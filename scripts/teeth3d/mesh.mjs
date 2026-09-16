/**
 * Сетка из поля расстояний методом surface nets: по вершине на ячейку,
 * пересекающую поверхность, и по четырёхугольнику на ребро сетки со сменой
 * знака. Вершины потом доводятся до нулевого уровня поля, а нормали берутся
 * из градиента — поэтому гладко выглядит даже крупная сетка.
 */

const PART_ORDER = ["I", "O", "M", "D", "V", "L", "root"];
const EPS = 0.01;

function gradient(field, x, y, z) {
  return [
    field(x + EPS, y, z) - field(x - EPS, y, z),
    field(x, y + EPS, z) - field(x, y - EPS, z),
    field(x, y, z + EPS) - field(x, y, z - EPS),
  ];
}

/** Шаг Ньютона к нулевому уровню поля и нормаль из градиента. */
function project(field, P, N, v, iterations = 2) {
  let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
  for (let it = 0; it < iterations; it++) {
    const f = field(x, y, z);
    const [gx, gy, gz] = gradient(field, x, y, z);
    const g2 = gx * gx + gy * gy + gz * gz;
    if (g2 < 1e-12) break;
    const s = (f * 2 * EPS) / g2;
    x -= s * gx;
    y -= s * gy;
    z -= s * gz;
  }
  const [gx, gy, gz] = gradient(field, x, y, z);
  const len = Math.hypot(gx, gy, gz) || 1;
  P[v * 3] = x;
  P[v * 3 + 1] = y;
  P[v * 3 + 2] = z;
  N[v * 3] = gx / len;
  N[v * 3 + 1] = gy / len;
  N[v * 3 + 2] = gz / len;
}

/**
 * Разметка по центрам треугольников даёт границу поверхностей лесенкой по
 * ячейкам сетки — на эмалево-цементной границе это заметно глазом. Сглаживаем
 * саму линию границы (у вершины ровно два соседа по ней, стыки трёх
 * поверхностей стоят на месте) и возвращаем точки на поверхность.
 */
function smoothBoundaries(field, P, N, tris, region, iterations = 10) {
  const owner = new Map();
  const neighbours = new Map();
  const link = (a, b) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a).add(b);
  };
  for (let t = 0; t < region.length; t++) {
    for (let e = 0; e < 3; e++) {
      const a = tris[t * 3 + e], b = tris[t * 3 + ((e + 1) % 3)];
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      const prev = owner.get(key);
      if (prev === undefined) owner.set(key, region[t]);
      else if (prev !== region[t]) {
        link(a, b);
        link(b, a);
      }
    }
  }
  const chain = [...neighbours].filter(([, set]) => set.size === 2).map(([v, set]) => [v, ...set]);
  for (let it = 0; it < iterations; it++) {
    const moved = chain.map(([v, p, q]) => [0, 1, 2].map((c) => 0.5 * P[v * 3 + c] + 0.25 * (P[p * 3 + c] + P[q * 3 + c])));
    chain.forEach(([v], i) => {
      P.set(moved[i], v * 3);
      project(field, P, N, v, 1);
    });
  }
}

export function polygonize(field, bounds, h, classify) {
  const [x0, y0, z0] = bounds.min;
  const nx = Math.ceil((bounds.max[0] - x0) / h) + 1;
  const ny = Math.ceil((bounds.max[1] - y0) / h) + 1;
  const nz = Math.ceil((bounds.max[2] - z0) / h) + 1;
  const id = (i, j, k) => i + nx * (j + ny * k);

  const values = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) values[id(i, j, k)] = field(x0 + i * h, y0 + j * h, z0 + k * h);

  // Вершина ячейки — среднее точек пересечения её рёбер с поверхностью
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cellVertex = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corner = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          corner[c] = values[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
          if (corner[c] < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          if (corner[a] < 0 === corner[b] < 0) continue;
          const t = corner[a] / (corner[a] - corner[b]);
          sx += (a & 1) + t * ((b & 1) - (a & 1));
          sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
          sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
          n++;
        }
        cellVertex[id(i, j, k)] = pos.length / 3;
        pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
      }

  const quads = [];
  const quad = (a, b, c, d) => {
    if (a >= 0 && b >= 0 && c >= 0 && d >= 0) quads.push(a, b, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = values[id(i, j, k)] < 0;
        if (i + 1 < nx && j > 0 && k > 0 && v !== values[id(i + 1, j, k)] < 0)
          quad(cellVertex[id(i, j - 1, k - 1)], cellVertex[id(i, j, k - 1)], cellVertex[id(i, j, k)], cellVertex[id(i, j - 1, k)]);
        if (j + 1 < ny && i > 0 && k > 0 && v !== values[id(i, j + 1, k)] < 0)
          quad(cellVertex[id(i - 1, j, k - 1)], cellVertex[id(i, j, k - 1)], cellVertex[id(i, j, k)], cellVertex[id(i - 1, j, k)]);
        if (k + 1 < nz && i > 0 && j > 0 && v !== values[id(i, j, k + 1)] < 0)
          quad(cellVertex[id(i - 1, j - 1, k)], cellVertex[id(i, j - 1, k)], cellVertex[id(i, j, k)], cellVertex[id(i - 1, j, k)]);
      }

  const vertexCount = pos.length / 3;
  const P = new Float32Array(pos);
  const N = new Float32Array(vertexCount * 3);
  for (let v = 0; v < vertexCount; v++) project(field, P, N, v);

  // Треугольники: короткая диагональ, ориентация наружу по нормалям вершин
  const tris = [];
  const region = [];
  // кроме поверхностей карты поле может описывать и отдельную деталь — коронку;
  // её имя дописывается в конец списка частей
  const names = [...PART_ORDER];
  const regionOf = (name) => {
    const i = names.indexOf(name);
    return i === -1 ? names.push(name) - 1 : i;
  };
  const at = (v, c) => P[v * 3 + c];
  const tri = (a, b, c) => {
    const u = [0, 1, 2].map((i) => at(b, i) - at(a, i));
    const w = [0, 1, 2].map((i) => at(c, i) - at(a, i));
    const cross = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const facing = [0, 1, 2].reduce((s, i) => s + cross[i] * (N[a * 3 + i] + N[b * 3 + i] + N[c * 3 + i]), 0);
    tris.push(...(facing < 0 ? [a, c, b] : [a, b, c]));
    region.push(regionOf(classify(...[0, 1, 2].map((i) => (at(a, i) + at(b, i) + at(c, i)) / 3))));
  };
  for (let q = 0; q < quads.length; q += 4) {
    const [a, b, c, d] = [quads[q], quads[q + 1], quads[q + 2], quads[q + 3]];
    const d02 = Math.hypot(at(a, 0) - at(c, 0), at(a, 1) - at(c, 1), at(a, 2) - at(c, 2));
    const d13 = Math.hypot(at(b, 0) - at(d, 0), at(b, 1) - at(d, 1), at(b, 2) - at(d, 2));
    if (d02 <= d13) {
      tri(a, b, c);
      tri(a, c, d);
    } else {
      tri(a, b, d);
      tri(b, c, d);
    }
  }

  smoothBoundaries(field, P, N, tris, region);

  // Каждая поверхность — отдельный меш; вершины на границах дублируются
  const parts = [];
  names.forEach((name, r) => {
    const remap = new Map();
    const positions = [];
    const normals = [];
    const indices = [];
    for (let t = 0; t < region.length; t++) {
      if (region[t] !== r) continue;
      for (let e = 0; e < 3; e++) {
        const g = tris[t * 3 + e];
        let l = remap.get(g);
        if (l === undefined) {
          l = remap.size;
          remap.set(g, l);
          positions.push(P[g * 3], P[g * 3 + 1], P[g * 3 + 2]);
          normals.push(N[g * 3], N[g * 3 + 1], N[g * 3 + 2]);
        }
        indices.push(l);
      }
    }
    if (!indices.length) return;
    parts.push({
      name,
      material: name === "root" ? "root" : name === "crown" ? "ceramic" : "enamel",
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: remap.size < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
    });
  });
  return { parts, vertices: vertexCount, triangles: region.length };
}
