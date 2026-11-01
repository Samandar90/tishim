/**
 * Supabase Auth при отсутствии сети или спящей базе отвечает той же ошибкой, что и
 * на неверный пароль, — форма входа говорила «неверная почта или пароль». Сетевой
 * сбой отличается именем ошибки или выключенным соединением.
 */
export function isNetworkAuthError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError") return true;
  if (/failed to fetch|network|load failed/i.test(error.message ?? "")) return true;
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
