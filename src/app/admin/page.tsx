import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { must } from "@/lib/supabase/result";
import type { Clinic } from "@/lib/types/database";
import { AdminTabs, type AdminStats } from "@/components/admin/AdminTabs";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [stats, clinics] = await Promise.all([
    must(supabase.rpc("get_admin_stats")),
    must(supabase.from("clinics").select("*").order("name")),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-h2 text-ink md:text-h1">{t("title")}</h1>
      <AdminTabs stats={(stats as AdminStats) ?? null} clinics={clinics as Clinic[]} />
    </div>
  );
}
