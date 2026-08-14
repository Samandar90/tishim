import { describe, expect, it } from "vitest";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import type { ToothRecord } from "@/lib/types/database";

let seq = 0;
function rec(p: Partial<ToothRecord> & { created_at: string }): ToothRecord {
  return {
    id: `r${++seq}`,
    visit_id: "v1",
    patient_id: "p1",
    tooth_fdi: 16,
    surfaces: [],
    condition: "healthy",
    procedure: null,
    note: null,
    price: 0,
    ...p,
  } as ToothRecord;
}

describe("buildChartState", () => {
  it("последняя по created_at запись выигрывает для пары (зуб, поверхность)", () => {
    const chart = buildChartState([
      rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "caries" }),
      rec({ created_at: "2026-05-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "filling" }),
    ]);
    expect(chart[16].surfaces.O?.condition).toBe("filling");
  });

  it("порядок во входном массиве не влияет — сортировка по created_at", () => {
    const chart = buildChartState([
      rec({ created_at: "2026-05-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "filling" }),
      rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "caries" }),
    ]);
    expect(chart[16].surfaces.O?.condition).toBe("filling");
  });

  it("whole-tooth состояние стирает более ранние поверхности и корень", () => {
    const chart = buildChartState([
      rec({ created_at: "2026-01-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "caries" }),
      rec({ created_at: "2026-02-01T10:00:00Z", tooth_fdi: 16, condition: "root_canal" }),
      rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 16, condition: "crown" }),
    ]);
    expect(chart[16].whole?.condition).toBe("crown");
    expect(chart[16].surfaces).toEqual({});
    expect(chart[16].root).toBeUndefined();
  });

  it("atDate отсекает будущее по концу дня включительно", () => {
    const records = [
      rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "caries" }),
      rec({ created_at: "2026-05-01T10:00:00Z", tooth_fdi: 16, surfaces: ["O"], condition: "filling" }),
    ];
    expect(buildChartState(records, "2026-03-01")[16].surfaces.O?.condition).toBe("caries");
    expect(buildChartState(records, "2026-05-01")[16].surfaces.O?.condition).toBe("filling");
  });

  it("входной массив не мутируется", () => {
    const records = [
      rec({ created_at: "2026-05-01T10:00:00Z" }),
      rec({ created_at: "2026-03-01T10:00:00Z" }),
    ];
    const before = records.map((r) => r.created_at);
    buildChartState(records);
    expect(records.map((r) => r.created_at)).toEqual(before);
  });
});

describe("extractRecordDates", () => {
  it("уникальные дни по возрастанию", () => {
    expect(
      extractRecordDates([
        rec({ created_at: "2026-05-01T10:00:00Z" }),
        rec({ created_at: "2026-03-01T23:00:00Z" }),
        rec({ created_at: "2026-03-01T08:00:00Z" }),
      ])
    ).toEqual(["2026-03-01", "2026-05-01"]);
  });
});
