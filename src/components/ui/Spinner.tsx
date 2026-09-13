"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <span
      className={cn(
        "inline-block size-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent",
        className
      )}
      role="status"
      aria-label={t("loading")}
    />
  );
}

/**
 * Появляется с задержкой, чтобы на быстрых переходах не мигать перед fade
 * страницы. Обёртка внутренняя: корень уже анимирует .page-enter > *, два
 * animation на одном элементе перебили бы друг друга.
 */
export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="animate-fade-in-late">
        <Spinner className="size-8" />
      </span>
    </div>
  );
}
