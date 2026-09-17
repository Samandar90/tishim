"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ToothCondition } from "@/lib/types/database";
import { ALL_SURFACES, quadrantKey, toothPositionKey } from "@/lib/constants/teeth";
import { formatDate } from "@/lib/utils";
import { ConditionDot } from "./ConditionDot";
import { recordDay } from "./state";
import { ToothStage } from "./ToothStage";
import type { SurfaceState, ToothPart, ToothState } from "./types";

interface Row {
  part: ToothPart | "whole";
  state: SurfaceState;
}

/** Строки подробностей: весь зуб, корень, затем поверхности в фиксированном порядке. */
function rowsOf(state: ToothState | undefined): Row[] {
  if (!state) return [];
  const rows: Row[] = [];
  if (state.whole) rows.push({ part: "whole", state: state.whole });
  if (state.root) rows.push({ part: "root", state: state.root });
  for (const s of ALL_SURFACES) {
    const st = state.surfaces[s];
    if (st) rows.push({ part: s, state: st });
  }
  return rows;
}

/** Состояние для заголовка: первое «нездоровое», иначе «здоров». */
function headline(rows: Row[]): ToothCondition {
  return rows.find((r) => r.state.condition !== "healthy")?.state.condition ?? "healthy";
}

/** Имя зуба для заголовка и aria-label: «Моляр · верхний правый». */
export function useToothTitle() {
  const t = useTranslations("odontogram");
  return (fdi: number) =>
    `${t(`toothNames.${toothPositionKey(fdi)}`)} · ${t(`quadrants.${quadrantKey(fdi)}`)}`;
}

/**
 * Подробности одного зуба на тёмной подложке: номер, 3D-модель, состояние и записи.
 * Одно содержимое для двух мест — шторки ToothSheet и панели рядом со сценой на
 * широком экране; где показать, решает TeethScene.
 */
export function ToothDetails({
  fdi,
  state,
  onClose,
  onPrev,
  onNext,
}: {
  fdi: number;
  state?: ToothState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("odontogram");
  const tc = useTranslations("common");
  const locale = useLocale();
  const title = useToothTitle();
  const rows = rowsOf(state);
  const main = headline(rows);

  const navButton =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <>
      <header className="flex items-center gap-1">
        <button type="button" onClick={onPrev} aria-label={t("prevTooth")} className={navButton}>
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-h2 tabular-nums text-white">{fdi}</p>
          <p className="truncate text-small text-slate-400">{title(fdi)}</p>
        </div>
        <button type="button" onClick={onNext} aria-label={t("nextTooth")} className={navButton}>
          <ChevronRight className="size-5" />
        </button>
        <button type="button" onClick={onClose} aria-label={tc("close")} className={navButton}>
          <X className="size-5" />
        </button>
      </header>

      <ToothStage fdi={fdi} state={state} className="mt-4 h-56 bg-white/5" />

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-body font-medium">
          <ConditionDot condition={main} />
          {t(`conditions.${main}`)}
        </span>
        {rows.length === 0 && <p className="text-small text-slate-400">{t("noRecords")}</p>}
      </div>

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
          {rows.map((r) => (
            <li key={r.part} className="flex items-start gap-3 py-2.5">
              <ConditionDot condition={r.state.condition} className="mt-2" />
              <div className="min-w-0 flex-1">
                <p className="text-body">
                  <span className="font-medium">{t(`conditions.${r.state.condition}`)}</span>
                  <span className="text-slate-400">
                    {" "}
                    · {r.part === "whole" ? t("wholeTooth") : t(`surfaces.${r.part}`)}
                  </span>
                </p>
                {(r.state.procedure || r.state.note) && (
                  <p className="text-small text-slate-400">
                    {[r.state.procedure, r.state.note].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
              {r.state.recordedAt && (
                <span className="shrink-0 pt-0.5 text-small tabular-nums text-slate-500">
                  {formatDate(recordDay(r.state.recordedAt), locale)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
