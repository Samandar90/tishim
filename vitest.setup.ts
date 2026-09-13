import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Тесты идут в часовом поясе пользователей, а не разработчика и не CI-раннера.
// Ошибки со смешением UTC и локального времени под UTC не воспроизводятся вовсе —
// именно так уехала отсечка истории зубов (см. toothState.timezone.test.ts).
process.env.TZ = "Asia/Tashkent";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// jsdom не реализует showModal/close у <dialog> — минимум для тестов шторок
// и подтверждений: атрибут open и событие close, как у настоящего.
// typeof — setup выполняется и для файлов с окружением node, где DOM нет.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
});
