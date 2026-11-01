/**
 * Адрес возврата после входа или подтверждения письма: только путь внутри сайта.
 * Внешний адрес или «//host» превратил бы письмо и ссылку входа в открытый редирект.
 */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
