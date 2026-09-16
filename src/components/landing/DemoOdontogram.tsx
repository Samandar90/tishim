"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Surface } from "@/lib/types/database";
import { Odontogram } from "@/components/odontogram/Odontogram";
import type { ChartState, ToothPart, SurfaceState } from "@/components/odontogram/types";
import { CONDITION_COLORS } from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";

/** Static demo chart shown to anonymous visitors on the landing page. */
export const DEMO_CHART: ChartState = {
  16: { surfaces: { O: { condition: "filling" } } },
  26: { surfaces: { O: { condition: "caries" }, M: { condition: "caries" } } },
  11: { surfaces: { V: { condition: "veneer" } } },
  36: { whole: { condition: "crown" }, surfaces: {} },
  46: { root: { condition: "root_canal" }, surfaces: {} },
  24: { whole: { condition: "implant" }, surfaces: {} },
  47: { whole: { condition: "extracted" }, surfaces: {} },
  33: { root: { condition: "periodontitis" }, surfaces: {} },
};

export function DemoOdontogram({ onDark }: { onDark?: boolean }) {
  const t = useTranslations("landing");
  const tOdo = useTranslations("odontogram");
  const [selected, setSelected] = useState<{ fdi: number; part: ToothPart } | null>(null);

  function stateFor(fdi: number, part: ToothPart): SurfaceState | undefined {
    const tooth = DEMO_CHART[fdi];
    if (!tooth) return undefined;
    if (part === "root") return tooth.root ?? tooth.whole;
    return tooth.surfaces[part as Surface] ?? tooth.whole;
  }

  const selectedState = selected ? stateFor(selected.fdi, selected.part) : undefined;
  const selectedCondition = selectedState?.condition ?? "healthy";

  return (
    <div className="space-y-3">
      <Odontogram
        chart={DEMO_CHART}
        onDark={onDark}
        compact={onDark}
        onSurfaceClick={(fdi, part) => setSelected({ fdi, part })}
        selection={selected ? { [selected.fdi]: [selected.part] } : undefined}
      />
      <div
        className={cn(
          "flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-body",
          onDark ? "bg-white/10 text-slate-200" : "bg-primary-50 text-primary-800"
        )}
      >
        {selected ? (
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-semibold">{t("demoTooth", { n: selected.fdi })}</span>
            <span className={onDark ? "text-slate-400" : "text-primary-600"}>
              {selected.part === "root"
                ? tOdo("surfaces.root")
                : tOdo(`surfaces.${selected.part}`)}
            </span>
            <span
              className="inline-block size-3 rounded-full ring-1 ring-inset ring-black/20"
              style={{ backgroundColor: CONDITION_COLORS[selectedCondition] }}
            />
            <span className="font-semibold">{tOdo(`conditions.${selectedCondition}`)}</span>
          </span>
        ) : (
          <span>{t("demoHint")}</span>
        )}
      </div>
    </div>
  );
}
