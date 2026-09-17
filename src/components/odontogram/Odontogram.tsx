"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Surface } from "@/lib/types/database";
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
} from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";
import { ConditionDot } from "./ConditionDot";
import { Tooth } from "./Tooth";
import { Legend } from "./Legend";
import type { ChartState, ToothPart } from "./types";

export type Dentition = "permanent" | "primary";

export interface OdontogramProps {
  chart: ChartState;
  readOnly?: boolean;
  onSurfaceClick?: (fdi: number, part: ToothPart) => void;
  selection?: Partial<Record<number, ToothPart[]>>;
  showLegend?: boolean;
  /** Уменьшенный вариант для встраивания (карточка визита). */
  compact?: boolean;
  /** Показать только эти зубы. */
  onlyTeeth?: number[];
  /** Тёмная подложка (hero лендинга). */
  onDark?: boolean;
  /** С xl ряд вписывается в ширину контейнера вместо прокрутки — колонки формы приёма и деталей визита. */
  fitWidth?: boolean;
}

export function Odontogram({
  chart,
  readOnly,
  onSurfaceClick,
  selection,
  showLegend = true,
  compact,
  onlyTeeth,
  onDark,
  fitWidth,
}: OdontogramProps) {
  const t = useTranslations("odontogram");
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [hovered, setHovered] = useState<{ fdi: number; part: ToothPart } | null>(null);

  const partLabels = useMemo(
    () => ({
      O: t("surfaces.O"),
      I: t("surfaces.I"),
      M: t("surfaces.M"),
      D: t("surfaces.D"),
      V: t("surfaces.V"),
      L: t("surfaces.L"),
      root: t("surfaces.root"),
    }),
    [t]
  );

  const width = compact ? 34 : 52;

  const [upperRow, lowerRow] =
    dentition === "permanent"
      ? [PERMANENT_UPPER, PERMANENT_LOWER]
      : [PRIMARY_UPPER, PRIMARY_LOWER];

  const filterRow = (row: number[]) =>
    onlyTeeth ? row.filter((fdi) => onlyTeeth.includes(fdi)) : row;

  const upper = filterRow(upperRow);
  const lower = filterRow(lowerRow);

  /** Состояние выбранной наведением части — для подписи в подсказке. */
  const hoveredCondition = useMemo(() => {
    if (!hovered) return null;
    const tooth = chart[hovered.fdi];
    if (!tooth) return "healthy" as const;
    if (hovered.part === "root") return (tooth.root ?? tooth.whole)?.condition ?? "healthy";
    return (tooth.surfaces[hovered.part as Surface] ?? tooth.whole)?.condition ?? "healthy";
  }, [hovered, chart]);

  const renderRow = (teeth: number[], jaw: "upper" | "lower") => (
    <div
      className={cn(
        "flex justify-center gap-0.5",
        jaw === "upper" ? "items-end" : "items-start"
      )}
    >
      {teeth.map((fdi) => (
        <div
          key={fdi}
          className={cn(
            "flex flex-col items-center gap-0.5",
            compact ? "min-w-0" : "min-w-touch",
            fitWidth && "xl:min-w-0 xl:flex-1 xl:max-w-[56px]"
          )}
        >
          <Tooth
            fdi={fdi}
            state={chart[fdi]}
            readOnly={readOnly}
            onSurfaceClick={onSurfaceClick}
            onPartHover={setHovered}
            selected={selection?.[fdi]}
            partLabels={partLabels}
            width={width}
            onDark={onDark}
            fluid={fitWidth ? "xl" : undefined}
          />
          {/* номер зуба — мелко, вторичным цветом, всегда под зубом */}
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              onDark ? "text-slate-300" : "text-muted"
            )}
          >
            {fdi}
          </span>
        </div>
      ))}
    </div>
  );

  const jawLabel = (key: "upperJaw" | "lowerJaw") => (
    <span
      className={cn(
        "text-[11px] font-medium uppercase tracking-wide",
        onDark ? "text-slate-400" : "text-muted"
      )}
    >
      {t(key)}
    </span>
  );

  return (
    <div className="space-y-3">
      {!onlyTeeth && !compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className={cn(
              "flex rounded-xl border p-0.5",
              onDark ? "border-white/15 bg-white/5" : "border-line bg-card"
            )}
          >
            {(["permanent", "primary"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDentition(d)}
                className={cn(
                  "min-h-touch rounded-lg px-3 text-small font-medium transition-colors sm:min-h-0 sm:py-1.5",
                  dentition === d
                    ? "bg-primary-600 text-white"
                    : onDark
                      ? "text-slate-300 hover:text-white"
                      : "text-muted hover:text-ink"
                )}
              >
                {t(d)}
              </button>
            ))}
          </div>

          {/* Подсказка о наведённой поверхности: "16 · Жевательная · Кариес" */}
          <div
            className={cn(
              "flex min-h-[28px] items-center rounded-lg px-2.5 text-small transition-opacity duration-200",
              hovered ? "opacity-100" : "opacity-0",
              onDark ? "bg-white/10 text-slate-100" : "bg-slate-50 text-ink"
            )}
            aria-live="polite"
          >
            {hovered && hoveredCondition && (
              <span className="flex items-center gap-1.5">
                <span className="font-semibold tabular-nums">{hovered.fdi}</span>
                <span className={onDark ? "text-slate-400" : "text-muted"}>·</span>
                <span>{partLabels[hovered.part]}</span>
                <span className={onDark ? "text-slate-400" : "text-muted"}>·</span>
                <ConditionDot condition={hoveredCondition} />
                <span className="font-medium">{t(`conditions.${hoveredCondition}`)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Один общий скроллер на обе челюсти: иначе ряды разъезжаются
          по горизонтали и верхний зуб перестаёт стоять над антагонистом. */}
      <div
        className={cn(
          "overflow-x-auto rounded-2xl border scrollbar-thin",
          compact ? "p-2" : "p-3",
          onDark ? "border-white/10 bg-white/5" : "border-line bg-card"
        )}
      >
        <div className={cn("w-max min-w-full space-y-2", fitWidth && "xl:w-auto")}>
          {upper.length > 0 && (
            <div className="space-y-1">
              {!onlyTeeth && jawLabel("upperJaw")}
              {renderRow(upper, "upper")}
            </div>
          )}
          {upper.length > 0 && lower.length > 0 && (
            <div className={cn("border-t border-dashed", onDark ? "border-white/15" : "border-line")} />
          )}
          {lower.length > 0 && (
            <div className="space-y-1">
              {renderRow(lower, "lower")}
              {!onlyTeeth && jawLabel("lowerJaw")}
            </div>
          )}
        </div>
      </div>

      {showLegend && <Legend chart={chart} onDark={onDark} />}
    </div>
  );
}
