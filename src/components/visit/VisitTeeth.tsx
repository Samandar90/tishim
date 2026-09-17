"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ToothRecord } from "@/lib/types/database";
import { buildChartState } from "@/components/odontogram/state";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { CONDITION_COLORS } from "@/lib/constants/teeth";

/** Mini odontogram of the teeth affected in one visit + record list. */
export function VisitTeeth({ records }: { records: ToothRecord[] }) {
  const t = useTranslations("visits");
  const tc = useTranslations("odontogram.conditions");

  const chart = useMemo(() => buildChartState(records), [records]);
  const teeth = useMemo(
    () => Array.from(new Set(records.map((r) => r.tooth_fdi))),
    [records]
  );

  if (records.length === 0) return null;

  return (
    <div className="space-y-3">
      <Odontogram chart={chart} readOnly compact showLegend={false} onlyTeeth={teeth} />
      <ul className="space-y-1.5">
        {records.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block size-3.5 shrink-0 rounded-[4px] border border-slate-300"
              style={{ backgroundColor: CONDITION_COLORS[r.condition] }}
            />
            <span className="font-medium text-slate-800">{t("toothN", { n: r.tooth_fdi })}</span>
            {r.surfaces.length > 0 && (
              <span className="text-slate-500">({r.surfaces.join(", ")})</span>
            )}
            <span className="text-slate-600">— {tc(r.condition)}</span>
            {r.procedure && <span className="truncate text-slate-500">· {r.procedure}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
