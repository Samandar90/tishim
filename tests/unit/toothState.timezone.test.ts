import { describe, expect, it } from "vitest";
import {
  buildChartState,
  endOfDay,
  extractRecordDates,
  recordDay,
} from "@/components/odontogram/state";
import { formatDate } from "@/lib/utils";
import type { ToothRecord } from "@/lib/types/database";

let seq = 0;
function rec(created_at: string): ToothRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    seq,
    visit_id: "v1",
    patient_id: "p1",
    tooth_fdi: 16,
    surfaces: ["O"],
    condition: "caries",
    procedure: null,
    note: null,
    price: 0,
    created_at,
  } as ToothRecord;
}

/**
 * Регрессия. Раньше endOfDay брал new Date(day) — по спецификации это UTC-полночь —
 * и добивал его локальным setHours(23,59,59,999). В Ташкенте (UTC+5) отсечка для
 * 14 августа получалась 18:59:59.999Z, а позиции слайдера extractRecordDates строит
 * по UTC-дате. Приём, сохранённый после полуночи по местному времени, попадал на
 * слайдер под вчерашним числом и при выборе этого числа не показывался.
 *
 * Тесты запускаются под TZ=Asia/Tashkent (см. vitest.setup.ts и CI) — под UTC баг
 * не воспроизводится, и именно поэтому его не видно на сервере.
 */
describe("отсечка по дате не зависит от часового пояса", () => {
  it("endOfDay даёт конец UTC-суток", () => {
    expect(endOfDay("2026-08-14")).toBe(Date.parse("2026-08-14T23:59:59.999Z"));
  });

  it("запись видна на той позиции слайдера, которую сама породила", () => {
    // 20:00Z — это 01:00 следующего дня по Ташкенту, но UTC-дата всё ещё 14-е
    const late = rec("2026-08-14T20:00:00Z");
    const dates = extractRecordDates([late]);
    expect(dates).toEqual(["2026-08-14"]);

    const chart = buildChartState([late], dates[0]);
    expect(chart[16]?.surfaces.O?.condition).toBe("caries");
  });

  it("граница суток включительна, следующая секунда уже отсекается", () => {
    const edge = rec("2026-08-14T23:59:59.999Z");
    const next = rec("2026-08-15T00:00:00.000Z");
    expect(buildChartState([edge], "2026-08-14")[16]).toBeDefined();
    expect(buildChartState([next], "2026-08-14")[16]).toBeUndefined();
  });

  it("дата записи в шторке зуба совпадает с позицией слайдера", () => {
    // 21:30Z — по Ташкенту уже 02:30 14-го; слайдер ставит запись на 13-е,
    // и шторка обязана показать то же число, а не локальное
    const late = rec("2026-08-13T21:30:00Z");
    const [sliderDay] = extractRecordDates([late]);
    const chart = buildChartState([late]);
    const sheetDay = recordDay(chart[16]!.surfaces.O!.recordedAt!);

    expect(sheetDay).toBe(sliderDay);
    expect(formatDate(sheetDay)).toBe("13.08.2026");
    // контроль: «наивный» путь через new Date(iso) даёт другой день
    expect(formatDate(late.created_at)).toBe("14.08.2026");
  });

  it("каждая позиция слайдера показывает всё, что было записано в тот день", () => {
    const records = [
      rec("2026-08-14T03:00:00Z"),
      rec("2026-08-14T12:00:00Z"),
      rec("2026-08-14T22:30:00Z"),
    ];
    for (const day of extractRecordDates(records)) {
      const chart = buildChartState(records, day);
      expect(chart[16], `день ${day} потерял свои записи`).toBeDefined();
    }
  });
});
