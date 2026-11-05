import { cn } from "@/lib/utils";

/**
 * Заголовок секции лендинга: надзаголовок, заголовок и подводка. Один блок на все
 * секции, чтобы ритм «eyebrow → title → lede» и отступы между ними совпадали.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  onDark,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  onDark?: boolean;
  className?: string;
}) {
  const center = align === "center";
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("mb-3 text-eyebrow uppercase", onDark ? "text-primary-300" : "text-primary-700")}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn("text-title", onDark ? "text-white" : "text-ink")}>{title}</h2>
      {lede && (
        <p className={cn("mt-4 text-lede", onDark ? "text-slate-300" : "text-muted")}>{lede}</p>
      )}
    </div>
  );
}
