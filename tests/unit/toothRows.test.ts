import { describe, expect, it } from "vitest";
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  jawRow,
  toothRowIndex,
} from "@/lib/constants/teeth";

describe("toothRowIndex", () => {
  it("постоянные ряды идут слева направо от правой восьмёрки пациента к левой", () => {
    expect(PERMANENT_UPPER.map(toothRowIndex)).toEqual([...Array(16).keys()]);
    expect(PERMANENT_LOWER.map(toothRowIndex)).toEqual([...Array(16).keys()]);
  });

  it("молочный зуб стоит на месте своего постоянного преемника", () => {
    expect(toothRowIndex(55)).toBe(toothRowIndex(15));
    expect(toothRowIndex(51)).toBe(toothRowIndex(11));
    expect(toothRowIndex(61)).toBe(toothRowIndex(21));
    expect(toothRowIndex(85)).toBe(toothRowIndex(45));
    expect(toothRowIndex(75)).toBe(toothRowIndex(35));
  });

  it("молочные ряды из констант уже стоят в порядке ряда", () => {
    const sorted = (row: number[]) => [...row].sort((a, b) => toothRowIndex(a) - toothRowIndex(b));
    expect(sorted(PRIMARY_UPPER)).toEqual(PRIMARY_UPPER);
    expect(sorted(PRIMARY_LOWER)).toEqual(PRIMARY_LOWER);
  });
});

describe("jawRow", () => {
  it("делит зубы по челюстям и расставляет по ряду", () => {
    const teeth = [36, 11, 47, 26, 16];

    expect(jawRow(teeth, "upper")).toEqual([16, 11, 26]);
    expect(jawRow(teeth, "lower")).toEqual([47, 36]);
  });

  it("молочные зубы не теряются — приём ребёнка раньше оставался без схемы", () => {
    const teeth = [55, 54, 75, 84, 16];

    expect(jawRow(teeth, "upper")).toEqual([16, 55, 54]);
    expect(jawRow(teeth, "lower")).toEqual([84, 75]);
  });

  it("сменный прикус: молочный и постоянный на одном месте стоят рядом, постоянный первым", () => {
    expect(jawRow([55, 15, 14], "upper")).toEqual([15, 55, 14]);
  });

  it("повторы и несуществующие номера отбрасываются", () => {
    expect(jawRow([16, 16, 99, 0, 19, 56], "upper")).toEqual([16]);
  });

  it("пустой список — пустой ряд", () => {
    expect(jawRow([], "lower")).toEqual([]);
  });
});
