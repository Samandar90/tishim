import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Единое пустое состояние: иконка в мягком круге, заголовок, пояснение
 * и ровно одно действие.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-line bg-card px-6 py-12 text-center shadow-card",
        className
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <p className="text-h3 text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-body text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
