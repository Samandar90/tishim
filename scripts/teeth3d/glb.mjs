/**
 * Минимальный кодировщик glTF 2.0 Binary (GLB) без зависимостей.
 * Каждая часть зуба — отдельный узел со своим мешем: приложение находит
 * поверхность по имени узла (O, I, M, D, V, L, root) и красит её по состоянию.
 *
 * Вершины сжаты по KHR_mesh_quantization: координаты — int16, нормали — int8,
 * 12 байт на вершину вместо 24. Челюсть грузит 16 моделей разом, часто по
 * мобильной сети, а three.js читает это расширение сам.
 */

const MATERIALS = {
  enamel: { baseColorFactor: [0.95, 0.93, 0.88, 1], metallicFactor: 0, roughnessFactor: 0.35 },
  root: { baseColorFactor: [0.87, 0.79, 0.63, 1], metallicFactor: 0, roughnessFactor: 0.6 },
  titanium: { baseColorFactor: [0.72, 0.74, 0.77, 1], metallicFactor: 1, roughnessFactor: 0.35 },
  ceramic: { baseColorFactor: [0.97, 0.96, 0.93, 1], metallicFactor: 0, roughnessFactor: 0.2 },
  gutta: { baseColorFactor: [0.93, 0.45, 0.25, 1], metallicFactor: 0, roughnessFactor: 0.5 },
};

const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const BYTE = 5120;
const SHORT = 5122;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;

const pad4 = (n) => (4 - (n % 4)) % 4;

/**
 * Координаты — в int16 относительно центра части. Масштаб один на все оси:
 * при разном масштабе по осям three.js пересчитал бы нормали через него и
 * исказил освещение.
 */
function quantize(part) {
  const count = part.positions.length / 3;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < count; v++) {
    for (let c = 0; c < 3; c++) {
      const value = part.positions[v * 3 + c];
      if (value < min[c]) min[c] = value;
      if (value > max[c]) max[c] = value;
    }
  }
  const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const step = extent / 65534 || 1;
  const translation = [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
  // по 4 значения на вершину: элемент вершинного атрибута выравнивается на 4 байта
  const positions = new Int16Array(count * 4);
  const normals = new Int8Array(count * 4);
  const qmin = [32767, 32767, 32767];
  const qmax = [-32767, -32767, -32767];
  for (let v = 0; v < count; v++) {
    for (let c = 0; c < 3; c++) {
      const q = Math.round((part.positions[v * 3 + c] - translation[c]) / step);
      positions[v * 4 + c] = q;
      if (q < qmin[c]) qmin[c] = q;
      if (q > qmax[c]) qmax[c] = q;
      normals[v * 4 + c] = Math.round(Math.max(-1, Math.min(1, part.normals[v * 3 + c])) * 127);
    }
  }
  return { count, positions, normals, translation, scale: [step, step, step], qmin, qmax };
}

/**
 * parts: [{ name, material: "enamel" | "root" | "titanium" | "ceramic" | "gutta",
 *           positions: Float32Array, normals: Float32Array, indices: Uint16Array | Uint32Array }]
 */
export function encodeGlb(name, parts) {
  const materialNames = [...new Set(parts.map((p) => p.material))];
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let offset = 0;

  function addView(typed, target, byteStride) {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target, ...(byteStride ? { byteStride } : {}) });
    chunks.push(bytes);
    const padding = pad4(bytes.length);
    if (padding) chunks.push(new Uint8Array(padding));
    offset += bytes.length + padding;
    return bufferViews.length - 1;
  }

  const nodes = [{ name, children: parts.map((_, i) => i + 1) }];
  const meshes = parts.map((part, i) => {
    const q = quantize(part);
    accessors.push({ bufferView: addView(q.positions, ARRAY_BUFFER, 8), componentType: SHORT, count: q.count, type: "VEC3", min: q.qmin, max: q.qmax });
    const position = accessors.length - 1;
    accessors.push({ bufferView: addView(q.normals, ARRAY_BUFFER, 4), componentType: BYTE, normalized: true, count: q.count, type: "VEC3" });
    const normal = accessors.length - 1;
    const wide = part.indices instanceof Uint32Array;
    accessors.push({
      bufferView: addView(part.indices, ELEMENT_ARRAY_BUFFER),
      componentType: wide ? UNSIGNED_INT : UNSIGNED_SHORT,
      count: part.indices.length,
      type: "SCALAR",
    });
    nodes.push({ name: part.name, mesh: i, translation: q.translation, scale: q.scale });
    return {
      name: part.name,
      primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: accessors.length - 1, material: materialNames.indexOf(part.material) }],
    };
  });

  const json = {
    asset: { version: "2.0", generator: "tishim teeth3d" },
    extensionsUsed: ["KHR_mesh_quantization"],
    extensionsRequired: ["KHR_mesh_quantization"],
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes,
    meshes,
    materials: materialNames.map((m) => ({ name: m, pbrMetallicRoughness: MATERIALS[m] })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = pad4(jsonBytes.length);
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + offset;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length + jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(jsonBytes, 20);
  // JSON-чанк по спецификации добивается пробелами, а не нулями
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonBytes.length + jsonPad);
  let p = 20 + jsonBytes.length + jsonPad;
  view.setUint32(p, offset, true);
  view.setUint32(p + 4, 0x004e4942, true); // "BIN\0"
  p += 8;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}
