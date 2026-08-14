import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Алиас продублирован из tsconfig намеренно, а не через vite-tsconfig-paths:
    // плагин сопоставляет файлы с include/exclude самого tsconfig.json, а тесты
    // оттуда исключены (иначе их тайпчекает `next build`). С плагином импорты
    // "@/..." внутри tests/ переставали резолвиться.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
    server: {
      deps: {
        // next-intl 3.26 не отдаёт условие "import" в exports — резолвится CJS-бандл.
        // Сейчас работает и без инлайна, но он обязателен, как только появится
        // next-intl/navigation (createNavigation). Держим превентивно.
        inline: ["next-intl", "use-intl"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/components/odontogram/state.ts", "src/hooks/**", "src/lib/utils.ts"],
    },
  },
});
