"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  MIN_PASSWORD_LENGTH,
  classifyPasswordUpdateError,
  validateNewPassword,
} from "@/lib/password";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

type Stage = "checking" | "form" | "expired" | "done";

/** Пауза перед уходом в кабинет после смены пароля; кнопка на экране — если переход не случился. */
const DONE_REDIRECT_MS = 1500;

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Сессию для смены пароля кладёт в cookie /api/auth/confirm. Без неё форма бессмысленна:
  // говорим, что ссылка не сработала, и ведём запрашивать новую.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setStage(data.user ? "form" : "expired");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stage !== "done") return;
    const timer = setTimeout(() => router.push("/"), DONE_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [stage, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setError(t(problem === "tooShort" ? "weakPassword" : "passwordMismatch"));
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("password update failed", updateError);
      const failure = classifyPasswordUpdateError(updateError.message);
      if (failure === "session") {
        setStage("expired");
      } else {
        setError(
          t(failure === "same" ? "passwordSame" : failure === "weak" ? "weakPassword" : "resetError")
        );
      }
      setLoading(false);
      return;
    }

    // Старый пароль мог быть у постороннего — его сессии закрываем, текущая остаётся.
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) console.error("sign out of other sessions failed", signOutError);
    setStage("done");
  }

  if (stage === "checking") {
    return <p className="py-6 text-center text-body text-muted">{tc("loading")}</p>;
  }

  if (stage === "expired") {
    return (
      <div className="text-center">
        <h1 className="text-h2 text-ink">{t("resetExpiredTitle")}</h1>
        <p className="mt-2 text-body text-muted">{t("linkInvalid")}</p>
        <div className="mt-6 space-y-2">
          <ButtonLink href="/forgot-password" block>
            {t("requestAgain")}
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" block>
            {t("backToLogin")}
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="text-center">
        <h1 className="text-h2 text-ink">{t("resetDoneTitle")}</h1>
        <p className="mt-2 text-body text-muted">{t("resetDoneText")}</p>
        <ButtonLink href="/" block className="mt-6">
          {t("resetDoneButton")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-h2 text-ink">{t("resetTitle")}</h1>
      <p className="mb-6 mt-1 text-body text-muted">{t("resetSubtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("password")} htmlFor="password" error={error} hint={t("passwordHint")}>
          <PasswordInput
            id="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            error={error}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>

        <Field label={t("confirmPassword")} htmlFor="confirm">
          <PasswordInput
            id="confirm"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirm}
            error={error}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>

        <Button type="submit" size="lg" block loading={loading}>
          {t("resetButton")}
        </Button>
      </form>
    </>
  );
}
