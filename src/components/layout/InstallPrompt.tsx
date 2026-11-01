"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const DISMISS_KEY = "tishim:install-dismissed";
const DISMISS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Подсказка «установить как приложение». Сайт ставится на домашний экран, но сам
 * об этом не говорил — пациенты не знали. Android: нативный prompt по событию
 * beforeinstallprompt; iPhone: шторка с двумя шагами, других способов у Safari нет.
 * В установленном приложении и после «Позже» (30 дней) не показывается.
 */
export function InstallPrompt() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;
    const ua = navigator.userAgent;
    // iPadOS представляется как Mac, но у него есть тач
    const apple = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (apple) {
      setIos(true);
      setHidden(false);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // без storage подсказка просто вернётся в следующий раз
    }
  }

  async function install() {
    if (ios) {
      setGuide(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setHidden(true);
    else dismiss();
  }

  if (hidden) return null;

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
        <Download className="size-5 shrink-0 text-primary-700" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">{t("installTitle")}</p>
          <p className="text-small text-muted">{t("installText")}</p>
        </div>
        <Button type="button" onClick={() => void install()}>
          {t("installButton")}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("later")}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-primary-100 hover:text-ink"
        >
          <X className="size-5" />
        </button>
      </div>

      <Sheet open={guide} onClose={() => setGuide(false)} label={t("iosTitle")}>
        <h2 className="text-h3 text-ink">{t("iosTitle")}</h2>
        <ol className="mt-4 space-y-3 text-body text-ink">
          <li className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Share className="size-4" strokeWidth={1.75} />
            </span>
            <span className="pt-1.5">{t("iosStep1")}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Download className="size-4" strokeWidth={1.75} />
            </span>
            <span className="pt-1.5">{t("iosStep2")}</span>
          </li>
        </ol>
        <Button type="button" block className="mt-6" onClick={() => setGuide(false)}>
          {t("gotIt")}
        </Button>
      </Sheet>
    </>
  );
}
