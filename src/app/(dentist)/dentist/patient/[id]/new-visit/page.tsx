import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings";
import type { Profile } from "@/lib/types/database";
import { NewVisitForm } from "@/components/visit/NewVisitForm";

export default async function NewVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dentist } = await supabase
    .from("dentists")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!dentist) redirect("/dentist");

  // RLS: readable only with active access
  const [{ data: patient }, settings] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    getAppSettings(),
  ]);
  if (!patient) notFound();

  return (
    <NewVisitForm
      patient={patient as Profile}
      dentistId={dentist.id}
      mappingPrice={settings.initialMappingPrice}
    />
  );
}
