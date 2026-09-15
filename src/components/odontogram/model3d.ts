import type { Surface } from "@/lib/types/database";
import {
  ALL_SURFACES,
  CONDITION_COLORS,
  isMesialOnRight,
  isUpperTooth,
  quadrant,
} from "@/lib/constants/teeth";
import type { ToothState } from "./types";

/**
 * Файл модели и разворот для зуба. Генератор (scripts/teeth3d) делает модели
 * только правой стороны: верхние типы 11–18 и 51–55, нижние 41–48 и 81–85.
 * Остальные квадранты — те же файлы, отражённые по осям.
 */
export interface ToothModel {
  url: string;
  /** Левая половина рта: мезиальная поверхность смотрит в другую сторону. */
  mirrorX: boolean;
  /** Верхняя челюсть: коронкой вниз, как на карте. */
  flipY: boolean;
}

/** detail — крупная модель для шторки зуба, jaw — облегчённая: челюсть показывает все зубы сразу. */
export function toothModel(fdi: number, lod: "detail" | "jaw" = "detail"): ToothModel {
  // верхние типы лежат в файлах 1x и 5x, нижние — в 4x и 8x
  const set = (isUpperTooth(fdi) ? 1 : 4) + (quadrant(fdi) >= 5 ? 4 : 0);
  return {
    url: `/models/teeth/${set * 10 + (fdi % 10)}${lod === "jaw" ? "-lo" : ""}.glb`,
    mirrorX: !isMesialOnRight(fdi),
    flipY: isUpperTooth(fdi),
  };
}

/** Узлы модели, которые красятся по карте: поверхности коронки и корень. */
export type ToothNode = Surface | "root";

export interface ToothPaint {
  /** Цвет по узлу; узла в списке нет — у него натуральный материал модели. */
  colors: Partial<Record<ToothNode, string>>;
  /** Зуб удалён или отсутствует — модель показывается полупрозрачной. */
  ghost: boolean;
}

/**
 * Те же правила, что у плоского Tooth: коронка, мост, имплант и отсутствие зуба
 * красят коронку целиком поверх отдельных поверхностей. Отличие одно: геометрии
 * каналов в модели нет, поэтому лечение каналов красит корень целиком.
 */
export function toothPaint(state: ToothState | undefined): ToothPaint {
  const whole = state?.whole?.condition;
  const ghost = whole === "extracted" || whole === "missing";
  const crownOverride = ghost || whole === "crown" || whole === "bridge" || whole === "implant";

  const colors: ToothPaint["colors"] = {};
  for (const s of ALL_SURFACES) {
    const condition = crownOverride ? whole : state?.surfaces[s]?.condition;
    if (condition && condition !== "healthy") colors[s] = CONDITION_COLORS[condition];
  }
  const root = ghost || whole === "implant" ? whole : state?.root?.condition;
  if (root && root !== "healthy") colors.root = CONDITION_COLORS[root];

  return { colors, ghost };
}
