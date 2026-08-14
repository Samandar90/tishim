"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ToothCondition } from "@/lib/types/database";
import { ALL_CONDITIONS, CONDITION_COLORS } from "@/lib/constants/teeth";
import { ColorChip } from "@/components/ui/Badge";
import type { ChartState } from "./types";

/**
 * Компактные чипы вместо таблицы. Если карта передана — показываем только
 * состояния, которые на ней реально есть, чтобы не занимать пол-экрана.
 */
export function Legend({ chart, onDark }: { chart?: ChartState; onDark?: boolean }) {
  const t = useTranslations("odontogram.conditions");

  const conditions = useMemo<ToothCondition[]>(() => {
    if (!chart) return ALL_CONDITIONS;
    const present = new Set<ToothCondition>();
    for (const tooth of Object.values(chart)) {
      if (tooth.whole) present.add(tooth.whole.condition);
      if (tooth.root) present.add(tooth.root.condition);
      for (const s of Object.values(tooth.surfaces)) {
        if (s) present.add(s.condition);
      }
    }
    return present.size > 0 ? ALL_CONDITIONS.filter((c) => present.has(c)) : ALL_CONDITIONS;
  }, [chart]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((c) => (
        <ColorChip
          key={c}
          color={CONDITION_COLORS[c]}
          label={t(c)}
          className={onDark ? "bg-white/10 text-slate-200" : undefined}
        />
      ))}
    </div>
  );
}
