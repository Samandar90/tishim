"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";

/**
 * Каркас экранов входа, регистрации и восстановления пароля. С lg — две колонки: слева
 * тёмная панель с обещанием продукта, как hero лендинга, справа карточка формы; на
 * телефоне остаётся логотип и карточка. Раньше экран входа был карточкой посреди серого
 * поля и не был похож на сайт, с которого на него пришли.
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const points = [t("benefit1Title"), t("benefit2Title"), t("benefit3Title")];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-900 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-primary-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 right-0 size-[420px] rounded-full bg-primary-400/15 blur-3xl"
        />
        <div className="relative">
          <Logo onDark />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-title text-white">{t("title")}</h2>
          <p className="mt-4 text-lede text-slate-300">{t("subtitle")}</p>
          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-body text-slate-200">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-700/40 text-primary-200 ring-1 ring-inset ring-primary-400/40">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-small text-slate-500">© {new Date().getFullYear()} Tishim</p>
      </aside>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:min-h-0">
        <Logo className="mb-8 lg:hidden" />
        <Card className="w-full max-w-md p-6 md:p-8">{children}</Card>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-touch items-center text-small text-muted hover:text-ink"
        >
          ← {tc("goHome")}
        </Link>
      </div>
    </div>
  );
}
