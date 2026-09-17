import type { ToothCondition } from "@/lib/types/database";
import { CONDITION_COLORS } from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";

/** Цветная точка состояния зуба — тем же цветом, что зуб на схеме и чип в легенде. */
export function ConditionDot({
  condition,
  className,
}: {
  condition: ToothCondition;
  className?: string;
}) {
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10", className)}
      style={{ backgroundColor: CONDITION_COLORS[condition] }}
    />
  );
}
