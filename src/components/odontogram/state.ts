import type { ToothRecord } from "@/lib/types/database";
import { ROOT_CONDITIONS, WHOLE_TOOTH_CONDITIONS } from "@/lib/constants/teeth";
import type { ChartState, ToothState } from "./types";

/**
 * Current tooth state is never stored — it is derived: for every
 * (tooth, surface) the latest tooth_records row by created_at wins.
 * Whole-tooth and root conditions occupy their own slots.
 */
export function buildChartState(records: ToothRecord[], atDate?: string | null): ChartState {
  const cutoff = atDate ? endOfDay(atDate) : null;
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const chart: ChartState = {};

  for (const rec of sorted) {
    if (cutoff && new Date(rec.created_at).getTime() > cutoff) continue;

    const tooth: ToothState = (chart[rec.tooth_fdi] ??= { surfaces: {} });
    const state = {
      condition: rec.condition,
      procedure: rec.procedure,
      note: rec.note,
      recordedAt: rec.created_at,
    };

    if (ROOT_CONDITIONS.includes(rec.condition)) {
      tooth.root = state;
      continue;
    }

    if (WHOLE_TOOTH_CONDITIONS.includes(rec.condition) || rec.surfaces.length === 0) {
      tooth.whole = state;
      // a new whole-tooth state supersedes earlier surface marks
      if (WHOLE_TOOTH_CONDITIONS.includes(rec.condition)) {
        tooth.surfaces = {};
        tooth.root = undefined;
      }
      continue;
    }

    for (const s of rec.surfaces) {
      tooth.surfaces[s] = state;
    }
  }

  return chart;
}

/** Unique YYYY-MM-DD dates (ascending) on which records exist — for the history slider. */
export function extractRecordDates(records: ToothRecord[]): string[] {
  const days = new Set<string>();
  for (const r of records) {
    days.add(r.created_at.slice(0, 10));
  }
  return [...days].sort();
}

/**
 * Конец суток по UTC — намеренно, а не по локальному времени.
 * Позиции слайдера строит extractRecordDates по UTC-дате (created_at.slice(0,10)),
 * поэтому и отсечка обязана считаться в том же календаре. Через setHours отсечка
 * съезжала на смещение часового пояса: в Ташкенте (UTC+5) конец 14 августа
 * приходился на 18:59:59Z, и приём, сохранённый после полуночи по местному
 * времени, пропадал с той самой позиции слайдера, которую сам же и породил.
 */
export function endOfDay(day: string): number {
  return Date.parse(`${day}T23:59:59.999Z`);
}
