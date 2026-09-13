import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/layout/AppIconArt";

// Node-сборка next/og на Windows не может загрузить свои wasm-файлы
// (TypeError: Invalid URL — путь с обратными слэшами). Edge-сборка грузит их
// иначе и работает и на Windows-машине разработчика, и на Linux в проде.
export const runtime = "edge";

/**
 * Иконки PWA генерируются на сборке из того же контура, что и логотип —
 * растровых файлов в репозитории нет, менять знак нужно в одном месте.
 * Маршруты: /icon/192, /icon/512, /icon/maskable-512 (их читает manifest.ts).
 */
const VARIANTS = [
  { id: "192", size: 192, maskable: false },
  { id: "512", size: 512, maskable: false },
  { id: "maskable-512", size: 512, maskable: true },
] as const;

export function generateImageMetadata() {
  return VARIANTS.map((v) => ({
    id: v.id,
    size: { width: v.size, height: v.size },
    contentType: "image/png",
  }));
}

export default function Icon({ id }: { id: string }) {
  const v = VARIANTS.find((x) => x.id === id) ?? VARIANTS[0];
  return new ImageResponse(<AppIconArt size={v.size} maskable={v.maskable} />, {
    width: v.size,
    height: v.size,
  });
}
