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

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
