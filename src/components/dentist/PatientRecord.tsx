import { getLocale, getTranslations } from "next-intl/server";
import type { Profile } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { VisitList, type VisitListRow } from "@/components/visit/VisitList";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, SectionTitle } from "@/components/ui/Card";
import { PlusIcon } from "@/components/icons";

/**
 * Карта пациента у врача: шапка с «Новым приёмом», карта зубов, история визитов.
 * Запросов здесь нет, а сцена зубов приходит слотом — так эту же разметку показывает
 * /dev/patient на моках, без входа врачом.
 */
export async function PatientRecordView({
  patient,
  visits,
  scene,
}: {
  patient: Pick<Profile, "id" | "full_name" | "phone" | "birth_date">;
  visits: VisitListRow[];
  scene: React.ReactNode;
}) {
  const t = await getTranslations("dentist");
  const tv = await getTranslations("visits");
  const locale = await getLocale();

  const about = [
    patient.phone,
    patient.birth_date ? `${formatDate(patient.birth_date, locale)} ${t("born")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={patient.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 text-ink md:text-h2">{patient.full_name}</h1>
          {about && <p className="truncate text-small text-muted">{about}</p>}
        </div>
        {/* На телефоне кнопка — своей строкой во всю ширину: рядом с ней от имени
            пациента оставался обрубок в несколько букв */}
        <ButtonLink href={`/dentist/patient/${patient.id}/new-visit`} block className="sm:w-auto">
          <PlusIcon className="size-4" />
          {t("newVisit")}
        </ButtonLink>
      </Card>

      {scene}

      <section>
        <SectionTitle>{t("visitHistory")}</SectionTitle>
        {visits.length === 0 ? (
          <Card className="py-8 text-center text-body text-muted">{tv("empty")}</Card>
        ) : (
          <VisitList visits={visits} hrefBase={`/dentist/patient/${patient.id}/visits`} />
        )}
      </section>
    </div>
  );
}
