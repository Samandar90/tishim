import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DentistsPanel, type AdminDentistRow } from "@/components/admin/DentistsPanel";

export default async function AdminDentistsPage() {
  const t = await getTranslations("nav");
  const supabase = createClient();

  const [{ data: dentists }, { data: clinics }] = await Promise.all([
    supabase
      .from("dentists")
      .select(
        "id, specialization, license_number, clinic_id, is_featured, experience_years, " +
          "profile:profiles(full_name, phone)"
      )
      .order("created_at"),
    supabase.from("clinics").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-h2 text-ink md:text-h1">{t("dentists")}</h1>
      <DentistsPanel
        dentists={(dentists ?? []) as unknown as AdminDentistRow[]}
        clinics={clinics ?? []}
      />
    </div>
  );
}
