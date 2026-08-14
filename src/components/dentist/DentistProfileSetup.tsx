"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";

/** Dentist onboarding: fill specialization / license / clinic after registration. */
export function DentistProfileSetup({
  dentistId,
  clinics,
  initial,
}: {
  dentistId: string;
  clinics: Pick<Clinic, "id" | "name">[];
  initial: { specialization: string | null; license_number: string | null; clinic_id: string | null };
}) {
  const t = useTranslations("dentist.profileSetup");
  const router = useRouter();
  const [specialization, setSpecialization] = useState(initial.specialization ?? "");
  const [license, setLicense] = useState(initial.license_number ?? "");
  const [clinicId, setClinicId] = useState(initial.clinic_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("dentists")
      .update({
        specialization: specialization.trim() || null,
        license_number: license.trim() || null,
        clinic_id: clinicId || null,
      })
      .eq("id", dentistId);

    setLoading(false);
    if (error) {
      console.error("dentist profile save failed", error);
      setError(t("saveError"));
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-primary-200 ring-1 ring-primary-100">
      <CardTitle>{t("title")}</CardTitle>
      <p className="-mt-2 mb-4 text-sm text-slate-500">{t("subtitle")}</p>

      <form onSubmit={save} className="space-y-3">
        <div>
          <Label htmlFor="specialization">{t("specialization")}</Label>
          <Input
            id="specialization"
            required
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder={t("specializationPlaceholder")}
          />
        </div>
        <div>
          <Label htmlFor="license">{t("license")}</Label>
          <Input id="license" value={license} onChange={(e) => setLicense(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="clinic">{t("clinic")}</Label>
          <Select id="clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            <option value="">{t("noClinic")}</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Button type="submit" loading={loading}>
          {t("title")}
        </Button>
      </form>
    </Card>
  );
}
