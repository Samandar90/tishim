import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { PatientRecordView } from "@/components/dentist/PatientRecord";
import { TeethScene } from "@/components/odontogram/TeethScene";
import type { VisitListRow } from "@/components/visit/VisitList";
import { SavedVisitToast } from "@/components/visit/SavedVisitToast";

export default async function DentistPatientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // RLS: профиль читается, только пока у врача есть активный доступ к пациенту
  const { data: patient } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!patient) notFound();
  const p = patient as Profile;

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, visit_date, visit_type, diagnosis, treatment, subtotal, discount_percent, total, payment_status, " +
        "dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name)), " +
        "attachments(count)"
    )
    .eq("patient_id", p.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <>
      <SavedVisitToast />
      <PatientRecordView
        patient={p}
        visits={(visits ?? []) as unknown as VisitListRow[]}
        scene={<TeethScene patientId={p.id} />}
      />
    </>
  );
}
