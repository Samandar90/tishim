import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/layout/AppIconArt";

// Edge, как у icon.tsx: node-сборка next/og на Windows не находит свои wasm-файлы.
export const runtime = "edge";
export const alt = "Tishim — цифровая карта зубов";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Цифровая карта ваших зубов";
const SUBTITLE = "Tishlaringizning raqamli kartasi";
const NOTE = "Один осмотр — и состояние зубов, диагнозы и история лечения всегда в телефоне";

/**
 * Satori рисует только теми глифами, что есть в переданном шрифте, а встроенный у
 * него латинский. Inter с кириллицей берём у Google Fonts подмножеством под нужный
 * текст; с устаревшим User-Agent сервис отдаёт TTF, который Satori понимает.
 */
async function loadInter(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Inter:wght@600&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0" } }
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

/** Превью ссылки в Telegram и WhatsApp: без него уходил голый текст. */
export default async function OpenGraphImage() {
  const font = await loadInter(`Tishim${TITLE}${SUBTITLE}${NOTE}`);
  // без шрифта кириллица превратилась бы в квадраты — оставляем латинские строки
  const title = font ? TITLE : "Tishim";
  const note = font ? NOTE : "tishim.onrender.com";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f172a 0%, #164e63 100%)",
          color: "white",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <AppIconArt size={112} maskable={false} />
          <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>Tishim</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#67e8f9" }}>{SUBTITLE}</div>
          <div style={{ fontSize: 28, color: "#cbd5e1", lineHeight: 1.35, maxWidth: 1000 }}>{note}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Inter", data: font, weight: 600, style: "normal" }] : undefined,
    }
  );
}
