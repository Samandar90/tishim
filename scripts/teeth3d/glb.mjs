/**
 * Минимальный кодировщик glTF 2.0 Binary (GLB) без зависимостей.
 * Каждая часть зуба — отдельный узел со своим мешем: приложение находит
 * поверхность по имени узла (O, I, M, D, V, L, root) и красит её по состоянию.
 */

const MATERIALS = {
  enamel: { baseColorFactor: [0.95, 0.93, 0.88, 1], metallicFactor: 0, roughnessFactor: 0.35 },
  root: { baseColorFactor: [0.87, 0.79, 0.63, 1], metallicFactor: 0, roughnessFactor: 0.6 },
  titanium: { baseColorFactor: [0.72, 0.74, 0.77, 1], metallicFactor: 1, roughnessFactor: 0.35 },
};

const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;

const pad4 = (n) => (4 - (n % 4)) % 4;

function minMax(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      if (positions[i + c] < min[c]) min[c] = positions[i + c];
      if (positions[i + c] > max[c]) max[c] = positions[i + c];
    }
  }
  return { min, max };
}

/**
 * parts: [{ name, material: "enamel" | "root" | "titanium", positions: Float32Array,
 *           normals: Float32Array, indices: Uint16Array | Uint32Array }]
 */
export function encodeGlb(name, parts) {
  const materialNames = [...new Set(parts.map((p) => p.material))];
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let offset = 0;

  function addView(typed, target) {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    chunks.push(bytes);
    const padding = pad4(bytes.length);
    if (padding) chunks.push(new Uint8Array(padding));
    offset += bytes.length + padding;
    return bufferViews.length - 1;
  }

  const nodes = [{ name, children: parts.map((_, i) => i + 1) }];
  const meshes = parts.map((part, i) => {
    const { min, max } = minMax(part.positions);
    const count = part.positions.length / 3;
    accessors.push({ bufferView: addView(part.positions, ARRAY_BUFFER), componentType: FLOAT, count, type: "VEC3", min, max });
    const position = accessors.length - 1;
    accessors.push({ bufferView: addView(part.normals, ARRAY_BUFFER), componentType: FLOAT, count, type: "VEC3" });
    const normal = accessors.length - 1;
    const wide = part.indices instanceof Uint32Array;
    accessors.push({
      bufferView: addView(part.indices, ELEMENT_ARRAY_BUFFER),
      componentType: wide ? UNSIGNED_INT : UNSIGNED_SHORT,
      count: part.indices.length,
      type: "SCALAR",
    });
    nodes.push({ name: part.name, mesh: i });
    return {
      name: part.name,
      primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: accessors.length - 1, material: materialNames.indexOf(part.material) }],
    };
  });

  const json = {
    asset: { version: "2.0", generator: "tishim teeth3d" },
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
