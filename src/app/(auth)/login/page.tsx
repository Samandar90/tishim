"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
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
      setError(t("invalidCredentials"));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />

      <Card className="w-full max-w-md p-6 md:p-7">
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
            <Input
              id="password"
              type="password"
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
      </Card>
    </div>
  );
}
