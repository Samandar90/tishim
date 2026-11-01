import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { maybe } from "@/lib/supabase/result";
import { getSessionProfile } from "@/lib/auth";
import { VisitDetails, type VisitFull } from "@/components/visit/VisitDetails";

export default async function VisitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionProfile();
  if (!session) return null;

  const { id } = await params;
  const supabase = await createClient();
  const visit = await maybe(
    supabase
      .from("visits")
      .select(
        "*, dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name, address)), " +
          "tooth_records(*), attachments(id, file_url, kind)"
      )
      .eq("id", id)
      .eq("patient_id", session.profile.id)
      .single()
  );

  if (!visit) notFound();

  return <VisitDetails visit={visit as unknown as VisitFull} backHref="/visits" />;
}
