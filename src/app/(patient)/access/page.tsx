import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { AccessStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { AccessCodeCard } from "@/components/access/AccessCodeCard";
import { RevokeAccessButton } from "@/components/access/RevokeAccessButton";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
  const supabase = createClient();

  const { data } = await supabase
    .from("patient_access")
    .select(
      "id, status, granted_at, dentist:dentists(specialization, profile:profiles(full_name), clinic:clinics(name))"
    )
    .eq("patient_id", session.profile.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as AccessRow[];

  return (
    <div className="space-y-4">
      <AccessCodeCard />

      <Card>
        <CardTitle>{t("myDentists")}</CardTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {row.dentist?.profile?.full_name ?? "—"}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {[row.dentist?.specialization, row.dentist?.clinic?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {row.granted_at && (
                    <p className="text-xs text-slate-400">
                      {t("grantedAt", { date: formatDate(row.granted_at, locale) })}
                    </p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[row.status]}>{t(`statuses.${row.status}`)}</Badge>
                {row.status === "active" && (
                  <RevokeAccessButton
                    accessId={row.id}
                    dentistName={row.dentist?.profile?.full_name ?? "—"}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
