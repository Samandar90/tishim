import Link from "next/link";
import { cn } from "@/lib/utils";
import { ToothIcon } from "@/components/icons";

/** Единый знак продукта: бирюзовый квадрат с зубом + слово Tishim. */
export function Logo({
  href = "/",
  onDark,
  subtitle,
  className,
}: {
  href?: string;
  onDark?: boolean;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex min-h-touch items-center gap-2.5", className)}
      aria-label="Tishim"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
        <ToothIcon className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[19px] font-semibold tracking-tight",
            onDark ? "text-white" : "text-ink"
          )}
        >
          Tishim
        </span>
        {subtitle && (
          <span className={cn("mt-1 text-small", onDark ? "text-slate-400" : "text-muted")}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
