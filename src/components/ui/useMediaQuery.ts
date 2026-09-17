"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Брейкпоинт xl из Tailwind: с него рядом со сценой зубов встаёт панель вместо шторки. */
export const WIDE_QUERY = "(min-width: 1280px)";

/**
 * Совпадает ли медиазапрос. На сервере и при гидрации — false, чтобы первое дерево
 * совпало с серверным; настоящее значение React подставляет сразу после гидрации.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
