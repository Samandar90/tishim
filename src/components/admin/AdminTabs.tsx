"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/lib/types/database";
import { cn, formatMoney, formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BuildingIcon, PlusIcon, XIcon } from "@/components/icons";

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
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  // ?tab=clinics — из чек-листа готовности на главной
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "clinics" ? "clinics" : "stats");

  // clinic form
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [savingClinic, setSavingClinic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // правка клиники: имя и адрес показываются на лендинге, а исправить их раньше было нельзя
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [draft, setDraft] = useState({ name: "", address: "", phone: "" });
  const [deleting, setDeleting] = useState<Clinic | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(c: Clinic) {
    setEditing(c);
    setDraft({ name: c.name, address: c.address ?? "", phone: c.phone ?? "" });
    setError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const { data, error } = await createClient()
      .from("clinics")
      .update({
        name: draft.name.trim(),
        address: draft.address.trim() || null,
        phone: draft.phone.trim() || null,
      })
      .eq("id", editing.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      console.error("clinic update failed", error);
      setError(t("clinicChangeError"));
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function removeClinic() {
    if (!deleting) return;
    setBusy(true);
    // у врачей этой клиники clinic_id станет null (on delete set null в схеме)
    const { data, error } = await createClient().from("clinics").delete().eq("id", deleting.id).select("id");
    setBusy(false);
    if (error || !data?.length) {
      console.error("clinic delete failed", error);
      setError(t("clinicDeleteError"));
      return;
    }
    setDeleting(null);
    router.refresh();
  }

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
      {/* Сегментный переключатель — как у языка и вида челюсти; на телефоне во всю ширину */}
      <div className="flex rounded-xl border border-line bg-card p-0.5 sm:inline-flex" role="tablist">
        {(["stats", "clinics"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "min-h-touch flex-1 rounded-lg px-4 text-body font-medium transition-colors sm:min-h-0 sm:flex-none sm:py-1.5 sm:text-small",
              tab === value ? "bg-primary-700 text-white" : "text-muted hover:text-ink"
            )}
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        // Одна карточка с сеткой ячеек, как сводка у пациента: восемь отдельных рамок
        // на телефоне превращались в стопку
        <Card flush className="grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="bg-card p-4">
              <p className="text-small text-muted">{label}</p>
              {/* nowrap и кегль поменьше на телефоне: «2 155 000 soʻm» в ячейке 138px рвалось
                  по валюте — браузер переносит строку и после апострофа, и после U+02BB */}
              <p className="mt-1 whitespace-nowrap text-body font-semibold tabular-nums text-ink sm:text-h3">
                {value}
              </p>
            </div>
          ))}
        </Card>
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
                <p className="rounded-xl bg-red-50 px-3 py-2.5 text-body text-danger">{error}</p>
              )}
              <Button type="submit" loading={savingClinic}>
                <PlusIcon className="size-4" />
                {t("addClinic")}
              </Button>
            </form>
          </Card>

          {clinics.length === 0 ? (
            <Card className="py-8 text-center text-body text-muted">{t("noClinics")}</Card>
          ) : (
            <div className="space-y-2">
              {clinics.map((c) =>
                editing?.id === c.id ? (
                  <Card key={c.id}>
                    <form onSubmit={saveEdit} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <Label htmlFor="editClinicName">{t("clinicName")}</Label>
                          <Input
                            id="editClinicName"
                            required
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editClinicAddress">{t("address")}</Label>
                          <Input
                            id="editClinicAddress"
                            value={draft.address}
                            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editClinicPhone">{t("phone")}</Label>
                          <Input
                            id="editClinicPhone"
                            value={draft.phone}
                            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" loading={busy}>
                          {tc("save")}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                          {tc("cancel")}
                        </Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  // На телефоне кнопки своей строкой: рядом с ними название клиники
                  // переносилось по одному слову
                  <Card key={c.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                      <BuildingIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="break-words text-body font-medium text-ink">{c.name}</p>
                      <p className="break-words text-small text-muted">
                        {[c.address, c.phone ? formatUzPhone(c.phone) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                      <Button type="button" variant="ghost" onClick={() => startEdit(c)}>
                        {t("editClinic")}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleting(c)}
                        aria-label={`${tc("delete")}: ${c.name}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-danger"
                      >
                        <XIcon className="size-5" />
                      </button>
                    </div>
                  </Card>
                )
              )}
            </div>
          )}

          <ConfirmDialog
            open={deleting !== null}
            title={t("deleteClinicTitle")}
            description={t("deleteClinicText", { name: deleting?.name ?? "" })}
            confirmLabel={tc("delete")}
            danger
            loading={busy}
            onConfirm={() => void removeClinic()}
            onCancel={() => setDeleting(null)}
          />
        </>
      )}
    </div>
  );
}
