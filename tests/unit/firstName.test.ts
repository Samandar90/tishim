import { describe, expect, it } from "vitest";
import { firstName } from "@/lib/utils";

describe("firstName", () => {
  it("из Ф.И.О. берёт имя — второе слово", () => {
    expect(firstName("Азимова Малика Рустамовна")).toBe("Малика");
    expect(firstName("Каримов Азиз")).toBe("Азиз");
  });

  it("одно слово или пустая строка — как есть", () => {
    expect(firstName("Малика")).toBe("Малика");
    expect(firstName("  ")).toBe("");
  });
});
