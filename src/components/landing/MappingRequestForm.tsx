"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CLINIC_REQUEST_TAG } from "@/lib/constants/requests";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";

/**
 * Публичная форма записи на цифровизацию. Одна колонка, крупные поля,
 * ошибки — inline под соответствующим полем.
 */
export function MappingRequestForm({
  defaultName = "",
  defaultPhone = "",
  showClinicOption = true,
}: {
  defaultName?: string;
  defaultPhone?: string;
  showClinicOption?: boolean;
}) {
  const t = useTranslations("landing");
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone ? formatUzPhone(defaultPhone) : "");
  const [date, setDate] = useState("");
  const [comment, setComment] = useState("");
  const [isClinic, setIsClinic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [sent, setSent] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = t("errName");
    // +998 плюс 9 цифр номера
    if (phone.replace(/\D/g, "").length < 12) next.phone = t("errPhone");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const finalComment = [isClinic ? CLINIC_REQUEST_TAG : null, comment.trim() || null]
      .filter(Boolean)
      .join(" ");

    // Прямая вставка закрыта миграцией 00008 — RPC троттлит заявки по номеру и клиенту.
    const { error } = await supabase.rpc("submit_mapping_request", {
      p_full_name: name.trim(),
      p_phone: phone.trim(),
      p_preferred_date: date || null,
      p_comment: finalComment || null,
    });

    setLoading(false);
    if (error) {
      console.error("mapping request submit failed", error);
      setErrors({
        form: error.message.includes("rate_limited") ? t("formRateLimited") : t("formError"),
      });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="size-7" strokeWidth={2} />
        </span>
        <p className="text-h3 text-ink">{t("thanksTitle")}</p>
        <p className="max-w-sm text-body text-muted">{t("thanksText")}</p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setName("");
            setPhone("");
            setDate("");
            setComment("");
            setIsClinic(false);
            setErrors({});
          }}
          className="min-h-touch px-3 text-body font-medium text-primary-700 hover:text-primary-800"
        >
          {t("thanksMore")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={t("formName")} htmlFor="mr-name" error={errors.name}>
        <Input
          id="mr-name"
          value={name}
          error={errors.name}
          maxLength={120}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
          }}
        />
      </Field>

      <Field label={t("formPhone")} htmlFor="mr-phone" error={errors.phone}>
        <Input
          id="mr-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          error={errors.phone}
          placeholder="+998 90 123 45 67"
          onFocus={() => {
            if (!phone) setPhone("+998 ");
          }}
          onChange={(e) => {
            setPhone(formatUzPhone(e.target.value));
            if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
          }}
        />
      </Field>

      <Field label={t("formDate")} htmlFor="mr-date">
        <Input
          id="mr-date"
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <Field label={t("formComment")} htmlFor="mr-comment">
        <Textarea
          id="mr-comment"
          className="min-h-[72px]"
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Field>

      {showClinicOption && (
        <label className="flex min-h-touch cursor-pointer items-center gap-3 text-body text-muted">
          <input
            type="checkbox"
            checked={isClinic}
            onChange={(e) => setIsClinic(e.target.checked)}
            className="size-5 rounded accent-primary-600"
          />
          {t("formClinic")}
        </label>
      )}

      {errors.form && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">{errors.form}</p>
      )}

      <Button type="submit" size="lg" block loading={loading}>
        {t("formSubmit")}
      </Button>
    </form>
  );
}
