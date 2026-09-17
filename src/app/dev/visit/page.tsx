import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  VisitDetailsView,
  type VisitAttachment,
  type VisitFull,
} from "@/components/visit/VisitDetails";
import { PERMANENT_LOWER, PERMANENT_UPPER } from "@/lib/constants/teeth";
import type { ToothRecord } from "@/lib/types/database";
import { DevVariantNav } from "../DevVariantNav";
import { DEV_NAV, mockRecord as rec } from "../mocks";

/**
 * Детали визита на моках, без входа — только в dev (middleware + notFound).
 * Обёрнуто в настоящий AppShell: ширина колонки контента зависит от бокового меню,
 * и без него раскладку на 1024–1536 не оценить.
 */

const ALL_TEETH = [...PERMANENT_UPPER, ...PERMANENT_LOWER];

const BASE: VisitFull = {
  id: "demo",
  visit_date: "2026-09-17",
  visit_type: "treatment",
  complaint: null,
  diagnosis: null,
  treatment: null,
  recommendation: null,
  subtotal: 0,
  discount_percent: 0,
  total: 0,
  payment_status: "unpaid",
  next_visit_date: null,
  dentist: {
    specialization: "Терапевт",
    profile: { full_name: "Азиза Каримова" },
    clinic: { name: "Tishim Clinic", address: null },
  },
  tooth_records: [],
  attachments: [],
};

const PROBLEMS: ToothRecord[] = [
  rec(16, { condition: "filling", surfaces: ["O"], procedure: "Пломба светового отверждения", price: 300000 }),
  rec(26, { condition: "caries", surfaces: ["O", "M"] }),
  rec(36, { condition: "root_canal", procedure: "Эндодонтическое лечение, три канала", price: 800000 }),
  rec(11, { condition: "veneer", surfaces: ["V"], procedure: "Винир", price: 1200000 }),
  rec(47, { condition: "extracted", procedure: "Удаление" }),
  rec(24, { condition: "implant", procedure: "Имплантация" }),
  rec(18, { condition: "missing" }),
];
const PROBLEM_TEETH = new Set(PROBLEMS.map((r) => r.tooth_fdi));

const VARIANTS = {
  treatment: {
    label: "Лечение",
    visit: {
      ...BASE,
      complaint: "Боль при накусывании слева внизу, реакция на холодное.",
      diagnosis: "Хронический пульпит 36, кариес 16 и 26.",
      treatment:
        "Эндодонтическое лечение 36: три канала, пломбирование гуттаперчей.\nПломбы светового отверждения на 16 и 26.",
      recommendation: "Не есть два часа. Через две недели — контрольный снимок 36 и коронка.",
      subtotal: 1450000,
      discount_percent: 10,
      total: 1305000,
      payment_status: "partial",
      next_visit_date: "2026-10-01",
      tooth_records: PROBLEMS.slice(0, 3),
    },
    attachments: [
      { id: "a1", kind: "xray", url: "/doctor-placeholder.svg" },
      { id: "a2", kind: "photo", url: "/doctor-placeholder.svg" },
      { id: "a3", kind: "document", url: "/doctor-placeholder.svg" },
    ],
  },
  mapping: {
    label: "Цифровизация",
    visit: {
      ...BASE,
      visit_type: "initial_mapping",
      diagnosis: "Первичный осмотр, карта заполнена по всем 32 зубам.",
      subtotal: 150000,
      total: 150000,
      payment_status: "paid",
      tooth_records: [
        ...PROBLEMS,
        ...ALL_TEETH.filter((fdi) => !PROBLEM_TEETH.has(fdi)).map((fdi) => rec(fdi)),
      ],
    },
    attachments: [],
  },
  long: {
    label: "32 строки",
    visit: {
      ...BASE,
      visit_type: "initial_mapping",
      subtotal: 150000,
      total: 150000,
      payment_status: "paid",
      tooth_records: ALL_TEETH.map((fdi) => rec(fdi, { procedure: "Осмотр" })),
    },
    attachments: [],
  },
  bare: {
    label: "Пустой",
    visit: { ...BASE, visit_type: "checkup" },
    attachments: [],
  },
} satisfies Record<string, { label: string; visit: VisitFull; attachments: VisitAttachment[] }>;

type VariantKey = keyof typeof VARIANTS;

export default function VisitDevPage({ searchParams }: { searchParams: { v?: string } }) {
  if (process.env.NODE_ENV !== "development") notFound();

  const key: VariantKey =
    searchParams.v && searchParams.v in VARIANTS ? (searchParams.v as VariantKey) : "treatment";
  const variant = VARIANTS[key];

  return (
    <AppShell
      items={DEV_NAV}
      homeHref="/dev/visit"
      profile={{ full_name: "Демо Пациент", phone: "+998 90 000 00 00" }}
      roleLabel="Пациент"
    >
      <div className="space-y-4">
        <DevVariantNav base="/dev/visit" variants={VARIANTS} current={key} />
        <VisitDetailsView visit={variant.visit} attachments={variant.attachments} backHref="/dev/odontogram" />
      </div>
    </AppShell>
  );
}
