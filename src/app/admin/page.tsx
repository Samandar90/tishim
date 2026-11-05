import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { must, mustCount } from "@/lib/supabase/result";
import { getAppSettings } from "@/lib/settings";
import type { Clinic } from "@/lib/types/database";
import { AdminTabs, type AdminStats } from "@/components/admin/AdminTabs";
import { LaunchChecklist } from "@/components/admin/LaunchChecklist";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [stats, clinics, settings, featured, newRequests] = await Promise.all([
    must(supabase.rpc("get_admin_stats")),
    must(supabase.from("clinics").select("*").order("name")),
    getAppSettings(),
    mustCount(supabase.from("dentists").select("id", { count: "exact", head: true }).eq("is_featured", true)),
    mustCount(supabase.from("mapping_requests").select("id", { count: "exact", head: true }).eq("status", "new")),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("homeSubtitle")} />
      {/* Пустая база давала восемь нулей без подсказки, что делать: чек-лист ведёт к экранам, где это чинится */}
      <LaunchChecklist
        featured={featured > 0}
        priceSet={(settings.initialMappingPrice ?? 0) > 0}
        phoneSet={Boolean(settings.contactPhone)}
        clinicSet={(clinics as Clinic[]).length > 0}
        newRequests={newRequests}
      />
      <AdminTabs stats={(stats as AdminStats) ?? null} clinics={clinics as Clinic[]} />
    </div>
  );
}
