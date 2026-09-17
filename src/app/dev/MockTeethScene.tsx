"use client";

import { useState } from "react";
import { TeethSceneView } from "@/components/odontogram/TeethScene";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import { MOCK_CHART_RECORDS } from "./mocks";

/** Та же сцена, что у пациента на дашборде и у врача в карте, — на моках, без входа. */
export function MockTeethScene({ title }: { title?: string }) {
  const [atDate, setAtDate] = useState<string | null>(null);

  return (
    <TeethSceneView
      title={title}
      chart={buildChartState(MOCK_CHART_RECORDS, atDate)}
      recordDates={extractRecordDates(MOCK_CHART_RECORDS)}
      atDate={atDate}
      onAtDateChange={setAtDate}
      loading={false}
      failed={false}
      onRetry={() => undefined}
    />
  );
}
