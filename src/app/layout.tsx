import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
    applicationName: "Tishim",
    // manifest здесь не задаётся: ссылку с crossorigin рендерит сам layout, см. ниже
    // iOS: полноэкранный режим с домашнего экрана и своё имя под иконкой
    appleWebApp: { capable: true, title: "Tishim", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Без cover env(safe-area-inset-*) на iPhone равны нулю — и в standalone
  // шапка уезжала бы под «чёлку», а таб-бар под полоску Home.
  viewportFit: "cover",
  themeColor: "#0891b2",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <head>
        {/* Next 15 ставит use-credentials только на превью Vercel, а без него браузер
            запрашивает манифест без cookie locale — см. manifest.webmanifest/route.ts */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Локаль и сообщения провайдер next-intl 4 берёт из i18n/request.ts сам */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
