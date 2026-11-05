"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PaymentStatus } from "@/lib/types/database";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { paidFor } from "./visitDraft";

export interface EditableVisit {
  id: string;
  visit_date: string;
  total: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  next_visit_date: string | null;
  complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendation: string | null;
}

/**
 * Правка сохранённого приёма врачом: статус и сумма оплаты, следующий визит, тексты.
 * Записи по зубам остаются append-only — историю карты менять задним числом нельзя.
 * Колонки, которые здесь меняются, — ровно те, что разрешены грантом из миграции 00013.
 */
export function VisitEditSheet({ visit }: { visit: EditableVisit }) {
  const t = useTranslations("visits");
  const tn = useTranslations("newVisit");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(visit.payment_status);
  const [paid, setPaid] = useState(
    visit.payment_status === "partial" ? String(Number(visit.paid_amount)) : ""
  );
  const [nextDate, setNextDate] = useState(visit.next_visit_date ?? "");
  const [complaint, setComplaint] = useState(visit.complaint ?? "");
  const [diagnosis, setDiagnosis] = useState(visit.diagnosis ?? "");
  const [treatment, setTreatment] = useState(visit.treatment ?? "");
  const [recommendation, setRecommendation] = useState(visit.recommendation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Number(visit.total);
  const paidValue = paidFor(status, total, paid);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (status === "partial" && !(paidValue > 0 && paidValue < total)) {
      setError(tn("paidInvalid"));
      return;
    }
    if (nextDate && nextDate < visit.visit_date) {
      setError(tn("nextDateInvalid"));
      return;
    }
    setError(null);
    setSaving(true);

    // .select("id"): отказ RLS — это не ошибка, а ноль строк, его надо отличать от успеха
    const { data, error: updateError } = await createClient()
      .from("visits")
      .update({
        payment_status: status,
        paid_amount: paidValue,
        next_visit_date: nextDate || null,
        complaint: complaint.trim() || null,
        diagnosis: diagnosis.trim() || null,
        treatment: treatment.trim() || null,
        recommendation: recommendation.trim() || null,
      })
      .eq("id", visit.id)
      .select("id");

    setSaving(false);
    if (updateError || !data?.length) {
      console.error("visit update failed", updateError);
      setError(t("editError"));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        {t("edit")}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("editTitle")}>
        <form onSubmit={save} className="space-y-4">

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-status">{t("paymentStatus")}</Label>
              <Select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              >
                {(["unpaid", "partial", "paid"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
            {status === "partial" && (
              <div>
                <Label htmlFor="edit-paid">{t("paidAmount")}</Label>
                <Input
                  id="edit-paid"
                  type="number"
                  min={0}
                  max={total}
                  step="any"
                  inputMode="numeric"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  placeholder="0"
                />
                <p className="mt-1 text-small text-muted">
                  {t("remaining")}: {formatMoney(Math.max(total - paidValue, 0), locale)}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="edit-next">{t("nextVisitDate")}</Label>
            <Input
              id="edit-next"
              type="date"
              min={visit.visit_date}
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-complaint">{t("complaint")}</Label>
              <Textarea id="edit-complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-diagnosis">{t("diagnosis")}</Label>
              <Textarea id="edit-diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-treatment">{t("treatment")}</Label>
              <Textarea id="edit-treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-recommendation">{t("recommendation")}</Label>
              <Textarea
                id="edit-recommendation"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-body text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" block onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" block loading={saving}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
