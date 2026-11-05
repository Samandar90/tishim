"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stethoscope, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isNetworkAuthError } from "@/lib/authErrors";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Field, Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { cn } from "@/lib/utils";

type Role = "patient" | "dentist";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  // Плитка «Стоматолог» — только по ссылке /register?role=dentist, которую даёт владелец:
  // врачом мог зарегистрироваться кто угодно, а пациент — ошибиться ролью без возврата.
  const dentistAllowed = useSearchParams().get("role") === "dentist";
  const [role, setRole] = useState<Role>(dentistAllowed ? "dentist" : "patient");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    form?: string;
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
  }>({});
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Раньше форма не проверяла ничего, и аккаунт создавался с пустым именем
    const next: typeof errors = {};
    const digits = phone.replace(/\D/g, "");
    if (fullName.trim().length < 2) next.name = t("nameRequired");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t("emailInvalid");
    if (password.length < MIN_PASSWORD_LENGTH) next.password = t("weakPassword");
    if (digits.length > 3 && digits.length !== 12) next.phone = t("phoneInvalid");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);

    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role, full_name: fullName.trim(), phone: digits.length > 3 ? phone.trim() : null },
        // ссылка из письма подтверждения идёт на наш обработчик, дальше middleware по роли
        emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=/`,
      },
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
        setErrors({ form: isNetworkAuthError(error) ? t("networkError") : t("registerError") });
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
      <AuthScreen>
        <div className="text-center">
          <h1 className="text-h2 text-ink">{t("confirmTitle")}</h1>
          <p className="mb-6 mt-2 text-body text-muted">{t("confirmText", { email })}</p>
          <ButtonLink href="/login" variant="secondary" block>
            {t("backToLogin")}
          </ButtonLink>
        </div>
      </AuthScreen>
    );
  }

  const roles = [
    { value: "patient" as const, label: t("rolePatient"), icon: User },
    { value: "dentist" as const, label: t("roleDentist"), icon: Stethoscope },
  ];

  return (
    <AuthScreen>
    <h1 className="text-h2 text-ink">{t("registerTitle")}</h1>
      <p className="mb-6 mt-1 text-body text-muted">{t("registerSubtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {dentistAllowed && (
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
        )}

        <Field label={t("fullName")} htmlFor="fullName" error={errors.name}>
          <Input
            id="fullName"
            required
            minLength={2}
            autoComplete="name"
            value={fullName}
            error={errors.name}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder={t("fullNamePlaceholder")}
          />
        </Field>

        <Field label={t("phone")} htmlFor="phone" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            error={errors.phone}
            onFocus={() => {
              if (!phone) setPhone("+998 ");
            }}
            onChange={(e) => {
              setPhone(formatUzPhone(e.target.value));
              if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
            }}
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
          <PasswordInput
            id="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
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

        <p className="text-center text-small text-muted">
          {t("consentPrefix")}{" "}
          <Link href="/privacy" className="font-medium text-primary-700 underline-offset-2 hover:underline">
            {t("privacyLink")}
          </Link>
        </p>
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
    </AuthScreen>
  );
}
