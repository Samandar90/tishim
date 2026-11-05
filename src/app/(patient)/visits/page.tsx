import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { must } from "@/lib/supabase/result";
import { getSessionProfile } from "@/lib/auth";
import { VISIT_LIST_SELECT, VisitList, type VisitListRow } from "@/components/visit/VisitList";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function VisitsPage() {
  const session = await getSessionProfile();
  if (!session) return null;

  const t = await getTranslations("visits");
  const supabase = await createClient();

  const visits = await must(
    supabase
    .from("visits")
    .select(VISIT_LIST_SELECT)
    .eq("patient_id", session.profile.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
  );

  const rows = visits as unknown as VisitListRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={rows.length > 0 ? t("countLabel", { count: rows.length }) : undefined}
      />

      {rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("empty")} />
      ) : (
        <VisitList visits={rows} hrefBase="/visits" />
      )}
    </div>
  );
}
