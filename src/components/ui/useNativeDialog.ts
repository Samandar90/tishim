"use client";

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";

/**
 * Жизненный цикл модального <dialog>: showModal/close по пропу open.
 * Механика общая для Sheet и ConfirmDialog, чтобы не жить в трёх копиях.
 * animateExit откладывает close() до конца выходной анимации — класс на время
 * closing вешает сам потребитель, хук только сообщает состояние.
 */
export function useNativeDialog(open: boolean, animateExit = false) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  const finish = useCallback(() => {
    setClosing(false);
    ref.current?.close();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setClosing(false);
      if (!el.open) el.showModal();
      return;
    }
    if (!el.open) return;
    if (animateExit) setClosing(true);
    else el.close();
  }, [open, animateExit]);

  // Страховка: если animationend не придёт (анимации отключены, вкладка в фоне
  // и кадры не рисуются), закрываем по расчётной длительности — иначе невидимая
  // модалка заблокирует страницу навсегда. Длительность читается с элемента,
  // чтобы не дублировать токен из tailwind.config.
  useEffect(() => {
    if (!closing) return;
    const el = ref.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const ms = (parseFloat(style.animationDuration) + parseFloat(style.animationDelay)) * 1000;
    const timer = setTimeout(finish, Number.isFinite(ms) ? ms + 100 : 400);
    return () => clearTimeout(timer);
  }, [closing, finish]);

  function onAnimationEnd(e: AnimationEvent<HTMLDialogElement>) {
    // animationend всплывает от детей (спиннер, тост) — ждём только свою анимацию
    if (!closing || e.target !== e.currentTarget) return;
    finish();
  }

  return { ref, closing, onAnimationEnd };
}
