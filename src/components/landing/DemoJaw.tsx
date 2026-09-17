"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PERMANENT_LOWER, PERMANENT_UPPER } from "@/lib/constants/teeth";
import { cn } from "@/lib/utils";
import { JawViewToggle, useJawView } from "@/components/odontogram/JawViewToggle";
import { Legend } from "@/components/odontogram/Legend";
import { ToothSheet } from "@/components/odontogram/ToothSheet";
import { DEMO_CHART, DemoOdontogram } from "./DemoOdontogram";

const Jaw3D = dynamic(() => import("@/components/odontogram/Jaw3D"), { ssr: false });

const ORDER = [...PERMANENT_UPPER, ...PERMANENT_LOWER];

/** Демо карты на лендинге: та же 3D-челюсть, что у пациента, на выдуманных данных. */
export function DemoJaw() {
  const t = useTranslations("odontogram");
  const stageRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [no3d, setNo3d] = useState(false);
  const [activeFdi, setActiveFdi] = useState<number | null>(null);
  const { view, resets, select } = useJawView();

  // three и модели качаются, только когда демо подъехало к экрану: на телефоне оно
  // ниже первого экрана, и тот, кто не долистал, не должен платить за него трафиком
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (no3d) return <DemoOdontogram onDark />;

  const step = (delta: number) =>
    setActiveFdi((cur) =>
      cur === null ? cur : ORDER[(ORDER.indexOf(cur) + delta + ORDER.length) % ORDER.length]
    );

  return (
    <div className="space-y-3">
      <div
        ref={stageRef}
        className="relative h-80 overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:h-stage-hero"
      >
        {!ready && <div aria-busy className="absolute inset-0 animate-pulse bg-white/5" />}
        {near && (
          <Jaw3D
            chart={DEMO_CHART}
            dentition="permanent"
            view={view}
            viewResets={resets}
            activeFdi={activeFdi}
            label={t("jaw3d")}
            onToothClick={setActiveFdi}
            onReady={() => setReady(true)}
            onFail={() => setNo3d(true)}
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              ready ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </div>
      <JawViewToggle view={view} onSelect={select} />
      <p className="text-center text-small text-slate-400">{t("jawHint")}</p>
      <Legend chart={DEMO_CHART} onDark />

      <ToothSheet
        fdi={activeFdi}
        state={activeFdi !== null ? DEMO_CHART[activeFdi] : undefined}
        onClose={() => setActiveFdi(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </div>
  );
}
