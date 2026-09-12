"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ToothCondition } from "@/lib/types/database";
import {
  ALL_SURFACES,
  CONDITION_COLORS,
  quadrantKey,
  toothPositionKey,
} from "@/lib/constants/teeth";
import { cn, formatDate } from "@/lib/utils";
import { recordDay } from "./state";
import { Tooth } from "./Tooth";
import type { SurfaceState, ToothPart, ToothState } from "./types";

interface Row {
  part: ToothPart | "whole";
  state: SurfaceState;
}

/** Строки шторки: весь зуб, корень, затем поверхности в фиксированном порядке. */
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

function Dot({ condition, className }: { condition: ToothCondition; className?: string }) {
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10", className)}
      style={{ backgroundColor: CONDITION_COLORS[condition] }}
    />
  );
}

/**
 * Шторка с подробностями по одному зубу. На телефоне выезжает снизу,
 * на десктопе — обычный центрированный диалог. Нативный <dialog>:
 * фокус-ловушка и Esc бесплатно, стрелки ←/→ листают соседние зубы.
 */
export function ToothSheet({
  fdi,
  state,
  onClose,
  onPrev,
  onNext,
}: {
  /** null — шторка закрыта. */
  fdi: number | null;
  state?: ToothState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("odontogram");
  const tc = useTranslations("common");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const open = fdi !== null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const rows = rowsOf(state);
  const main = headline(rows);
  const name =
    fdi !== null
      ? `${t(`toothNames.${toothPositionKey(fdi)}`)} · ${t(`quadrants.${quadrantKey(fdi)}`)}`
      : "";

  const navButton =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Chrome может закрыть модальный <dialog> по Esc, не спросив cancel
      // (close watcher без user activation) — синхронизируем состояние и тут.
      onClose={onClose}
      // клик по подложке: padding у диалога нулевой, содержимое закрывает весь бокс
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onPrev();
        if (e.key === "ArrowRight") onNext();
      }}
      aria-label={fdi !== null ? `${fdi} · ${name}` : undefined}
      // Прижат к низу явно (top:auto; bottom:0), а не через margin-top:auto:
      // у модального <dialog> с UA-стилем inset-block:0 auto-margin в Chrome
      // не отдаёт всё свободное место, и шторка повисала у верхнего края.
      className={cn(
        "bottom-0 top-auto m-0 max-h-[85vh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-slate-900 p-0 text-white shadow-modal",
        "backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm",
        "sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-2xl sm:border",
        "animate-sheet-up"
      )}
    >
      {fdi !== null && (
        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:p-6">
          {/* ручка шторки — только на телефоне */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

          <header className="flex items-center gap-1">
            <button type="button" onClick={onPrev} aria-label={t("prevTooth")} className={navButton}>
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-h2 tabular-nums text-white">{fdi}</p>
              <p className="truncate text-small text-slate-400">{name}</p>
            </div>
            <button type="button" onClick={onNext} aria-label={t("nextTooth")} className={navButton}>
              <ChevronRight className="size-5" />
            </button>
            <button type="button" onClick={onClose} aria-label={tc("close")} className={navButton}>
              <X className="size-5" />
            </button>
          </header>

          <div className="mt-4 flex items-center gap-5">
            <div className="shrink-0 rounded-2xl bg-white/5 px-4 py-3">
              <Tooth fdi={fdi} state={state} readOnly onDark width={88} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-body font-medium">
                <Dot condition={main} />
                {t(`conditions.${main}`)}
              </span>
              {rows.length === 0 && (
                <p className="mt-2 text-small text-slate-400">{t("noRecords")}</p>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
              {rows.map((r) => (
                <li key={r.part} className="flex items-start gap-3 py-2.5">
                  <Dot condition={r.state.condition} className="mt-2" />
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
        </div>
      )}
    </dialog>
  );
}
