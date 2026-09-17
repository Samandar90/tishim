import { cn } from "@/lib/utils";

/** Базовый прямоугольник-заглушка с бегущим бликом (стиль .skeleton в globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

/** Заглушка списка карточек (визиты, пациенты, заявки). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-lg" />
          </div>
          <Skeleton className="mb-2 h-4 w-full max-w-[220px]" />
          <Skeleton className="h-4 w-full max-w-[160px]" />
        </div>
      ))}
    </div>
  );
}

/** Заглушка одонтограммы: два ряда «зубов». */
export function ChartSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      {[0, 1].map((row) => (
        <div key={row} className="flex justify-center gap-1 overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[76px] w-[52px] shrink-0 rounded-xl xl:w-auto xl:min-w-0 xl:max-w-[52px] xl:flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Заглушка карточек статистики. */
export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="status" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <Skeleton className="mb-2 h-6 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
