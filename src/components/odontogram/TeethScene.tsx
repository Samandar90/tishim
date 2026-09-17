"use client";

import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MousePointerClick, RotateCw } from "lucide-react";
import { useToothState } from "@/hooks/useToothState";
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
} from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { WIDE_QUERY, useMediaQuery } from "@/components/ui/useMediaQuery";
import { Tooth } from "./Tooth";
import { Legend } from "./Legend";
import { HistorySlider } from "./HistorySlider";
import { ToothDetails } from "./ToothDetails";
import { ToothSheet } from "./ToothSheet";
import { JawViewToggle, segmentClass, useJawView } from "./JawViewToggle";
import type { Dentition } from "./Odontogram";
import type { ChartState } from "./types";

// three грузится отдельным чанком, только когда карта на экране, и в серверном
// рендере не участвует — WebGL есть только в браузере.
const Jaw3D = dynamic(() => import("./Jaw3D"), { ssr: false });

/** Карта пациента из базы; как она выглядит — TeethSceneView. */
export function TeethScene({ patientId, title }: { patientId: string; title?: string }) {
  const [atDate, setAtDate] = useState<string | null>(null);
  const { chart, recordDates, loading, error, refresh } = useToothState(patientId, atDate);

  return (
    <TeethSceneView
      title={title}
      chart={chart}
      recordDates={recordDates}
      atDate={atDate}
      onAtDateChange={setAtDate}
      loading={loading}
      failed={error !== null}
      onRetry={() => void refresh()}
    />
  );
}

/**
 * Карта зубов как сцена: тёмная подложка, обе челюсти в 3D — их вращают пальцем или
 * мышью, зуб выбирают тапом, кликом или стрелками ←/→ со сцены в фокусе. Подробности
 * зуба на телефоне и планшете — шторка, на широком экране (xl) — панель справа от
 * сцены: врач листает зубы, не открывая и не закрывая модалку. Только чтение. Без
 * WebGL остаётся плоская схема: на телефоне зуб ~20px, поверхности читаются как цвет,
 * детали — в шторке, «промах» исправляется стрелками в ней.
 */
export function TeethSceneView({
  title,
  chart,
  recordDates,
  atDate,
  onAtDateChange,
  loading,
  failed,
  onRetry,
}: {
  title?: string;
  chart: ChartState;
  recordDates: string[];
  atDate: string | null;
  onAtDateChange: (date: string | null) => void;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("odontogram");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const { view, resets, select } = useJawView();
  const [activeFdi, setActiveFdi] = useState<number | null>(null);
  // Сцена показывается, когда собрана именно для выбранного прикуса; до этого на её
  // месте заглушка, а совсем без WebGL — плоская схема.
  const [readyDentition, setReadyDentition] = useState<Dentition | null>(null);
  const [no3d, setNo3d] = useState(false);
  const ready = !no3d && readyDentition === dentition;
  // Панель вместо шторки решается в JS, а не только CSS: скрытый модальный <dialog>
  // всё равно держал бы фокус и запирал скролл страницы.
  const wide = useMediaQuery(WIDE_QUERY);

  const [upper, lower] =
    dentition === "permanent" ? [PERMANENT_UPPER, PERMANENT_LOWER] : [PRIMARY_UPPER, PRIMARY_LOWER];
  const order = useMemo(() => [...upper, ...lower], [upper, lower]);

  const step = useCallback(
    (delta: number) =>
      setActiveFdi((cur) => {
        if (cur === null) return delta > 0 ? order[0] : order[order.length - 1];
        const i = order.indexOf(cur);
        return order[(i + delta + order.length) % order.length];
      }),
    [order]
  );

  const onStageKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    } else if (e.key === "Escape") {
      setActiveFdi(null);
    }
  };

  const renderRow = (teeth: number[], jaw: "upper" | "lower") => (
    <div className={cn("flex justify-center gap-px sm:gap-1", jaw === "upper" ? "items-end" : "items-start")}>
      {teeth.map((fdi) => (
        <button
          key={fdi}
          type="button"
          onClick={() => setActiveFdi(fdi)}
          aria-label={String(fdi)}
          className={cn(
            "flex min-w-0 max-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg py-1 transition-colors",
            "hover:bg-white/5 active:bg-white/10",
            activeFdi === fdi && "bg-white/10 ring-1 ring-primary-400"
          )}
        >
          <Tooth fdi={fdi} state={chart[fdi]} readOnly onDark fluid />
          <span className="text-[10px] font-medium tabular-nums text-slate-400 sm:text-[11px]">
            {fdi}
          </span>
        </button>
      ))}
    </div>
  );

  const jawLabel = (key: "upperJaw" | "lowerJaw") => (
    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t(key)}</p>
  );

  return (
    <>
      <section
        className={cn(
          "relative -mx-4 overflow-hidden bg-slate-900 px-3 py-4",
          "sm:mx-0 sm:rounded-2xl sm:border sm:border-white/10 sm:px-5 sm:py-5 md:px-6"
        )}
      >
        {/* то же бирюзовое свечение, что в hero лендинга — одна подача на весь продукт */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-16 size-64 rounded-full bg-primary-400/15 blur-3xl"
        />

        <div className="relative xl:flex xl:gap-5">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-h3 text-white">{title ?? td("teethMap")}</h2>
              <div className="flex rounded-xl border border-white/15 bg-white/5 p-0.5">
                {(["permanent", "primary"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDentition(d);
                      setActiveFdi(null);
                    }}
                    className={segmentClass(dentition === d)}
                  >
                    {t(d)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div aria-busy className="h-72 animate-pulse rounded-xl bg-white/10 sm:h-96 lg:h-stage" />
            ) : failed ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-body text-slate-300">{td("loadError")}</p>
                <Button
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={onRetry}
                >
                  <RotateCw className="size-4" />
                  {tc("retry")}
                </Button>
              </div>
            ) : (
              <>
                {no3d ? (
                  <div className="space-y-1">
                    {jawLabel("upperJaw")}
                    {renderRow(upper, "upper")}
                    <div className="border-t border-dashed border-white/15" />
                    {renderRow(lower, "lower")}
                    {jawLabel("lowerJaw")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Сцена в фокусе принимает ←/→ и Esc: зуб выбирается с клавиатуры,
                        без попадания мышью по canvas */}
                    <div
                      tabIndex={0}
                      role="group"
                      aria-label={t("jaw3d")}
                      onKeyDown={onStageKeyDown}
                      className="relative h-72 rounded-xl sm:h-96 lg:h-stage"
                    >
                      {!ready && (
                        <div aria-busy className="absolute inset-0 animate-pulse rounded-xl bg-white/5" />
                      )}
                      <Jaw3D
                        chart={chart}
                        dentition={dentition}
                        view={view}
                        viewResets={resets}
                        activeFdi={activeFdi}
                        label={t("jaw3d")}
                        onToothClick={setActiveFdi}
                        onReady={setReadyDentition}
                        onFail={() => setNo3d(true)}
                        className={cn(
                          "absolute inset-0 transition-opacity duration-300",
                          ready ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    <JawViewToggle view={view} onSelect={select} />
                  </div>
                )}
                <p className="text-center text-[11px] text-slate-500 lg:text-small">
                  {t(no3d ? "tapHint" : wide ? "jawHintWide" : "jawHint")}
                </p>
                <Legend chart={chart} onDark />
                <HistorySlider dates={recordDates} value={atDate} onChange={onAtDateChange} onDark />
              </>
            )}
          </div>

          {/* Панель подробностей — только на широком экране; ниже xl их показывает шторка */}
          <aside className="hidden w-80 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-4 xl:flex">
            {activeFdi !== null ? (
              <ToothDetails
                fdi={activeFdi}
                state={chart[activeFdi]}
                onClose={() => setActiveFdi(null)}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <MousePointerClick aria-hidden className="size-8 text-slate-500" strokeWidth={1.5} />
                <p className="text-body text-slate-400">{t("pickTooth")}</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <ToothSheet
        fdi={wide ? null : activeFdi}
        state={activeFdi !== null ? chart[activeFdi] : undefined}
        onClose={() => setActiveFdi(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </>
  );
}
