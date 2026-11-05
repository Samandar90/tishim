"use client";

import { useRef, type KeyboardEventHandler, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNativeDialog } from "./useNativeDialog";

type Tone = "light" | "dark";

const TONES: Record<Tone, { dialog: string; handle: string; title: string; close: string }> = {
  light: {
    dialog: "border-line bg-card text-ink backdrop:bg-slate-900/40",
    handle: "bg-line",
    title: "text-ink",
    close: "text-muted hover:bg-slate-100 hover:text-ink",
  },
  dark: {
    dialog: "border-white/10 bg-slate-900 text-white backdrop:bg-slate-950/60",
    handle: "bg-white/20",
    title: "text-white",
    close: "text-slate-300 hover:bg-white/10 hover:text-white",
  },
};

/**
 * Шторка: на телефоне выезжает снизу, на sm+ — обычный центрированный диалог.
 * Нативный <dialog>: фокус-ловушка и Esc бесплатно. Светлая по умолчанию,
 * тёмный tone — только для одонтограммы. С title рисует общую шапку «заголовок +
 * крестик» — раньше у каждой шторки была своя, а у правки визита крестика не было
 * вовсе. ConfirmDialog — отдельный примитив подтверждения, общая у них только
 * механика useNativeDialog.
 */
export function Sheet({
  open,
  onClose,
  tone = "light",
  title,
  label,
  onKeyDown,
  children,
}: {
  open: boolean;
  onClose: () => void;
  tone?: Tone;
  /** Заголовок шапки с крестиком; без него шапку рисует содержимое. */
  title?: string;
  label?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
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
      aria-label={label ?? title}
      // Прижат к низу явно (top:auto; bottom:0), а не через margin-top:auto:
      // у модального <dialog> с UA-стилем inset-block:0 auto-margin в Chrome
      // не отдаёт всё свободное место, и шторка повисала у верхнего края.
      // Центр на sm+ — с !important: диалог лежит в top layer, но селектор
      // родительского space-y-* до него дотягивается и ставит margin-top,
      // отчего центрированный диалог уезжал к верхнему краю.
      className={cn(
        "bottom-0 top-auto m-0 max-h-sheet w-full max-w-full overflow-y-auto overscroll-contain rounded-t-3xl border-t p-0 shadow-modal backdrop:backdrop-blur-sm",
        "sm:inset-0 sm:!m-auto sm:max-w-md sm:rounded-2xl sm:border",
        TONES[tone].dialog,
        closing ? "animate-sheet-down" : "animate-sheet-up"
      )}
    >
      <div className="safe-bottom-sheet px-4 pt-3 sm:p-6">
        {/* ручка шторки — только на телефоне */}
        <div className={cn("mx-auto mb-3 h-1 w-10 rounded-full sm:hidden", TONES[tone].handle)} />
        {title && (
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 className={cn("text-h3", TONES[tone].title)}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={tc("close")}
              className={cn(
                "-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                TONES[tone].close
              )}
            >
              <X className="size-5" />
            </button>
          </header>
        )}
        {open ? children : last.current}
      </div>
    </dialog>
  );
}
