import { describe, expect, it } from "vitest";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import type { ToothRecord } from "@/lib/types/database";

let seq = 0;
function rec(p: Partial<ToothRecord> & { created_at: string }): ToothRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    seq,
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

  it.each(["crown", "bridge"] as const)(
    "%s стирает более ранние поверхности, но каналы под ней остаются",
    (condition) => {
      const chart = buildChartState([
        rec({ created_at: "2026-01-01T10:00:00Z", tooth_fdi: 36, surfaces: ["O"], condition: "caries" }),
        rec({ created_at: "2026-02-01T10:00:00Z", tooth_fdi: 36, condition: "root_canal" }),
        rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 36, condition }),
      ]);
      expect(chart[36].whole?.condition).toBe(condition);
      expect(chart[36].surfaces).toEqual({});
      expect(chart[36].root?.condition).toBe("root_canal");
    }
  );

  it.each(["implant", "extracted", "missing"] as const)(
    "%s стирает и поверхности, и корень — своего корня у зуба больше нет",
    (condition) => {
      const chart = buildChartState([
        rec({ created_at: "2026-01-01T10:00:00Z", tooth_fdi: 47, surfaces: ["O", "D"], condition: "caries" }),
        rec({ created_at: "2026-02-01T10:00:00Z", tooth_fdi: 47, condition: "root_canal" }),
        rec({ created_at: "2026-03-01T10:00:00Z", tooth_fdi: 47, condition }),
      ]);
      expect(chart[47].whole?.condition).toBe(condition);
      expect(chart[47].surfaces).toEqual({});
      expect(chart[47].root).toBeUndefined();
    }
  );

  describe("записи одного приёма с общим created_at", () => {
    const at = "2026-04-01T10:00:00Z";

    it("порядок решает seq, а не порядок во входном массиве", () => {
      const chart = buildChartState([
        rec({ created_at: at, seq: 2, surfaces: ["O"], condition: "filling" }),
        rec({ created_at: at, seq: 1, surfaces: ["O"], condition: "caries" }),
      ]);
      expect(chart[16].surfaces.O?.condition).toBe("filling");
    });

    it("коронка гасит поверхности, записанные в приёме до неё, но не после", () => {
      const fillingThenCrown = buildChartState([
        rec({ created_at: at, seq: 2, condition: "crown" }),
        rec({ created_at: at, seq: 1, surfaces: ["O"], condition: "filling" }),
      ]);
      expect(fillingThenCrown[16].surfaces).toEqual({});

      const crownThenFilling = buildChartState([
        rec({ created_at: at, seq: 2, surfaces: ["O"], condition: "filling" }),
        rec({ created_at: at, seq: 1, condition: "crown" }),
      ]);
      expect(crownThenFilling[16].surfaces.O?.condition).toBe("filling");
    });
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
