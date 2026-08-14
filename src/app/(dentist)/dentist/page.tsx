import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { DentistProfileSetup } from "@/components/dentist/DentistProfileSetup";
import { PatientList, type PatientRow } from "@/components/dentist/PatientList";

export default async function DentistHomePage() {
  const session = await getSessionProfile();
  if (!session) return null;

  const t = await getTranslations("dentist");
  const supabase = createClient();

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id, specialization, license_number, clinic_id, bio, photo_url, experience_years")
    .eq("profile_id", session.profile.id)
    .single();

  if (!dentist) return null;

  const [{ data: clinics }, { data: accesses }] = await Promise.all([
    supabase.from("clinics").select("id, name").order("name"),
    supabase
      .from("patient_access")
      .select("id, granted_at, patient:profiles(id, full_name, phone, birth_date)")
      .eq("dentist_id", dentist.id)
      .eq("status", "active")
      .order("granted_at", { ascending: false }),
  ]);

  const patients: PatientRow[] = ((accesses ?? []) as unknown as Array<{
    id: string;
    granted_at: string | null;
    patient: { id: string; full_name: string; phone: string | null; birth_date: string | null } | null;
  }>)
    .filter((a) => a.patient)
    .map((a) => ({
      accessId: a.id,
      patientId: a.patient!.id,
      fullName: a.patient!.full_name,
      phone: a.patient!.phone,
      birthDate: a.patient!.birth_date,
      grantedAt: a.granted_at,
    }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t("patientsTitle")}</h1>

      <DentistProfileSetup
        dentistId={dentist.id}
        userId={session.user.id}
        clinics={clinics ?? []}
        initial={dentist}
      />

      <PatientList patients={patients} />
    </div>
  );
}
