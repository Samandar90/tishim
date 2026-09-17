import { describe, expect, it } from "vitest";
import { groupVisitRecords, needsWideChart } from "@/components/visit/recordGroups";
import { PERMANENT_LOWER, PERMANENT_UPPER } from "@/lib/constants/teeth";
import type { ToothRecord } from "@/lib/types/database";

function rec(seq: number, tooth: number, patch: Partial<ToothRecord> = {}): ToothRecord {
  return {
    id: String(seq),
    seq,
    visit_id: "v1",
    patient_id: "p1",
    tooth_fdi: tooth,
    surfaces: [],
    condition: "healthy",
    procedure: null,
    note: null,
    price: 0,
    created_at: "2026-09-18T10:00:00.000Z",
    ...patch,
  };
}

describe("groupVisitRecords", () => {
  it("«просто здоровые» зубы уходят в сводку, остальные остаются строками", () => {
    const groups = groupVisitRecords([
      rec(1, 16, { condition: "caries", surfaces: ["O"] }),
      rec(2, 18),
      rec(3, 17),
    ]);

    expect(groups.detailed.map((r) => r.tooth_fdi)).toEqual([16]);
    expect(groups.healthyTeeth).toEqual([18, 17]);
  });

  it("порядок — по seq, в каком бы виде записи ни отдала база", () => {
    const groups = groupVisitRecords([
      rec(4, 36, { condition: "crown" }),
      rec(2, 11),
      rec(1, 26, { condition: "filling", surfaces: ["O", "M"] }),
      rec(3, 12),
    ]);

    expect(groups.detailed.map((r) => r.tooth_fdi)).toEqual([26, 36]);
    expect(groups.healthyTeeth).toEqual([11, 12]);
  });

  it("здоровый зуб с процедурой, заметкой, ценой или поверхностью — отдельная строка", () => {
    const groups = groupVisitRecords([
      rec(1, 11, { procedure: "Профессиональная чистка" }),
      rec(2, 12, { note: "Наблюдать" }),
      rec(3, 13, { price: 50_000 }),
      rec(4, 14, { surfaces: ["V"] }),
      rec(5, 15, { procedure: "" }),
    ]);

    expect(groups.detailed.map((r) => r.tooth_fdi)).toEqual([11, 12, 13, 14]);
    expect(groups.healthyTeeth).toEqual([15]);
  });

  it("цена строкой из PostgREST («0») не выдёргивает зуб из сводки", () => {
    const groups = groupVisitRecords([rec(1, 21, { price: "0" as unknown as number })]);

    expect(groups.detailed).toEqual([]);
    expect(groups.healthyTeeth).toEqual([21]);
  });

  it("исходный массив не меняется", () => {
    const records = [rec(2, 11), rec(1, 12)];
    groupVisitRecords(records);

    expect(records.map((r) => r.seq)).toEqual([2, 1]);
  });

  it("пустой приём даёт пустые группы", () => {
    expect(groupVisitRecords([])).toEqual({ detailed: [], healthyTeeth: [] });
  });
});

describe("needsWideChart", () => {
  it("обычному приёму хватает колонки", () => {
    expect(needsWideChart([rec(1, 16), rec(2, 26), rec(3, 36)])).toBe(false);
  });

  it("восемь зубов в ряду ещё помещаются, девятый — уже нет", () => {
    const upper = PERMANENT_UPPER.map((fdi, i) => rec(i + 1, fdi));

    expect(needsWideChart(upper.slice(0, 8))).toBe(false);
    expect(needsWideChart(upper.slice(0, 9))).toBe(true);
  });

  it("ряды считаются порознь: по восемь сверху и снизу — всё ещё колонка", () => {
    const records = [...PERMANENT_UPPER.slice(0, 8), ...PERMANENT_LOWER.slice(0, 8)].map((fdi, i) =>
      rec(i + 1, fdi)
    );

    expect(needsWideChart(records)).toBe(false);
  });

  it("несколько записей об одном зубе — один зуб в ряду", () => {
    const records = Array.from({ length: 12 }, (_, i) => rec(i + 1, 16, { condition: "caries" }));

    expect(needsWideChart(records)).toBe(false);
  });

  it("цифровизация — все 32 зуба — идёт во всю ширину", () => {
    const records = [...PERMANENT_UPPER, ...PERMANENT_LOWER].map((fdi, i) => rec(i + 1, fdi));

    expect(needsWideChart(records)).toBe(true);
  });

  it("пустой приём — не широкий", () => {
    expect(needsWideChart([])).toBe(false);
  });
});
