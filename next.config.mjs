import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Origin Supabase различается между окружениями (локально 127.0.0.1:54321,
 * в проде *.supabase.co), поэтому CSP собирается из переменной, а не хардкодится:
 * захардкоженная строка намертво ломает одну из сред.
 */
function supabaseOrigin() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const supabase = supabaseOrigin();

if (!supabase) {
  // Без этого origin CSP обрежет всё общение с базой, а выглядеть будет корректно.
  console.warn(
    "[next.config] NEXT_PUBLIC_SUPABASE_URL не задан или невалиден — " +
      "connect-src и img-src соберутся без Supabase, приложение не сможет ходить в базу."
  );
}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js App Router кладёт RSC-payload в inline-скрипты self.__next_f.push —
  // без 'unsafe-inline' React не гидратируется. Добавлять сюда nonce или
  // 'strict-dynamic' НЕЛЬЗЯ: по CSP3 их присутствие заставляет браузер
  // игнорировать 'unsafe-inline' в этой же директиве, и приложение белеет.
  // 'unsafe-eval' нужен только dev-сборке (react-refresh, eval-source-map);
  // в прод-чанках ни eval(, ни new Function не встречается.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // style={{...}} используется в девяти местах (легенда одонтограммы, бейджи
  // состояний зубов, прогресс заполнения карты). React рендерит их атрибутом
  // style=, а атрибутные стили не покрываются ни nonce, ни hash — послабление
  // здесь неустранимо. Сам Tailwind собирается во внешний css и его не требует.
  "style-src 'self' 'unsafe-inline'",
  // blob: — превью выбранных фото через URL.createObjectURL до отправки.
  // Supabase — публичные URL бакета avatars и подписанные ссылки на вложения.
  `img-src 'self' blob: data:${supabase ? ` ${supabase}` : ""}`,
  // Inter самохостится через next/font, во внешний Google в рантайме не ходим.
  "font-src 'self'",
  // 'self' обязателен не только для /api/ai-screening: App Router тянет по нему
  // RSC-payload при клиентской навигации и router.refresh().
  // Порты в dev — с подстановкой: next dev сам уходит на 3001, если 3000 занят.
  `connect-src 'self'${supabase ? ` ${supabase}` : ""}${
    isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""
  }`,
  // Только когда окружение действительно боевое. Признак — https у Supabase:
  // в проде он https, в локальной сборке http://127.0.0.1:54321. Проверено, что
  // одного NODE_ENV мало: `next start` на localhost поднимается как production,
  // и тогда Chrome апгрейдит до https даже same-origin запросы за RSC-payload —
  // получаем ERR_SSL_PROTOCOL_ERROR, откат на полную перезагрузку страницы и
  // ошибки в консоли. Вопреки расхожему мнению, loopback от апгрейда не освобождён.
  ...(!isDev && supabase.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Два года. Без preload сознательно: запись в preload-список практически
  // необратима, а onrender.com нам не принадлежит — при переезде на свой домен
  // имя займёт другой тенант и унаследует её.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Дубль frame-ancestors для старых браузеров.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Фото грузятся системным выбором файла, getUserMedia в коде нет — camera
  // можно закрывать безопасно.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=(self)",
      "screen-wake-lock=()",
      "usb=()",
      "xr-spatial-tracking=()",
      "browsing-topics=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Origin-Agent-Cluster", value: "?1" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Убирает x-powered-by: Next.js — бесплатная наводка для сканеров.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
