import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/ru.json";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const t = messages.auth;
const getUser = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser, updateUser, signOut } }),
}));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      <ResetPasswordForm />
    </NextIntlClientProvider>
  );
}

async function fill(password: string, confirm: string) {
  fireEvent.change(await screen.findByLabelText(t.password), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(t.confirmPassword), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: t.resetButton }));
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  updateUser.mockReset().mockResolvedValue({ data: {}, error: null });
  signOut.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("ResetPasswordForm", () => {
  it("без сессии — ссылка не сработала, ведём запрашивать новую", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    renderForm();
    expect(await screen.findByText(t.resetExpiredTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.requestAgain })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("несовпадающий повтор на сервер не уходит", async () => {
    renderForm();
    await fill("secret1", "secret2");
    expect(screen.getByText(t.passwordMismatch)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("короткий пароль — подсказка про длину", async () => {
    renderForm();
    await fill("123", "123");
    expect(screen.getByText(t.weakPassword)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("успех: пароль обновлён, чужие сессии закрыты, показан итог", async () => {
    renderForm();
    await fill("newsecret", "newsecret");
    expect(await screen.findByText(t.resetDoneTitle)).toBeInTheDocument();
    expect(updateUser).toHaveBeenCalledWith({ password: "newsecret" });
    expect(signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("тот же пароль, что и был, — просим другой", async () => {
    updateUser.mockResolvedValue({
      data: null,
      error: { message: "New password should be different from the old password." },
    });
    renderForm();
    await fill("samesame", "samesame");
    expect(await screen.findByText(t.passwordSame)).toBeInTheDocument();
  });

  it("сессия пропала к моменту отправки — состояние «ссылка не сработала»", async () => {
    updateUser.mockResolvedValue({ data: null, error: { message: "Auth session missing!" } });
    renderForm();
    await fill("newsecret", "newsecret");
    expect(await screen.findByText(t.resetExpiredTitle)).toBeInTheDocument();
  });
});
