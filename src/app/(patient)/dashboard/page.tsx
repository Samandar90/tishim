import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ClipboardList, KeyRound, Phone, Stethoscope, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mustCount } from "@/lib/supabase/result";
import { getSessionProfile } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { cn, firstName, formatDate, formatMoney } from "@/lib/utils";
import { TeethScene } from "@/components/odontogram/TeethScene";
import { MappingRequestForm } from "@/components/landing/MappingRequestForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Ячейка сводки: значение крупно, подпись мелко. Три ячейки живут в одной карточке с
 * разделителями — три отдельные карточки на телефоне превращались в стопку рамок.
 */
function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const valueTone =
    tone === "warning" ? "text-amber-700" : tone === "success" ? "text-emerald-700" : "text-ink";

  return (
    <Link
      href="/visits"
      className="flex items-start gap-3 p-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50 sm:first:rounded-l-2xl sm:first:rounded-tr-none sm:last:rounded-r-2xl sm:last:rounded-bl-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-small text-muted">{label}</span>
        <span className={cn("block truncate text-h3", valueTone)}>{value}</span>
        {hint && <span className="block truncate text-small text-muted">{hint}</span>}
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) return null;
  const { profile } = session;

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const greeting = t("greeting", { name: firstName(profile.full_name) || profile.full_name });

  const recordsCount = await mustCount(
    supabase
      .from("tooth_records")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", profile.id)
  );

  // Пустая карта — приглашение на цифровизацию вместо пустой одонтограммы. Раньше
  // пациент не понимал, что делать дальше, а отправленная заявка «забывалась» при
  // следующем входе — теперь шаги написаны прямо, а форма помнит отправку.
  if (!recordsCount) {
    const settings = await getAppSettings();
    const steps = [
      { icon: Phone, text: t("nextStep1") },
      { icon: KeyRound, text: t("nextStep2") },
      { icon: Stethoscope, text: t("nextStep3") },
    ];
    return (
      <div className="space-y-6">
        <PageHeader title={greeting} />
        <EmptyState
          icon={ClipboardList}
          title={t("emptyTitle")}
          description={t("emptyText")}
          className="mx-auto max-w-xl"
        />
        <Card className="mx-auto max-w-xl">
          <CardTitle>{t("nextStepsTitle")}</CardTitle>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-body text-ink">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <s.icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="pt-1.5">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-body">
            <Link href="/access" className="min-h-touch inline-flex items-center font-medium text-primary-700 hover:text-primary-800">
              {t("nextStepsAccess")} →
            </Link>
            {settings.contactPhone && (
              <a
                href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                className="min-h-touch inline-flex items-center font-medium text-primary-700 hover:text-primary-800"
              >
                {settings.contactPhone}
              </a>
            )}
          </div>
        </Card>
        <Card className="mx-auto max-w-xl p-5 md:p-6">
          <MappingRequestForm
            defaultName={profile.full_name}
            defaultPhone={profile.phone ?? ""}
            showClinicOption={false}
            persistKey="tishim:mapping-request-sent"
          />
        </Card>
      </div>
    );
  }

  const [{ data: upcoming }, { data: visits }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, next_visit_date, dentist:dentists(profile:profiles(full_name))")
      .eq("patient_id", profile.id)
      .gte("next_visit_date", today)
      .order("next_visit_date", { ascending: true })
      .limit(1),
    supabase
      .from("visits")
      .select("visit_date, total, payment_status, paid_amount")
      .eq("patient_id", profile.id),
  ]);

  const nextVisit = upcoming?.[0] as
    | { next_visit_date: string; dentist: { profile: { full_name: string } | null } | null }
    | undefined;

  const rows = visits ?? [];
  // Долг — остаток по каждому визиту: частично оплаченный раньше считался неоплаченным целиком
  const debt = rows.reduce(
    (sum, v) => sum + Math.max(Number(v.total) - Number(v.paid_amount ?? 0), 0),
    0
  );
  const spent = rows.reduce((sum, v) => sum + Number(v.paid_amount ?? 0), 0);
  const partialCount = rows.filter((v) => v.payment_status === "partial").length;
  const lastVisitDate = rows.map((v) => v.visit_date as string).sort().at(-1);
  const subtitle = nextVisit
    ? t("nextVisitAt", { date: formatDate(nextVisit.next_visit_date, locale) })
    : lastVisitDate
      ? t("lastVisit", { date: formatDate(lastVisitDate, locale) })
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        description={subtitle}
        action={
          <ButtonLink href="/visits" variant="secondary">
            <CalendarDays className="size-4" strokeWidth={1.75} />
            {t("allVisits")}
          </ButtonLink>
        }
      />

      {/* карта зубов — главный элемент экрана: на телефоне во всю ширину */}
      <TeethScene patientId={profile.id} />

      <Card flush className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat
          icon={CalendarDays}
          label={t("nextVisit")}
          value={nextVisit ? formatDate(nextVisit.next_visit_date, locale) : t("noUpcoming")}
          hint={nextVisit?.dentist?.profile?.full_name ?? undefined}
        />
        <Stat
          icon={Wallet}
          label={t("debt")}
          value={debt > 0 ? formatMoney(debt, locale) : t("noDebt")}
          hint={partialCount > 0 ? t("partialHint", { count: partialCount }) : undefined}
          tone={debt > 0 ? "warning" : "success"}
        />
        <Stat
          icon={ClipboardList}
          label={t("visitsCount")}
          value={String(rows.length)}
          hint={t("spentTotal", { amount: formatMoney(spent, locale) })}
        />
      </Card>
    </div>
  );
}
