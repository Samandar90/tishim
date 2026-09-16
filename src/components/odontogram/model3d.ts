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

/** Узлы модели: поверхности коронки, корень и детали, которых у здорового зуба нет. */
export type ToothNode = Surface | "root" | "crown" | "implant" | "canals";

/** Детали, которые в модели есть всегда, но видны, только когда их требует карта. */
export const EXTRA_NODES: readonly ToothNode[] = ["crown", "implant", "canals"];

export interface ToothPaint {
  /** Цвет по узлу; узла в списке нет — у него натуральный материал модели. */
  colors: Partial<Record<ToothNode, string>>;
  /** Видимость, отличная от обычной: детали по умолчанию скрыты, остальное видно. */
  visible: Partial<Record<ToothNode, boolean>>;
  /** Корень полупрозрачный — сквозь него видны пломбированные каналы. */
  seeThroughRoot: boolean;
  /** Зуб удалён или отсутствует — модель показывается полупрозрачной. */
  ghost: boolean;
}

/**
 * Те же правила, что у плоского Tooth: коронка, мост, имплант и отсутствие зуба
 * красят коронку целиком поверх отдельных поверхностей. Чего нет на плоской схеме,
 * показывают детали модели: коронка и мост надеты колпачком, имплант стоит вместо
 * корня, а пролеченные каналы видны сквозь полупрозрачный корень.
 */
export function toothPaint(state: ToothState | undefined): ToothPaint {
  const whole = state?.whole?.condition;
  const rootCondition = state?.root?.condition;
  const ghost = whole === "extracted" || whole === "missing";
  const implant = whole === "implant";
  const capped = whole === "crown" || whole === "bridge" || implant;

  const colors: ToothPaint["colors"] = {};
  const visible: ToothPaint["visible"] = {};
  for (const s of ALL_SURFACES) {
    const condition = ghost || capped ? whole : state?.surfaces[s]?.condition;
    if (condition && condition !== "healthy") colors[s] = CONDITION_COLORS[condition];
  }
  if (capped && whole) {
    visible.crown = true;
    colors.crown = CONDITION_COLORS[whole];
  }
  if (implant) {
    visible.implant = true;
    visible.root = false;
  }

  const canals = !ghost && !implant && rootCondition === "root_canal";
  if (canals) {
    visible.canals = true;
    colors.canals = CONDITION_COLORS.root_canal;
  } else if (ghost && whole) {
    colors.root = CONDITION_COLORS[whole];
  } else if (!implant && rootCondition && rootCondition !== "healthy") {
    colors.root = CONDITION_COLORS[rootCondition];
  }

  return { colors, visible, seeThroughRoot: canals, ghost };
}
