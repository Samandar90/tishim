"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/utils";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export interface PatientRow {
  accessId: string;
  patientId: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  grantedAt: string | null;
}

export function PatientList({ patients }: { patients: PatientRow[] }) {
  const t = useTranslations("dentist");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          strokeWidth={1.75}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-11"
          type="search"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Link key={p.accessId} href={`/dentist/patient/${p.patientId}`} className="block">
              <Card className="flex items-center gap-3 transition-shadow hover:shadow-md">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                  {p.fullName.charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{p.fullName}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[
                      p.phone,
                      p.birthDate ? `${formatDate(p.birthDate, locale)} ${t("born")}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary-700">{t("openCard")} →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
