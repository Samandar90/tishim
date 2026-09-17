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
 * Список визитов — у пациента и в карте пациента у врача. До xl это лента карточек.
 * С xl — одна карточка со строками: растянутая на всю ширину карточка разносила дату
 * и сумму по краям экрана, а историю из десятка визитов приходилось листать.
 */
export function VisitList({ visits, hrefBase }: { visits: VisitListRow[]; hrefBase: string }) {
  return (
    <div className="space-y-3 xl:space-y-0 xl:divide-y xl:divide-line xl:rounded-2xl xl:border xl:border-line xl:bg-card xl:shadow-card">
      {visits.map((v) => (
        <VisitCard key={v.id} visit={v} href={`${hrefBase}/${v.id}`} />
      ))}
    </div>
  );
}

/**
 * Иерархия: дата и врач крупно, диагноз обычным текстом, цена справа выделена,
 * статус оплаты — цветной бейдж. Разметка одна на оба вида: с xl блоки карточки
 * встают в строку — дата, врач с диагнозом, вложения, сумма, статус, — а рамку и
 * тень даёт общий контейнер VisitList.
 */
async function VisitCard({ visit, href }: { visit: VisitListRow; href: string }) {
  const t = await getTranslations("visits");
  const locale = await getLocale();
  const attachmentsCount = visit.attachments?.[0]?.count ?? 0;
  const discount = Number(visit.discount_percent);

  return (
    // Скругление на ссылке — чтобы контур фокуса шёл по форме карточки. В строках
    // скруглены только крайние: они повторяют углы контейнера.
    <Link
      href={href}
      className="block rounded-2xl transition-colors xl:rounded-none xl:first:rounded-t-2xl xl:last:rounded-b-2xl xl:hover:bg-slate-50"
    >
      <Card
        interactive
        className="xl:rounded-none xl:border-0 xl:bg-transparent xl:py-3 xl:shadow-none xl:hover:shadow-none"
      >
        <div className="flex items-start justify-between gap-4 xl:items-center xl:gap-6">
          <div className="min-w-0 flex-1 xl:flex xl:items-center xl:gap-6">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 xl:mb-0 xl:w-44 xl:shrink-0">
              <span className="text-h3 text-ink xl:text-body">
                {formatDate(visit.visit_date, locale)}
              </span>
              {visit.visit_type === "initial_mapping" && (
                <Badge tone="primary">{t("types.initial_mapping")}</Badge>
              )}
            </div>

            <div className="min-w-0 xl:flex-1">
              <p className="truncate text-body text-muted">
                {visit.dentist?.profile?.full_name ?? "—"}
                {visit.dentist?.clinic?.name ? ` · ${visit.dentist.clinic.name}` : ""}
              </p>

              {visit.diagnosis && (
                <p className="mt-2 line-clamp-2 text-body text-ink xl:mt-0 xl:line-clamp-1">
                  {visit.diagnosis}
                </p>
              )}
            </div>

            {attachmentsCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-small text-muted xl:mt-0 xl:shrink-0">
                <Paperclip className="size-4" strokeWidth={1.75} />
                {attachmentsCount}
              </p>
            )}
          </div>

          {/* цена и статус — правая колонка; в строке у них фиксированная ширина,
              чтобы суммы и бейджи стояли друг под другом */}
          <div className="flex shrink-0 flex-col items-end gap-2 xl:flex-row xl:items-center xl:gap-4">
            <div className="flex flex-col items-end gap-2 xl:w-36 xl:gap-0">
              <span className="text-h3 tabular-nums text-ink xl:text-body">
                {formatMoney(visit.total, locale)}
              </span>
              {discount > 0 && (
                <span className="text-small text-muted">
                  {t("discount")} −{discount}%
                </span>
              )}
            </div>
            <span className="flex justify-end xl:w-28">
              <Badge tone={STATUS_TONE[visit.payment_status]}>
                {t(`statuses.${visit.payment_status}`)}
              </Badge>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
