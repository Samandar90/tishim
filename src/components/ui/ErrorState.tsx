"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

/** Общий экран ошибки маршрута — текст на языке пользователя, а не стек Next.js. */
export function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("route error", error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title={t("error")}
      className="mx-auto max-w-md"
      action={
        <Button variant="secondary" onClick={reset}>
          <RotateCw className="size-4" />
          {t("retry")}
        </Button>
      }
    />
  );
}
