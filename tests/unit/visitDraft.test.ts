import { describe, expect, it } from "vitest";
import {
  draftIsDirty,
  paidFor,
  stepForProblem,
  validateVisit,
} from "@/components/visit/visitDraft";

const base = {
  itemsCount: 1,
  visitDate: "2026-11-02",
  nextVisitDate: "",
  today: "2026-11-02",
  paymentStatus: "unpaid" as const,
  paidAmount: 0,
  total: 100000,
};

describe("validateVisit", () => {
  it("без записей — needRecords, это первый шаг", () => {
    expect(validateVisit({ ...base, itemsCount: 0 })).toBe("needRecords");
    expect(stepForProblem("needRecords")).toBe(0);
  });

  it("дата приёма из будущего или пустая — dateInvalid", () => {
    expect(validateVisit({ ...base, visitDate: "2026-11-03" })).toBe("dateInvalid");
    expect(validateVisit({ ...base, visitDate: "" })).toBe("dateInvalid");
    expect(stepForProblem("dateInvalid")).toBe(1);
  });

  it("следующий визит раньше приёма — nextDateInvalid", () => {
    expect(validateVisit({ ...base, nextVisitDate: "2026-11-01" })).toBe("nextDateInvalid");
    expect(validateVisit({ ...base, nextVisitDate: "2026-11-02" })).toBeNull();
  });

  it("частичная оплата принимает только сумму между нулём и итогом", () => {
    expect(validateVisit({ ...base, paymentStatus: "partial", paidAmount: 0 })).toBe("paidInvalid");
    expect(validateVisit({ ...base, paymentStatus: "partial", paidAmount: 100000 })).toBe("paidInvalid");
    expect(validateVisit({ ...base, paymentStatus: "partial", paidAmount: 40000 })).toBeNull();
    expect(stepForProblem("paidInvalid")).toBe(2);
  });
});

describe("paidFor", () => {
  it("оплачено — весь итог, не оплачено — ноль, частично — ввод врача", () => {
    expect(paidFor("paid", 135000, "")).toBe(135000);
    expect(paidFor("unpaid", 135000, "50000")).toBe(0);
    expect(paidFor("partial", 135000, "50000")).toBe(50000);
    expect(paidFor("partial", 135000, "abc")).toBe(0);
    expect(paidFor("partial", 135000, "12.345")).toBe(12.35);
  });
});

describe("draftIsDirty", () => {
  it("черновик стоит хранить, если есть записи или текст", () => {
    const empty = { items: [], complaint: "", diagnosis: "", treatment: "", recommendation: " " };
    expect(draftIsDirty(empty)).toBe(false);
    expect(draftIsDirty({ ...empty, diagnosis: "кариес" })).toBe(true);
    expect(
      draftIsDirty({ ...empty, items: [{ tooth_fdi: 11, surfaces: [], condition: "caries", procedure: "", price: 0, note: "" }] })
    ).toBe(true);
  });
});
