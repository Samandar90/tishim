import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border bg-card px-3.5 text-body text-ink transition-colors placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-muted";
const normal = "border-line focus:border-primary-500";
const invalid = "border-danger focus:border-danger focus:ring-danger/20";

type FieldProps = { error?: string | null };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(base, "h-11", error ? invalid : normal, className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={error ? true : undefined}
    className={cn(base, "min-h-[88px] py-2.5", error ? invalid : normal, className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(({ className, error, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(base, "h-11 appearance-none pr-9", error ? invalid : normal, className)}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      aria-hidden
    />
  </div>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  htmlFor,
}: {
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-small font-medium text-ink", className)}>
      {children}
    </label>
  );
}

/**
 * Поле с подписью и inline-ошибкой под ним — вместо alert() и общих плашек.
 */
export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
  /** Место поля в сетке формы, например `lg:col-span-2`. */
  className?: string;
}) {
  const fallbackId = useId();
  const id = htmlFor ?? fallbackId;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-small text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-small text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
