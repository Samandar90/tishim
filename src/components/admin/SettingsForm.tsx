"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function SettingsForm({
  initialPrice,
  initialPhone,
}: {
  initialPrice: number | null;
  initialPhone: string | null;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Пустой телефон — допустимо (с лендинга пропадёт ссылка), а вот половина номера — нет:
    // раньше «+998 » из автоподстановки сохранялся как есть.
    const digits = phone.replace(/\D/g, "");
    const cleanPhone = digits.length <= 3 ? "" : phone.trim();
    if (digits.length > 3 && digits.length !== 12) {
      setPhoneError(t("phoneInvalid"));
      return;
    }
    setPhoneError(null);
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("app_settings").upsert([
      {
        key: "initial_mapping_price",
        value: Math.max(0, Math.round(parseFloat(price) || 0)),
        updated_at: now,
      },
      { key: "contact_phone", value: cleanPhone, updated_at: now },
    ]);

    setSaving(false);
    if (error) {
      console.error("settings save failed", error);
      setError(t("settingsError"));
      return;
    }
    setPhone(cleanPhone);
    setSaved(true);
    router.refresh();
  }

  return (
    <Card className="p-5 md:p-6">
      <form onSubmit={save} className="space-y-4">
        <Field label={t("mappingPrice")} htmlFor="mappingPrice" hint={t("mappingPriceHint")}>
          <Input
            id="mappingPrice"
            type="number"
            min={0}
            step="any"
            inputMode="numeric"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field
          label={t("contactPhone")}
          htmlFor="contactPhone"
          hint={t("contactPhoneHint")}
          error={phoneError}
        >
          <Input
            id="contactPhone"
            type="tel"
            inputMode="tel"
            value={phone}
            error={phoneError}
            onChange={(e) => {
              setPhone(formatUzPhone(e.target.value));
              if (phoneError) setPhoneError(null);
            }}
            placeholder="+998 71 200 11 22"
          />
        </Field>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-body text-danger">{error}</p>}
        {saved && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-body text-emerald-800">
            {t("settingsSaved")}
          </p>
        )}

        <Button type="submit" loading={saving}>
          {tc("save")}
        </Button>
      </form>
    </Card>
  );
}
