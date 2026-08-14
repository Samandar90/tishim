"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

const KEY = "tishim:visit-saved";

/**
 * Показывает подтверждение сохранения приёма после перехода на карту пациента.
 * Сообщение кладёт в sessionStorage форма приёма — так оно переживает навигацию.
 */
export function SavedVisitToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY);
    if (stored) {
      setMessage(stored);
      sessionStorage.removeItem(KEY);
    }
  }, []);

  return <Toast message={message} tone="success" onDismiss={() => setMessage(null)} />;
}
