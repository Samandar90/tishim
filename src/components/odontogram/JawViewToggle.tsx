"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { JawView } from "./archLayout";

/** Кнопка сегментного переключателя на тёмной сцене. */
export const segmentClass = (active: boolean) =>
  cn(
    "min-h-touch rounded-lg px-3 text-small font-medium transition-colors sm:min-h-0 sm:py-1.5",
    active ? "bg-primary-600 text-white" : "text-slate-300 hover:text-white"
  );

/**
 * Вид челюсти и счётчик нажатий на него: Jaw3D поворачивается при каждом нажатии,
 * поэтому повторное нажатие того же вида возвращает челюсть, закрученную пальцем.
 */
export function useJawView() {
  const [view, setView] = useState<JawView>("both");
  const [resets, setResets] = useState(0);
  const select = (next: JawView) => {
    setView(next);
    setResets((n) => n + 1);
  };
  return { view, resets, select };
}

export function JawViewToggle({
  view,
  onSelect,
}: {
  view: JawView;
  onSelect: (view: JawView) => void;
}) {
  const t = useTranslations("odontogram");
  return (
    <div className="flex justify-center">
      <div className="flex rounded-xl border border-white/15 bg-white/5 p-0.5">
        {(["both", "upper", "lower"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            aria-pressed={view === v}
            className={segmentClass(view === v)}
          >
            {t(`jawView.${v}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
