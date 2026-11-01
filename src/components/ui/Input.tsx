import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Рамка slate-300, а не line: граница #e2e8f0 на белом — 1,2:1, поле сливалось с
// карточкой. Кольцо фокуса без прозрачности: 20% давали 1,21:1, фокус был невидим.
const base =
  "w-full rounded-xl border bg-card px-3.5 text-body text-ink transition-colors placeholder:text-slate-500 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-700 disabled:bg-slate-50 disabled:text-muted";
const normal = "border-slate-300 hover:border-slate-400 focus:border-primary-700";
const invalid = "border-danger focus:border-danger focus:ring-danger";

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
  // Ошибку и подсказку скринридер читает вместе с полем — через aria-describedby
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control =
    describedBy && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": describedBy })
      : children;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {error ? (
        <p id={`${id}-error`} aria-live="polite" className="mt-1.5 text-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-small text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
