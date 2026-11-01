"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

/**
 * Имя, телефон и дата рождения после регистрации. Раньше их нельзя было ни
 * исправить, ни дозаполнить; обновление profiles своей строки RLS уже разрешал.
 */
export function ProfileEditForm({
  userId,
  initialName,
  initialPhone,
  initialBirthDate,
  onDone,
}: {
  userId: string;
  initialName: string;
  initialPhone: string | null;
  initialBirthDate: string | null;
  onDone: () => void;
}) {
  const t = useTranslations("profile");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ? formatUzPhone(initialPhone) : "");
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = ta("nameRequired");
    const digits = phone.replace(/\D/g, "");
    if (digits.length > 3 && digits.length !== 12) next.phone = ta("phoneInvalid");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const { data, error } = await createClient()
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone: digits.length > 3 ? phone.trim() : null,
        birth_date: birthDate || null,
      })
      .eq("id", userId)
      .select("id");
    setSaving(false);
    if (error || !data?.length) {
      console.error("profile update failed", error);
      setErrors({ form: t("error") });
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-3" noValidate>
      <Field label={ta("fullName")} htmlFor="profile-name" error={errors.name}>
        <Input
          id="profile-name"
          autoComplete="name"
          value={name}
          error={errors.name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
          }}
        />
      </Field>
      <Field label={ta("phone")} htmlFor="profile-phone" error={errors.phone}>
        <Input
          id="profile-phone"
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
      <Field label={t("birthDate")} htmlFor="profile-birth">
        <Input
          id="profile-birth"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </Field>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">
          {errors.form}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" block onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" block loading={saving}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
