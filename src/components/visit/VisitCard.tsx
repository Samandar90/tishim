import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Paperclip } from "lucide-react";
import type { PaymentStatus, VisitType } from "@/lib/types/database";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface VisitListRow {
  id: string;
  visit_date: string;
  visit_type: VisitType;
  diagnosis: string | null;
  treatment: string | null;
  subtotal: number;
  discount_percent: number;
  total: number;
  payment_status: PaymentStatus;
  dentist: {
    specialization: string | null;
    profile: { full_name: string } | null;
    clinic: { name: string } | null;
  } | null;
  attachments: { count: number }[];
}

const STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

/**
 * Иерархия: дата и врач крупно, диагноз обычным текстом,
 * цена справа выделена, статус оплаты — цветной бейдж.
 */
export async function VisitCard({ visit, href }: { visit: VisitListRow; href: string }) {
  const t = await getTranslations("visits");
  const locale = await getLocale();
  const attachmentsCount = visit.attachments?.[0]?.count ?? 0;

  return (
    <Link href={href} className="block focus-visible:outline-none">
      <Card interactive>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-h3 text-ink">{formatDate(visit.visit_date, locale)}</span>
              {visit.visit_type === "initial_mapping" && (
                <Badge tone="primary">{t("types.initial_mapping")}</Badge>
              )}
            </div>

            <p className="truncate text-body text-muted">
              {visit.dentist?.profile?.full_name ?? "—"}
              {visit.dentist?.clinic?.name ? ` · ${visit.dentist.clinic.name}` : ""}
            </p>

            {visit.diagnosis && (
              <p className="mt-2 line-clamp-2 text-body text-ink">{visit.diagnosis}</p>
            )}

            {attachmentsCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-small text-muted">
                <Paperclip className="size-4" strokeWidth={1.75} />
                {attachmentsCount}
              </p>
            )}
          </div>

          {/* цена и статус — правая колонка */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-h3 tabular-nums text-ink">
              {formatMoney(visit.total, locale)}
            </span>
            {Number(visit.discount_percent) > 0 && (
              <span className="text-small text-muted">
                {t("discount")} −{Number(visit.discount_percent)}%
              </span>
            )}
            <Badge tone={STATUS_TONE[visit.payment_status]}>
              {t(`statuses.${visit.payment_status}`)}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
