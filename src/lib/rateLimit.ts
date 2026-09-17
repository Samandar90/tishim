export interface RateLimitResult {
  ok: boolean;
  /** Через сколько миллисекунд освободится место; 0, если запрос принят. */
  retryAfterMs: number;
}

/**
 * Ограничитель частоты со скользящим окном, в памяти процесса.
 *
 * Годится как первая линия там, где приложение — один процесс (`next start` на
 * Render): счётчики не переживают перезапуск и не делятся между экземплярами.
 * Лимит, который обязан держаться всегда, считается по базе — этот лишь гасит
 * всплески и ловит то, что в базе следа не оставляет (неудачные вызовы).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  let calls = 0;

  return function take(key: string, now: number = Date.now()): RateLimitResult {
    // Раз в сотню вызовов выметаются ключи, чьи окна истекли: иначе Map растёт с
    // каждым новым пользователем до перезапуска процесса.
    calls += 1;
    if (calls % 100 === 0) {
      hits.forEach((times, k) => {
        if (times[times.length - 1] <= now - windowMs) hits.delete(k);
      });
    }

    const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterMs: recent[0] + windowMs - now };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true, retryAfterMs: 0 };
  };
}
