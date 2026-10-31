/**
 * Минимальная длина пароля — та же, что auth.minimum_password_length в supabase/config.toml
 * и в облачном проекте: расхождение дало бы отказ сервера уже после прохождения формы.
 */
export const MIN_PASSWORD_LENGTH = 6;

export type NewPasswordProblem = "tooShort" | "mismatch";

/** Проверка пары «пароль + повтор» до запроса: ответ Supabase переводить на два языка сложнее. */
export function validateNewPassword(password: string, confirm: string): NewPasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "tooShort";
  if (password !== confirm) return "mismatch";
  return null;
}

export type PasswordUpdateFailure = "same" | "weak" | "session" | "unknown";

/**
 * На updateUser Supabase отвечает английским текстом без кода. Различаем по нему три случая
 * с разными действиями пользователя: тот же пароль — придумать другой, слабый — длиннее,
 * нет сессии — ссылка из письма не сработала, запрашивать новую.
 */
export function classifyPasswordUpdateError(message: string): PasswordUpdateFailure {
  const text = message.toLowerCase();
  if (text.includes("different from the old")) return "same";
  if (text.includes("password") && /at least|weak|short/.test(text)) return "weak";
  if (/session|not authenticated|jwt/.test(text)) return "session";
  return "unknown";
}
