"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooth } from "./Tooth";
import type { ToothState } from "./types";

// three тяжёлый: чанк с ним грузится, только когда сцена зуба на экране, и в
// серверном рендере не участвует — WebGL есть только в браузере.
const Tooth3D = dynamic(() => import("./Tooth3D"), { ssr: false });

/**
 * Один зуб в 3D на тёмной подложке. Пока модель именно этого зуба не на экране — и
 * совсем без WebGL — на её месте плоский зуб, чтобы сцена не появлялась пустым окном.
 */
export function ToothStage({
  fdi,
  state,
  className,
}: {
  fdi: number;
  state?: ToothState;
  /** Размер и подложка сцены. */
  className?: string;
}) {
  const t = useTranslations("odontogram");
  const [readyFdi, setReadyFdi] = useState<number | null>(null);
  const [no3d, setNo3d] = useState(false);
  const ready = !no3d && readyFdi === fdi;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Tooth fdi={fdi} state={state} readOnly onDark width={88} />
        </div>
      )}
      {!no3d && (
        <Tooth3D
          fdi={fdi}
          state={state}
          label={t("model3d", { fdi })}
          onReady={setReadyFdi}
          onFail={() => setNo3d(true)}
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            ready ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {ready && (
        <Rotate3d
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 size-4 text-slate-500"
        />
      )}
    </div>
  );
}
