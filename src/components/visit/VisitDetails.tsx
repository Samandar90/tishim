import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, ToothRecord, AttachmentKind, VisitType } from "@/lib/types/database";
import { formatDate, formatMoney } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BackLink } from "@/components/ui/BackLink";
import { PaperclipIcon } from "@/components/icons";
import { VisitTeeth } from "./VisitTeeth";
import { needsWideChart } from "./recordGroups";

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

/** Вложение, которое уже можно показать: ссылка подписана. */
export interface VisitAttachment {
  id: string;
  kind: AttachmentKind;
  url: string;
}

const STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

/** Детали визита у пациента и у врача: подписывает вложения, разметка — в VisitDetailsView. */
export async function VisitDetails({ visit, backHref }: { visit: VisitFull; backHref: string }) {
  const supabase = createClient();

  // Бакет вложений приватный: ссылка подписывается на час. Файл, который подписать
  // не удалось, пропускается — иначе в сетке осталась бы пустая ячейка.
  const signed = await Promise.all(
    (visit.attachments ?? []).map(async (a): Promise<VisitAttachment | null> => {
      const { data } = await supabase.storage.from("attachments").createSignedUrl(a.file_url, 3600);
      return data?.signedUrl ? { id: a.id, kind: a.kind, url: data.signedUrl } : null;
    })
  );
  const attachments = signed.filter((a): a is VisitAttachment => a !== null);

  return <VisitDetailsView visit={visit} attachments={attachments} backHref={backHref} />;
}

/** Разметка без запросов — её же показывает /dev/visit на моках, без входа. */
export async function VisitDetailsView({
  visit,
  attachments,
  backHref,
}: {
  visit: VisitFull;
  attachments: VisitAttachment[];
  backHref: string;
}) {
  const t = await getTranslations("visits");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const notes = [
    { label: t("complaint"), value: visit.complaint },
    { label: t("diagnosis"), value: visit.diagnosis },
    { label: t("treatment"), value: visit.treatment },
    { label: t("recommendation"), value: visit.recommendation },
  ].filter((note): note is { label: string; value: string } => Boolean(note.value));

  const doctorLine = [
    visit.dentist?.profile?.full_name,
    visit.dentist?.specialization,
    visit.dentist?.clinic?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  const records = visit.tooth_records ?? [];
  const hasNotes = notes.length > 0 || Boolean(visit.next_visit_date);
  const wideChart = needsWideChart(records);
  // есть ли что класть в левую колонку: схема (если она не ушла наверх) или записи врача
  const hasReading = (records.length > 0 && !wideChart) || hasNotes;
  const discount = Number(visit.discount_percent);

  const teethCard = records.length > 0 && (
    <Card>
      <CardTitle>{t("affectedTeeth")}</CardTitle>
      <VisitTeeth records={records} />
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 md:gap-3">
        <BackLink href={backHref} label={tc("back")} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-h3 text-ink md:text-h2">
            {formatDate(visit.visit_date, locale)}
            <Badge tone={visit.visit_type === "initial_mapping" ? "primary" : "neutral"}>
              {t(`types.${visit.visit_type}`)}
            </Badge>
          </h1>
          {doctorLine && <p className="text-small text-muted">{doctorLine}</p>}
        </div>
        <Badge tone={STATUS_TONE[visit.payment_status]}>{t(`statuses.${visit.payment_status}`)}</Badge>
      </div>

      {/* Цифровизация — 16 зубов в ряду: такой схеме колонки мало, она идёт во всю
          ширину страницы, над колонками. */}
      {wideChart && teethCard}

      {/* С lg две колонки: слева то, что читают (зубы и записи врача), справа сводка —
          деньги и файлы. В одну колонку строки «Стоимость … сумма» разъезжались по
          краям карточки на всю ширину экрана. На телефоне порядок прежний. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {hasReading && (
          <div className="min-w-0 space-y-4 lg:flex-1">
            {!wideChart && teethCard}

            {hasNotes && (
              <Card className="space-y-3">
                {notes.map((note) => (
                  <div key={note.label}>
                    <p className="text-small font-medium uppercase tracking-wide text-muted">
                      {note.label}
                    </p>
                    <p className="whitespace-pre-line text-body text-ink">{note.value}</p>
                  </div>
                ))}
                {visit.next_visit_date && (
                  <div>
                    <p className="text-small font-medium uppercase tracking-wide text-muted">
                      {t("nextVisitDate")}
                    </p>
                    <p className="text-body font-medium text-primary-700">
                      {formatDate(visit.next_visit_date, locale)}
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Без левой колонки сводке незачем жаться в 320px у края: карточки встают в ряд */}
        <div
          className={
            hasReading
              ? "space-y-4 lg:w-80 lg:shrink-0"
              : "grid flex-1 gap-4 md:grid-cols-2 md:items-start lg:gap-6"
          }
        >
          <Card>
            {/* заголовок только в колонке: на телефоне три строки под текстом врача понятны и так */}
            <CardTitle className="hidden lg:block">{t("paymentStatus")}</CardTitle>
            <div className="space-y-1.5 text-body">
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t("price")}</span>
                <span className="tabular-nums text-ink">{formatMoney(visit.subtotal, locale)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-3 text-muted">
                  <span>{t("discount")}</span>
                  <span className="tabular-nums">−{discount}%</span>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                <span>{t("total")}</span>
                <span className="tabular-nums">{formatMoney(visit.total, locale)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>{t("attachments")}</CardTitle>
            {attachments.length === 0 ? (
              <p className="text-body text-muted">{t("noAttachments")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-xl border border-line"
                  >
                    {a.kind === "document" ? (
                      <span className="flex h-28 flex-col items-center justify-center gap-1 text-muted transition-colors group-hover:bg-slate-50">
                        <PaperclipIcon className="size-6" />
                        <span className="text-small">{t(`attachmentKinds.${a.kind}`)}</span>
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
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
