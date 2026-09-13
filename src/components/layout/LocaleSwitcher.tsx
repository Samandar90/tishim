"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { value: "ru", label: "Рус" },
  { value: "uz", label: "O'z" },
];

/** block — на всю ширину, тач-зона 44px и крупный кегль (шторка профиля). */
export function LocaleSwitcher({ onDark, block }: { onDark?: boolean; block?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // useLocale() обновится только когда router.refresh() дойдёт до конца
  // (300–800 мс на Render) — без оптимистичной подсветки тап выглядит мёртвым.
  const [next, setNext] = useState<string | null>(null);
  const current = next ?? locale;

  useEffect(() => {
    setNext(null);
  }, [locale]);

  function setLocale(value: string) {
    if (value === current) return;
    setNext(value);
    document.cookie = `locale=${value}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn(
        "flex rounded-xl border p-0.5",
        block && "w-full",
        onDark ? "border-white/20 bg-white/10" : "border-line bg-card"
      )}
      role="group"
    >
      {LOCALES.map((l) => (
        <button
          key={l.value}
          type="button"
          disabled={pending}
          aria-pressed={current === l.value}
          onClick={() => setLocale(l.value)}
          className={cn(
            "rounded-lg px-3 font-medium transition-colors",
            block ? "min-h-touch flex-1 text-body" : "min-h-touch text-small sm:min-h-0 sm:py-1.5",
            current === l.value
              ? "bg-primary-600 text-white"
              : onDark
                ? "text-slate-300 hover:text-white"
                : "text-muted hover:text-ink"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
