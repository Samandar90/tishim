"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { KeyIcon } from "@/components/icons";

export default function DentistAccessPage() {
  const t = useTranslations("dentist");
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, value: string) {
    const v = value.replace(/\D/g, "");
    setDigits((prev) => {
      const next = [...prev];
      if (v.length > 1) {
        // pasted several digits
        const chars = v.slice(0, 6 - index).split("");
        chars.forEach((c, i) => (next[index + i] = c));
        inputs.current[Math.min(index + chars.length, 5)]?.focus();
      } else {
        next[index] = v;
        if (v && index < 5) inputs.current[index + 1]?.focus();
      }
      return next;
    });
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("redeem_access_code", { p_code: code });

    // Неверный код — пустой ответ; исключение too_many_attempts — блокировка после пяти
    // неудач за 15 минут (миграция 00011), о ней врачу говорится прямо
    if (error || !data) {
      setError(error?.message.includes("too_many_attempts") ? t("codeLocked") : t("codeError"));
      setLoading(false);
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
      return;
    }

    setSuccess(true);
    router.push(`/dentist/patient/${data}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("accessTitle")} description={t("accessSubtitle")} />
      <Card className="max-w-md p-5 md:p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex justify-center gap-2" dir="ltr">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={6}
                // те же рамка и кольцо фокуса, что у ui/Input: раньше поле было бледнее и фокус терялся
                className="h-14 min-w-0 flex-1 rounded-xl border border-slate-300 bg-card text-center text-h2 tabular-nums text-ink transition-colors hover:border-slate-400 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700"
                aria-label={t("codeDigit", { n: i + 1 })}
              />
            ))}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-body text-danger">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-body text-emerald-800">
              {t("codeSuccess")}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            block
            loading={loading}
            disabled={digits.join("").length !== 6}
          >
            <KeyIcon className="size-4" />
            {t("submitCode")}
          </Button>
          <p className="text-center text-small text-muted">{t("accessHint")}</p>
        </form>
      </Card>
    </div>
  );
}
