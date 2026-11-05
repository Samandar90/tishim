import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  as: Tag = "div",
  interactive,
  flush,
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article" | "li";
  /** Подсветка тени при наведении — для кликабельных карточек. */
  interactive?: boolean;
  /** Без внутренних отступов — для карточек из ячеек с разделителями. cn классы не
      сливает, и `p-0` в className не перебивает `p-4`. */
  flush?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-card shadow-card",
        !flush && "p-4",
        interactive && "transition-shadow duration-200 hover:shadow-card-hover",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <h2 className={cn("mb-3 text-h3 text-ink", className)}>{children}</h2>;
}

/** Заголовок раздела вне карточки. */
export function SectionTitle({
  className,
  children,
  action,
}: {
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-h3 text-ink">{children}</h2>
      {action}
    </div>
  );
}
