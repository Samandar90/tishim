"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Field, Input } from "@/components/ui/Input";

/**
 * Адрес, на который Supabase вернёт пользователя из письма. Это не страница, а обработчик
 * /api/auth/confirm: он обменивает code или token_hash на сессию в cookie и уже с ней
 * ведёт на /reset-password. Адрес обязан входить в Redirect URLs проекта Supabase —
 * иначе Supabase молча подставит Site URL, и пользователь окажется на лендинге.
 */
export function recoveryRedirectUrl(origin: string): string {
  const url = new URL("/api/auth/confirm", origin);
  url.searchParams.set("next", "/reset-password");
  return url.toString();
}

export function ForgotPasswordForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address) {
      setError(t("emailRequired"));
      return;
    }
    setError(null);
    setLoading(true);

    const { error: requestError } = await createClient().auth.resetPasswordForEmail(address, {
      redirectTo: recoveryRedirectUrl(window.location.origin),
    });
    // Ответ одинаковый при любом исходе — иначе по нему можно было бы проверить, есть ли
    // аккаунт с таким адресом. Сбой (лимит отправки, сеть) остаётся в консоли.
    if (requestError) console.error("password reset request failed", requestError);

    setSentTo(address);
    setLoading(false);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <h1 className="text-h2 text-ink">{t("forgotSentTitle")}</h1>
        <p className="mt-2 text-body text-muted">{t("forgotSentText", { email: sentTo })}</p>
        <p className="mt-2 text-small text-muted">{t("forgotSentHint")}</p>
        <div className="mt-6 space-y-2">
          <ButtonLink href="/login" variant="secondary" block>
            {t("backToLogin")}
          </ButtonLink>
          <Button type="button" variant="ghost" block onClick={() => setSentTo(null)}>
            {t("sendAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-h2 text-ink">{t("forgotTitle")}</h1>
      <p className="mb-6 mt-1 text-body text-muted">{t("forgotSubtitle")}</p>

      {linkFailed && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">
          {t("linkInvalid")}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("email")} htmlFor="email" error={error}>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            error={error}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="name@example.com"
          />
        </Field>

        <Button type="submit" size="lg" block loading={loading}>
          {t("forgotButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-body text-muted">
        <Link
          href="/login"
          className="inline-flex min-h-touch items-center px-1.5 font-medium text-primary-700 hover:text-primary-800"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
