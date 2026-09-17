"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

export interface AdminDentistRow {
  id: string;
  specialization: string | null;
  license_number: string | null;
  clinic_id: string | null;
  is_featured: boolean;
  experience_years: number | null;
  profile: { full_name: string; phone: string | null } | null;
}

export function DentistsPanel({
  dentists,
  clinics,
}: {
  dentists: AdminDentistRow[];
  clinics: Pick<Clinic, "id" | "name">[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string | null; name: string } | null>(null);

  async function assignClinic(dentistId: string, clinicId: string) {
    setBusyId(dentistId);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("dentists")
        .update({ clinic_id: clinicId || null })
        .eq("id", dentistId);
      if (error) {
        console.error("assign clinic failed", error);
        setError(t("clinicChangeError"));
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function setFeatured(dentistId: string | null) {
    setBusyId(dentistId ?? "clear");
    setError(null);
    try {
      const supabase = createClient();
      // единственный активный флагман: RPC снимает флаг у остальных атомарно
      const { error } = await supabase.rpc("set_featured_dentist", {
        p_dentist_id: dentistId,
      });
      if (error) {
        console.error("set featured dentist failed", error);
        setError(t("featuredError"));
        return;
      }
      setPending(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
        {t("featuredHint")}
      </p>

      {dentists.length === 0 ? (
        <Card className="py-8 text-center text-slate-500">{t("noDentists")}</Card>
      ) : (
        dentists.map((d) => (
          <Card key={d.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                {(d.profile?.full_name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                  <span className="truncate">{d.profile?.full_name ?? "—"}</span>
                  {d.is_featured && <Badge tone="primary">{t("featuredBadge")}</Badge>}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {[d.specialization, d.license_number && `${t("license")}: ${d.license_number}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-full text-sm sm:w-44"
                value={d.clinic_id ?? ""}
                disabled={busyId === d.id}
                onChange={(e) => assignClinic(d.id, e.target.value)}
                aria-label={t("clinic")}
              >
                <option value="">{t("noClinic")}</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              {d.is_featured ? (
                <Button
                  variant="secondary"
                 
                  onClick={() =>
                    setPending({ id: null, name: d.profile?.full_name ?? "—" })
                  }
                >
                  {t("removeFeatured")}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                 
                  onClick={() =>
                    setPending({ id: d.id, name: d.profile?.full_name ?? "—" })
                  }
                >
                  {t("makeFeatured")}
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.id ? t("featuredConfirmTitle") : t("unfeaturedConfirmTitle")}
        description={
          pending?.id
            ? t("featuredConfirmText", { name: pending.name })
            : t("unfeaturedConfirmText", { name: pending?.name ?? "" })
        }
        confirmLabel={pending?.id ? t("makeFeatured") : t("removeFeatured")}
        danger={!pending?.id}
        loading={busyId !== null}
        onConfirm={() => pending && setFeatured(pending.id)}
        onCancel={() => setPending(null)}
      />

      <Toast message={error} tone="error" onDismiss={() => setError(null)} />
    </div>
  );
}
