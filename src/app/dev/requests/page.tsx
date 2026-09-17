import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RequestsView } from "@/components/requests/RequestsScreen";
import { CLINIC_REQUEST_TAG } from "@/lib/constants/requests";
import type { MappingRequest } from "@/lib/types/database";
import { DevVariantNav } from "../DevVariantNav";
import { DEV_NAV } from "../mocks";

/**
 * Заявки на моках, без входа — только в dev (middleware + notFound). Под анонимом
 * смена статуса не пройдёт (RLS): удобно смотреть откат статуса и сообщение об ошибке.
 */

function request(n: number, patch: Partial<MappingRequest>): MappingRequest {
  return {
    id: `req-${n}`,
    full_name: "Демо Заявитель",
    phone: "+998 90 000 00 00",
    preferred_date: null,
    comment: null,
    status: "new",
    created_at: "2026-09-17T09:30:00.000Z",
    ...patch,
  };
}

const REQUESTS: MappingRequest[] = [
  request(1, {
    full_name: "Малика Азимова",
    phone: "+998 90 123 45 67",
    preferred_date: "2026-09-22",
    comment: "Удобно после 18:00, болит зуб слева внизу.",
  }),
  request(2, { full_name: "Жасур Тошматов", phone: "+998 91 765 43 21" }),
  request(3, {
    full_name: "Стоматология «Dental Art»",
    phone: "+998 71 200 11 22",
    comment: `${CLINIC_REQUEST_TAG} Хотим подключить трёх врачей, расскажите про условия для клиник.`,
    status: "contacted",
    created_at: "2026-09-16T12:00:00.000Z",
  }),
  request(4, {
    full_name: "Севара Носирова",
    phone: "+998 93 555 10 20",
    preferred_date: "2026-09-25",
    status: "scheduled",
    created_at: "2026-09-15T08:10:00.000Z",
  }),
  request(5, {
    full_name: "Бобур Рахимов",
    phone: "+998 94 321 00 99",
    status: "done",
    created_at: "2026-09-10T15:45:00.000Z",
  }),
  request(6, {
    full_name: "Нигора Абдуллаева-Мирзиёева",
    phone: "+998 97 111 22 33",
    comment:
      "Была у вас два года назад, карту не заводили. Хочу оцифровать всё сразу и для мужа тоже — можно прийти вдвоём в один день? Лучше в субботу утром.",
    status: "cancelled",
    created_at: "2026-09-05T10:00:00.000Z",
  }),
  request(7, { full_name: "Тимур Исмаилов", phone: "+998 99 808 70 60", preferred_date: "2026-09-30" }),
];

const VARIANTS = {
  many: { label: "7 заявок", requests: REQUESTS },
  one: { label: "1 заявка", requests: REQUESTS.slice(0, 1) },
  empty: { label: "Нет заявок", requests: [] },
} satisfies Record<string, { label: string; requests: MappingRequest[] }>;

type VariantKey = keyof typeof VARIANTS;

export default function RequestsDevPage({ searchParams }: { searchParams: { v?: string } }) {
  if (process.env.NODE_ENV !== "development") notFound();

  const key: VariantKey =
    searchParams.v && searchParams.v in VARIANTS ? (searchParams.v as VariantKey) : "many";

  return (
    <AppShell
      items={DEV_NAV}
      homeHref="/dev/requests"
      profile={{ full_name: "Азиз Каримов", phone: "+998 90 000 00 00" }}
      roleLabel="Врач"
    >
      <div className="space-y-4">
        <DevVariantNav base="/dev/requests" variants={VARIANTS} current={key} />
        <RequestsView requests={VARIANTS[key].requests} />
      </div>
    </AppShell>
  );
}
