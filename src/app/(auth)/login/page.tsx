"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { isNetworkAuthError } from "@/lib/authErrors";
import { safeNext } from "@/lib/safeNext";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  // middleware кладёт сюда страницу, с которой увёл на вход; чужой адрес не пропускаем
  const next = safeNext(useSearchParams().get("next"), "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await createClient().auth.signInWithPassword({ email, password });

    if (error) {
      setError(isNetworkAuthError(error) ? t("networkError") : t("invalidCredentials"));
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthScreen>
      <h1 className="text-h2 text-ink">{t("loginTitle")}</h1>
      <p className="mb-6 mt-1 text-body text-muted">{t("loginSubtitle")}</p>

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

        <Field label={t("password")} htmlFor="password">
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={password}
            error={error}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-touch items-center px-1.5 text-small font-medium text-primary-700 hover:text-primary-800"
          >
            {t("forgotLink")}
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={loading}>
          {t("loginButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-body text-muted">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="inline-flex min-h-touch items-center px-1.5 font-medium text-primary-700 hover:text-primary-800"
        >
          {t("registerLink")}
        </Link>
      </p>
    </AuthScreen>
  );
}
