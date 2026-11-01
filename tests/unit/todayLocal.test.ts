import { describe, expect, it } from "vitest";
import { todayLocal } from "@/lib/utils";

describe("todayLocal", () => {
  it("берёт местный календарь, а не UTC", () => {
    // Час ночи 1 января по местному времени: в Ташкенте toISOString() дал бы 31 декабря
    const night = new Date(2026, 0, 1, 1, 0, 0);
    expect(todayLocal(night)).toBe("2026-01-01");
  });

  it("дополняет месяц и день нулями", () => {
    expect(todayLocal(new Date(2026, 2, 5, 12))).toBe("2026-03-05");
  });
});
