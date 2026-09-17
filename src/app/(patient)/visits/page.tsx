import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { VisitCard, type VisitListRow } from "@/components/visit/VisitCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function VisitsPage() {
  const session = await getSessionProfile();
  if (!session) return null;

  const t = await getTranslations("visits");
  const supabase = createClient();

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, visit_date, visit_type, diagnosis, treatment, subtotal, discount_percent, total, payment_status, " +
        "dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name)), " +
        "attachments(count)"
    )
    .eq("patient_id", session.profile.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (visits ?? []) as unknown as VisitListRow[];

  return (
    <div className="space-y-5">
      <h1 className="text-h1 text-ink">{t("title")}</h1>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {rows.map((v) => (
            <VisitCard key={v.id} visit={v} href={`/visits/${v.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
