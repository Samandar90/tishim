"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Rotate3d, X } from "lucide-react";
import type { ToothCondition } from "@/lib/types/database";
import {
  ALL_SURFACES,
  CONDITION_COLORS,
  quadrantKey,
  toothPositionKey,
} from "@/lib/constants/teeth";
import { cn, formatDate } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { recordDay } from "./state";
import { Tooth } from "./Tooth";
import type { SurfaceState, ToothPart, ToothState } from "./types";

// three тяжёлый: чанк с ним грузится, только когда шторку зуба открыли, и в
// серверном рендере не участвует — WebGL есть только в браузере.
const Tooth3D = dynamic(() => import("./Tooth3D"), { ssr: false });

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
 * Шторка с подробностями по одному зубу — нативный <dialog> через ui/Sheet:
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
  const open = fdi !== null;
  const rows = rowsOf(state);
  const main = headline(rows);
  const name =
    fdi !== null
      ? `${t(`toothNames.${toothPositionKey(fdi)}`)} · ${t(`quadrants.${quadrantKey(fdi)}`)}`
      : "";

  // Пока модель открытого зуба не на экране — и совсем без WebGL — на её месте
  // плоский зуб, чтобы шторка не открывалась с пустым окном.
  const [readyFdi, setReadyFdi] = useState<number | null>(null);
  const [no3d, setNo3d] = useState(false);
  const ready = !no3d && readyFdi === fdi;

  useEffect(() => {
    // сбой загрузки не должен выключать 3D до перезагрузки страницы
    if (fdi === null) {
      setReadyFdi(null);
      setNo3d(false);
    }
  }, [fdi]);

  const navButton =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tone="dark"
      label={fdi !== null ? `${fdi} · ${name}` : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onPrev();
        if (e.key === "ArrowRight") onNext();
      }}
    >
      {fdi !== null && (
        <>
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

          <div className="relative mt-4 h-56 overflow-hidden rounded-2xl bg-white/5">
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Tooth fdi={fdi} state={state} readOnly onDark width={88} />
              </div>
            )}
            {!no3d && (
              <Tooth3D
                fdi={fdi}
                state={state}
                label={t("model3d", { fdi })}
                onReady={setReadyFdi}
                onFail={() => setNo3d(true)}
                className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  ready ? "opacity-100" : "opacity-0"
                )}
              />
            )}
            {ready && (
              <Rotate3d
                aria-hidden
                className="pointer-events-none absolute right-3 top-3 size-4 text-slate-500"
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-body font-medium">
              <Dot condition={main} />
              {t(`conditions.${main}`)}
            </span>
            {rows.length === 0 && <p className="text-small text-slate-400">{t("noRecords")}</p>}
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
        </>
      )}
    </Sheet>
  );
}
