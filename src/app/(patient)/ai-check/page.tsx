"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { AiScreening, AiScreeningResult, UrgencyLevel } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CameraIcon, SparklesIcon, XIcon } from "@/components/icons";

const URGENCY_TONE: Record<UrgencyLevel, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

function ResultView({ result }: { result: AiScreeningResult }) {
  const t = useTranslations("aiCheck");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{t("urgencyLabel")}</span>
        <Badge tone={URGENCY_TONE[result.urgency]}>{t(`urgency.${result.urgency}`)}</Badge>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900">{t("findings")}</p>
        {result.findings.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noFindings")}</p>
        ) : (
          <ul className="space-y-2">
            {result.findings.map((f, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t("zone")}: {f.zone}
                </p>
                <p className="text-sm text-slate-800">{f.observation}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {t("confidence", { value: Math.round(f.confidence * 100) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t("recommendations")}</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
            {result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800">
        ⚠️ {t("disclaimer")}
      </p>
    </div>
  );
}

export default function AiCheckPage() {
  const t = useTranslations("aiCheck");
  const locale = useLocale();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiScreeningResult | null>(null);
  const [history, setHistory] = useState<AiScreening[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ai_screenings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory((data ?? []) as AiScreening[]));
  }, [result]);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...images].slice(0, 3));
    setResult(null);
  }

  async function analyze() {
    if (files.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("unauthorized");

      const paths: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("ai-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        paths.push(path);
      }

      const res = await fetch("/api/ai-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, locale }),
      });
      if (!res.ok) throw new Error(`api ${res.status}`);
      const data = (await res.json()) as { result: AiScreeningResult };
      setResult(data.result);
      setFiles([]);
    } catch (e) {
      setError(t("error"));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <SparklesIcon className="size-6" />
          </span>
          <div>
            <CardTitle className="mb-0">{t("title")}</CardTitle>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex size-9 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label={t("removePhoto")}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-primary-400 hover:text-primary-500">
              <CameraIcon className="size-7" />
              <span className="text-xs font-medium">{t("upload")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-400">{t("uploadHint")}</p>

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button
          onClick={analyze}
          loading={analyzing}
          disabled={files.length === 0}
          className="w-full"
        >
          {analyzing ? t("analyzing") : t("analyze")}
        </Button>

        {/* дисклеймер виден до проверки, а не только в результате */}
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          {t("disclaimer")}
        </p>
      </Card>

      {result && (
        <Card>
          <ResultView result={result} />
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardTitle>{t("history")}</CardTitle>
          <ul className="divide-y divide-slate-100">
            {history.map((s) => (
              <li key={s.id} className="py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {formatDate(s.created_at, locale)}
                  </span>
                  <Badge tone={URGENCY_TONE[s.urgency]}>{t(`urgency.${s.urgency}`)}</Badge>
                </div>
                {(s.result?.findings ?? []).slice(0, 2).map((f, i) => (
                  <p key={i} className="truncate text-sm text-slate-700">
                    {f.zone}: {f.observation}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {t("disclaimer")}
          </p>
        </Card>
      )}
    </div>
  );
}
