import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/ru.json";
import { ProfileSheet } from "@/components/layout/ProfileSheet";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));

function renderSheet() {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      <ProfileSheet name="Иванов Иван" phone="998901234567" roleLabel="Пациент" />
    </NextIntlClientProvider>
  );
}

describe("ProfileSheet", () => {
  it("открывает шторку с именем, ролью, телефоном, языком и выходом", () => {
    const { container } = renderSheet();
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: messages.nav.profile }));

    expect(dialog).toHaveAttribute("open");
    expect(screen.getByText("Иванов Иван")).toBeInTheDocument();
    expect(screen.getByText("Пациент")).toBeInTheDocument();
    expect(screen.getByText("+998 90 123 45 67")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: messages.common.logout })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Рус" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "O'z" })).toBeInTheDocument();
    expect(screen.getAllByText("ИИ").length).toBeGreaterThan(0);
  });

  it("без телефона строки с номером нет", () => {
    render(
      <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
        <ProfileSheet name="Иванов Иван" phone={null} roleLabel="Пациент" />
      </NextIntlClientProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: messages.nav.profile }));
    expect(screen.queryByText(/\+998/)).not.toBeInTheDocument();
  });

  it("крестик запускает выходную анимацию, close() придёт по animationend", () => {
    const { container } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: messages.nav.profile }));
    fireEvent.click(screen.getByRole("button", { name: messages.common.close }));

    const dialog = container.querySelector("dialog");
    expect(dialog).toHaveClass("animate-sheet-down");
    // jsdom не проигрывает анимации — animationend шлём руками
    fireEvent.animationEnd(dialog!);
    expect(dialog).not.toHaveAttribute("open");
  });
});
