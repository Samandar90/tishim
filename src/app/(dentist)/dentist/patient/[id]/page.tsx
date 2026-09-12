import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { TeethScene } from "@/components/odontogram/TeethScene";
import { VisitCard, type VisitListRow } from "@/components/visit/VisitCard";
import { SavedVisitToast } from "@/components/visit/SavedVisitToast";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { PlusIcon } from "@/components/icons";

export default async function DentistPatientPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("dentist");
  const tv = await getTranslations("visits");
  const locale = await getLocale();
  const supabase = createClient();

  // RLS: readable only while access is active
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

  const rows = (visits ?? []) as unknown as VisitListRow[];

  return (
    <div className="space-y-4">
      <SavedVisitToast />
      <Card className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700">
          {p.full_name.charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-slate-900">{p.full_name}</h1>
          <p className="truncate text-sm text-slate-500">
            {[p.phone, p.birth_date ? `${formatDate(p.birth_date, locale)} ${t("born")}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link href={`/dentist/patient/${p.id}/new-visit`}>
          <Button>
            <PlusIcon className="size-4" />
            {t("newVisit")}
          </Button>
        </Link>
      </Card>

      <TeethScene patientId={p.id} />

      <div>
        <CardTitle>{t("visitHistory")}</CardTitle>
        {rows.length === 0 ? (
          <Card className="py-8 text-center text-slate-500">{tv("empty")}</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((v) => (
              <VisitCard key={v.id} visit={v} href={`/dentist/patient/${p.id}/visits/${v.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
