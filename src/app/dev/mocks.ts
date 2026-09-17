import type { ToothRecord } from "@/lib/types/database";
import type { NavItem } from "@/components/layout/NavTabs";

/** Общие моки dev-страниц (/dev/*): в продакшен-маршруты не импортируются. */

/** Боковое меню каркаса: dev-страницы ссылаются друг на друга. */
export const DEV_NAV: NavItem[] = [
  { href: "/dev/odontogram", label: "Карта", icon: "tooth" },
  { href: "/dev/patient", label: "Пациент", icon: "users" },
  { href: "/dev/visit", label: "Визит", icon: "calendar" },
];

let seq = 0;

/** Запись о зубе: всё, что не передано, — «просто здоровый зуб» в общем приёме. */
export function mockRecord(tooth: number, patch: Partial<ToothRecord> = {}): ToothRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    seq,
    visit_id: "demo",
    patient_id: "demo",
    tooth_fdi: tooth,
    surfaces: [],
    condition: "healthy",
    procedure: null,
    note: null,
    price: 0,
    created_at: "2026-09-17T09:30:00.000Z",
    ...patch,
  };
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** История карты за год: кариес, через полгода лечение, потом протезирование и удаление. */
export const MOCK_CHART_RECORDS: ToothRecord[] = [
  ...[
    mockRecord(16, { condition: "caries", surfaces: ["O"] }),
    mockRecord(26, { condition: "caries", surfaces: ["O", "M"] }),
    mockRecord(36, { condition: "pulpitis" }),
    mockRecord(11, { condition: "caries", surfaces: ["V"] }),
    mockRecord(47, { condition: "caries", surfaces: ["O", "D"] }),
  ].map((r) => ({ ...r, visit_id: "v365", created_at: daysAgo(365) })),
  ...[
    mockRecord(16, { condition: "filling", surfaces: ["O"], procedure: "Пломба", price: 300000 }),
    mockRecord(26, { condition: "filling", surfaces: ["O", "M"], procedure: "Пломба", price: 350000 }),
    mockRecord(36, { condition: "root_canal", procedure: "Эндодонтия", price: 800000 }),
    mockRecord(11, { condition: "veneer", surfaces: ["V"], procedure: "Винир", price: 1200000 }),
  ].map((r) => ({ ...r, visit_id: "v180", created_at: daysAgo(180) })),
  ...[
    mockRecord(36, { condition: "crown", procedure: "Коронка", price: 1500000 }),
    mockRecord(47, { condition: "extracted", procedure: "Удаление", price: 400000 }),
    mockRecord(18, { condition: "missing" }),
    mockRecord(24, { condition: "implant", procedure: "Имплантация", price: 5000000 }),
    mockRecord(33, { condition: "periodontitis" }),
  ].map((r) => ({ ...r, visit_id: "v60", created_at: daysAgo(60) })),
];
