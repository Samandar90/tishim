import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

/** Внешний вид кнопки — общий для <button> и для ссылки-кнопки (ButtonLink). */
export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  /** На всю ширину контейнера — типично для мобильных форм. */
  block?: boolean;
  className?: string;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  loading?: boolean;
}

/** Три стиля: заливка, обводка, прозрачная. Теней на кнопках нет по дизайн-системе. */
const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
  secondary: "border border-line bg-card text-ink hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
  danger: "bg-danger text-white hover:bg-red-600 active:bg-red-700",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-body",
  lg: "h-12 px-6 text-body",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  className,
}: ButtonStyleProps): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    block && "w-full",
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, block, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
