import { getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";
import type { Clinic } from "@/lib/types/database";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        title={t("patientsTitle")}
        description={patients.length > 0 ? t("patientsCount", { count: patients.length }) : undefined}
        action={
          // Новый пациент появляется только через код: кнопка ведёт туда прямо с главной
          <ButtonLink href="/dentist/access" variant="secondary">
            <KeyRound className="size-4" strokeWidth={1.75} />
            {t("enterCode")}
          </ButtonLink>
        }
      />
      <DentistProfileSetup dentistId={dentistId} userId={userId} clinics={clinics} initial={profile} />
      <PatientList patients={patients} />
    </div>
  );
}
