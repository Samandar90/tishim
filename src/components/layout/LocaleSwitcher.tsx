"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { value: "ru", label: "Рус" },
  { value: "uz", label: "O'z" },
];

export function LocaleSwitcher({ onDark }: { onDark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(value: string) {
    document.cookie = `locale=${value}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn(
        "flex rounded-xl border p-0.5",
        onDark ? "border-white/20 bg-white/10" : "border-line bg-card"
      )}
      role="group"
    >
      {LOCALES.map((l) => (
        <button
          key={l.value}
          type="button"
          disabled={pending}
          onClick={() => setLocale(l.value)}
          className={cn(
            "min-h-touch rounded-lg px-3 text-small font-medium transition-colors sm:min-h-0 sm:py-1.5",
            locale === l.value
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
