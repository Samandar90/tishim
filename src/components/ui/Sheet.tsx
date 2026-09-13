"use client";

import { useRef, type KeyboardEventHandler, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNativeDialog } from "./useNativeDialog";

type Tone = "light" | "dark";

const TONES: Record<Tone, { dialog: string; handle: string }> = {
  light: {
    dialog: "border-line bg-card text-ink backdrop:bg-slate-900/40",
    handle: "bg-line",
  },
  dark: {
    dialog: "border-white/10 bg-slate-900 text-white backdrop:bg-slate-950/60",
    handle: "bg-white/20",
  },
};

/**
 * Шторка: на телефоне выезжает снизу, на sm+ — обычный центрированный диалог.
 * Нативный <dialog>: фокус-ловушка и Esc бесплатно. Светлая по умолчанию,
 * тёмный tone — только для одонтограммы. ConfirmDialog — отдельный примитив
 * подтверждения, общая у них только механика useNativeDialog.
 */
export function Sheet({
  open,
  onClose,
  tone = "light",
  label,
  onKeyDown,
  children,
}: {
  open: boolean;
  onClose: () => void;
  tone?: Tone;
  label?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
  children: ReactNode;
}) {
  const { ref, closing, onAnimationEnd } = useNativeDialog(open, true);

  // На время выходной анимации показываем последнее содержимое: ToothSheet
  // обнуляет children вместе с open, без снимка шторка уезжала бы пустой.
  const last = useRef<ReactNode>(null);
  if (open) last.current = children;

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Chrome может закрыть модальный <dialog> по Esc, не спросив cancel
      // (close watcher без user activation) — синхронизируем состояние и тут.
      onClose={onClose}
      // клик по подложке: padding у диалога нулевой, содержимое закрывает весь бокс
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      onAnimationEnd={onAnimationEnd}
      aria-label={label}
      // Прижат к низу явно (top:auto; bottom:0), а не через margin-top:auto:
      // у модального <dialog> с UA-стилем inset-block:0 auto-margin в Chrome
      // не отдаёт всё свободное место, и шторка повисала у верхнего края.
      className={cn(
        "bottom-0 top-auto m-0 max-h-sheet w-full max-w-full overflow-y-auto overscroll-contain rounded-t-3xl border-t p-0 shadow-modal backdrop:backdrop-blur-sm",
        "sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-2xl sm:border",
        TONES[tone].dialog,
        closing ? "animate-sheet-down" : "animate-sheet-up"
      )}
    >
      <div className="safe-bottom-sheet px-4 pt-3 sm:p-6">
        {/* ручка шторки — только на телефоне */}
        <div className={cn("mx-auto mb-3 h-1 w-10 rounded-full sm:hidden", TONES[tone].handle)} />
        {open ? children : last.current}
      </div>
    </dialog>
  );
}
