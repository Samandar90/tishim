"use client";

import { Sheet } from "@/components/ui/Sheet";
import { ToothDetails, useToothTitle } from "./ToothDetails";
import type { ToothState } from "./types";

/**
 * Шторка с подробностями по одному зубу — нативный <dialog> через ui/Sheet:
 * фокус-ловушка и Esc бесплатно, стрелки ←/→ листают соседние зубы. На широком
 * экране TeethScene показывает те же подробности панелью рядом со сценой и шторку
 * не открывает.
 */
export function ToothSheet({
  fdi,
  state,
  onClose,
  onPrev,
  onNext,
}: {
  /** null — шторка закрыта. */
  fdi: number | null;
  state?: ToothState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const title = useToothTitle();

  return (
    <Sheet
      open={fdi !== null}
      onClose={onClose}
      tone="dark"
      label={fdi !== null ? `${fdi} · ${title(fdi)}` : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onPrev();
        if (e.key === "ArrowRight") onNext();
      }}
    >
      {fdi !== null && (
        <ToothDetails fdi={fdi} state={state} onClose={onClose} onPrev={onPrev} onNext={onNext} />
      )}
    </Sheet>
  );
}
