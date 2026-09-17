import { getTranslations } from "next-intl/server";
import type { Clinic } from "@/lib/types/database";
import { DentistProfileSetup, type DentistProfileInitial } from "./DentistProfileSetup";
import { PatientList, type PatientRow } from "./PatientList";

/**
 * Главная кабинета врача: заголовок, профиль (свёрнут, пока заполнен) и пациенты.
 * Запросов здесь нет — эту же разметку показывает /dev/dentist на моках, без входа.
 */
export async function DentistHomeView({
  dentistId,
  userId,
  clinics,
  profile,
  patients,
}: {
  dentistId: string;
  userId: string;
  clinics: Pick<Clinic, "id" | "name">[];
  profile: DentistProfileInitial;
  patients: PatientRow[];
}) {
  const t = await getTranslations("dentist");

  return (
    <div className="space-y-4">
      <h1 className="text-h2 text-ink md:text-h1">{t("patientsTitle")}</h1>
      <DentistProfileSetup dentistId={dentistId} userId={userId} clinics={clinics} initial={profile} />
      <PatientList patients={patients} />
    </div>
  );
}
