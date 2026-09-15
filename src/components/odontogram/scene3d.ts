import {
  DirectionalLight,
  Mesh,
  NeutralToneMapping,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
  type Color,
  type Group,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ToothNode, ToothPaint } from "./model3d";

// Модели кэшируются на всю жизнь страницы: шторку зуба и карту открывают снова и
// снова, и качать и разбирать те же GLB повторно незачем.
const models = new Map<string, Promise<Group>>();

export function loadModel(url: string): Promise<Group> {
  let model = models.get(url);
  if (!model) {
    model = new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene);
    // неудачная загрузка не кэшируется — следующее открытие попробует снова
    model.catch(() => models.delete(url));
    models.set(url, model);
  }
  return model;
}

/** Рендерер и сцена с мягким студийным светом, холст — внутри host. Бросает, если WebGL недоступен. */
export function createScene(host: HTMLElement, canvasClassName: string) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.className = canvasClassName;
  host.appendChild(canvas);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  const light = new DirectionalLight(0xffffff, 1.5);
  light.position.set(2, 3, 4);
  scene.add(light);

  function dispose() {
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    // iOS держит лишь несколько WebGL-контекстов — свой отдаём сразу, не ждём сборщика мусора
    renderer.forceContextLoss();
    canvas.remove();
  }

  return { renderer, scene, canvas, dispose };
}

/** Копия модели зуба, у каждой поверхности которой свой материал. */
export interface Paintable {
  root: Object3D;
  natural: Map<MeshStandardMaterial, Color>;
}

export function makePaintable(root: Object3D): Paintable {
  const natural = new Map<MeshStandardMaterial, Color>();
  // материалы общие у всех копий модели из кэша — каждой поверхности свой экземпляр
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const material = (o.material as MeshStandardMaterial).clone();
    o.material = material;
    natural.set(material, material.color.clone());
  });
  return { root, natural };
}

export function paintModel({ root, natural }: Paintable, { colors, ghost }: ToothPaint) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const material = o.material as MeshStandardMaterial;
    const color = colors[o.name as ToothNode] ?? natural.get(material);
    if (color) material.color.set(color);
    if (material.transparent !== ghost) {
      material.transparent = ghost;
      material.depthWrite = !ghost;
      material.needsUpdate = true;
    }
    material.opacity = ghost ? 0.3 : 1;
  });
}

/** Подсветка всего зуба свечением; null — снять. */
export function highlightModel({ natural }: Paintable, color: string | null, intensity = 0.4) {
  for (const material of natural.keys()) {
    material.emissive.set(color ?? "#000000");
    material.emissiveIntensity = color ? intensity : 1;
  }
}

export function disposePaintable({ natural }: Paintable) {
  for (const material of natural.keys()) material.dispose();
  natural.clear();
}
