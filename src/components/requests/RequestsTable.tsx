"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { MappingRequest, MappingRequestStatus } from "@/lib/types/database";
import { CLINIC_REQUEST_TAG } from "@/lib/constants/requests";
import { cn, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays, Inbox, Phone } from "lucide-react";

const STATUS_STYLE: Record<MappingRequestStatus, string> = {
  new: "bg-red-50 text-red-700 border-red-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUSES: MappingRequestStatus[] = ["new", "contacted", "scheduled", "done", "cancelled"];

export function RequestsTable({ requests }: { requests: MappingRequest[] }) {
  const t = useTranslations("requests");
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [pending, setPending] = useState<{ req: MappingRequest; status: MappingRequestStatus } | null>(
    null
  );

  async function applyStatus(id: string, status: MappingRequestStatus) {
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("mapping_requests").update({ status }).eq("id", id);
      if (error) {
        console.error("update request status failed", error);
        setToast({ msg: t("statusError"), tone: "error" });
        return;
      }
      setPending(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function onStatusChange(req: MappingRequest, status: MappingRequestStatus) {
    // «Отменена» — необратимо для заявителя, спрашиваем подтверждение
    if (status === "cancelled") {
      setPending({ req, status });
      return;
    }
    void applyStatus(req.id, status);
  }

  if (requests.length === 0) {
    return <EmptyState icon={Inbox} title={t("empty")} />;
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => {
        const isClinic = r.comment?.startsWith(CLINIC_REQUEST_TAG) ?? false;
        const comment = isClinic
          ? r.comment!.slice(CLINIC_REQUEST_TAG.length).trim()
          : r.comment ?? "";

        return (
          <Card key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                <span className="break-words">{r.full_name}</span>
                {isClinic && <Badge tone="info">{t("clinicTag")}</Badge>}
              </p>
              <Select
                value={r.status}
                disabled={busyId === r.id}
                onChange={(e) => onStatusChange(r, e.target.value as MappingRequestStatus)}
                className={cn(
                  "w-full border px-2.5 text-sm font-medium sm:w-40",
                  STATUS_STYLE[r.status]
                )}
                aria-label={t("statusLabel")}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a
                href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                className="flex min-h-touch items-center gap-1.5 font-medium text-primary-700 hover:underline"
              >
                <Phone className="size-4" strokeWidth={1.75} />
                {r.phone}
              </a>
              {r.preferred_date && (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <CalendarDays className="size-4 text-muted" strokeWidth={1.75} />
                  {t("preferredDate")}: {formatDate(r.preferred_date, locale)}
                </span>
              )}
              <span className="text-xs text-slate-500">
                {t("createdAt")}: {formatDate(r.created_at, locale)}
              </span>
            </div>

            {comment && (
              <p className="break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {comment}
              </p>
            )}
          </Card>
        );
      })}

      <ConfirmDialog
        open={pending !== null}
        title={t("cancelConfirmTitle")}
        description={t("cancelConfirmText", { name: pending?.req.full_name ?? "" })}
        confirmLabel={t("statuses.cancelled")}
        danger
        loading={busyId !== null}
        onConfirm={() => pending && applyStatus(pending.req.id, pending.status)}
        onCancel={() => setPending(null)}
      />

      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDismiss={() => setToast(null)} />
    </div>
  );
}
