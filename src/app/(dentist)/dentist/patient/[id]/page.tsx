import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maybe, must } from "@/lib/supabase/result";
import type { Profile } from "@/lib/types/database";
import { PatientRecordView } from "@/components/dentist/PatientRecord";
import { TeethScene } from "@/components/odontogram/TeethScene";
import { VISIT_LIST_SELECT, type VisitListRow } from "@/components/visit/VisitList";
import { SavedVisitToast } from "@/components/visit/SavedVisitToast";

export default async function DentistPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: профиль читается, только пока у врача есть активный доступ к пациенту
  const patient = await maybe(supabase.from("profiles").select("*").eq("id", id).single());
  if (!patient) notFound();
  const p = patient as Profile;

  const visits = await must(
    supabase
    .from("visits")
    .select(VISIT_LIST_SELECT)
    .eq("patient_id", p.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
  );

  return (
    <>
      <SavedVisitToast />
      <PatientRecordView
        patient={p}
        visits={visits as unknown as VisitListRow[]}
        scene={<TeethScene patientId={p.id} />}
      />
    </>
  );
}
