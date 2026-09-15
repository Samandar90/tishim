"use client";

import { useEffect, useRef } from "react";
import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  isUpperTooth,
} from "@/lib/constants/teeth";
import { alongArch, archPath, archSlots, type JawView } from "./archLayout";
import { toothModel, toothPaint } from "./model3d";
import {
  createScene,
  disposePaintable,
  highlightModel,
  loadModel,
  makePaintable,
  paintModel,
  type Paintable,
} from "./scene3d";
import type { Dentition } from "./Odontogram";
import type { ChartState } from "./types";

const GAP = 12; // рот приоткрыт: мм между кончиками верхних и нижних зубов
const OVERJET = 2; // верхние резцы стоят перед нижними, мм
const PRIMARY_SCALE = 0.8; // молочная дуга меньше постоянной
const DRAG = 0.008; // рад на пиксель
const TAP_SLOP = 6; // px: дальше касание уже считается вращением
const MAX_STEP = 80; // px за одно событие: больше — не жест, а скачок координат
const FIT_MARGIN = 1.15; // запас кадра, чтобы при вращении челюсть не сразу упиралась в края
const TRANSITION = 450; // мс на смену вида
const ACTIVE_GLOW = "#22d3ee";
const HOVER_GLOW = "#ffffff";

// Наклон челюсти в каждом виде. Спереди — чуть сверху, чтобы были видны и
// жевательные поверхности нижних зубов; верх и низ — со стороны смыкания,
// резцами к краю экрана, как дуги на бумажной схеме.
const VIEW_TILT: Record<JawView, number> = { both: 0.35, upper: -Math.PI / 2, lower: Math.PI / 2 };
const VIEWS = Object.keys(VIEW_TILT) as JawView[];

// Сечение десны: скруглённый прямоугольник, u — поперёк дуги наружу, v — от края
// десны к корням. Край на 1,5 мм заходит на коронку, как у живой десны.
const GUM_PROFILE: [number, number][] = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2;
  const round = (x: number) => Math.sign(x) * Math.sqrt(Math.abs(x));
  return [5.5 * round(Math.cos(a)), 6 + 7.5 * round(Math.sin(a))];
});

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);

type Jaw = "upper" | "lower";

function gumGeometry(
  path: ReturnType<typeof archPath>,
  cejAt: (s: number) => number,
  rootSign: 1 | -1
): BufferGeometry {
  const k = GUM_PROFILE.length;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const p of path) {
    const cej = cejAt(p.s);
    for (const [u, v] of GUM_PROFILE) {
      positions.push(p.x + p.nx * u, rootSign * (cej + v), p.z + p.nz * u);
    }
  }
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < k; j++) {
      const a = i * k + j;
      const b = i * k + ((j + 1) % k);
      indices.push(a, a + k, b, b, a + k, b + k);
    }
  }
  // торцы за последними зубами
  for (const ring of [0, path.length - 1]) {
    const center = positions.length / 3;
    const sum = [0, 0, 0];
    for (let j = 0; j < k; j++) {
      for (let c = 0; c < 3; c++) sum[c] += positions[(ring * k + j) * 3 + c];
    }
    positions.push(sum[0] / k, sum[1] / k, sum[2] / k);
    for (let j = 0; j < k; j++) indices.push(center, ring * k + j, ring * k + ((j + 1) % k));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

interface JawStage {
  build: (sources: Map<number, Object3D>, scale: number) => void;
  paint: (chart: ChartState) => void;
  /** Поворачивает челюсть к виду; повторный вызов с тем же видом сбрасывает вращение пальцем. */
  setView: (view: JawView) => void;
  highlight: (fdi: number | null) => void;
}

/** Бросает, если WebGL недоступен. */
function createJawStage(
  host: HTMLElement,
  initialView: JawView,
  onToothClick: (fdi: number) => void
): { stage: JawStage; dispose: () => void } {
  // touch-none: челюсть вращают во все стороны, поэтому жесты над сценой — её;
  // страница прокручивается за пределами сцены
  const { renderer, scene, canvas, dispose: disposeScene } = createScene(
    host,
    "block size-full touch-none cursor-grab"
  );
  const camera = new PerspectiveCamera(30, 1, 1, 2000);
  const pivot = new Group();
  const content = new Group();
  const jaws: Record<Jaw, Group> = { upper: new Group(), lower: new Group() };
  jaws.upper.position.y = GAP / 2;
  jaws.lower.position.set(0, -GAP / 2, -OVERJET);
  content.add(jaws.upper, jaws.lower);
  pivot.add(content);
  scene.add(pivot);

  const gumMaterial = new MeshStandardMaterial({
    color: "#e0909c",
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  });

  let teeth = new Map<number, Paintable>();
  let pickables: Record<Jaw, Mesh[]> = { upper: [], lower: [] };
  let gums: Mesh[] = [];
  // для каждого вида: центр видимой части в координатах content и её габариты в этом виде
  let focus: Record<JawView, { center: Vector3; size: Vector3 }> | null = null;
  let view = initialView;
  let active: number | null = null;
  let hovered: number | null = null;
  let distance = 200;
  let frame = 0;
  let transition: {
    start: number;
    fromQ: Quaternion;
    toQ: Quaternion;
    fromP: Vector3;
    toP: Vector3;
    fromD: number;
    toD: number;
  } | null = null;

  function fitDistance(size: Vector3) {
    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const tanH = tanV * camera.aspect;
    return Math.max(size.y / 2 / tanV, size.x / 2 / tanH) * FIT_MARGIN + size.z / 2;
  }

  function placeCamera() {
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.near = distance / 10;
    camera.far = distance * 3;
    camera.updateProjectionMatrix();
  }

  function tick(time: number) {
    frame = 0;
    if (transition) {
      const t = Math.min(Math.max((time - transition.start) / TRANSITION, 0), 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
      pivot.quaternion.slerpQuaternions(transition.fromQ, transition.toQ, eased);
      content.position.lerpVectors(transition.fromP, transition.toP, eased);
      distance = transition.fromD + (transition.toD - transition.fromD) * eased;
      placeCamera();
      if (t < 1) frame = requestAnimationFrame(tick);
      else transition = null;
    }
    renderer.render(scene, camera);
  }

  // кадр рисуется только по событию или во время смены вида: в покое сцена не тратит батарею
  function wake() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function applyView(animate: boolean) {
    if (!focus) return;
    jaws.upper.visible = view !== "lower";
    jaws.lower.visible = view !== "upper";
    const toQ = new Quaternion().setFromAxisAngle(X_AXIS, VIEW_TILT[view]);
    // центр видимой части — в начало координат, вокруг него и вращаем
    const toP = focus[view].center.clone().negate();
    const toD = fitDistance(focus[view].size);
    if (animate) {
      transition = {
        start: performance.now(),
        fromQ: pivot.quaternion.clone(),
        toQ,
        fromP: content.position.clone(),
        toP,
        fromD: distance,
        toD,
      };
    } else {
      transition = null;
      pivot.quaternion.copy(toQ);
      content.position.copy(toP);
      distance = toD;
      placeCamera();
    }
    wake();
  }

  function applyHighlights() {
    for (const [fdi, paintable] of teeth) {
      if (fdi === active) highlightModel(paintable, ACTIVE_GLOW, 0.5);
      else if (fdi === hovered) highlightModel(paintable, HOVER_GLOW, 0.12);
      else highlightModel(paintable, null);
    }
    canvas.classList.toggle("cursor-pointer", hovered !== null);
    canvas.classList.toggle("cursor-grab", hovered === null);
    wake();
  }

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  function pick(e: PointerEvent): number | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    scene.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    // скрытая челюсть лучом не ловится: Raycaster видимость не проверяет
    const targets = [
      ...(jaws.upper.visible ? pickables.upper : []),
      ...(jaws.lower.visible ? pickables.lower : []),
    ];
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? (hit.object.userData.fdi as number) : null;
  }

  const turn = new Quaternion();
  let pointer: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null =
    null;

  function onPointerDown(e: PointerEvent) {
    // второй палец челюсть не вращает
    if (pointer) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
    transition = null;
  }

  function onPointerMove(e: PointerEvent) {
    if (pointer && pointer.id === e.pointerId) {
      // кнопку отпустили, а pointerup не дошёл — перетаскивание закончилось
      if (e.pointerType === "mouse" && e.buttons === 0) {
        pointer = null;
        return;
      }
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.moved && Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) > TAP_SLOP) {
        pointer.moved = true;
      }
      // скачок за одно событие — не движение пальца: сменился масштаб страницы или события потерялись
      if (!pointer.moved || Math.abs(dx) > MAX_STEP || Math.abs(dy) > MAX_STEP) return;
      pivot.quaternion.premultiply(turn.setFromAxisAngle(Y_AXIS, dx * DRAG));
      pivot.quaternion.premultiply(turn.setFromAxisAngle(X_AXIS, dy * DRAG));
      wake();
    } else if (!pointer && e.pointerType === "mouse") {
      const fdi = pick(e);
      if (fdi !== hovered) {
        hovered = fdi;
        applyHighlights();
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const tap = !pointer.moved;
    pointer = null;
    if (!tap) return;
    const fdi = pick(e);
    if (fdi !== null) onToothClick(fdi);
  }

  function onPointerCancel(e: PointerEvent) {
    if (pointer?.id === e.pointerId) pointer = null;
  }

  function onPointerLeave() {
    if (hovered === null) return;
    hovered = null;
    applyHighlights();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onPointerCancel);
  canvas.addEventListener("pointerleave", onPointerLeave);

  const observer = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (focus && !transition) distance = fitDistance(focus[view].size);
    placeCamera();
    wake();
  });
  observer.observe(host);

  function clear() {
    for (const paintable of teeth.values()) disposePaintable(paintable);
    teeth = new Map();
    for (const gum of gums) gum.geometry.dispose();
    gums = [];
    pickables = { upper: [], lower: [] };
    jaws.upper.clear();
    jaws.lower.clear();
    focus = null;
    hovered = null;
  }

  function build(sources: Map<number, Object3D>, scale: number) {
    clear();
    for (const jaw of ["upper", "lower"] as const) {
      const placed = [...sources.entries()]
        .filter(([fdi]) => isUpperTooth(fdi) === (jaw === "upper"))
        .map(([fdi, source]) => {
          const { mirrorX, flipY } = toothModel(fdi, "jaw");
          const model = source.clone(true);
          model.scale.set(mirrorX ? -1 : 1, flipY ? -1 : 1, 1);
          model.updateMatrixWorld(true);
          const box = new Box3().setFromObject(model);
          const center = box.getCenter(new Vector3());
          const crown = flipY ? -box.min.y : box.max.y;
          // кончик коронки — на плоскости смыкания, центр коронки — на дуге;
          // шейка зуба оказывается на высоте crown, там же проходит край десны
          model.position.set(-center.x, flipY ? crown : -crown, -center.z);
          return { fdi, model, width: box.max.x - box.min.x, crown };
        });
      if (placed.length === 0) continue;

      const byFdi = new Map(placed.map((p) => [p.fdi, p] as const));
      const slots = archSlots(jaw, [...byFdi.keys()], (fdi) => byFdi.get(fdi)?.width ?? 7, scale);
      for (const slot of slots) {
        const p = byFdi.get(slot.fdi);
        if (!p) continue;
        const holder = new Group();
        holder.position.set(slot.x, 0, slot.z);
        holder.rotation.y = slot.rotationY;
        holder.add(p.model);
        jaws[jaw].add(holder);
        teeth.set(slot.fdi, makePaintable(p.model));
        p.model.traverse((o) => {
          if (!(o instanceof Mesh)) return;
          o.userData.fdi = slot.fdi;
          pickables[jaw].push(o);
        });
      }

      const sorted = [...slots].sort((a, b) => a.s - b.s);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const crowns = sorted.map((slot) => ({ s: slot.s, value: byFdi.get(slot.fdi)?.crown ?? 8 }));
      const path = archPath(
        jaw,
        first.s - (byFdi.get(first.fdi)?.width ?? 7) / 2 - 1.5,
        last.s + (byFdi.get(last.fdi)?.width ?? 7) / 2 + 1.5,
        scale
      );
      const gum = new Mesh(
        gumGeometry(path, (s) => alongArch(crowns, s), jaw === "upper" ? 1 : -1),
        gumMaterial
      );
      // десна рисуется после зубов: она полупрозрачная, корни видны сквозь неё
      gum.renderOrder = 1;
      jaws[jaw].add(gum);
      gums.push(gum);
    }

    // Центры меряются в покое, габариты — уже в повороте своего вида: кадрирование
    // по описанной сфере оставляло челюсть мелкой посреди сцены.
    const targetOf = (v: JawView) => (v === "both" ? content : jaws[v]);
    const measured = {} as Record<JawView, { center: Vector3; size: Vector3 }>;
    pivot.quaternion.identity();
    content.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    for (const v of VIEWS) {
      measured[v] = { center: new Box3().setFromObject(targetOf(v)).getCenter(new Vector3()), size: new Vector3() };
    }
    for (const v of VIEWS) {
      pivot.quaternion.setFromAxisAngle(X_AXIS, VIEW_TILT[v]);
      content.position.copy(measured[v].center).negate();
      scene.updateMatrixWorld(true);
      new Box3().setFromObject(targetOf(v)).getSize(measured[v].size);
    }
    focus = measured;
    applyView(false);
  }

  function paint(chart: ChartState) {
    for (const [fdi, paintable] of teeth) paintModel(paintable, toothPaint(chart[fdi]));
    wake();
  }

  function setView(next: JawView) {
    view = next;
    applyView(true);
  }

  function highlight(fdi: number | null) {
    active = fdi;
    applyHighlights();
  }

  function dispose() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    clear();
    gumMaterial.dispose();
    disposeScene();
  }

  return { stage: { build, paint, setView, highlight }, dispose };
}

/** Обе челюсти в 3D: вращаются пальцем, зубы окрашены по карте, тап по зубу — onToothClick. */
export default function Jaw3D({
  chart,
  dentition,
  view,
  viewResets,
  activeFdi,
  label,
  className,
  onToothClick,
  onReady,
  onFail,
}: {
  chart: ChartState;
  dentition: Dentition;
  view: JawView;
  /** Растёт при каждом нажатии на вид: повторное нажатие возвращает челюсть в исходный поворот. */
  viewResets: number;
  activeFdi: number | null;
  label: string;
  className?: string;
  onToothClick: (fdi: number) => void;
  /** Сцена собрана для этого прикуса и на экране. */
  onReady: (dentition: Dentition) => void;
  /** WebGL недоступен или модели не загрузились. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<JawStage | null>(null);
  // Пропсы читаются через ref: сцена и загрузка не должны пересоздаваться
  // от новых стрелочных функций родителя на каждом рендере.
  const latest = useRef({ chart, view, activeFdi, onToothClick, onReady, onFail });
  latest.current = { chart, view, activeFdi, onToothClick, onReady, onFail };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let created;
    try {
      created = createJawStage(host, latest.current.view, (fdi) => latest.current.onToothClick(fdi));
    } catch {
      latest.current.onFail();
      return;
    }
    const { stage, dispose } = created;
    stageRef.current = stage;
    return () => {
      stageRef.current = null;
      dispose();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    const fdis =
      dentition === "permanent"
        ? [...PERMANENT_UPPER, ...PERMANENT_LOWER]
        : [...PRIMARY_UPPER, ...PRIMARY_LOWER];
    Promise.all(fdis.map((fdi) => loadModel(toothModel(fdi, "jaw").url))).then(
      (sources) => {
        if (cancelled) return;
        const byFdi = new Map<number, Object3D>(fdis.map((fdi, i) => [fdi, sources[i]] as const));
        stage.build(byFdi, dentition === "primary" ? PRIMARY_SCALE : 1);
        stage.paint(latest.current.chart);
        stage.highlight(latest.current.activeFdi);
        latest.current.onReady(dentition);
      },
      () => {
        if (!cancelled) latest.current.onFail();
      }
    );
    return () => {
      cancelled = true;
    };
  }, [dentition]);

  useEffect(() => {
    stageRef.current?.paint(chart);
  }, [chart]);

  useEffect(() => {
    stageRef.current?.setView(view);
  }, [view, viewResets]);

  useEffect(() => {
    stageRef.current?.highlight(activeFdi);
  }, [activeFdi]);

  return <div ref={hostRef} role="img" aria-label={label} className={className} />;
}
