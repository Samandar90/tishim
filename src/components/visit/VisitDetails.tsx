import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, ToothRecord, AttachmentKind, VisitType } from "@/lib/types/database";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeftIcon, PaperclipIcon } from "@/components/icons";
import { VisitTeeth } from "./VisitTeeth";

export interface VisitFull {
  id: string;
  visit_date: string;
  visit_type: VisitType;
  complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendation: string | null;
  subtotal: number;
  discount_percent: number;
  total: number;
  payment_status: PaymentStatus;
  next_visit_date: string | null;
  dentist: {
    specialization: string | null;
    profile: { full_name: string } | null;
    clinic: { name: string; address: string | null } | null;
  } | null;
  tooth_records: ToothRecord[];
  attachments: { id: string; file_url: string; kind: AttachmentKind }[];
}

const STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

export async function VisitDetails({ visit, backHref }: { visit: VisitFull; backHref: string }) {
  const t = await getTranslations("visits");
  const locale = await getLocale();
  const supabase = createClient();

  // Signed URLs for private attachments (1 hour)
  const attachments = await Promise.all(
    (visit.attachments ?? []).map(async (a) => {
      const { data } = await supabase.storage
        .from("attachments")
        .createSignedUrl(a.file_url, 3600);
      return { ...a, url: data?.signedUrl ?? null };
    })
  );

  const textBlocks: Array<[string, string | null]> = [
    [t("complaint"), visit.complaint],
    [t("diagnosis"), visit.diagnosis],
    [t("treatment"), visit.treatment],
    [t("recommendation"), visit.recommendation],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
            {formatDate(visit.visit_date, locale)}
            <Badge tone={visit.visit_type === "initial_mapping" ? "primary" : "neutral"}>
              {t(`types.${visit.visit_type}`)}
            </Badge>
          </h1>
          <p className="text-sm text-slate-500">
            {visit.dentist?.profile?.full_name}
            {visit.dentist?.specialization ? ` · ${visit.dentist.specialization}` : ""}
            {visit.dentist?.clinic?.name ? ` · ${visit.dentist.clinic.name}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[visit.payment_status]}>
          {t(`statuses.${visit.payment_status}`)}
        </Badge>
      </div>

      {visit.tooth_records?.length > 0 && (
        <Card>
          <CardTitle>{t("affectedTeeth")}</CardTitle>
          <VisitTeeth records={visit.tooth_records} />
        </Card>
      )}

      <Card className="space-y-3">
        {textBlocks
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="whitespace-pre-line text-sm text-slate-800">{value}</p>
            </div>
          ))}
        {visit.next_visit_date && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("nextVisitDate")}
            </p>
            <p className="text-sm font-medium text-primary-700">
              {formatDate(visit.next_visit_date, locale)}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{t("price")}</span>
            <span className="tabular-nums">{formatMoney(visit.subtotal, locale)}</span>
          </div>
          {Number(visit.discount_percent) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{t("discount")}</span>
              <span className="tabular-nums">−{Number(visit.discount_percent)}%</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-slate-900">
            <span>{t("total")}</span>
            <span className="tabular-nums">{formatMoney(visit.total, locale)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>{t("attachments")}</CardTitle>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noAttachments")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attachments.map((a) =>
              a.url ? (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-slate-200"
                >
                  {a.kind === "document" ? (
                    <span className="flex h-28 flex-col items-center justify-center gap-1 text-slate-500 group-hover:bg-slate-50">
                      <PaperclipIcon className="size-6" />
                      <span className="text-xs">{t(`attachmentKinds.${a.kind}`)}</span>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={t(`attachmentKinds.${a.kind}`)}
                      className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </a>
              ) : null
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
