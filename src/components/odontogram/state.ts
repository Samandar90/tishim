import type { ToothRecord } from "@/lib/types/database";
import {
  ROOT_CONDITIONS,
  ROOT_REMOVING_CONDITIONS,
  WHOLE_TOOTH_CONDITIONS,
} from "@/lib/constants/teeth";
import type { ChartState, ToothState } from "./types";

/**
 * Current tooth state is never stored — it is derived: for every
 * (tooth, surface) the latest tooth_records row by created_at wins.
 * Whole-tooth and root conditions occupy their own slots.
 *
 * Записи одного приёма уходят одним insert и получают общий created_at —
 * между ними порядок решает seq (порядок вставки). Эти же правила повторяет
 * view current_tooth_state (миграция 00010), расходиться им нельзя.
 */
export function buildChartState(records: ToothRecord[], atDate?: string | null): ChartState {
  const cutoff = atDate ? endOfDay(atDate) : null;
  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.seq - b.seq
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
      }
      // коронка и мост стоят на своём корне — каналы под ними не пропадают
      if (ROOT_REMOVING_CONDITIONS.includes(rec.condition)) {
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

/**
 * День записи как YYYY-MM-DD по UTC. Единственное место, где из created_at
 * делается календарная дата: и позиции слайдера, и даты в шторке зуба обязаны
 * идти через него, иначе запись под 21:30Z у слайдера будет 13-м, а в шторке
 * (через локальный new Date) — 14-м.
 */
export function recordDay(createdAt: string): string {
  return createdAt.slice(0, 10);
}

/** Unique YYYY-MM-DD dates (ascending) on which records exist — for the history slider. */
export function extractRecordDates(records: ToothRecord[]): string[] {
  const days = new Set<string>();
  for (const r of records) {
    days.add(recordDay(r.created_at));
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
