import { describe, expect, it } from "vitest";
import { calcTotal, formatMoney, resolveDiscountPercent } from "@/lib/utils";

describe("calcTotal", () => {
  it("процент применяется к подытогу", () => {
    expect(calcTotal(150_000, 10)).toBe(135_000);
  });

  it("процент зажимается в [0, 100]", () => {
    expect(calcTotal(150_000, 150)).toBe(0);
    expect(calcTotal(150_000, -20)).toBe(150_000);
  });
});

describe("resolveDiscountPercent", () => {
  it("процент берётся как есть", () => {
    expect(resolveDiscountPercent("percent", "15", 150_000)).toBe(15);
  });

  it("сумма переводится в процент от подытога", () => {
    expect(resolveDiscountPercent("amount", "30000", 150_000)).toBe(20);
  });

  it("скидка больше подытога не уводит итог в минус", () => {
    const p = resolveDiscountPercent("amount", "999999", 150_000);
    expect(calcTotal(150_000, p)).toBe(0);
  });

  it("нулевой подытог не даёт NaN и Infinity", () => {
    const p = resolveDiscountPercent("amount", "5000", 0);
    expect(p).toBe(0);
    expect(calcTotal(0, p)).toBe(0);
  });

  it("пустое и мусорное поле означают отсутствие скидки", () => {
    expect(resolveDiscountPercent("percent", "", 150_000)).toBe(0);
    expect(resolveDiscountPercent("percent", "abc", 150_000)).toBe(0);
  });

  /**
   * Колонка visits.discount_percent — numeric(12,2). Если убрать округление
   * из resolveDiscountPercent, форма посчитает total от 22.2222…, а в базу
   * уйдёт 22.22, и сохранённые subtotal / discount_percent / total перестанут
   * сходиться: пересчёт из базы даст другой итог, чем видел врач.
   */
  it("результат переживает запись в numeric(12,2) без потерь", () => {
    const cases: Array<[number, string]> = [
      [135_000, "30000"],
      [150_000, "50000"],
      [90_000, "12345"],
      [7_777, "1111"],
    ];
    for (const [subtotal, amount] of cases) {
      const percent = resolveDiscountPercent("amount", amount, subtotal);
      expect(Number(percent.toFixed(2))).toBe(percent);
    }
  });

  it("итог сходится с тем, что пересчитают из сохранённых полей", () => {
    const subtotal = 135_000;
    const percent = resolveDiscountPercent("amount", "30000", subtotal);
    const totalПоказанныйВрачу = calcTotal(subtotal, percent);
    // из базы читаются ровно эти два числа — пересчёт обязан дать тот же итог
    const totalИзБазы = calcTotal(subtotal, Number(percent.toFixed(2)));
    expect(totalПоказанныйВрачу).toBe(totalИзБазы);
  });
});

describe("formatMoney", () => {
  // Разделитель — именно неразрывный пробел: обычный переносит «сум» на
  // следующую строку в узких карточках. Записан кодом, а не символом, чтобы
  // его нельзя было незаметно заменить обычным пробелом при правке файла.
  const NBSP = " ";

  it("разряды разделяются неразрывным пробелом, валюта по локали", () => {
    expect(formatMoney(150000, "ru")).toBe(`150${NBSP}000${NBSP}сум`);
    expect(formatMoney(150000, "uz")).toBe(`150${NBSP}000${NBSP}so'm`);
  });
});
