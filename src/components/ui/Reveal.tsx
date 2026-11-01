"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Stage = "visible" | "hidden" | "shown";

/**
 * Сдержанное появление секции при скролле: только opacity + 12px сдвиг.
 * Анимация — прогрессивное улучшение: в разметке с сервера контент виден, и
 * прячется он только тем, что при монтировании оказалось ниже экрана. Раньше всё
 * ниже hero рендерилось с opacity-0 до гидратации, и на медленной сети посетитель
 * листал пустые секции. При prefers-reduced-motion анимация отключена в globals.css.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top <= window.innerHeight) return;

    setStage("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStage("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={stage === "shown" ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        stage === "hidden" && "opacity-0",
        stage === "shown" && "animate-fade-in-up",
        className
      )}
    >
      {children}
    </div>
  );
}
