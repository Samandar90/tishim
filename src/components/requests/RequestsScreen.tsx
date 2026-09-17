import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { MappingRequest } from "@/lib/types/database";
import { RequestsTable } from "./RequestsTable";

/**
 * Экран заявок — один на флагманского врача и админа: кому какие строки видны,
 * решает RLS. Колонки перечислены явно: служебный client_fingerprint (троттлинг
 * формы лендинга) в браузер не уходит.
 */
export async function RequestsScreen() {
  const supabase = createClient();

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
      <h1 className="text-h2 text-ink md:text-h1">{t("title")}</h1>
      <RequestsTable requests={requests} />
    </div>
  );
}
