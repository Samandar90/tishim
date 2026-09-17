export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const NBSP = " ";

/**
 * Деньги: «150 000 сум». Группировка сделана вручную, без Intl —
 * ICU-данные для uz-UZ различаются между Node и браузером, из-за чего
 * серверный и клиентский рендер расходились и ломали гидратацию.
 */
export function formatMoney(value: number | null | undefined, locale: string = "ru"): string {
  const n = Math.round(Number(value ?? 0));
  const sign = n < 0 ? "-" : "";
  const grouped = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${grouped}${NBSP}${locale === "uz" ? "so'm" : "сум"}`;
}

/** Дата всегда ДД.ММ.ГГГГ — одинаково в обеих локалях и на сервере, и в браузере. */
export function formatDate(value: string | Date | null | undefined, _locale: string = "ru"): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseDate(value) : value;
  if (!d || Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/**
 * «2026-08-13» разбирается как локальная дата, а не UTC: иначе в часовых
 * поясах восточнее UTC день съезжает на сутки назад.
 */
function parseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

/** Прогрессивная маска узбекского номера: +998 XX XXX XX XX */
export function formatUzPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  let out = "+998";
  if (digits.length > 0) out += " " + digits.slice(0, 2);
  if (digits.length > 2) out += " " + digits.slice(2, 5);
  if (digits.length > 5) out += " " + digits.slice(5, 7);
  if (digits.length > 7) out += " " + digits.slice(7, 9);
  return out;
}

export function calcTotal(subtotal: number, discountPercent: number): number {
  const total = subtotal * (1 - Math.min(Math.max(discountPercent, 0), 100) / 100);
  return Math.round(total * 100) / 100;
}
