import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { must } from "@/lib/supabase/result";
import { getSessionProfile } from "@/lib/auth";
import type { AccessStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { AccessCodeCard } from "@/components/access/AccessCodeCard";
import { RevokeAccessButton } from "@/components/access/RevokeAccessButton";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

interface AccessRow {
  id: string;
  status: AccessStatus;
  granted_at: string | null;
  dentist: {
    specialization: string | null;
    profile: { full_name: string } | null;
    clinic: { name: string } | null;
  } | null;
}

const STATUS_TONE: Record<AccessStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  pending: "warning",
  revoked: "neutral",
};

export default async function AccessPage() {
  const session = await getSessionProfile();
  if (!session) return null;

  const t = await getTranslations("access");
  const locale = await getLocale();
  const supabase = await createClient();

  const data = await must(
    supabase
      .from("patient_access")
      .select(
        "id, status, granted_at, dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name))"
      )
      .eq("patient_id", session.profile.id)
      .order("created_at", { ascending: false })
  );

  const rows = data as unknown as AccessRow[];

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AccessCodeCard />

      <Card>
        <CardTitle>{t("myDentists")}</CardTitle>
        {rows.length === 0 ? (
          <p className="text-body text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const name = row.dentist?.profile?.full_name ?? "—";
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body font-medium text-ink">{name}</p>
                      <p className="break-words text-small text-muted">
                        {[row.dentist?.specialization, row.dentist?.clinic?.name]
                          .filter(Boolean)
                          .join(" · ")}
                        {row.granted_at && (
                          <> · {t("grantedAt", { date: formatDate(row.granted_at, locale) })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <Badge tone={STATUS_TONE[row.status]}>{t(`statuses.${row.status}`)}</Badge>
                    {row.status === "active" && (
                      <RevokeAccessButton accessId={row.id} dentistName={name} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
