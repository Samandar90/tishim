"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stethoscope, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

type Role = "patient" | "dentist";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [role, setRole] = useState<Role>("patient");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ form?: string; email?: string; password?: string }>({});
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName.trim(), phone: phone.trim() || null } },
    });

    if (error) {
      console.error("signup failed", error);
      const msg = error.message.toLowerCase();
      // Ошибку показываем у поля, к которому она относится
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        setErrors({ email: t("emailTaken") });
      } else if (msg.includes("password")) {
        setErrors({ password: t("weakPassword") });
      } else {
        setErrors({ form: t("registerError") });
      }
      setLoading(false);
      return;
    }

    // Если в Supabase включено подтверждение почты — сессии ещё нет
    if (!data.session) {
      setNeedsConfirm(true);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (needsConfirm) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center md:p-7">
          <h1 className="text-h2 text-ink">{t("confirmTitle")}</h1>
          <p className="mb-6 mt-2 text-body text-muted">{t("confirmText", { email })}</p>
          <Link href="/login">
            <Button variant="secondary" block>
              {t("backToLogin")}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const roles = [
    { value: "patient" as const, label: t("rolePatient"), icon: User },
    { value: "dentist" as const, label: t("roleDentist"), icon: Stethoscope },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />

      <Card className="w-full max-w-md p-6 md:p-7">
        <h1 className="text-h2 text-ink">{t("registerTitle")}</h1>
        <p className="mb-6 mt-1 text-body text-muted">{t("registerSubtitle")}</p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label>{t("iAm")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  aria-pressed={role === r.value}
                  className={cn(
                    "flex min-h-touch flex-col items-center gap-1.5 rounded-xl border p-3 text-body font-medium transition-colors",
                    role === r.value
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-line bg-card text-muted hover:border-slate-300 hover:text-ink"
                  )}
                >
                  <r.icon className="size-5" strokeWidth={1.75} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <Field label={t("fullName")} htmlFor="fullName">
            <Input
              id="fullName"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("fullNamePlaceholder")}
            />
          </Field>

          <Field label={t("phone")} htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onFocus={() => {
                if (!phone) setPhone("+998 ");
              }}
              onChange={(e) => setPhone(formatUzPhone(e.target.value))}
              placeholder="+998 90 123 45 67"
            />
          </Field>

          <Field label={t("email")} htmlFor="email" error={errors.email}>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              error={errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="name@example.com"
            />
          </Field>

          <Field
            label={t("password")}
            htmlFor="password"
            error={errors.password}
            hint={t("passwordHint")}
          >
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              error={errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
            />
          </Field>

          {errors.form && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">{errors.form}</p>
          )}

          <Button type="submit" size="lg" block loading={loading}>
            {t("registerButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-body text-muted">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="inline-flex min-h-touch items-center px-1.5 font-medium text-primary-700 hover:text-primary-800"
          >
            {t("loginLink")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
