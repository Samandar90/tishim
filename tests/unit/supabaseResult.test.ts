import { describe, expect, it } from "vitest";
import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { maybe, must, mustCount } from "@/lib/supabase/result";

const err = (code: string, message = "boom") => ({ code, message, details: "", hint: "", name: "PostgrestError" }) as PostgrestError;
const ok = <T,>(data: T, count: number | null = null): PostgrestSingleResponse<T> =>
  ({ data, error: null, count, status: 200, statusText: "OK" }) as PostgrestSingleResponse<T>;
const failed = <T,>(code: string): PostgrestSingleResponse<T> =>
  ({ data: null, error: err(code), count: null, status: 500, statusText: "ERR" }) as PostgrestSingleResponse<T>;

describe("must / maybe / mustCount", () => {
  it("must отдаёт данные и бросает на любой ошибке", async () => {
    expect(must(ok([1, 2]))).toEqual([1, 2]);
    expect(() => must(failed("42501"))).toThrow(/Supabase: boom/);
    await expect(must(Promise.resolve(ok("x")))).resolves.toBe("x");
    await expect(must(Promise.resolve(failed("PGRST116")))).rejects.toThrow();
  });

  it("maybe: нет строки — null, другой сбой — исключение", async () => {
    expect(maybe(failed("PGRST116"))).toBeNull();
    expect(maybe(ok({ id: 1 }))).toEqual({ id: 1 });
    expect(() => maybe(failed("42501"))).toThrow(/Supabase/);
    await expect(maybe(Promise.resolve(failed("PGRST116")))).resolves.toBeNull();
  });

  it("mustCount: число, а не ноль при сбое", async () => {
    expect(mustCount(ok(null, 7))).toBe(7);
    expect(mustCount(ok(null, null))).toBe(0);
    expect(() => mustCount(failed("08006"))).toThrow(/Supabase/);
    await expect(mustCount(Promise.resolve(ok(null, 3)))).resolves.toBe(3);
  });

  it("исключение несёт исходную ошибку в cause", () => {
    try {
      must(failed("42501"));
    } catch (e) {
      expect((e as Error).cause).toMatchObject({ code: "42501" });
    }
  });
});
