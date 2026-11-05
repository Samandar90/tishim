"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KeyIcon } from "@/components/icons";

export function AccessCodeCard() {
  const t = useTranslations("access");
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState<string | null>(null);
  const [grantedTo, setGrantedTo] = useState<string | null>(null);
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

  // Пока код жив, раз в три секунды смотрим, не появился ли новый активный доступ:
  // иначе пациент не знал, принял ли врач код, и диктовал его снова.
  useEffect(() => {
    if (!code || !issuedAt) return;
    const supabase = createClient();
    const check = async () => {
      const { data } = await supabase
        .from("patient_access")
        .select("granted_at, dentist:dentists(profile:profiles(full_name))")
        .eq("status", "active")
        .gte("granted_at", issuedAt)
        .order("granted_at", { ascending: false })
        .limit(1);
      const row = data?.[0] as
        | { dentist: { profile: { full_name: string } | null } | null }
        | undefined;
      if (row) {
        setGrantedTo(row.dentist?.profile?.full_name ?? "");
        setCode(null);
        setExpiresAt(null);
        router.refresh();
      }
    };
    const id = setInterval(() => void check(), 3000);
    return () => clearInterval(id);
  }, [code, issuedAt, router]);

  async function generate() {
    setGrantedTo(null);
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
    setIssuedAt(new Date(Date.now() - 5000).toISOString());
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card>
      {code ? (
        <div className="mb-4 rounded-2xl bg-primary-50 p-6 text-center ring-1 ring-inset ring-primary-100">
          <p className="text-small font-medium text-primary-700">{t("codeLabel")}</p>
          <p
            className="mt-1 text-display tabular-nums tracking-[0.3em] text-primary-800"
            aria-live="polite"
          >
            {code}
          </p>
          <p className="mt-1 text-small tabular-nums text-primary-700">
            {mm}:{ss}
          </p>
        </div>
      ) : null}

      {grantedTo !== null && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-body font-medium text-emerald-800">
          <Check className="size-4 shrink-0" />
          {t("granted", { name: grantedTo || "—" })}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-body text-danger">{error}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <KeyIcon className="size-5" />
          </span>
          <p className="text-body text-muted">{t("codeHint")}</p>
        </div>
        <Button onClick={generate} loading={loading} size="lg" className="w-full sm:w-auto">
          {t("generate")}
        </Button>
      </div>
    </Card>
  );
}
