import type { Config } from "tailwindcss";

/**
 * Дизайн-система Tishim. Медицинский продукт: спокойная бирюза, много воздуха,
 * тени только там, где нужно отделить слой (карточки и модалки).
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2", // основной
          700: "#0e7490", // hover
          800: "#155e75",
          900: "#164e63",
          DEFAULT: "#0891b2",
        },
        surface: "#f8fafc", // фон страницы
        card: "#ffffff",
        ink: "#0f172a", // основной текст
        muted: "#64748b", // вторичный текст
        line: "#e2e8f0", // границы
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontSize: {
        // [размер, line-height] — шкала из ТЗ
        h1: ["30px", { lineHeight: "36px", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "24px" }],
        small: ["13px", { lineHeight: "20px" }],
      },
      borderRadius: {
        // кнопки и инпуты 12px, карточки 16px
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 2px 4px -1px rgb(15 23 42 / 0.06), 0 4px 12px -2px rgb(15 23 42 / 0.08)",
        modal: "0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -4px rgb(15 23 42 / 0.1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
      // высота шторки на телефоне: оставляет видимой сцену под ней
      maxHeight: { sheet: "85vh" },
      // ширина подобрана так, чтобы вся челюсть (16 зубов) влезала без скролла
      maxWidth: { content: "1280px" },
      // 3D-сцена челюсти на широком экране: челюсть вписывается по высоте, а не по ширине
      height: { stage: "520px" },
      spacing: {
        section: "80px", // вертикальный ритм секций лендинга (десктоп)
        "section-sm": "48px", // мобильный
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "sheet-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-down": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(24px)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        // шторка: <dialog> из display:none в open перезапускает анимацию сам
        "sheet-up": "sheet-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        // выход шторки; close() зовётся по animationend в useNativeDialog
        "sheet-down": "sheet-down 200ms cubic-bezier(0.7, 0, 0.84, 0) both",
        // вход страницы после навигации. Только opacity: transform на корне
        // страницы сделал бы её containing block для fixed Toast внутри.
        // backwards, а не both: анимация, «заполняющая» после конца, по Web
        // Animations действует как will-change и навсегда оставляет корню
        // страницы отдельный слой и stacking context.
        "page-in": "fade-in 220ms cubic-bezier(0.16, 1, 0.3, 1) backwards",
        // спиннер загрузки: задержка, чтобы не мигать на переходах короче 200 мс
        "fade-in-late": "fade-in 160ms ease-out 200ms backwards",
      },
    },
  },
  plugins: [],
};
export default config;
