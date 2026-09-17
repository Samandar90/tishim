"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ToothRecord } from "@/lib/types/database";
import { buildChartState } from "@/components/odontogram/state";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { ConditionDot } from "@/components/odontogram/ConditionDot";
import { groupVisitRecords } from "./recordGroups";

/** Мини-схема зубов, затронутых за один приём, и список записей под ней. */
export function VisitTeeth({ records }: { records: ToothRecord[] }) {
  const t = useTranslations("visits");
  const tf = useTranslations("newVisit");
  const tc = useTranslations("odontogram.conditions");

  const chart = useMemo(() => buildChartState(records), [records]);
  const teeth = useMemo(
    () => Array.from(new Set(records.map((r) => r.tooth_fdi))),
    [records]
  );
  const { detailed, healthyTeeth } = useMemo(() => groupVisitRecords(records), [records]);

  if (records.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* fitWidth: с xl ряд вписывается в колонку. Цифровизация — все 16 зубов в ряду, и
          без этого им не хватало пары пикселей: внутри карточки появлялась прокрутка. */}
      <Odontogram chart={chart} readOnly compact fitWidth showLegend={false} onlyTeeth={teeth} />

      {/* Столбцы по ширине, а не по числу: в карточке во всю страницу (цифровизация)
          список встаёт в два столбца, в колонке и на телефоне остаётся одним — столбец
          уже 320px обрезал бы названия процедур. Отступы строк — padding, а не margin:
          margin на разрыве столбца браузеры обрезают по-разному. */}
      {detailed.length > 0 && (
        <ul className="columns-xs gap-x-6">
          {detailed.map((r) => {
            const surfaces = r.surfaces.length > 0 ? `(${r.surfaces.join(", ")})` : "";
            const condition = tc(r.condition);
            return (
              <li key={r.id} className="flex break-inside-avoid items-center gap-2 py-1 text-body">
                <ConditionDot condition={r.condition} />
                <span className="shrink-0 font-medium text-ink">{t("toothN", { n: r.tooth_fdi })}</span>
                {/* одна строка на запись: хвост обрезается, целиком он — в подсказке */}
                <span
                  className="min-w-0 truncate text-muted"
                  title={[surfaces, condition, r.procedure].filter(Boolean).join(" · ")}
                >
                  {surfaces && `${surfaces} `}
                  <span className="text-ink">— {condition}</span>
                  {r.procedure && ` · ${r.procedure}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* «Остальные — здоровы» — одной строкой, как в форме приёма: на цифровизации это
          две с лишним дюжины одинаковых записей, за которыми терялось лечение */}
      {healthyTeeth.length > 0 && (
        <div className="flex items-start gap-2 text-body">
          {/* номера переносятся на несколько строк — точка держится у первой */}
          <ConditionDot condition="healthy" className="mt-2" />
          <p className="min-w-0">
            <span className="font-medium text-ink">
              {tf("healthyBulk", { count: healthyTeeth.length })}
            </span>{" "}
            <span className="tabular-nums text-muted">{healthyTeeth.join(", ")}</span>
          </p>
        </div>
      )}
    </div>
  );
}
