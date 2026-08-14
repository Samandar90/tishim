import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { VisitDetails, type VisitFull } from "@/components/visit/VisitDetails";

export default async function VisitDetailsPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session) return null;

  const supabase = createClient();
  const { data: visit } = await supabase
    .from("visits")
    .select(
      "*, dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name, address)), " +
        "tooth_records(*), attachments(id, file_url, kind)"
    )
    .eq("id", params.id)
    .eq("patient_id", session.profile.id)
    .single();

  if (!visit) notFound();

  return <VisitDetails visit={visit as unknown as VisitFull} backHref="/visits" />;
}
