import type { ToothRecord } from "@/lib/types/database";
import { isUpperTooth } from "@/lib/constants/teeth";

export interface VisitRecordGroups {
  /** Записи, у которых есть что показать: каждая своей строкой, в порядке внесения. */
  detailed: ToothRecord[];
  /** Зубы, отмеченные просто здоровыми: одной сводной строкой, как в форме приёма. */
  healthyTeeth: number[];
}

/**
 * «Просто здоров» — без поверхностей, процедуры, заметки и цены. Так пишет кнопка
 * «остальные — здоровы»: на цифровизации это две с лишним дюжины одинаковых строк,
 * за которыми теряются записи о лечении.
 */
function isPlainHealthy(record: ToothRecord): boolean {
  return (
    record.condition === "healthy" &&
    record.surfaces.length === 0 &&
    !record.procedure &&
    !record.note &&
    Number(record.price) === 0
  );
}

/**
 * Раскладывает записи приёма для показа. Порядок — как вносил врач: `created_at` у
 * приёма общий, разводит записи `seq`. Без явной сортировки порядок отдаёт база.
 */
export function groupVisitRecords(records: ToothRecord[]): VisitRecordGroups {
  const ordered = [...records].sort((a, b) => a.seq - b.seq);
  return {
    detailed: ordered.filter((r) => !isPlainHealthy(r)),
    healthyTeeth: ordered.filter(isPlainHealthy).map((r) => r.tooth_fdi),
  };
}

/**
 * Столько компактных зубов одного ряда помещается в левую колонку деталей визита на
 * экране 1024px (колонка 337px, зуб с промежутком — 36px).
 */
const COLUMN_ROW_MAX = 8;

/**
 * Приёму нужна схема во всю ширину страницы, а не в колонке: в одном из рядов зубов
 * больше, чем в колонку помещается. Так выглядит цифровизация — 16 зубов в ряду, и в
 * колонке схема уходила в горизонтальную прокрутку.
 */
export function needsWideChart(records: ToothRecord[]): boolean {
  const upper = new Set<number>();
  const lower = new Set<number>();
  for (const r of records) (isUpperTooth(r.tooth_fdi) ? upper : lower).add(r.tooth_fdi);
  return Math.max(upper.size, lower.size) > COLUMN_ROW_MAX;
}
