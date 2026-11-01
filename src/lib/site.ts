/**
 * Публичный адрес сайта — для metadataBase, sitemap и ссылок в письмах.
 * Render сам выставляет RENDER_EXTERNAL_URL; свой домен задаётся NEXT_PUBLIC_SITE_URL.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    (process.env.NODE_ENV === "production" ? "https://tishim.onrender.com" : "http://localhost:3000")
  );
}
