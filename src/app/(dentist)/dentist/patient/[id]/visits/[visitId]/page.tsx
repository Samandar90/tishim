import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maybe } from "@/lib/supabase/result";
import { VisitDetails, type VisitFull } from "@/components/visit/VisitDetails";

export default async function DentistVisitDetailsPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  const supabase = await createClient();

  const visit = await maybe(
    supabase
      .from("visits")
      .select(
        "*, dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name, address)), " +
          "tooth_records(*), attachments(id, file_url, kind)"
      )
      .eq("id", visitId)
      .eq("patient_id", id)
      .single()
  );

  if (!visit) notFound();

  return <VisitDetails visit={visit as unknown as VisitFull} backHref={`/dentist/patient/${id}`} />;
}
