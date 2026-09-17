import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DentistHomeView } from "@/components/dentist/DentistHome";
import type { DentistProfileInitial } from "@/components/dentist/DentistProfileSetup";
import type { PatientRow } from "@/components/dentist/PatientList";
import { DevVariantNav } from "../DevVariantNav";
import { DEV_NAV } from "../mocks";

/**
 * Главная кабинета врача на моках, без входа — только в dev (middleware + notFound).
 * Сохранение профиля под анонимом не пройдёт (RLS) — страница для просмотра раскладки.
 */

const NAMES = [
  "Малика Азимова",
  "Жасур Тошматов",
  "Севара Носирова",
  "Бобур Рахимов",
  "Дилноза Каримова",
  "Шахзод Юлдашев",
  "Нигора Абдуллаева-Мирзиёева",
  "Тимур Исмаилов",
  "Зарина Хасанова",
  "Отабек Саидов",
  "Лола Усманова",
];

const PATIENTS: PatientRow[] = NAMES.map((fullName, i) => ({
  accessId: `a${i}`,
  patientId: "00000000-0000-0000-0000-000000000000",
  fullName,
  phone: i === 3 ? null : `+998 9${i % 10} ${100 + i * 7} ${10 + i} ${20 + i * 3}`,
  birthDate: i % 4 === 2 ? null : `${1975 + i * 3}-0${(i % 9) + 1}-1${i % 9}`,
  grantedAt: "2026-09-01T10:00:00.000Z",
}));

const FILLED: DentistProfileInitial = {
  specialization: "Терапевт",
  license_number: "UZ-123456",
  clinic_id: "c1",
  bio: "Лечу кариес и пульпит под микроскопом, 12 лет практики.",
  photo_url: null,
  experience_years: 12,
};

const EMPTY: DentistProfileInitial = {
  specialization: null,
  license_number: null,
  clinic_id: null,
  bio: null,
  photo_url: null,
  experience_years: null,
};

const VARIANTS = {
  many: { label: "11 пациентов", profile: FILLED, patients: PATIENTS },
  few: { label: "2 пациента", profile: FILLED, patients: PATIENTS.slice(0, 2) },
  empty: { label: "Нет пациентов", profile: FILLED, patients: [] },
  setup: { label: "Профиль не заполнен", profile: EMPTY, patients: PATIENTS.slice(0, 4) },
} satisfies Record<string, { label: string; profile: DentistProfileInitial; patients: PatientRow[] }>;

type VariantKey = keyof typeof VARIANTS;

export default function DentistDevPage({ searchParams }: { searchParams: { v?: string } }) {
  if (process.env.NODE_ENV !== "development") notFound();

  const key: VariantKey =
    searchParams.v && searchParams.v in VARIANTS ? (searchParams.v as VariantKey) : "many";
  const variant = VARIANTS[key];

  return (
    <AppShell
      items={DEV_NAV}
      homeHref="/dev/dentist"
      profile={{ full_name: "Азиз Каримов", phone: "+998 90 000 00 00" }}
      roleLabel="Врач"
    >
      <div className="space-y-4">
        <DevVariantNav base="/dev/dentist" variants={VARIANTS} current={key} />
        {/* key: форма профиля держит начальные значения в состоянии — без него при
            переключении варианта она осталась бы от прежнего */}
        <DentistHomeView
          key={key}
          dentistId="demo"
          userId="demo"
          clinics={[
            { id: "c1", name: "Tishim Clinic" },
            { id: "c2", name: "Dental Art" },
          ]}
          profile={variant.profile}
          patients={variant.patients}
        />
      </div>
    </AppShell>
  );
}
