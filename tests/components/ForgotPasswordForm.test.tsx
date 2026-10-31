import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/ru.json";
import { ForgotPasswordForm, recoveryRedirectUrl } from "@/components/auth/ForgotPasswordForm";

const t = messages.auth;
const resetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}));

function renderForm(props: { linkFailed?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      <ForgotPasswordForm {...props} />
    </NextIntlClientProvider>
  );
}

function submit(email: string) {
  fireEvent.change(screen.getByLabelText(t.email), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: t.forgotButton }));
}

beforeEach(() => {
  resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("ForgotPasswordForm", () => {
  it("запрашивает ссылку с возвратом на /api/auth/confirm и показывает «проверьте почту»", async () => {
    renderForm();
    submit("patient1@tishim.uz");
    expect(await screen.findByText(t.forgotSentTitle)).toBeInTheDocument();
    expect(resetPasswordForEmail).toHaveBeenCalledWith("patient1@tishim.uz", {
      redirectTo: recoveryRedirectUrl(window.location.origin),
    });
    expect(
      screen.getByText(t.forgotSentText.replace("{email}", "patient1@tishim.uz"))
    ).toBeInTheDocument();
  });

  it("при ошибке Supabase ответ тот же — по нему нельзя узнать, есть ли аккаунт", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: "rate limit" } });
    renderForm();
    submit("nobody@tishim.uz");
    expect(await screen.findByText(t.forgotSentTitle)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it("пустая почта на сервер не уходит", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: t.forgotButton }));
    expect(screen.getByText(t.emailRequired)).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("после неудачной ссылки из письма объясняет, что её надо запросить заново", () => {
    renderForm({ linkFailed: true });
    expect(screen.getByText(t.linkInvalid)).toBeInTheDocument();
  });

  it("адрес возврата ведёт на обработчик с next=/reset-password", () => {
    expect(recoveryRedirectUrl("https://tishim.onrender.com")).toBe(
      "https://tishim.onrender.com/api/auth/confirm?next=%2Freset-password"
    );
  });
});
