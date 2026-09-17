import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";

const MINUTE = 60_000;

describe("createRateLimiter", () => {
  it("пропускает до лимита и отказывает сверх него", () => {
    const take = createRateLimiter({ limit: 3, windowMs: 10 * MINUTE });

    expect(take("u1", 0).ok).toBe(true);
    expect(take("u1", 1000).ok).toBe(true);
    expect(take("u1", 2000).ok).toBe(true);
    expect(take("u1", 3000)).toEqual({ ok: false, retryAfterMs: 10 * MINUTE - 3000 });
  });

  it("окно скользящее: место освобождается, когда стареет самый ранний запрос", () => {
    const take = createRateLimiter({ limit: 2, windowMs: 10 * MINUTE });
    take("u1", 0);
    take("u1", 5 * MINUTE);

    expect(take("u1", 9 * MINUTE).ok).toBe(false);
    expect(take("u1", 10 * MINUTE + 1).ok).toBe(true); // первый запрос вышел из окна
    expect(take("u1", 10 * MINUTE + 2).ok).toBe(false); // второй ещё в окне
  });

  it("отказанные запросы окно не продлевают", () => {
    const take = createRateLimiter({ limit: 1, windowMs: MINUTE });
    take("u1", 0);
    for (let t = 1000; t < MINUTE; t += 1000) expect(take("u1", t).ok).toBe(false);

    expect(take("u1", MINUTE + 1).ok).toBe(true);
  });

  it("пользователи считаются порознь", () => {
    const take = createRateLimiter({ limit: 1, windowMs: MINUTE });

    expect(take("u1", 0).ok).toBe(true);
    expect(take("u2", 0).ok).toBe(true);
    expect(take("u1", 1).ok).toBe(false);
  });

  it("истёкшие ключи выметаются и не мешают новым запросам", () => {
    const take = createRateLimiter({ limit: 1, windowMs: MINUTE });
    for (let i = 0; i < 250; i++) take(`user-${i}`, 0);

    // через час все окна истекли; сотый по счёту вызов запускает уборку
    for (let i = 0; i < 250; i++) expect(take(`user-${i}`, 60 * MINUTE).ok).toBe(true);
  });
});
