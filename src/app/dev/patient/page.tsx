import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PatientRecordView } from "@/components/dentist/PatientRecord";
import type { VisitListRow } from "@/components/visit/VisitList";
import { DevVariantNav } from "../DevVariantNav";
import { MockTeethScene } from "../MockTeethScene";
import { DEV_NAV } from "../mocks";

/**
 * Карта пациента у врача на моках, без входа — только в dev (middleware + notFound).
 * В настоящем AppShell: ширина колонки контента зависит от бокового меню.
 */

const PATIENT = {
  id: "00000000-0000-0000-0000-000000000000",
  full_name: "Малика Азимова",
  phone: "+998 90 123 45 67",
  birth_date: "1992-04-15",
};

const DENTIST: VisitListRow["dentist"] = {
  specialization: "Терапевт",
  profile: { full_name: "Азиз Каримов" },
  clinic: { name: "Tishim Clinic" },
};

function visit(n: number, patch: Partial<VisitListRow>): VisitListRow {
  return {
    id: `v${n}`,
    visit_date: "2026-09-17",
    visit_type: "treatment",
    diagnosis: null,
    treatment: null,
    subtotal: 0,
    discount_percent: 0,
    total: 0,
    payment_status: "paid",
    dentist: DENTIST,
    attachments: [{ count: 0 }],
    ...patch,
  };
}

const HISTORY: VisitListRow[] = [
  visit(1, {
    visit_date: "2026-09-17",
    diagnosis: "Хронический пульпит 36, кариес 16 и 26. Эндодонтическое лечение, пломбы светового отверждения.",
    subtotal: 1450000,
    discount_percent: 10,
    total: 1305000,
    payment_status: "partial",
    attachments: [{ count: 3 }],
  }),
  visit(2, { visit_date: "2026-08-02", diagnosis: "Контрольный осмотр после лечения 36.", total: 0 }),
  visit(3, {
    visit_date: "2026-07-20",
    diagnosis: "Периодонтит 33, назначена терапия.",
    total: 450000,
    payment_status: "unpaid",
    dentist: { ...DENTIST, profile: { full_name: "Нилуфар Юсупова" }, clinic: { name: "Dental Art" } },
  }),
  visit(4, { visit_date: "2026-06-11", diagnosis: "Имплантация 24.", total: 5000000, attachments: [{ count: 1 }] }),
  visit(5, { visit_date: "2026-05-30", diagnosis: "Удаление 47.", total: 400000 }),
  visit(6, { visit_date: "2026-04-18", diagnosis: "Коронка на 36.", total: 1500000, discount_percent: 5 }),
  visit(7, { visit_date: "2026-03-02", diagnosis: "Винир 11.", total: 1200000 }),
  visit(8, { visit_date: "2026-02-14", total: 350000 }),
  visit(9, { visit_date: "2026-01-25", diagnosis: "Пломба 16.", total: 300000 }),
  visit(10, { visit_date: "2025-12-09", diagnosis: "Профессиональная гигиена.", total: 250000 }),
  visit(11, { visit_date: "2025-11-03", diagnosis: "Кариес 16, 26, 11, 47; пульпит 36.", total: 0, payment_status: "paid" }),
  visit(12, {
    visit_date: "2025-10-01",
    visit_type: "initial_mapping",
    diagnosis: "Первичный осмотр, карта заполнена по всем 32 зубам.",
    total: 150000,
    attachments: [{ count: 2 }],
  }),
];

const VARIANTS = {
  many: { label: "12 визитов", visits: HISTORY },
  few: { label: "2 визита", visits: [HISTORY[0], HISTORY[11]] },
  empty: { label: "Без визитов", visits: [] },
} satisfies Record<string, { label: string; visits: VisitListRow[] }>;

type VariantKey = keyof typeof VARIANTS;

export default function PatientDevPage({ searchParams }: { searchParams: { v?: string } }) {
  if (process.env.NODE_ENV !== "development") notFound();

  const key: VariantKey =
    searchParams.v && searchParams.v in VARIANTS ? (searchParams.v as VariantKey) : "many";

  return (
    <AppShell
      items={DEV_NAV}
      homeHref="/dev/patient"
      profile={{ full_name: "Азиз Каримов", phone: "+998 90 000 00 00" }}
      roleLabel="Врач"
    >
      <div className="space-y-4">
        <DevVariantNav base="/dev/patient" variants={VARIANTS} current={key} />
        <PatientRecordView patient={PATIENT} visits={VARIANTS[key].visits} scene={<MockTeethScene />} />
      </div>
    </AppShell>
  );
}
