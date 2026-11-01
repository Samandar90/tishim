import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";

/** Ответ builder'а supabase-js — и для списка (T = Row[]), и для `.single()` (T = Row). */
type Res<T> = PostgrestSingleResponse<T>;

/** PostgREST: `.single()` / `.maybeSingle()` не нашли строку — это не сбой, а «нет». */
const NO_ROWS = "PGRST116";

function fail(error: PostgrestError): never {
  // Без исключения страница показывала «данных нет» вместо «не удалось загрузить»:
  // сбой базы маскировался под пустую карту, а error.tsx с «Повторить» не срабатывал.
  throw new Error(`Supabase: ${error.message}`, { cause: error });
}

const isThenable = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as { then?: unknown })?.then === "function";

function unwrapMust<T>(res: Res<T>): T {
  if (res.error) fail(res.error);
  return res.data as T;
}

function unwrapMaybe<T>(res: Res<T>): T | null {
  if (res.error && res.error.code !== NO_ROWS) fail(res.error);
  return res.data ?? null;
}

function unwrapCount(res: Res<unknown>): number {
  if (res.error) fail(res.error);
  return res.count ?? 0;
}

// Запрос передаётся самим builder'ом — `await must(supabase.from(...))`, — а не как
// `must(await ...)`: с собственным типом ответа TypeScript выводил строку как never,
// поэтому сигнатуры опираются на PostgrestSingleResponse из supabase-js.
// Синхронная перегрузка стоит последней: её TypeScript берёт для `.then(must)`.

/** Данные или исключение — для списков и агрегатов, где пустота не ошибка, а сбой — ошибка. */
export function must<T>(query: PromiseLike<Res<T>>): Promise<T>;
export function must<T>(res: Res<T>): T;
export function must<T>(x: Res<T> | PromiseLike<Res<T>>): T | Promise<T> {
  return isThenable(x) ? Promise.resolve(x).then(unwrapMust) : unwrapMust(x);
}

/** Одна строка или null, если её нет; любой другой сбой — исключение. */
export function maybe<T>(query: PromiseLike<Res<T>>): Promise<T | null>;
export function maybe<T>(res: Res<T>): T | null;
export function maybe<T>(x: Res<T> | PromiseLike<Res<T>>): T | null | Promise<T | null> {
  return isThenable(x) ? Promise.resolve(x).then(unwrapMaybe) : unwrapMaybe(x);
}

/** Счётчик `{ count: "exact", head: true }`: сбой — исключение, а не ноль. */
export function mustCount(query: PromiseLike<Res<unknown>>): Promise<number>;
export function mustCount(res: Res<unknown>): number;
export function mustCount(x: Res<unknown> | PromiseLike<Res<unknown>>): number | Promise<number> {
  return isThenable(x) ? Promise.resolve(x).then(unwrapCount) : unwrapCount(x);
}
