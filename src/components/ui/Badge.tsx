import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  primary: "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-small font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Чип с цветным кружком — для легенды одонтограммы. */
export function ColorChip({
  color,
  label,
  className,
}: {
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-small text-muted",
        className
      )}
    >
      <span
        className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
