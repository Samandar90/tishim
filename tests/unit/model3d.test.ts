import { existsSync, readFileSync } from "node:fs";
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

const ALL_TEETH = [...PERMANENT_UPPER, ...PERMANENT_LOWER, ...PRIMARY_UPPER, ...PRIMARY_LOWER];

function at(condition: SurfaceState["condition"]): SurfaceState {
  return { condition, procedure: null, note: null, recordedAt: "2026-01-01T10:00:00Z" } as SurfaceState;
}

/** Имена узлов из JSON-чанка GLB. */
function glbNodeNames(url: string): string[] {
  const bytes = readFileSync(join(process.cwd(), "public", url));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8")) as {
    nodes: { name: string }[];
  };
  return json.nodes.map((n) => n.name);
}

describe("toothModel", () => {
  it("у каждого зуба карты есть обе модели: для шторки и для челюсти", () => {
    for (const fdi of ALL_TEETH) {
      for (const lod of ["detail", "jaw"] as const) {
        const { url } = toothModel(fdi, lod);
        expect(existsSync(join(process.cwd(), "public", url)), `${fdi} → ${url}`).toBe(true);
      }
    }
  });

  it("в каждой модели есть скрытые детали: колпачок коронки, имплант и каналы", () => {
    for (const fdi of ALL_TEETH) {
      for (const lod of ["detail", "jaw"] as const) {
        const { url } = toothModel(fdi, lod);
        expect(glbNodeNames(url), url).toEqual(
          expect.arrayContaining(["root", "crown", "implant", "canals"])
        );
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
  it("зуб без записей и здоровый зуб остаются как есть, детали скрыты", () => {
    const plain = { colors: {}, visible: {}, seeThroughRoot: false, ghost: false };
    expect(toothPaint(undefined)).toEqual(plain);
    expect(toothPaint({ whole: at("healthy"), surfaces: { O: at("healthy") } })).toEqual(plain);
  });

  it("поверхность красится своим состоянием", () => {
    const { colors } = toothPaint({ surfaces: { O: at("caries"), M: at("filling") } });
    expect(colors).toEqual({ O: CONDITION_COLORS.caries, M: CONDITION_COLORS.filling });
  });

  it.each(["crown", "bridge"] as const)(
    "%s надета колпачком, пролеченные каналы видны сквозь корень",
    (condition) => {
      const paint = toothPaint({
        whole: at(condition),
        root: at("root_canal"),
        surfaces: { O: at("caries") },
      });
      for (const s of ["O", "I", "M", "D", "V", "L"] as const) {
        expect(paint.colors[s]).toBe(CONDITION_COLORS[condition]);
      }
      expect(paint.visible).toEqual({ crown: true, canals: true });
      expect(paint.colors.crown).toBe(CONDITION_COLORS[condition]);
      expect(paint.colors.canals).toBe(CONDITION_COLORS.root_canal);
      expect(paint.colors.root).toBeUndefined();
      expect(paint.seeThroughRoot).toBe(true);
    }
  );

  it("имплант стоит вместо корня, сверху колпачок", () => {
    const paint = toothPaint({ whole: at("implant"), root: at("root_canal"), surfaces: {} });
    expect(paint.visible).toEqual({ crown: true, implant: true, root: false });
    expect(paint.colors.crown).toBe(CONDITION_COLORS.implant);
    expect(paint.seeThroughRoot).toBe(false);
  });

  it.each(["extracted", "missing"] as const)("%s — модель полупрозрачная, без деталей", (condition) => {
    const paint = toothPaint({ whole: at(condition), surfaces: {} });
    expect(paint.ghost).toBe(true);
    expect(paint.visible).toEqual({});
  });

  it("корневое состояние без лечения каналов красит только корень", () => {
    expect(toothPaint({ root: at("pulpitis"), surfaces: {} })).toEqual({
      colors: { root: CONDITION_COLORS.pulpitis },
      visible: {},
      seeThroughRoot: false,
      ghost: false,
    });
  });
});
