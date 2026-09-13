import { describe, expect, it } from "vitest";
import { initials } from "@/lib/utils";

describe("initials", () => {
  it("берёт первые буквы двух первых слов", () => {
    expect(initials("Иванов Иван Иванович")).toBe("ИИ");
  });

  it("одно слово — одна буква", () => {
    expect(initials("Alisher")).toBe("A");
  });

  it("лишние пробелы и нижний регистр", () => {
    expect(initials("  o'tkir   karimov ")).toBe("OK");
  });

  it("кириллица с ё и ў поднимается в верхний регистр", () => {
    expect(initials("ёлкин ўткир")).toBe("ЁЎ");
  });

  it("суррогатная пара не режется пополам", () => {
    const out = Array.from(initials("👩‍⚕️ Doc"));
    expect(out).toHaveLength(2);
    expect(out[1]).toBe("D");
  });

  it("пустая строка и одни пробелы дают пусто", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });
});
