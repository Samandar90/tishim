/**
 * Форма зуба как поле расстояний (SDF): отрицательно внутри, положительно
 * снаружи. Поле, а не набор полигонов — потому что бугры, валики и фуркация
 * корней получаются мягким слиянием примитивов без швов, а сетку потом
 * строит mesh.mjs с любой детализацией.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, v) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};
const smax = (a, b, k) => -smin(-a, -b, k);

/** Сечение-суперэллипс; расстояние вдоль луча от оси — для нулевого уровня этого достаточно. */
function section(dx, dz, a, b, n) {
  const r = (Math.abs(dx / a) ** n + Math.abs(dz / b) ** n) ** (1 / n);
  const len = Math.hypot(dx, dz);
  if (r < 1e-9) return -Math.min(a, b);
  return len - len / r;
}

/** Конус со скруглёнными концами (Inigo Quilez) — один корень. */
function roundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

function ellipsoid(px, py, pz, rx, ry, rz) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

const SHAPE = {
  incisor: { tA: 0.75, tB: 0.2, top: (aM) => [aM * 0.95, 0.45], n: 2.2, kTop: 0.4 },
  canine: { tA: 0.6, tB: 0.3, top: (aM) => [aM * 0.55, 0.7], n: 2.2, kTop: 0.6 },
  premolar: { tA: 0.65, tB: 0.35, top: (aM, bM) => [aM * 0.88, bM * 0.72], n: 2.4, kTop: 0.9 },
  molar: { tA: 0.65, tB: 0.35, top: (aM, bM) => [aM * 0.9, bM * 0.74], n: 2.7, kTop: 0.9 },
};

function bulge(cervix, max, top, t, tMax) {
  if (t < tMax) return cervix + (max - cervix) * Math.sin((Math.PI / 2) * (t / tMax));
  return max + (top - max) * ((t - tMax) / (1 - tMax)) ** 2;
}

export function buildTooth(spec) {
  const shape = SHAPE[spec.kind];
  const aC = spec.mdCervix / 2, aM = spec.md / 2;
  const bC = spec.vlCervix / 2, bM = spec.vl / 2;
  const [aTop, bTop] = shape.top(aM, bM);
  const crown = spec.crown;
  const roots = spec.roots ?? [];
  const multi = roots.length > 0;
  const rootLen = spec.root;
  const posterior = spec.kind === "premolar" || spec.kind === "molar";
  const cusps = (spec.cusps ?? []).map((c) => ({ x: c.x * aTop, z: c.z * bTop, h: c.h * 1.25, s2: 1.3 * c.r * c.r }));
  const cuspH = Math.max(0, ...cusps.map((c) => c.h));
  const shear = spec.shear ?? 0;
  const taper = spec.lingualTaper ?? 0;

  function widths(y) {
    if (y >= 0) {
      const t = Math.min(1, y / crown);
      return [bulge(aC, aM, aTop, t, shape.tA), bulge(bC, bM, bTop, t, shape.tB), 0];
    }
    const u = Math.min(1, -y / rootLen);
    const k = 1 - 0.84 * u ** 2;
    // верхушка корня однокорневых зубов чуть загибается дистально
    return [aC * k, bC * k, multi ? 0 : -0.06 * rootLen * u * u];
  }

  function top(x, z) {
    if (spec.kind === "incisor") {
      const X = Math.abs(x / aM);
      return crown - 1.3 * smoothstep(0.5, 1.05, X) * (x < 0 ? 1.5 : 1);
    }
    if (spec.kind === "canine") {
      const dx = x - 0.12 * aM;
      return crown + 0.35 - (dx > 0 ? 0.5 : 0.62) * Math.sqrt(dx * dx + 0.5);
    }
    let h = crown - cuspH;
    for (const c of cusps) {
      const dx = x - c.x, dz = z - c.z;
      h += c.h * Math.exp(-(dx * dx + dz * dz) / c.s2);
    }
    const X = Math.abs(x / aTop);
    // краевые валики замыкают жевательную площадку с мезиальной и дистальной сторон
    h += 0.25 * cuspH * Math.exp(-(((X - 0.9) / 0.12) ** 2));
    // широкая мелкая фиссура: узкую сетка не разрешает, и она выглядела трещиной
    h -= 0.25 * Math.exp(-((z / 0.5) ** 2)) * (1 - smoothstep(0.3, 0.7, X));
    return h;
  }

  function field(x, y, z) {
    const yc = clamp(y, -rootLen, crown);
    const [a, b, cx] = widths(yc);
    const aEff = a * (1 - taper * clamp(-z / b, 0, 1));
    let d = section(x - cx - shear * z, z, aEff, b, shape.n);
    d = smax(d, y - top(x, z), shape.kTop);

    if (!posterior) {
      // язычная ямка резцов и клыков, по краям остаются краевые валики
      const fy = 0.58 * crown;
      const [, bf] = widths(fy);
      const fossa = ellipsoid(x, y - fy, z + bf + 0.85, aM * 0.5, crown * 0.3, 1.0);
      d = smax(d, -fossa, 0.5);
    }

    if (!multi) return smax(d, -(y + rootLen), 0.4);

    d = smax(d, -(y + spec.trunk), 1.6);
    const [aT, bT] = widths(-spec.trunk * 0.5);
    for (const r of roots) {
      // Корень из двух конусов: толстый до середины и сужение к верхушке.
      // Один конус давал тонкий шип. Z сжат на fz — так сечение сплющено.
      const sx = r.x * aT, sz = r.z * bT, sy = -spec.trunk * 0.4;
      const ex = sx + r.ax, ez = sz + r.az / r.fz, ey = -r.len;
      const mx = sx + r.ax * 0.45 - 0.25, my = sy + (ey - sy) * 0.55, mz = sz + (ez - sz) * 0.45;
      const pz = sz + (z - sz) / r.fz;
      const k = Math.min(1, r.fz);
      // Обычный min, а не мягкий: конусы сходятся в общей сфере, и мягкое
      // слияние наращивало на стыке заметное кольцо.
      const rd = Math.min(
        roundCone(x, y, pz, sx, sy, sz, mx, my, mz, r.r, r.r * 0.78) * k,
        roundCone(x, y, pz, mx, my, mz, ex, ey, ez, r.r * 0.78, 0.5) * k
      );
      d = smin(d, rd, 1.4);
    }
    return d;
  }

  const spreadX = Math.max(0, ...roots.map((r) => Math.abs(r.ax) + r.r));
  const spreadZ = Math.max(0, ...roots.map((r) => Math.abs(r.az) + r.r * r.fz));
  const depth = Math.max(rootLen, ...roots.map((r) => r.len));
  const bounds = {
    min: [-(aM + spreadX + 1.5), -(depth + 1.5), -(bM + spreadZ + 1.5)],
    max: [aM + spreadX + 1.5, crown + 1.5, bM + spreadZ + 1.5],
  };

  /** Поверхность по классификации карты: I/O, M, D, V, L или корень. */
  function classify(x, y, z) {
    const X = x / aC, Z = z / bC;
    const w = (X * X) / (X * X + Z * Z + 1e-6);
    if (y < spec.cej * w - 0.3 * (1 - w)) return "root";
    if (!posterior) {
      if (y > crown - (spec.kind === "incisor" ? 1.1 : 1.8) && Math.abs(x / aM) < 0.9) return "I";
    } else if (y > crown - cuspH - 1 && Math.abs(x / aTop) < 0.8 && Math.abs(z / bTop) < 0.72) {
      return "O";
    }
    if (Math.abs(x / aM) > Math.abs(z / bM)) return x > 0 ? "M" : "D";
    return z > 0 ? "V" : "L";
  }

  // Коронка — то же поле, раздутое на толщину стенки и срезанное чуть ниже шейки:
  // она закрывает свою коронку целиком, как настоящая.
  const CAP = 0.35;
  const capField = (x, y, z) => smax(field(x, y, z) - CAP, -(y + 0.3), 0.3);
  const capBounds = { min: [bounds.min[0], -1.5, bounds.min[2]], max: bounds.max };

  // Пломбированные каналы — ломаные от пульповой камеры по оси каждого корня,
  // не доходя до верхушки. Точки корней те же, что в field(), но в мировом Z:
  // там Z сжат на fz.
  const chamber = [0, Math.min(1.5, crown * 0.2), 0];
  const [aT, bT] = multi ? widths(-spec.trunk * 0.5) : [0, 0];
  const canals = multi
    ? roots.map((r) => {
        const sx = r.x * aT, sz = r.z * bT, sy = -spec.trunk * 0.4;
        const ex = sx + r.ax, ey = -r.len, ez = sz + r.az;
        const mx = sx + r.ax * 0.45 - 0.25, my = sy + (ey - sy) * 0.55, mz = sz + r.az * 0.45;
        const tip = 0.85;
        return [
          chamber,
          [sx * 0.5, sy * 0.3, sz * 0.5],
          [sx, sy, sz],
          [mx, my, mz],
          [mx + (ex - mx) * tip, my + (ey - my) * tip, mz + (ez - mz) * tip],
        ];
      })
    : [
        Array.from({ length: 7 }, (_, i) => {
          const y = chamber[1] - (i / 6) * (chamber[1] + rootLen - 1.8);
          return [widths(y)[2], y, 0];
        }),
      ];

  // Имплант — на оси зуба, толщиной по шейке, короче корня.
  const implant = {
    radius: clamp(Math.min(spec.mdCervix, spec.vlCervix) * 0.31, 1.7, 2.5),
    length: clamp(rootLen - 1.5, 8, 12),
  };

  return { field, bounds, classify, capField, capBounds, canals, implant };
}
