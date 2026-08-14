"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/lib/types/database";
import { cn, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { BuildingIcon, PlusIcon } from "@/components/icons";

export interface AdminStats {
  patients: number;
  dentists: number;
  clinics: number;
  visits: number;
  visits_last_30d: number;
  revenue_total: number;
  revenue_outstanding: number;
  ai_screenings: number;
}

type Tab = "stats" | "clinics";

export function AdminTabs({
  stats,
  clinics,
}: {
  stats: AdminStats | null;
  clinics: Clinic[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");

  // clinic form
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [savingClinic, setSavingClinic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addClinic(e: React.FormEvent) {
    e.preventDefault();
    setSavingClinic(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("clinics").insert({
      name: clinicName.trim(),
      address: clinicAddress.trim() || null,
      phone: clinicPhone.trim() || null,
    });
    setSavingClinic(false);
    if (error) {
      console.error("clinic insert failed", error);
      setError(t("clinicAddError"));
      return;
    }
    setClinicName("");
    setClinicAddress("");
    setClinicPhone("");
    router.refresh();
  }

  const statCards: Array<[string, string | number]> = stats
    ? [
        [t("stats.patients"), stats.patients],
        [t("stats.dentists"), stats.dentists],
        [t("stats.clinics"), stats.clinics],
        [t("stats.visits"), stats.visits],
        [t("stats.visits30"), stats.visits_last_30d],
        [t("stats.revenuePaid"), formatMoney(stats.revenue_total, locale)],
        [t("stats.revenueOutstanding"), formatMoney(stats.revenue_outstanding, locale)],
        [t("stats.screenings"), stats.ai_screenings],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
        {(["stats", "clinics"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "min-h-touch flex-1 rounded-[10px] px-3 text-sm font-medium transition-colors sm:min-h-0 sm:py-2",
              tab === value ? "bg-primary-600 text-white" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(([label, value]) => (
            <Card key={label} className="text-center">
              <p className="break-words text-base font-bold tabular-nums text-slate-900 sm:text-xl">
                {value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "clinics" && (
        <>
          <Card>
            <CardTitle>{t("addClinic")}</CardTitle>
            <form onSubmit={addClinic} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="clinicName">{t("clinicName")}</Label>
                  <Input
                    id="clinicName"
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clinicAddress">{t("address")}</Label>
                  <Input
                    id="clinicAddress"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="clinicPhone">{t("phone")}</Label>
                  <Input
                    id="clinicPhone"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <Button type="submit" loading={savingClinic}>
                <PlusIcon className="size-4" />
                {t("addClinic")}
              </Button>
            </form>
          </Card>

          {clinics.length === 0 ? (
            <Card className="py-8 text-center text-slate-500">{t("noClinics")}</Card>
          ) : (
            <div className="space-y-2">
              {clinics.map((c) => (
                <Card key={c.id} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <BuildingIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{c.name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {[c.address, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
