import { describe, expect, it } from "vitest";
import { alongArch, archPath, archSlots, type ArchSlot } from "@/components/odontogram/archLayout";
import { PERMANENT_UPPER, PRIMARY_UPPER } from "@/lib/constants/teeth";

// мезиодистальные ширины верхних зубов по Wheeler's, мм: от центрального резца к третьему моляру
const WIDTHS = [8.5, 6.5, 7.5, 7, 6.5, 10, 9, 8.5];
const widthOf = (fdi: number) => WIDTHS[(fdi % 10) - 1];

function slot(slots: ArchSlot[], fdi: number): ArchSlot {
  const found = slots.find((s) => s.fdi === fdi);
  if (!found) throw new Error(`нет места для зуба ${fdi}`);
  return found;
}

describe("archSlots", () => {
  const slots = archSlots("upper", PERMANENT_UPPER, widthOf);

  it("место есть у каждого зуба, стороны зеркальны относительно середины", () => {
    expect(slots).toHaveLength(16);
    for (let pos = 1; pos <= 8; pos++) {
      const right = slot(slots, 10 + pos);
      const left = slot(slots, 20 + pos);
      expect(right.x).toBeCloseTo(-left.x, 6);
      expect(right.z).toBeCloseTo(left.z, 6);
      expect(right.rotationY).toBeCloseTo(-left.rotationY, 6);
    }
  });

  it("правая сторона пациента — слева, резцы спереди смотрят вперёд", () => {
    expect(slot(slots, 11).x).toBeLessThan(0);
    expect(slot(slots, 21).x).toBeGreaterThan(0);
    expect(Math.abs(slot(slots, 11).rotationY)).toBeLessThan(0.3);
  });

  it("моляры стоят позади клыков и смотрят губной стороной наружу", () => {
    expect(slot(slots, 16).z).toBeLessThan(slot(slots, 13).z);
    expect(slot(slots, 16).rotationY).toBeLessThan(-Math.PI / 4);
    expect(slot(slots, 26).rotationY).toBeGreaterThan(Math.PI / 4);
  });

  it("соседи касаются: по дуге между центрами — полусумма ширин, дуга без изломов", () => {
    for (let pos = 1; pos < 8; pos++) {
      const a = slot(slots, 10 + pos);
      const b = slot(slots, 11 + pos);
      const along = Math.abs(b.s - a.s);
      expect(along).toBeCloseTo((widthOf(10 + pos) + widthOf(11 + pos)) / 2, 6);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.9 * along);
    }
  });

  it("молочная дуга уже постоянной", () => {
    const primary = archSlots("upper", PRIMARY_UPPER, () => 6, 0.8);
    expect(primary).toHaveLength(10);
    expect(Math.abs(slot(primary, 55).x)).toBeLessThan(Math.abs(slot(slots, 16).x));
  });
});

describe("archPath", () => {
  it("идёт от from до to, нормаль единичная и спереди смотрит вперёд", () => {
    const path = archPath("lower", -30, 30);
    expect(path[0].s).toBeCloseTo(-30, 6);
    expect(path[path.length - 1].s).toBeCloseTo(30, 6);
    for (const p of path) expect(Math.hypot(p.nx, p.nz)).toBeCloseTo(1, 6);
    expect(path[Math.floor(path.length / 2)].nz).toBeGreaterThan(0.9);
  });
});

describe("alongArch", () => {
  const samples = [
    { s: -10, value: 8 },
    { s: 0, value: 10 },
    { s: 10, value: 6 },
  ];

  it("между точками — линейно, за краями — крайнее значение", () => {
    expect(alongArch(samples, -5)).toBeCloseTo(9, 6);
    expect(alongArch(samples, 5)).toBeCloseTo(8, 6);
    expect(alongArch(samples, -50)).toBe(8);
    expect(alongArch(samples, 50)).toBe(6);
  });
});
