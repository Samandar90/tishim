import type { Surface, ToothCondition } from "@/lib/types/database";

/** FDI numbering, displayed left→right as the dentist faces the patient. */
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const PRIMARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PRIMARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const ALL_SURFACES: Surface[] = ["O", "I", "M", "D", "V", "L"];

/** Conditions that apply to a single surface of the crown. */
export const SURFACE_CONDITIONS: ToothCondition[] = ["healthy", "caries", "filling", "veneer"];

/** Conditions that apply to the whole tooth. */
export const WHOLE_TOOTH_CONDITIONS: ToothCondition[] = [
  "crown",
  "bridge",
  "implant",
  "extracted",
  "missing",
];

/** Conditions rendered on the root (endodontics / periodontics). */
export const ROOT_CONDITIONS: ToothCondition[] = ["root_canal", "pulpitis", "periodontitis"];

export const ALL_CONDITIONS: ToothCondition[] = [
  "healthy",
  "caries",
  "filling",
  "crown",
  "veneer",
  "bridge",
  "implant",
  "root_canal",
  "pulpitis",
  "periodontitis",
  "extracted",
  "missing",
];

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  healthy: "#ffffff",
  caries: "#ef4444",
  filling: "#3b82f6",
  crown: "#eab308",
  implant: "#a855f7",
  extracted: "#9ca3af",
  missing: "#e5e7eb",
  root_canal: "#f97316",
  veneer: "#14b8a6",
  bridge: "#f59e0b",
  pulpitis: "#e11d48",
  periodontitis: "#92400e",
};

export function quadrant(fdi: number): number {
  return Math.floor(fdi / 10);
}

export function isUpperTooth(fdi: number): boolean {
  const q = quadrant(fdi);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

/** Mesial side faces the midline: right half of the mouth (quadrants 1,4,5,8) has mesial on the viewer's right. */
export function isMesialOnRight(fdi: number): boolean {
  const q = quadrant(fdi);
  return q === 1 || q === 4 || q === 5 || q === 8;
}

export function isMolar(fdi: number): boolean {
  const pos = fdi % 10;
  const q = quadrant(fdi);
  if (q >= 5) return pos === 4 || pos === 5; // primary molars
  return pos >= 6;
}

export function isFrontTooth(fdi: number): boolean {
  const pos = fdi % 10;
  return pos <= 3;
}

/** Number of roots drawn: 3 for upper molars, 2 for lower molars, 1 otherwise. */
export function rootCount(fdi: number): number {
  if (!isMolar(fdi)) return 1;
  return isUpperTooth(fdi) ? 3 : 2;
}

/** Occlusal for molars/premolars, incisal for front teeth. */
export function centerSurface(fdi: number): "O" | "I" {
  return isFrontTooth(fdi) ? "I" : "O";
}
