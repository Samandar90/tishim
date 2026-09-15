import { isMesialOnRight } from "@/lib/constants/teeth";

export type JawView = "both" | "upper" | "lower";

type Point = readonly [number, number];

// Центры коронок вдоль дуги, мм: середина спереди в (0, 0), дальше назад (z < 0)
// и в сторону левой половины пациента; правая половина — зеркально. Средние
// размеры взрослой дуги, последняя точка — запас за третьим моляром.
const UPPER_HALF: Point[] = [
  [0, 0], [8, -2], [15, -6.5], [19, -12], [22, -18], [25, -26], [27, -36], [28.5, -45], [29.5, -55],
];
const LOWER_HALF: Point[] = [
  [0, 0], [6, -1.5], [11.5, -5], [16, -10.5], [19.5, -17], [22.5, -25], [24.5, -35], [26, -45], [27, -55],
];

const SUBDIVISIONS = 16;

interface Arch {
  points: Point[];
  lengths: number[];
  /** Длина дуги до середины. */
  mid: number;
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

function buildArch(jaw: "upper" | "lower", scale: number): Arch {
  const half = jaw === "upper" ? UPPER_HALF : LOWER_HALF;
  // дуга идёт от правой стороны пациента (x < 0) к левой через середину
  const control: Point[] = [
    ...half.slice(1).reverse().map(([x, z]): Point => [-x * scale, z * scale]),
    ...half.map(([x, z]): Point => [x * scale, z * scale]),
  ];
  const points: Point[] = [];
  for (let i = 0; i < control.length - 1; i++) {
    const p0 = control[Math.max(i - 1, 0)];
    const p3 = control[Math.min(i + 2, control.length - 1)];
    for (let k = 0; k < SUBDIVISIONS; k++) {
      points.push(catmullRom(p0, control[i], control[i + 1], p3, k / SUBDIVISIONS));
    }
  }
  points.push(control[control.length - 1]);

  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, bz - az));
  }
  return { points, lengths, mid: lengths[(half.length - 1) * SUBDIVISIONS] };
}

/** Точка дуги на расстоянии s от её начала и единичное направление дуги; за концами — по касательной. */
function pointAt({ points, lengths }: Arch, s: number) {
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const [ax, az] = points[i - 1];
  const [bx, bz] = points[i];
  const segment = lengths[i] - lengths[i - 1];
  const t = (s - lengths[i - 1]) / segment;
  return {
    x: ax + (bx - ax) * t,
    z: az + (bz - az) * t,
    tx: (bx - ax) / segment,
    tz: (bz - az) / segment,
  };
}

export interface ArchSlot {
  fdi: number;
  x: number;
  z: number;
  /** Поворот вокруг вертикали: губная сторона зуба смотрит наружу от дуги. */
  rotationY: number;
  /** Расстояние по дуге от середины; у правой стороны пациента отрицательное. */
  s: number;
}

/**
 * Места зубов на дуге. Центр коронки стоит от середины на сумме ширин зубов ближе
 * к середине плюс половине собственной ширины — соседние зубы касаются, как в
 * жизни, какими бы ни были ширины моделей.
 */
export function archSlots(
  jaw: "upper" | "lower",
  teeth: number[],
  widthOf: (fdi: number) => number,
  scale = 1
): ArchSlot[] {
  const arch = buildArch(jaw, scale);
  const byPosition = (a: number, b: number) => (a % 10) - (b % 10);
  const right = teeth.filter((fdi) => isMesialOnRight(fdi)).sort(byPosition);
  const left = teeth.filter((fdi) => !isMesialOnRight(fdi)).sort(byPosition);

  const slots: ArchSlot[] = [];
  for (const [side, list] of [[-1, right], [1, left]] as const) {
    let offset = 0;
    for (const fdi of list) {
      const width = widthOf(fdi);
      const s = side * (offset + width / 2);
      offset += width;
      const p = pointAt(arch, arch.mid + s);
      // наружу — направление дуги, повёрнутое на -90° вокруг вертикали: (-tz, tx)
      slots.push({ fdi, x: p.x, z: p.z, rotationY: Math.atan2(-p.tz, p.tx), s });
    }
  }
  return slots;
}

/** Точки дуги между s = from и s = to с нормалью наружу — ось, вдоль которой строится десна. */
export function archPath(jaw: "upper" | "lower", from: number, to: number, scale = 1, step = 1.5) {
  const arch = buildArch(jaw, scale);
  const count = Math.max(2, Math.ceil((to - from) / step) + 1);
  return Array.from({ length: count }, (_, i) => {
    const s = from + ((to - from) * i) / (count - 1);
    const p = pointAt(arch, arch.mid + s);
    return { s, x: p.x, z: p.z, nx: -p.tz, nz: p.tx };
  });
}

/** Линейная интерполяция по дуге между точками, отсортированными по s; за краями — крайнее значение. */
export function alongArch(samples: { s: number; value: number }[], s: number): number {
  if (s <= samples[0].s) return samples[0].value;
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i];
    if (s <= b.s) {
      const a = samples[i - 1];
      return a.value + ((b.value - a.value) * (s - a.s)) / (b.s - a.s);
    }
  }
  return samples[samples.length - 1].value;
}
