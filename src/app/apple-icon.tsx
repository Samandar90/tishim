import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/layout/AppIconArt";

// edge по той же причине, что и в icon.tsx (node-сборка next/og падает на Windows)
export const runtime = "edge";

// iOS игнорирует иконки из манифеста и берёт только apple-touch-icon.
// Углы скругляет сам, поэтому заливка во весь холст, как у maskable.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={size.width} maskable />, size);
}
