import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { MappingRequest } from "@/lib/types/database";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestsTable } from "./RequestsTable";

/**
 * Экран заявок — один на флагманского врача и админа: кому какие строки видны,
 * решает RLS. Колонки перечислены явно: служебный client_fingerprint (троттлинг
 * формы лендинга) в браузер не уходит.
 */
export async function RequestsScreen() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("mapping_requests")
    .select("id, full_name, phone, preferred_date, comment, status, created_at")
    .order("created_at", { ascending: false });

  return <RequestsView requests={(data ?? []) as MappingRequest[]} />;
}

/** Разметка без запросов — её же показывает /dev/requests на моках, без входа. */
export async function RequestsView({ requests }: { requests: MappingRequest[] }) {
  const t = await getTranslations("requests");

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <RequestsTable requests={requests} />
    </div>
  );
}
