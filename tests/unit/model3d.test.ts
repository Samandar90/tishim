import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toothModel, toothPaint } from "@/components/odontogram/model3d";
import type { SurfaceState } from "@/components/odontogram/types";
import {
  CONDITION_COLORS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
} from "@/lib/constants/teeth";

function at(condition: SurfaceState["condition"]): SurfaceState {
  return { condition, procedure: null, note: null, recordedAt: "2026-01-01T10:00:00Z" } as SurfaceState;
}

describe("toothModel", () => {
  it("у каждого зуба карты есть обе модели: для шторки и для челюсти", () => {
    for (const fdi of [...PERMANENT_UPPER, ...PERMANENT_LOWER, ...PRIMARY_UPPER, ...PRIMARY_LOWER]) {
      for (const lod of ["detail", "jaw"] as const) {
        const { url } = toothModel(fdi, lod);
        expect(existsSync(join(process.cwd(), "public", url)), `${fdi} → ${url}`).toBe(true);
      }
    }
  });

  it("модель для челюсти — облегчённый файл того же типа", () => {
    expect(toothModel(36, "jaw")).toEqual({
      url: "/models/teeth/46-lo.glb",
      mirrorX: true,
      flipY: false,
    });
  });

  it.each([
    [46, "/models/teeth/46.glb", false, false],
    [36, "/models/teeth/46.glb", true, false],
    [16, "/models/teeth/16.glb", false, true],
    [26, "/models/teeth/16.glb", true, true],
    [84, "/models/teeth/84.glb", false, false],
    [74, "/models/teeth/84.glb", true, false],
    [54, "/models/teeth/54.glb", false, true],
    [64, "/models/teeth/54.glb", true, true],
  ])("%i → %s, mirrorX=%s, flipY=%s", (fdi, url, mirrorX, flipY) => {
    expect(toothModel(fdi)).toEqual({ url, mirrorX, flipY });
  });
});

describe("toothPaint", () => {
  it("зуб без записей и здоровый зуб остаются в натуральном цвете", () => {
    expect(toothPaint(undefined)).toEqual({ colors: {}, ghost: false });
    expect(toothPaint({ whole: at("healthy"), surfaces: { O: at("healthy") } })).toEqual({
      colors: {},
      ghost: false,
    });
  });

  it("поверхность красится своим состоянием", () => {
    const { colors } = toothPaint({ surfaces: { O: at("caries"), M: at("filling") } });
    expect(colors).toEqual({ O: CONDITION_COLORS.caries, M: CONDITION_COLORS.filling });
  });

  it("коронка красит всю коронку поверх поверхностей, каналы под ней остаются", () => {
    const { colors, ghost } = toothPaint({
      whole: at("crown"),
      root: at("root_canal"),
      surfaces: { O: at("caries") },
    });
    for (const s of ["O", "I", "M", "D", "V", "L"] as const) {
      expect(colors[s]).toBe(CONDITION_COLORS.crown);
    }
    expect(colors.root).toBe(CONDITION_COLORS.root_canal);
    expect(ghost).toBe(false);
  });

  it("имплант красит и коронку, и корень", () => {
    const { colors } = toothPaint({ whole: at("implant"), surfaces: {} });
    expect(colors.O).toBe(CONDITION_COLORS.implant);
    expect(colors.root).toBe(CONDITION_COLORS.implant);
  });

  it.each(["extracted", "missing"] as const)("%s — модель полупрозрачная", (condition) => {
    expect(toothPaint({ whole: at(condition), surfaces: {} }).ghost).toBe(true);
  });

  it("корневое состояние красит только корень", () => {
    expect(toothPaint({ root: at("pulpitis"), surfaces: {} }).colors).toEqual({
      root: CONDITION_COLORS.pulpitis,
    });
  });
});
