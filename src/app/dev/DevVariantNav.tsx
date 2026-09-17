import Link from "next/link";
import { cn } from "@/lib/utils";

/** Переключатель вариантов мок-данных dev-страницы: `?v=<ключ>`. */
export function DevVariantNav({
  base,
  variants,
  current,
}: {
  base: string;
  variants: Record<string, { label: string }>;
  current: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 text-small">
      {Object.entries(variants).map(([key, { label }]) => (
        <Link
          key={key}
          href={`${base}?v=${key}`}
          className={cn(
            "rounded-lg border border-line px-2.5 py-1",
            key === current ? "bg-primary-600 text-white" : "bg-card text-muted hover:text-ink"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
