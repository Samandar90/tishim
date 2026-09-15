/**
 * Анатомия зубов для генератора 3D-моделей. Размеры — средние по учебнику
 * Wheeler's Dental Anatomy, миллиметры. Модель описывает зуб правой стороны
 * (квадранты 1/4 и 5/8) в локальной системе: Y вверх к режущему краю,
 * Y = 0 на эмалево-цементной границе, +X мезиально, +Z вестибулярно.
 *
 * md / mdCervix — мезиодистальная ширина коронки на контакте и у шейки;
 * vl / vlCervix — вестибуло-оральная ширина максимум и у шейки;
 * cej — насколько эмалево-цементная граница поднимается на апроксимальных сторонах;
 * cusps — бугры: x, z в долях полуширин коронки, h — высота над фиссурой, r — радиус;
 * roots — корни многокорневых зубов: x, z в долях полуширин шейки, len — длина,
 *         r — радиус у начала, ax/az — смещение верхушки (расхождение корней),
 *         fz — сплющенность сечения (ширина по Z к ширине по X);
 * trunk — длина корневого ствола до фуркации; shear — ромбовидность верхних моляров.
 */

const incisor = (o) => ({ kind: "incisor", cej: 3, lingualTaper: 0.35, ...o });
const canine = (o) => ({ kind: "canine", cej: 2.5, lingualTaper: 0.3, ...o });
const premolar = (o) => ({ kind: "premolar", cej: 1, ...o });
const molar = (o) => ({ kind: "molar", cej: 0.8, ...o });

const UPPER_MOLAR_ROOTS = (spread, len) => [
  { x: 0.55, z: 0.5, len, r: 2.3, ax: 1.2 * spread, az: 1.4 * spread, fz: 1.1 },
  { x: -0.55, z: 0.5, len: len - 1, r: 2.1, ax: -1.2 * spread, az: 1.2 * spread, fz: 1.2 },
  { x: 0, z: -0.55, len: len + 1, r: 2.6, ax: 0, az: -2.6 * spread, fz: 0.85 },
];

const LOWER_MOLAR_ROOTS = (spread, len) => [
  { x: 0.55, z: 0, len, r: 2.0, ax: 1.0 * spread, az: 0, fz: 1.9 },
  { x: -0.55, z: 0, len: len - 1, r: 1.9, ax: -1.3 * spread, az: 0, fz: 1.7 },
];

const UPPER_MOLAR_CUSPS = (dl) => [
  { x: 0.5, z: 0.5, h: 1.6, r: 1.6 },
  { x: -0.5, z: 0.5, h: 1.4, r: 1.5 },
  { x: 0.4, z: -0.45, h: 1.9, r: 2.0 },
  ...(dl > 0 ? [{ x: -0.5, z: -0.5, h: dl, r: 1.3 }] : []),
];

export const TEETH = {
  // Постоянные, верхняя челюсть
  11: incisor({ crown: 10.5, root: 13, md: 8.5, mdCervix: 7, vl: 7, vlCervix: 6, cej: 3.5 }),
  12: incisor({ crown: 9, root: 13, md: 6.5, mdCervix: 5, vl: 6, vlCervix: 5 }),
  13: canine({ crown: 10, root: 17, md: 7.5, mdCervix: 5.5, vl: 8, vlCervix: 7 }),
  14: premolar({
    crown: 8.5, root: 14, md: 7, mdCervix: 5, vl: 9, vlCervix: 8, trunk: 7,
    cusps: [{ x: 0, z: 0.5, h: 1.9, r: 1.8 }, { x: 0, z: -0.5, h: 1.3, r: 1.7 }],
    roots: [
      { x: 0, z: 0.45, len: 14, r: 2.1, ax: 0, az: 0.9, fz: 0.9 },
      { x: 0, z: -0.45, len: 13.5, r: 2.1, ax: 0, az: -1.1, fz: 0.9 },
    ],
  }),
  15: premolar({
    crown: 8.5, root: 14, md: 7, mdCervix: 5, vl: 9, vlCervix: 8,
    cusps: [{ x: 0, z: 0.5, h: 1.5, r: 1.8 }, { x: 0, z: -0.5, h: 1.4, r: 1.8 }],
  }),
  16: molar({
    crown: 7.5, root: 13, md: 10, mdCervix: 8, vl: 11, vlCervix: 10, trunk: 4, shear: 0.15,
    cusps: UPPER_MOLAR_CUSPS(1.1), roots: UPPER_MOLAR_ROOTS(1, 13),
  }),
  17: molar({
    crown: 7, root: 12, md: 9, mdCervix: 7, vl: 11, vlCervix: 10, trunk: 4.5, shear: 0.12,
    cusps: UPPER_MOLAR_CUSPS(0.7), roots: UPPER_MOLAR_ROOTS(0.6, 12),
  }),
  18: molar({
    crown: 6.5, root: 11, md: 8.5, mdCervix: 6.5, vl: 10, vlCervix: 9.5, trunk: 6, shear: 0.1,
    cusps: UPPER_MOLAR_CUSPS(0), roots: UPPER_MOLAR_ROOTS(0.25, 11),
  }),

  // Постоянные, нижняя челюсть
  41: incisor({ crown: 9, root: 12.5, md: 5, mdCervix: 3.5, vl: 6, vlCervix: 5.3, lingualTaper: 0.2 }),
  42: incisor({ crown: 9.5, root: 14, md: 5.5, mdCervix: 4, vl: 6.5, vlCervix: 5.8, lingualTaper: 0.2 }),
  43: canine({ crown: 11, root: 16, md: 7, mdCervix: 5.5, vl: 7.5, vlCervix: 7 }),
  44: premolar({
    crown: 8.5, root: 14, md: 7, mdCervix: 5, vl: 7.5, vlCervix: 6.5,
    cusps: [{ x: 0, z: 0.3, h: 2.3, r: 1.9 }, { x: 0, z: -0.6, h: 0.6, r: 1.2 }],
  }),
  45: premolar({
    crown: 8, root: 14.5, md: 7, mdCervix: 5, vl: 8, vlCervix: 7,
    cusps: [
      { x: 0, z: 0.45, h: 1.6, r: 1.9 },
      { x: 0.4, z: -0.5, h: 1.2, r: 1.3 },
      { x: -0.4, z: -0.5, h: 0.9, r: 1.2 },
    ],
  }),
  46: molar({
    crown: 7.5, root: 14, md: 11, mdCervix: 9, vl: 10.5, vlCervix: 9, trunk: 3,
    cusps: [
      { x: 0.55, z: 0.5, h: 1.3, r: 1.6 },
      { x: 0, z: 0.55, h: 1.2, r: 1.5 },
      { x: -0.6, z: 0.3, h: 0.9, r: 1.2 },
      { x: 0.5, z: -0.5, h: 1.7, r: 1.6 },
      { x: -0.35, z: -0.5, h: 1.6, r: 1.5 },
    ],
    roots: LOWER_MOLAR_ROOTS(1, 14),
  }),
  47: molar({
    crown: 7, root: 13, md: 10.5, mdCervix: 8, vl: 10, vlCervix: 9, trunk: 4,
    cusps: [
      { x: 0.5, z: 0.5, h: 1.2, r: 1.7 },
      { x: -0.5, z: 0.5, h: 1.1, r: 1.7 },
      { x: 0.5, z: -0.5, h: 1.6, r: 1.7 },
      { x: -0.5, z: -0.5, h: 1.5, r: 1.7 },
    ],
    roots: LOWER_MOLAR_ROOTS(0.6, 13),
  }),
  48: molar({
    crown: 7, root: 11, md: 10, mdCervix: 7.5, vl: 9.5, vlCervix: 9, trunk: 5.5,
    cusps: [
      { x: 0.5, z: 0.5, h: 1.0, r: 1.6 },
      { x: -0.5, z: 0.45, h: 0.9, r: 1.6 },
      { x: 0.45, z: -0.5, h: 1.3, r: 1.6 },
      { x: -0.45, z: -0.5, h: 1.2, r: 1.6 },
    ],
    roots: LOWER_MOLAR_ROOTS(0.2, 11),
  }),

  // Молочные, верхняя челюсть: шейка сужена сильнее, корни моляров широко разведены
  51: incisor({ crown: 6, root: 10, md: 6.5, mdCervix: 4.5, vl: 5, vlCervix: 4, cej: 1.5, primary: true }),
  52: incisor({ crown: 5.6, root: 11.4, md: 5.1, mdCervix: 3.7, vl: 4, vlCervix: 3.7, cej: 1.5, primary: true }),
  53: canine({ crown: 6.5, root: 13.5, md: 7, mdCervix: 5.1, vl: 7, vlCervix: 5.5, cej: 1.5, primary: true }),
  54: molar({
    crown: 5.1, root: 10, md: 7.3, mdCervix: 5.2, vl: 8.5, vlCervix: 6.9, trunk: 2, shear: 0.1, primary: true,
    cusps: [{ x: 0.35, z: 0.5, h: 1.3, r: 1.5 }, { x: -0.5, z: 0.5, h: 0.8, r: 1.1 }, { x: 0.2, z: -0.45, h: 1.2, r: 1.6 }],
    roots: UPPER_MOLAR_ROOTS(1.6, 10).map((r) => ({ ...r, r: r.r * 0.7 })),
  }),
  55: molar({
    crown: 5.7, root: 11.7, md: 8.2, mdCervix: 6.4, vl: 10, vlCervix: 8.3, trunk: 2, shear: 0.15, primary: true,
    cusps: UPPER_MOLAR_CUSPS(0.9).map((c) => ({ ...c, h: c.h * 0.8, r: c.r * 0.85 })),
    roots: UPPER_MOLAR_ROOTS(1.8, 11.7).map((r) => ({ ...r, r: r.r * 0.75 })),
  }),

  // Молочные, нижняя челюсть
  81: incisor({ crown: 5, root: 9, md: 4, mdCervix: 3, vl: 4, vlCervix: 3.5, cej: 1, lingualTaper: 0.2, primary: true }),
  82: incisor({ crown: 5.2, root: 10, md: 4.1, mdCervix: 3, vl: 4, vlCervix: 3.5, cej: 1, lingualTaper: 0.2, primary: true }),
  83: canine({ crown: 6, root: 11.5, md: 5, mdCervix: 3.7, vl: 4.8, vlCervix: 4, cej: 1, primary: true }),
  84: molar({
    crown: 6, root: 9.8, md: 7.7, mdCervix: 6.5, vl: 7, vlCervix: 5.3, trunk: 1.5, primary: true,
    cusps: [
      { x: 0.5, z: 0.45, h: 1.4, r: 1.4 },
      { x: -0.45, z: 0.45, h: 0.9, r: 1.3 },
      { x: 0.45, z: -0.45, h: 1.6, r: 1.3 },
      { x: -0.45, z: -0.45, h: 1.0, r: 1.2 },
    ],
    roots: LOWER_MOLAR_ROOTS(1.7, 9.8).map((r) => ({ ...r, r: r.r * 0.7 })),
  }),
  85: molar({
    crown: 5.5, root: 11.3, md: 9.9, mdCervix: 7.2, vl: 8.7, vlCervix: 6.4, trunk: 1.5, primary: true,
    cusps: [
      { x: 0.55, z: 0.5, h: 1.1, r: 1.4 },
      { x: 0, z: 0.55, h: 1.0, r: 1.3 },
      { x: -0.6, z: 0.3, h: 0.8, r: 1.1 },
      { x: 0.5, z: -0.5, h: 1.4, r: 1.4 },
      { x: -0.35, z: -0.5, h: 1.3, r: 1.3 },
    ],
    roots: LOWER_MOLAR_ROOTS(1.8, 11.3).map((r) => ({ ...r, r: r.r * 0.7 })),
  }),
};
