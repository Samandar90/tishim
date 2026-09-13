import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../messages/ru.json";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("подсвечивает выбранный язык сразу, до завершения refresh", () => {
    render(
      <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
        <LocaleSwitcher block />
      </NextIntlClientProvider>
    );
    const ru = screen.getByRole("button", { name: "Рус" });
    const uz = screen.getByRole("button", { name: "O'z" });
    expect(ru).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(uz);

    // useLocale() в тесте не меняется (refresh замокан) — подсветка держится на next
    expect(uz).toHaveAttribute("aria-pressed", "true");
    expect(ru).toHaveAttribute("aria-pressed", "false");
    expect(document.cookie).toContain("locale=uz");
  });
});
