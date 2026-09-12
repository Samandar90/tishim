import { describe, expect, it } from "vitest";
import ru from "../../messages/ru.json";
import uz from "../../messages/uz.json";

/** Все листовые пути вида "odontogram.conditions.caries". */
function leafPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
}

/**
 * next-intl при отсутствии ключа не падает, а рендерит сам ключ —
 * «odontogram.tapHint» в интерфейсе на узбекском. Ловим это здесь, а не глазами.
 */
describe("паритет ru/uz", () => {
  const ruKeys = new Set(leafPaths(ru));
  const uzKeys = new Set(leafPaths(uz));

  it("в uz есть всё, что есть в ru", () => {
    expect([...ruKeys].filter((k) => !uzKeys.has(k))).toEqual([]);
  });

  it("в uz нет лишнего", () => {
    expect([...uzKeys].filter((k) => !ruKeys.has(k))).toEqual([]);
  });

  it("пустых строк нет ни в одной локали", () => {
    const empty = (obj: unknown) => leafPaths(obj).filter((p) => {
      const v = p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
      return typeof v !== "string" || v.trim() === "";
    });
    expect(empty(ru)).toEqual([]);
    expect(empty(uz)).toEqual([]);
  });
});
