"use client";

import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";

/**
 * History slider: each position is a day with dental records;
 * the rightmost position is "now" (full current state).
 */
export function HistorySlider({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  /** selected date (YYYY-MM-DD) or null for "now" */
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  const t = useTranslations("odontogram");
  const locale = useLocale();

  if (dates.length < 2) return null;

  const index = value === null ? dates.length : dates.indexOf(value);

  return (
    // appearance-none у ползунка убрано намеренно: без кастомных стилей thumb
    // он не отрисовывается в iOS Safari, и контрол выглядит сломанным.
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={dates.length}
        step={1}
        value={index === -1 ? dates.length : index}
        onChange={(e) => {
          const i = Number(e.target.value);
          onChange(i >= dates.length ? null : dates[i]);
        }}
        className="h-11 w-full flex-1 cursor-pointer accent-primary-600"
        aria-label={t("history")}
      />
      <span className="w-24 shrink-0 text-right text-sm font-medium text-slate-700">
        {value === null ? t("now") : formatDate(value, locale)}
      </span>
    </div>
  );
}
