"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Copy, Inbox, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MappingRequest, MappingRequestStatus } from "@/lib/types/database";
import { CLINIC_REQUEST_TAG } from "@/lib/constants/requests";
import { copyText } from "@/lib/clipboard";
import { cn, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_STYLE: Record<MappingRequestStatus, string> = {
  new: "bg-red-50 text-red-700 border-red-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUSES: MappingRequestStatus[] = ["new", "contacted", "scheduled", "done", "cancelled"];

/**
 * Заявки с лендинга — у флагманского врача и у админа. На телефоне лента, с xl —
 * сетка в два столбца: заявка короткая, и во всю ширину экрана имя и статус
 * разъезжались по краям.
 */
export function RequestsTable({ requests }: { requests: MappingRequest[] }) {
  const t = useTranslations("requests");
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [pending, setPending] = useState<{ req: MappingRequest; status: MappingRequestStatus } | null>(
    null
  );
  // Выбранный статус показывается сразу. Список управляется значением из пропсов, и
  // без этого React на время запроса возвращал в нём прежний статус — выглядело так,
  // будто выбор не принят. При ошибке запись отсюда убирается: это и есть откат.
  const [optimistic, setOptimistic] = useState<Record<string, MappingRequestStatus>>({});
  // Заявка, по которой запрос ещё идёт. Ref, а не busyId: эффект ниже не должен
  // срабатывать на конец запроса — он стёр бы запись раньше, чем придут свежие данные.
  const inFlight = useRef<string | null>(null);

  // Свежие данные с сервера — истина: оптимистичные записи больше не нужны. Кроме
  // заявки, по которой запрос ещё идёт, — её обновление в этих данных могло не успеть.
  useEffect(() => {
    setOptimistic((prev) => {
      const id = inFlight.current;
      const next = id !== null && id in prev ? { [id]: prev[id] } : {};
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [requests]);

  const statusOf = (r: MappingRequest) => optimistic[r.id] ?? r.status;
  const newCount = requests.filter((r) => statusOf(r) === "new").length;

  async function applyStatus(id: string, status: MappingRequestStatus) {
    setBusyId(id);
    inFlight.current = id;
    setOptimistic((prev) => ({ ...prev, [id]: status }));
    try {
      const supabase = createClient();
      // select: без него отказ RLS неотличим от успеха — ошибки нет, строк просто ноль
      const { data, error } = await supabase
        .from("mapping_requests")
        .update({ status })
        .eq("id", id)
        .select("id");
      if (error || !data || data.length === 0) {
        console.error("update request status failed", error ?? "no rows updated");
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setToast({ msg: t("statusError"), tone: "error" });
        return;
      }
      setPending(null);
      router.refresh();
    } finally {
      inFlight.current = null;
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

  // На компьютере ссылка tel: никуда не ведёт — номер переносят в телефон или мессенджер
  async function copyPhone(phone: string) {
    const copied = await copyText(phone);
    setToast(
      copied ? { msg: t("phoneCopied"), tone: "success" } : { msg: t("copyError"), tone: "error" }
    );
  }

  if (requests.length === 0) {
    return <EmptyState icon={Inbox} title={t("empty")} />;
  }

  return (
    <div className="space-y-3">
      {newCount > 0 && <Badge tone="danger">{t("newCount", { count: newCount })}</Badge>}

      <ul className="grid gap-2 xl:grid-cols-2 xl:gap-3">
        {requests.map((r) => {
          const status = statusOf(r);
          const isClinic = r.comment?.startsWith(CLINIC_REQUEST_TAG) ?? false;
          const comment = isClinic
            ? r.comment!.slice(CLINIC_REQUEST_TAG.length).trim()
            : r.comment ?? "";

          return (
            <Card as="li" key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 flex-wrap items-center gap-2 text-body font-semibold text-ink">
                  <span className="break-words">{r.full_name}</span>
                  {isClinic && <Badge tone="info">{t("clinicTag")}</Badge>}
                </p>
                {/* ml-auto: с длинным именем статус переносится на свою строку и без него
                    прижимался к левому краю — статус всегда стоит справа */}
                <div className="w-full sm:ml-auto sm:w-40">
                  <Select
                    value={status}
                    disabled={busyId === r.id}
                    onChange={(e) => onStatusChange(r, e.target.value as MappingRequestStatus)}
                    className={cn("border px-2.5 text-small font-medium", STATUS_STYLE[status])}
                    aria-label={t("statusLabel")}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`statuses.${s}`)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
                <span className="flex items-center">
                  <a
                    href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                    className="flex min-h-touch items-center gap-1.5 text-body font-medium text-primary-700 hover:underline"
                  >
                    <Phone className="size-4" strokeWidth={1.75} />
                    {r.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyPhone(r.phone)}
                    aria-label={`${t("copyPhone")}: ${r.phone}`}
                    title={t("copyPhone")}
                    className="flex size-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    <Copy className="size-4" strokeWidth={1.75} />
                  </button>
                </span>
                {r.preferred_date && (
                  <span className="flex items-center gap-1.5 text-muted">
                    <CalendarDays className="size-4" strokeWidth={1.75} />
                    {t("preferredDate")}: {formatDate(r.preferred_date, locale)}
                  </span>
                )}
                <span className="text-muted">
                  {t("createdAt")}: {formatDate(r.created_at, locale)}
                </span>
              </div>

              {comment && (
                <p className="break-words rounded-xl bg-slate-50 px-3 py-2 text-body text-ink">{comment}</p>
              )}
            </Card>
          );
        })}
      </ul>

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
