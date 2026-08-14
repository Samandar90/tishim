import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, ClipboardList, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";
import { TeethMapCard } from "@/components/patient/TeethMapCard";
import { MappingRequestForm } from "@/components/landing/MappingRequestForm";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** Компактная карточка статистики: значение крупно, подпись мелко. */
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
    <Card className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-small text-muted">{label}</p>
        <p className={`truncate text-h3 ${valueTone}`}>{value}</p>
        {hint && <p className="truncate text-small text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) return null;
  const { profile } = session;

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { count: recordsCount } = await supabase
    .from("tooth_records")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", profile.id);

  // Пустая карта — приглашение на цифровизацию вместо пустой одонтограммы
  if (!recordsCount) {
    return (
      <div className="space-y-6">
        <h1 className="text-h1 text-ink">
          {t("greeting", { name: profile.full_name.split(" ")[0] || profile.full_name })}
        </h1>
        <EmptyState
          icon={ClipboardList}
          title={t("emptyTitle")}
          description={t("emptyText")}
          className="mx-auto max-w-xl"
        />
        <Card className="mx-auto max-w-xl p-5 md:p-6">
          <MappingRequestForm
            defaultName={profile.full_name}
            defaultPhone={profile.phone ?? ""}
            showClinicOption={false}
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
    supabase.from("visits").select("total, payment_status").eq("patient_id", profile.id),
  ]);

  const nextVisit = upcoming?.[0] as
    | { next_visit_date: string; dentist: { profile: { full_name: string } | null } | null }
    | undefined;

  const rows = visits ?? [];
  const debt = rows
    .filter((v) => v.payment_status !== "paid")
    .reduce((sum, v) => sum + Number(v.total), 0);
  const spent = rows
    .filter((v) => v.payment_status === "paid")
    .reduce((sum, v) => sum + Number(v.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">
          {t("greeting", { name: profile.full_name.split(" ")[0] || profile.full_name })}
        </h1>
        <Link
          href="/visits"
          className="flex min-h-touch items-center text-body font-medium text-primary-700 hover:text-primary-800"
        >
          {t("allVisits")} →
        </Link>
      </div>

      {/* карта зубов — главный элемент экрана */}
      <TeethMapCard patientId={profile.id} />

      {/* компактная строка статистики */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          tone={debt > 0 ? "warning" : "success"}
        />
        <Stat
          icon={ClipboardList}
          label={t("visitsCount")}
          value={String(rows.length)}
          hint={t("spentTotal", { amount: formatMoney(spent, locale) })}
        />
      </div>
    </div>
  );
}
