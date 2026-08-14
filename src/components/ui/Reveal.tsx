"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Сдержанное появление секции при скролле: только opacity + 12px сдвиг.
 * При prefers-reduced-motion анимация отключается глобально в globals.css.
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
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
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
      style={shown ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(shown ? "animate-fade-in-up" : "opacity-0", className)}
    >
      {children}
    </div>
  );
}
