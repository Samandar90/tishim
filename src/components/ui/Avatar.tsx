import { UserRound } from "lucide-react";
import { cn, initials } from "@/lib/utils";

type Size = "sm" | "lg";

// Размер и кегль задаются парой: text-small в шкале идёт после text-h3
// и через className перебил бы его.
const SIZES: Record<Size, string> = {
  sm: "size-9 text-small",
  lg: "size-14 text-h3",
};

/**
 * Круг с инициалами. Фото (profiles.avatar_url) пока нигде не заполняется —
 * проп src появится вместе с загрузкой, инициалы станут запасным вариантом.
 * aria-hidden: имя озвучивает родитель.
 */
export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  const text = initials(name);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-700 ring-1 ring-inset ring-primary-100",
        SIZES[size],
        className
      )}
    >
      {text || <UserRound className="size-5" strokeWidth={1.75} />}
    </span>
  );
}
