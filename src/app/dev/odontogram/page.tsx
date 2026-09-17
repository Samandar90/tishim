"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { HistorySlider } from "@/components/odontogram/HistorySlider";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import type { ToothRecord } from "@/lib/types/database";
import { Card, CardTitle } from "@/components/ui/Card";

/**
 * Dev-only static preview of the odontogram on mock data.
 * Unreachable in production (middleware + notFound guard).
 */

let seq = 0;
function rec(
  daysAgo: number,
  tooth: number,
  condition: ToothRecord["condition"],
  surfaces: ToothRecord["surfaces"] = [],
  procedure = "",
  price = 0
): ToothRecord {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: String(++seq),
    visit_id: "v" + daysAgo,
    patient_id: "demo",
    tooth_fdi: tooth,
    surfaces,
    condition,
    procedure,
    note: null,
    price,
    created_at: d.toISOString(),
  };
}

const MOCK: ToothRecord[] = [
  // a year ago: lots of caries
  rec(365, 16, "caries", ["O"]),
  rec(365, 26, "caries", ["O", "M"]),
  rec(365, 36, "pulpitis"),
  rec(365, 11, "caries", ["V"]),
  rec(365, 47, "caries", ["O", "D"]),
  // 6 months ago: treatment
  rec(180, 16, "filling", ["O"], "Пломба", 300000),
  rec(180, 26, "filling", ["O", "M"], "Пломба", 350000),
  rec(180, 36, "root_canal", [], "Эндодонтия", 800000),
  rec(180, 11, "veneer", ["V"], "Винир", 1200000),
  // 2 months ago: prosthetics + extraction
  rec(60, 36, "crown", [], "Коронка", 1500000),
  rec(60, 47, "extracted", [], "Удаление", 400000),
  rec(60, 18, "missing"),
  rec(60, 24, "implant", [], "Имплантация", 5000000),
  rec(60, 33, "periodontitis"),
];

export default function OdontogramDevPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const [atDate, setAtDate] = useState<string | null>(null);
  const dates = extractRecordDates(MOCK);
  const chart = buildChartState(MOCK, atDate);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Card>
        <CardTitle>Odontogram — dev preview (mock data)</CardTitle>
        <div className="space-y-3">
          <Odontogram
            chart={chart}
            onSurfaceClick={(fdi, part) => alert(`${fdi} · ${part}`)}
          />
          <HistorySlider dates={dates} value={atDate} onChange={setAtDate} />
        </div>
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
