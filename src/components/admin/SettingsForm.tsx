"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";

export function SettingsForm({
  initialPrice,
  initialPhone,
}: {
  initialPrice: number | null;
  initialPhone: string | null;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice != null ? String(initialPrice) : "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
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
      { key: "contact_phone", value: phone.trim(), updated_at: now },
    ]);

    setSaving(false);
    if (error) {
      console.error("settings save failed", error);
      setError(t("settingsError"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>{t("settingsTitle")}</CardTitle>
      <form onSubmit={save} className="space-y-3">
        <div>
          <Label htmlFor="mappingPrice">{t("mappingPrice")}</Label>
          <Input
            id="mappingPrice"
            type="number"
            min={0}
            step="1000"
            inputMode="numeric"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contactPhone">{t("contactPhone")}</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatUzPhone(e.target.value))}
            placeholder="+998 71 200 11 22"
          />
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {t("settingsSaved")}
          </p>
        )}

        <Button type="submit" loading={saving}>
          {t("settingsTitle")}
        </Button>
      </form>
    </Card>
  );
}
