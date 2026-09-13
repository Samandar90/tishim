import type { MetadataRoute } from "next";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Манифест локализован так же, как остальное приложение: Next ставит на
 * <link rel="manifest"> атрибут crossorigin="use-credentials", поэтому cookie
 * с локалью долетает и сюда. Путь исключён из matcher'а middleware — иначе
 * аноним получал бы 307 на /login вместо манифеста.
 *
 * Service worker'а нет намеренно: всё приложение живёт под RLS-сессией,
 * кэшировать медицинские данные на устройстве нельзя, а для установки на
 * домашний экран современным Chrome и Safari он не нужен.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = await getTranslations("meta");

  return {
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
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
