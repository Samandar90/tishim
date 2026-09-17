"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { TeethSceneView } from "@/components/odontogram/TeethScene";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import { NewVisitForm } from "@/components/visit/NewVisitForm";
import type { Profile } from "@/lib/types/database";
import { Card, CardTitle } from "@/components/ui/Card";
import { MOCK_CHART_RECORDS as MOCK } from "../mocks";

/**
 * Dev-only static preview of the odontogram on mock data.
 * Unreachable in production (middleware + notFound guard).
 */

// Форма приёма на выдуманном пациенте: история под анонимом не загрузится (RLS),
// сохранить нельзя — страница только для просмотра шагов и превью без входа врачом.
const MOCK_PATIENT = { id: "00000000-0000-0000-0000-000000000000", full_name: "Демо Пациент" } as Profile;

export default function OdontogramDevPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const [atDate, setAtDate] = useState<string | null>(null);
  const dates = extractRecordDates(MOCK);
  const chart = buildChartState(MOCK, atDate);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {/* та же сцена, что у пациента на дашборде и у врача в карте, — на моках, без входа */}
      <TeethSceneView
        title="Карта (моки)"
        chart={chart}
        recordDates={dates}
        atDate={atDate}
        onAtDateChange={setAtDate}
        loading={false}
        failed={false}
        onRetry={() => undefined}
      />
      <Card>
        <CardTitle>Форма приёма (мок-пациент)</CardTitle>
        <NewVisitForm patient={MOCK_PATIENT} dentistId="demo" mappingPrice={150000} />
      </Card>
      <Card>
        <CardTitle>Схема для формы приёма (2D)</CardTitle>
        <Odontogram chart={chart} onSurfaceClick={(fdi, part) => alert(`${fdi} · ${part}`)} />
      </Card>
      <Card>
        <CardTitle>Mini (visit view)</CardTitle>
        <Odontogram
          chart={chart}
          readOnly
          compact
          showLegend={false}
          onlyTeeth={[16, 26, 36, 11, 47, 24]}
        />
      </Card>
    </div>
  );
}
