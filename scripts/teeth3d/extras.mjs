/**
 * Детали, которых нет у здорового зуба: пломбированные каналы и имплант.
 * Строятся прямо сеткой, а не полем: канал тоньше шага сетки и потерялся бы при
 * полигонизации, а имплант — тело вращения с резьбой, его точнее описать профилем.
 */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [0, 1, 2].map(
    (c) =>
      0.5 *
      (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3)
  );
}

function smoothPath(points, subdivisions) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    for (let k = 0; k < subdivisions; k++) out.push(catmullRom(p0, points[i], points[i + 1], p3, k / subdivisions));
  }
  out.push(points[points.length - 1]);
  return out;
}

function toPart(name, material, positions, normals, indices) {
  return {
    name,
    material,
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: positions.length / 3 < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
  };
}

/** Трубки вдоль ломаных; к верхушке радиус сходит почти на нет, как у пломбы в канале. */
export function canalsPart(paths, radius, segments, subdivisions) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (const path of paths) {
    const points = smoothPath(path, subdivisions);
    const base = positions.length / 3;
    let normal = null;
    points.forEach((p, i) => {
      const t = normalize(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]));
      // нормаль переносится вдоль пути, а не строится заново — иначе трубка перекручивается
      const seed = normal ?? (Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
      const k = dot(seed, t);
      normal = normalize([seed[0] - t[0] * k, seed[1] - t[1] * k, seed[2] - t[2] * k]);
      const binormal = cross(t, normal);
      const u = i / (points.length - 1);
      const r = radius * (u < 0.8 ? 1 : 1 - ((u - 0.8) / 0.2) * 0.85);
      for (let s = 0; s < segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const dir = [0, 1, 2].map((c) => normal[c] * Math.cos(a) + binormal[c] * Math.sin(a));
        positions.push(p[0] + dir[0] * r, p[1] + dir[1] * r, p[2] + dir[2] * r);
        normals.push(dir[0], dir[1], dir[2]);
      }
    });
    for (let i = 0; i < points.length - 1; i++) {
      for (let s = 0; s < segments; s++) {
        const a = base + i * segments + s;
        const b = base + i * segments + ((s + 1) % segments);
        // обход против часовой снаружи: грани смотрят наружу трубки
        indices.push(a, b, a + segments, b, b + segments, a + segments);
      }
    }
  }
  return toPart("canals", "gutta", positions, normals, indices);
}

/**
 * Имплант вокруг оси Y: абатмент над шейкой, гладкая шейка, резьба, скруглённая
 * верхушка. ringsPerPitch — сколько колец профиля на виток: для челюсти хватает двух.
 */
export function implantPart({ radius, length }, segments, ringsPerPitch) {
  const profile = [
    [0, 3.2],
    [radius * 0.38, 3.2],
    [radius * 0.48, 0.3],
    [radius, 0],
    [radius, -0.8],
  ];
  const pitch = 0.8;
  const bodyEnd = -(length - 1.6);
  for (let y = -0.8 - pitch / ringsPerPitch; y > bodyEnd; y -= pitch / ringsPerPitch) {
    const phase = (((-y / pitch) % 1) + 1) % 1;
    const thread = 0.22 * (1 - Math.abs(phase * 2 - 1));
    const taper = 1 - 0.12 * ((-0.8 - y) / (-0.8 - bodyEnd));
    profile.push([radius * taper - thread, y]);
  }
  profile.push([radius * 0.7, -(length - 0.6)], [radius * 0.35, -length + 0.1], [0, -length]);

  const positions = [];
  const normals = [];
  const indices = [];
  profile.forEach(([r, y], i) => {
    const prev = profile[Math.max(i - 1, 0)];
    const next = profile[Math.min(i + 1, profile.length - 1)];
    // нормаль профиля — его направление, повёрнутое наружу от оси
    const nr0 = -(next[1] - prev[1]);
    const ny0 = next[0] - prev[0];
    const nl = Math.hypot(nr0, ny0) || 1;
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      positions.push(r * Math.cos(a), y, r * Math.sin(a));
      normals.push((nr0 / nl) * Math.cos(a), ny0 / nl, (nr0 / nl) * Math.sin(a));
    }
  });
  for (let i = 0; i < profile.length - 1; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * segments + s;
      const b = i * segments + ((s + 1) % segments);
      indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }
  return toPart("implant", "titanium", positions, normals, indices);
}
