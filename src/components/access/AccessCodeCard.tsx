"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { KeyIcon } from "@/components/icons";

export function AccessCodeCard() {
  const t = useTranslations("access");
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setCode(null);
        setExpiresAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function generate() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("generate_access_code");
    setLoading(false);

    if (error || !data || data.length === 0) {
      console.error("generate access code failed", error);
      setError(t("codeError"));
      return;
    }
    const row = data[0] as { code: string; expires_at: string };
    setCode(row.code);
    setExpiresAt(new Date(row.expires_at));
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <p className="mb-4 text-sm text-slate-500">{t("subtitle")}</p>

      {code ? (
        <div className="mb-4 rounded-xl bg-primary-50 p-5 text-center">
          <p
            className="text-4xl font-bold tracking-[0.35em] text-primary-800"
            aria-live="polite"
          >
            {code}
          </p>
          <p className="mt-2 text-sm tabular-nums text-primary-700">
            {mm}:{ss}
          </p>
        </div>
      ) : null}

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button onClick={generate} loading={loading} className="w-full sm:w-auto">
        <KeyIcon className="size-4" />
        {t("generate")}
      </Button>
      <p className="mt-2 text-xs text-slate-400">{t("codeHint")}</p>
    </Card>
  );
}
