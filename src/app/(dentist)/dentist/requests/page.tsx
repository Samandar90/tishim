import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { MappingRequest } from "@/lib/types/database";
import { RequestsTable } from "@/components/requests/RequestsTable";

export default async function DentistRequestsPage() {
  const t = await getTranslations("requests");
  const supabase = createClient();

  // RLS: только admin и featured-врач видят строки
  const { data } = await supabase
    .from("mapping_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
      <RequestsTable requests={(data ?? []) as MappingRequest[]} />
    </div>
  );
}
