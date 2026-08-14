import type { Surface, ToothCondition } from "@/lib/types/database";

/** Latest known state of one part of a tooth. */
export interface SurfaceState {
  condition: ToothCondition;
  procedure?: string | null;
  note?: string | null;
  recordedAt?: string;
}

export interface ToothState {
  /** Whole-tooth condition (crown, bridge, implant, extracted, missing). */
  whole?: SurfaceState;
  /** Root condition (root_canal, pulpitis, periodontitis). */
  root?: SurfaceState;
  /** Per-surface conditions (caries, filling, veneer, healthy). */
  surfaces: Partial<Record<Surface, SurfaceState>>;
}

/** fdi -> tooth state */
export type ChartState = Record<number, ToothState>;

export type ToothPart = Surface | "root";
