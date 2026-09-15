/**
 * Генерация 3D-моделей зубов в GLB.
 *
 *   node scripts/teeth3d/generate.mjs [--only 16,46] [--step 0.4] [--lo-step 0.8]
 *                                     [--out public/models/teeth] [--preview <папка>] [--debug]
 *
 * На каждый тип зуба два файла: <fdi>.glb для одного зуба крупно и <fdi>-lo.glb
 * для всей челюсти сразу. --preview кладёт PNG-листы с тремя проекциями,
 * --debug красит их по поверхностям карты.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEETH } from "./anatomy.mjs";
import { buildTooth } from "./field.mjs";
import { polygonize } from "./mesh.mjs";
import { encodeGlb } from "./glb.mjs";
import { renderSheet } from "./preview.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next === undefined || next.startsWith("--") ? true : next;
}

const out = arg("out", "public/models/teeth");
const preview = arg("preview", null);
const step = Number(arg("step", 0.4));
const loStep = Number(arg("lo-step", 0.8));
const debug = arg("debug", false) === true;
const only = arg("only", null);
const list = only ? String(only).split(",").map(Number) : Object.keys(TEETH).map(Number);

mkdirSync(out, { recursive: true });
const built = new Map();
const rows = [];

for (const fdi of list) {
  const spec = TEETH[fdi];
  if (!spec) throw new Error(`Нет анатомии для зуба ${fdi}`);
  const started = performance.now();
  const tooth = buildTooth(spec);
  const hi = polygonize(tooth.field, tooth.bounds, step, tooth.classify);
  const hiBytes = encodeGlb(`tooth-${fdi}`, hi.parts);
  writeFileSync(join(out, `${fdi}.glb`), hiBytes);
  let loInfo = "";
  if (loStep > 0) {
    const lo = polygonize(tooth.field, tooth.bounds, loStep, tooth.classify);
    const loBytes = encodeGlb(`tooth-${fdi}`, lo.parts);
    writeFileSync(join(out, `${fdi}-lo.glb`), loBytes);
    loInfo = `lo ${lo.triangles} tri ${(loBytes.length / 1024).toFixed(0)} KB`;
  }
  built.set(fdi, hi.parts);
  rows.push(`${fdi}: ${hi.triangles} tri ${(hiBytes.length / 1024).toFixed(0)} KB | ${loInfo} | ${(performance.now() - started).toFixed(0)} ms | ${hi.parts.map((p) => p.name).join(",")}`);
}
console.log(rows.join("\n"));

if (preview) {
  mkdirSync(preview, { recursive: true });
  const groups = only
    ? { selection: list }
    : { upper: [11, 12, 13, 14, 15, 16, 17, 18], lower: [41, 42, 43, 44, 45, 46, 47, 48], primary: [51, 52, 53, 54, 55, 81, 82, 83, 84, 85] };
  for (const [name, fdis] of Object.entries(groups)) {
    const teeth = fdis.filter((f) => built.has(f)).map((fdi) => ({ fdi, parts: built.get(fdi) }));
    const file = join(preview, `${name}${debug ? "-surfaces" : ""}.png`);
    writeFileSync(file, renderSheet(teeth, { debug }));
    console.log("preview:", file);
  }
}
