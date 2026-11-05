"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { useNativeDialog } from "./useNativeDialog";

/**
 * Модальное подтверждение необратимых действий.
 * Нативный <dialog> даёт фокус-ловушку и Esc бесплатно.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("common");
  const { ref } = useNativeDialog(open);
  const titleId = useId();
  const descId = useId();
  const Icon = danger ? TriangleAlert : CircleHelp;

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      // !m-auto: селектор родительского space-y-* дотягивается до диалога в top layer
      // и ставит margin-top, отчего центрированный диалог уезжал к верхнему краю
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="w-[calc(100vw-2rem)] max-w-md !m-auto rounded-2xl border border-line bg-card p-6 shadow-modal backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        {/* знак слева: опасное действие читается до текста, не только по красной кнопке */}
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            danger ? "bg-red-50 text-red-700" : "bg-primary-50 text-primary-700"
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-h3 text-ink">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1.5 text-body text-muted">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
