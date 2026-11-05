import { cn } from "@/lib/utils";

/**
 * Шапка страницы кабинета: заголовок, строка-пояснение и действие справа. Один блок на
 * все разделы — раньше у каждой страницы был свой h1 (где-то sr-only, где-то внутри
 * карточки), и кабинет читался как набор разных экранов.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-h2 text-ink md:text-h1">{title}</h1>
        {description && <p className="mt-1 text-body text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
