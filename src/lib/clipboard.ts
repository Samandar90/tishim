/**
 * Копирует текст в буфер обмена. Сначала Async Clipboard API; его нет вне https и
 * localhost, а во встроенных браузерах мессенджеров он бывает запрещён — тогда
 * старый execCommand через временное поле. false — не вышло ни одним способом.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}

function legacyCopy(text: string): boolean {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  // fixed и preventScroll: страница не дёргается к полю, пока оно в фокусе
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  // execCommand копирует выделение элемента в фокусе; один select() фокус не гарантирует
  field.focus({ preventScroll: true });
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    // фокус возвращается на кнопку: с клавиатуры человек остаётся там, где был
    previous?.focus({ preventScroll: true });
  }
}
