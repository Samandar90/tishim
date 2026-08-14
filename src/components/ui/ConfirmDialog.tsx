"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";

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
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-line bg-card p-6 shadow-modal backdrop:bg-slate-900/50"
    >
      <h2 className="text-h3 text-ink">{title}</h2>
      {description && <p className="mt-2 text-body text-muted">{description}</p>}
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
