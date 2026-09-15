"use client";

import { useEffect, useRef } from "react";
import { Box3, Group, PerspectiveCamera, Sphere, Vector3, type Object3D } from "three";
import { toothModel, toothPaint, type ToothPaint } from "./model3d";
import {
  createScene,
  disposePaintable,
  loadModel,
  makePaintable,
  paintModel,
  type Paintable,
} from "./scene3d";
import type { ToothState } from "./types";

const AUTO_SPIN = 0.4; // рад/с
const DRAG = 0.012; // рад на пиксель
const FRICTION = 3; // затухание инерции, 1/с
const START_ANGLE = -0.5; // три четверти: видны и губная, и боковая поверхности

interface Stage {
  show: (model: Object3D, mirrorX: boolean, flipY: boolean) => void;
  clear: () => void;
  paint: (paint: ToothPaint) => void;
}

/** Бросает, если WebGL недоступен. */
function createStage(host: HTMLElement): { stage: Stage; dispose: () => void } {
  // pan-y: вертикальный свайп по модели прокручивает шторку, горизонтальный вращает зуб
  const { renderer, scene, canvas, dispose: disposeScene } = createScene(
    host,
    "block size-full touch-pan-y"
  );
  const camera = new PerspectiveCamera(30, 1, 1, 1000);
  const pivot = new Group();
  scene.add(pivot);

  let current: Paintable | null = null;
  let radius = 10;
  let crownSign = 1;

  let spin = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let lastTime = 0;
  let frame = 0;
  let prevTime = 0;

  function tick(time: number) {
    const dt = prevTime ? Math.min((time - prevTime) / 1000, 0.05) : 0;
    prevTime = time;
    if (!dragging) {
      if (spin) {
        pivot.rotation.y += AUTO_SPIN * dt;
      } else if (Math.abs(velocity) > 0.02) {
        pivot.rotation.y += velocity * dt;
        velocity *= Math.exp(-FRICTION * dt);
      } else {
        velocity = 0;
      }
    }
    renderer.render(scene, camera);
    frame = dragging || spin || velocity ? requestAnimationFrame(tick) : 0;
    if (!frame) prevTime = 0;
  }

  // кадры идут, только пока зуб движется; в покое шторка не тратит батарею
  function wake() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function placeCamera() {
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const distance = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05;
    // камера чуть со стороны коронки — видна и жевательная поверхность
    camera.position.set(0, crownSign * distance * 0.3, distance);
    camera.lookAt(0, 0, 0);
    camera.near = distance / 20;
    camera.far = distance * 4;
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    placeCamera();
    wake();
  });
  observer.observe(host);

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    spin = false;
    velocity = 0;
    lastX = e.clientX;
    lastTime = e.timeStamp;
    canvas.setPointerCapture(e.pointerId);
    wake();
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dt = Math.max((e.timeStamp - lastTime) / 1000, 1 / 240);
    pivot.rotation.y += dx * DRAG;
    velocity = Math.max(-10, Math.min(10, (dx * DRAG) / dt));
    lastX = e.clientX;
    lastTime = e.timeStamp;
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    // палец замер перед отпусканием — бросать нечего
    if (e.timeStamp - lastTime > 80) velocity = 0;
    wake();
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  function clear() {
    if (current) {
      pivot.remove(current.root);
      disposePaintable(current);
    }
    current = null;
  }

  function show(next: Object3D, mirrorX: boolean, flipY: boolean) {
    clear();
    next.scale.set(mirrorX ? -1 : 1, flipY ? -1 : 1, 1);
    next.updateMatrixWorld(true);
    const box = new Box3().setFromObject(next);
    // центр модели — в начало координат: зуб вращается вокруг своей оси
    next.position.sub(box.getCenter(new Vector3()));
    radius = box.getBoundingSphere(new Sphere()).radius;
    crownSign = flipY ? -1 : 1;
    current = makePaintable(next);
    pivot.rotation.y = START_ANGLE;
    pivot.add(next);
    placeCamera();
  }

  function paint(p: ToothPaint) {
    if (current) paintModel(current, p);
    wake();
  }

  function dispose() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    clear();
    disposeScene();
  }

  return { stage: { show, clear, paint }, dispose };
}

/** Один зуб в 3D: крутится пальцем, поверхности окрашены по карте. */
export default function Tooth3D({
  fdi,
  state,
  label,
  className,
  onReady,
  onFail,
}: {
  fdi: number;
  state?: ToothState;
  label: string;
  className?: string;
  /** Модель этого зуба загружена и на экране. */
  onReady: (fdi: number) => void;
  /** WebGL недоступен или модель не загрузилась. */
  onFail: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  // Состояние и колбэки читаются через ref: сцена и загрузка не должны
  // пересоздаваться от новых стрелочных функций родителя на каждом рендере.
  const latest = useRef({ state, onReady, onFail });
  latest.current = { state, onReady, onFail };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let created;
    try {
      created = createStage(host);
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
    stage.clear();
    const { url, mirrorX, flipY } = toothModel(fdi);
    loadModel(url).then(
      (source) => {
        if (cancelled) return;
        stage.show(source.clone(true), mirrorX, flipY);
        stage.paint(toothPaint(latest.current.state));
        latest.current.onReady(fdi);
      },
      () => {
        if (!cancelled) latest.current.onFail();
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fdi]);

  useEffect(() => {
    stageRef.current?.paint(toothPaint(state));
  }, [state]);

  return <div ref={hostRef} role="img" aria-label={label} className={className} />;
}
