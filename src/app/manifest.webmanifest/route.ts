import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Манифест локализован так же, как остальное приложение, — по cookie locale.
 * Это обычный route handler, а не соглашение app/manifest.ts: для соглашения
 * Next 15 сам рендерит <link rel="manifest"> и ставит на него
 * crossorigin="use-credentials" только на превью Vercel. Без атрибута браузер
 * запрашивает манифест без cookie, и он всегда уходил бы на языке по умолчанию.
 * Ссылку с атрибутом рендерит корневой layout. Путь исключён из matcher'а
 * middleware — иначе аноним получал бы 307 на /login вместо манифеста.
 *
 * Service worker'а нет намеренно: всё приложение живёт под RLS-сессией,
 * кэшировать медицинские данные на устройстве нельзя, а для установки на
 * домашний экран современным Chrome и Safari он не нужен.
 */
/** Поднимать при изменении знака: иконки кэшируются на год, без версии телефон не увидит новую. */
const ICON_VERSION = 1;

export async function GET() {
  const locale = await getLocale();
  const t = await getTranslations("meta");

  const manifest: MetadataRoute.Manifest = {
    id: "/",
    name: t("title"),
    short_name: "Tishim",
    description: t("description"),
    lang: locale,
    // "/" — middleware сам отправит вошедшего в кабинет его роли
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0891b2",
    icons: [
      { src: `/icon/192?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
      { src: `/icon/512?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
      { src: `/icon/maskable-512?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
