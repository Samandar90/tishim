"use client";

import { memo } from "react";
import type { Surface } from "@/lib/types/database";
import {
  CONDITION_COLORS,
  centerSurface,
  isMesialOnRight,
  isUpperTooth,
  rootCount,
} from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";
import type { SurfaceState, ToothPart, ToothState } from "./types";

export interface ToothProps {
  fdi: number;
  state?: ToothState;
  onSurfaceClick?: (fdi: number, part: ToothPart) => void;
  onPartHover?: (info: { fdi: number; part: ToothPart } | null) => void;
  readOnly?: boolean;
  /** Части, подсвеченные как выбранные (форма приёма). */
  selected?: ToothPart[];
  /** Локализованные названия поверхностей для нативных тултипов. */
  partLabels?: Partial<Record<ToothPart, string>>;
  /** Ширина в px; высота считается по пропорции. Тач-зона не меньше 44px. */
  width?: number;
  /** Тёмный фон (hero лендинга) — контуры светлее, чтобы зуб читался. */
  onDark?: boolean;
}

const W = 52;
const H = 82;
const CROWN_TOP = 2;
const CROWN_H = 46;
const INSET = 13;
const ROOT_H = 30;

type Poly = { part: ToothPart; points: string };

/**
 * Геометрия коронки: центральная площадка + четыре трапеции.
 * Стороны считаются от прикуса: V всегда наружу, M — к средней линии.
 */
function crownGeometry(fdi: number) {
  const upper = isUpperTooth(fdi);
  const top = upper ? H - CROWN_TOP - CROWN_H : CROWN_TOP;
  const bottom = top + CROWN_H;
  const iT = top + INSET;
  const iB = bottom - INSET;

  const outer: Surface = upper ? "V" : "L";
  const inner: Surface = upper ? "L" : "V";
  const right: Surface = isMesialOnRight(fdi) ? "M" : "D";
  const left: Surface = right === "M" ? "D" : "M";

  const polys: Poly[] = [
    { part: outer, points: `4,${top} 48,${top} 35,${iT} 17,${iT}` },
    { part: inner, points: `4,${bottom} 48,${bottom} 35,${iB} 17,${iB}` },
    { part: left, points: `4,${top} 17,${iT} 17,${iB} 4,${bottom}` },
    { part: right, points: `48,${top} 35,${iT} 35,${iB} 48,${bottom}` },
  ];
  const center: Poly = { part: centerSurface(fdi), points: `17,${iT} 35,${iT} 35,${iB} 17,${iB}` };

  return { polys, center, top, bottom };
}

/**
 * Один корень: расширенное основание, плавное сужение и скруглённая верхушка —
 * узнаваемый силуэт без острых игл.
 */
function rootPath(x1: number, x2: number, baseY: number, dir: number, len: number): string {
  const cx = (x1 + x2) / 2;
  const tip = baseY + dir * len;
  const neck = baseY + dir * (len * 0.5);
  const shoulder = baseY + dir * (len * 0.12);
  const tipW = Math.max(2.2, (x2 - x1) * 0.18);

  return [
    `M ${x1},${baseY}`,
    `C ${x1 - 0.5},${shoulder} ${cx - tipW * 1.6},${neck} ${cx - tipW},${tip - dir * tipW}`,
    `Q ${cx},${tip} ${cx + tipW},${tip - dir * tipW}`,
    `C ${cx + tipW * 1.6},${neck} ${x2 + 0.5},${shoulder} ${x2},${baseY}`,
    "Z",
  ].join(" ");
}

/** Корни: 3 у верхних моляров, 2 у нижних, 1 у остальных. */
function rootPaths(fdi: number, baseY: number, dir: number): string[] {
  switch (rootCount(fdi)) {
    case 3:
      return [
        rootPath(6, 17, baseY, dir, ROOT_H * 0.92),
        rootPath(19, 33, baseY, dir, ROOT_H),
        rootPath(35, 46, baseY, dir, ROOT_H * 0.92),
      ];
    case 2:
      return [
        rootPath(7, 23, baseY, dir, ROOT_H),
        rootPath(29, 45, baseY, dir, ROOT_H * 0.95),
      ];
    default:
      return [rootPath(13, 39, baseY, dir, ROOT_H)];
  }
}

function fillFor(state: SurfaceState | undefined, fallback: string): string {
  return state ? (CONDITION_COLORS[state.condition] ?? fallback) : fallback;
}

export const Tooth = memo(function Tooth({
  fdi,
  state,
  onSurfaceClick,
  onPartHover,
  readOnly,
  selected,
  partLabels,
  width = 52,
  onDark,
}: ToothProps) {
  const upper = isUpperTooth(fdi);
  const { polys, center, top, bottom } = crownGeometry(fdi);

  const whole = state?.whole;
  const rootState = state?.root;
  const condition = whole?.condition;
  const isGone = condition === "extracted" || condition === "missing";
  const isImplant = condition === "implant";
  const crownOverride =
    condition === "crown" || condition === "bridge" || isGone || isImplant ? whole : undefined;

  const interactive = !readOnly && !!onSurfaceClick;
  const selectedSet = new Set(selected ?? []);

  const rootBaseY = upper ? top : bottom;
  const rootDir = upper ? -1 : 1;

  const emptyFill = onDark ? "#f1f5f9" : "#ffffff";
  const stroke = onDark ? "#94a3b8" : "#cbd5e1";
  const rootFill = isImplant
    ? CONDITION_COLORS.implant
    : isGone
      ? CONDITION_COLORS[condition!]
      : rootState && rootState.condition !== "root_canal"
        ? fillFor(rootState, "#f1f5f9")
        : onDark
          ? "#e2e8f0"
          : "#f1f5f9";

  const handleClick = (part: ToothPart) =>
    interactive ? () => onSurfaceClick!(fdi, part) : undefined;
  const handleEnter = (part: ToothPart) =>
    onPartHover ? () => onPartHover({ fdi, part }) : undefined;
  const handleLeave = onPartHover ? () => onPartHover(null) : undefined;

  const label = (part: ToothPart) => `${fdi} · ${partLabels?.[part] ?? part}`;

  // Плавная смена цвета при изменении состояния + подсветка при наведении.
  const partClass = (part: ToothPart) =>
    cn(
      "transition-[fill,stroke,stroke-width] duration-200 ease-out",
      interactive && "cursor-pointer hover:brightness-95",
      interactive && "hover:[stroke:theme(colors.primary.500)] hover:[stroke-width:2]",
      selectedSet.has(part) && "[stroke:theme(colors.primary.600)] [stroke-width:2.5]"
    );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      className="select-none overflow-visible"
      role={interactive ? "group" : "img"}
      aria-label={String(fdi)}
      onMouseLeave={handleLeave}
    >
      {/* --- корни / имплант --- */}
      {isImplant ? (
        <g onClick={handleClick("root")} onMouseEnter={handleEnter("root")} className={partClass("root")}>
          <rect
            x={21}
            y={upper ? top - ROOT_H : rootBaseY}
            width={10}
            height={ROOT_H}
            rx={4}
            fill={CONDITION_COLORS.implant}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {[0.3, 0.5, 0.7, 0.9].map((k) => (
            <line
              key={k}
              x1={21}
              x2={31}
              y1={rootBaseY + rootDir * ROOT_H * k}
              y2={rootBaseY + rootDir * ROOT_H * k}
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}
          <title>{label("root")}</title>
        </g>
      ) : (
        <g onClick={handleClick("root")} onMouseEnter={handleEnter("root")} className={partClass("root")}>
          {rootPaths(fdi, rootBaseY, rootDir).map((d, i) => (
            <path
              key={i}
              d={d}
              fill={rootFill}
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="transition-[fill] duration-200 ease-out"
            />
          ))}
          {/* пломбированный канал — штрих по оси корня */}
          {rootState?.condition === "root_canal" &&
            !isGone &&
            rootPaths(fdi, rootBaseY, rootDir).map((_, i, arr) => {
              const span = 40 / (arr.length + 1);
              const x = 6 + span * (i + 1) + (arr.length === 1 ? 20 : 0);
              return (
                <line
                  key={`rc-${i}`}
                  x1={x}
                  x2={x}
                  y1={rootBaseY + rootDir * 4}
                  y2={rootBaseY + rootDir * (ROOT_H - 6)}
                  stroke={CONDITION_COLORS.root_canal}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
          <title>{label("root")}</title>
        </g>
      )}

      {/* --- коронка: скруглённая подложка + кликабельные зоны --- */}
      <rect
        x={4}
        y={top}
        width={44}
        height={CROWN_H}
        rx={9}
        fill={emptyFill}
        stroke={stroke}
        strokeWidth="1.5"
        className="transition-[fill] duration-200 ease-out"
      />
      {/* Клип по скруглению, чтобы поверхности не выходили за края коронки */}
      <clipPath id={`crown-${fdi}`}>
        <rect x={4} y={top} width={44} height={CROWN_H} rx={9} />
      </clipPath>
      <g clipPath={`url(#crown-${fdi})`}>
        {polys.map((p) => (
          <polygon
            key={p.part}
            points={p.points}
            fill={fillFor(crownOverride ?? state?.surfaces[p.part as Surface], emptyFill)}
            stroke={stroke}
            strokeWidth="1.25"
            onClick={handleClick(p.part)}
            onMouseEnter={handleEnter(p.part)}
            className={partClass(p.part)}
          >
            <title>{label(p.part)}</title>
          </polygon>
        ))}
        <polygon
          points={center.points}
          fill={fillFor(crownOverride ?? state?.surfaces[center.part as Surface], emptyFill)}
          stroke={stroke}
          strokeWidth="1.25"
          onClick={handleClick(center.part)}
          onMouseEnter={handleEnter(center.part)}
          className={partClass(center.part)}
        >
          <title>{label(center.part)}</title>
        </polygon>
      </g>
      {/* Внешний контур поверх заливок — держит форму коронки */}
      <rect
        x={4}
        y={top}
        width={44}
        height={CROWN_H}
        rx={9}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        pointerEvents="none"
      />

      {/* --- удалён / отсутствует --- */}
      {condition === "extracted" && (
        <g stroke="#475569" strokeWidth="3" strokeLinecap="round" pointerEvents="none">
          <line x1={12} y1={top + 8} x2={40} y2={bottom - 8} />
          <line x1={40} y1={top + 8} x2={12} y2={bottom - 8} />
        </g>
      )}
      {condition === "missing" && (
        <rect
          x={7}
          y={top + 3}
          width={38}
          height={CROWN_H - 6}
          rx={7}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
});
