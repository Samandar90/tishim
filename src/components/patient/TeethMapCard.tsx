"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { useToothState } from "@/hooks/useToothState";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { HistorySlider } from "@/components/odontogram/HistorySlider";
import { Card, CardTitle } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

/** Карта зубов только для чтения + слайдер истории. Общая для пациента и врача. */
export function TeethMapCard({ patientId, title }: { patientId: string; title?: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [atDate, setAtDate] = useState<string | null>(null);
  const { chart, recordDates, loading, error, refresh } = useToothState(patientId, atDate);

  return (
    <Card>
      <CardTitle>{title ?? t("teethMap")}</CardTitle>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-body text-muted">{t("loadError")}</p>
          <Button variant="secondary" onClick={() => void refresh()}>
            <RotateCw className="size-4" />
            {tc("retry")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Odontogram chart={chart} readOnly />
          <HistorySlider dates={recordDates} value={atDate} onChange={setAtDate} />
        </div>
      )}
    </Card>
  );
}
