import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["ru", "uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("locale")?.value;
  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
