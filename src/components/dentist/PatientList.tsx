"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Search, SearchX, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";

export interface PatientRow {
  accessId: string;
  patientId: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  grantedAt: string | null;
}

/**
 * Пациенты врача с поиском по имени и телефону. На телефоне — лента, с lg — сетка
 * в два, с xl — в три столбца: карточка пациента короткая, и во всю ширину экрана
 * имя и «открыть» разъезжались по краям.
 */
export function PatientList({ patients }: { patients: PatientRow[] }) {
  const t = useTranslations("dentist");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return patients;
    return patients.filter(
      (p) => p.fullName.toLowerCase().includes(needle) || (p.phone ?? "").toLowerCase().includes(needle)
    );
  }, [patients, needle]);

  return (
    <div className="space-y-3">
      {/* пока искать не среди кого, поле поиска только сбивает с толку */}
      {patients.length > 0 && (
        <div className="relative lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-11"
            type="search"
          />
        </div>
      )}

      {patients.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} description={t("emptyHint")} />
      ) : filtered.length === 0 ? (
        // Поиск без совпадений — не «пациентов пока нет»: совет про код доступа тут неуместен
        <EmptyState
          icon={SearchX}
          title={t("searchEmpty")}
          description={t("searchEmptyHint", { query: query.trim() })}
          action={
            <Button variant="secondary" onClick={() => setQuery("")}>
              {t("searchReset")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 lg:gap-3 xl:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.accessId}>
              {/* скругление на ссылке — контур фокуса идёт по форме карточки */}
              <Link href={`/dentist/patient/${p.patientId}`} className="block rounded-2xl">
                <Card interactive className="flex items-center gap-3">
                  <Avatar name={p.fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink" title={p.fullName}>
                      {p.fullName}
                    </p>
                    <p className="truncate text-small text-muted">
                      {[p.phone, p.birthDate ? `${formatDate(p.birthDate, locale)} ${t("born")}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {/* Подпись «Открыть карту» забирала треть строки, и на телефоне телефон
                      пациента обрезался. Осталась для скринридера, видимый знак — шеврон.
                      В сетке из трёх столбцов (xl) нет и его: там на счету каждый пиксель
                      строки с телефоном, а кликабельность показывает тень при наведении. */}
                  <span className="sr-only">{t("openCard")}</span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted xl:hidden"
                    strokeWidth={1.75}
                  />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
