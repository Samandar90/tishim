/**
 * Программный рендер сетки в PNG без браузера и зависимостей: три проекции
 * на зуб, как в атласах анатомии, — вестибулярная, мезиальная и окклюзионная.
 * Нужен, чтобы проверять форму прямо из скрипта генерации.
 */
import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Перевод в систему камеры: [вправо, вверх, к зрителю]
const VIEWS = {
  front: (x, y, z) => [x, y, z],
  side: (x, y, z) => [-z, y, x],
  top: (x, y, z) => [x, -z, y],
};

const BASE = { enamel: [242, 236, 224], root: [222, 200, 160] };
const DEBUG = { I: [220, 80, 200], O: [220, 80, 200], M: [230, 80, 70], D: [70, 120, 230], V: [80, 200, 110], L: [230, 200, 60], root: [150, 150, 150] };
const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const KEY = norm([0.35, 0.55, 0.75]);
const RIM = norm([-0.7, 0.25, -0.2]);
const HALF = norm([KEY[0], KEY[1], KEY[2] + 1]);
const BG = [11, 18, 32];

function drawTooth(img, parts, view, rect, scale, debug) {
  const T = VIEWS[view];
  const verts = parts.map((p) => {
    const out = new Float32Array(p.positions.length);
    for (let i = 0; i < p.positions.length; i += 3) out.set(T(p.positions[i], p.positions[i + 1], p.positions[i + 2]), i);
    return out;
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of verts)
    for (let i = 0; i < v.length; i += 3) {
      minX = Math.min(minX, v[i]); maxX = Math.max(maxX, v[i]);
      minY = Math.min(minY, v[i + 1]); maxY = Math.max(maxY, v[i + 1]);
    }
  const cx = rect.x + rect.w / 2 - ((minX + maxX) / 2) * scale;
  const cy = rect.y + rect.h / 2 + ((minY + maxY) / 2) * scale;

  parts.forEach((part, pi) => {
    const V = verts[pi];
    const color = debug ? DEBUG[part.name] : BASE[part.material];
    const idx = part.indices;
    for (let t = 0; t < idx.length; t += 3) {
      const ids = [idx[t], idx[t + 1], idx[t + 2]];
      const sx = ids.map((i) => cx + V[i * 3] * scale);
      const sy = ids.map((i) => cy - V[i * 3 + 1] * scale);
      const sz = ids.map((i) => V[i * 3 + 2]);
      const area = (sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0]);
      if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(rect.x, Math.floor(Math.min(...sx))), x1 = Math.min(rect.x + rect.w - 1, Math.ceil(Math.max(...sx)));
      const y0 = Math.max(rect.y, Math.floor(Math.min(...sy))), y1 = Math.min(rect.y + rect.h - 1, Math.ceil(Math.max(...sy)));
      const n = ids.map((i) => T(part.normals[i * 3], part.normals[i * 3 + 1], part.normals[i * 3 + 2]));
      for (let py = y0; py <= y1; py++)
        for (let px = x0; px <= x1; px++) {
          const qx = px + 0.5, qy = py + 0.5;
          const w0 = ((sx[1] - qx) * (sy[2] - qy) - (sx[2] - qx) * (sy[1] - qy)) / area;
          const w1 = ((sx[2] - qx) * (sy[0] - qy) - (sx[0] - qx) * (sy[2] - qy)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const depth = w0 * sz[0] + w1 * sz[1] + w2 * sz[2];
          const o = py * img.w + px;
          if (depth <= img.depth[o]) continue;
          img.depth[o] = depth;
          const nn = norm([0, 1, 2].map((c) => w0 * n[0][c] + w1 * n[1][c] + w2 * n[2][c]));
          const dot = (l) => nn[0] * l[0] + nn[1] * l[1] + nn[2] * l[2];
          const diffuse = 0.15 + 0.85 * Math.max(0, dot(KEY)) + 0.3 * Math.max(0, dot(RIM));
          const spec = debug ? 0 : 90 * Math.max(0, dot(HALF)) ** 40;
          for (let c = 0; c < 3; c++) img.rgb[o * 3 + c] = Math.min(255, color[c] * diffuse + spec);
        }
    }
  });
}

/** teeth: [{ fdi, parts }] — столбец на зуб, строки: спереди, сбоку, сверху. */
export function renderSheet(teeth, { scale = 7, debug = false } = {}) {
  const colW = 140, rowH = [220, 220, 140], pad = 10;
  const w = teeth.length * colW + pad * 2;
  const h = rowH.reduce((a, b) => a + b, 0) + pad * 2;
  const img = { w, h, rgb: new Uint8Array(w * h * 3), depth: new Float32Array(w * h) };
  for (let i = 0; i < w * h; i++) img.rgb.set(BG, i * 3);
  teeth.forEach(({ parts }, col) => {
    let y = pad;
    ["front", "side", "top"].forEach((view, row) => {
      img.depth.fill(-Infinity);
      drawTooth(img, parts, view, { x: pad + col * colW, y, w: colW, h: rowH[row] }, scale, debug);
      y += rowH[row];
    });
  });
  return encodePng(w, h, img.rgb);
}
