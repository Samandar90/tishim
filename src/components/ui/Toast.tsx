"use client";

import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Всплывающее подтверждение. Живёт над нижней таб-панелью,
 * поэтому на мобильном отступ снизу больше.
 */
export function Toast({
  message,
  tone = "success",
  onDismiss,
  duration = 4000,
}: {
  message: string | null;
  tone?: "success" | "error";
  onDismiss?: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const id = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration]);

  if (!message || !visible) return null;

  const Icon = tone === "success" ? Check : TriangleAlert;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm animate-fade-in-up items-center gap-2.5",
        "rounded-xl px-4 py-3 text-body font-medium text-white shadow-modal md:bottom-6",
        tone === "success" ? "bg-emerald-600" : "bg-danger"
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon className="size-3.5" strokeWidth={2.5} />
      </span>
      {message}
    </div>
  );
}
