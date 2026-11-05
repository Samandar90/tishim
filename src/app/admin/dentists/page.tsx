import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { must } from "@/lib/supabase/result";
import { DentistsPanel, type AdminDentistRow } from "@/components/admin/DentistsPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AdminDentistsPage() {
  const t = await getTranslations("nav");
  const ta = await getTranslations("admin");
  const supabase = await createClient();

  const [dentists, clinics] = await Promise.all([
    must(
      supabase
      .from("dentists")
      .select(
        "id, specialization, license_number, clinic_id, is_featured, experience_years, " +
          "profile:profiles(full_name, phone)"
      )
      .order("created_at")
    ),
    must(supabase.from("clinics").select("id, name").order("name")),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("dentists")} description={ta("featuredHint")} />
      <DentistsPanel
        dentists={dentists as unknown as AdminDentistRow[]}
        clinics={clinics}
      />
    </div>
  );
}
