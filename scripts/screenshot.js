// Полностраничный скриншот страницы через DevTools Protocol с эмуляцией телефона.
// Нужен для визуальных проверок: обычный headless-скриншот Chrome не даёт окно уже 500px,
// а сайт запрещает встраивание в iframe. Требует Chrome и Node ≥ 22 (глобальный WebSocket).
//   node scripts/screenshot.js <url> <out.png> [width=375] [mobile=1]
// Путь к Chrome берётся из переменной CHROME, иначе стандартный.
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const [url, out, widthArg, mobileArg] = process.argv.slice(2);
const width = Number(widthArg || 375);
const mobile = (mobileArg ?? "1") === "1";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shot-"));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${Math.max(width, 500)},900`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (p) => new Promise((resolve, reject) => {
  http.get({ host: "127.0.0.1", port, path: p }, (res) => {
    let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve(JSON.parse(d)));
  }).on("error", reject);
});

(async () => {
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await getJson("/json"); break; } catch { await sleep(200); }
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id; pending.set(myId, resolve); ws.send(JSON.stringify({ id: myId, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 2, mobile });
  if (mobile) {
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Emulation.setUserAgentOverride", {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    });
  }
  await send("Page.navigate", { url });
  await sleep(9000);
  // пролистать, чтобы отработали IntersectionObserver (Reveal, ленивая 3D), и вернуться наверх
  await send("Runtime.evaluate", { expression: "(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}scrollTo(0,0);})()", awaitPromise: true });
  await sleep(1500);
  const { result } = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
  const height = Math.min(result.result.value, 16000);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile });
  await sleep(800);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(`ok ${out} ${width}x${height}`);
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
