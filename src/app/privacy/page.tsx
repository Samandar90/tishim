import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PRIVACY } from "@/content/privacy";
import { Logo } from "@/components/layout/Logo";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

/** Публичная страница: на неё ссылаются форма заявки, регистрация и подвал лендинга. */
export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const locale = (await getLocale()) === "uz" ? "uz" : "ru";
  const sections = PRIVACY[locale];

  return (
    <div className="min-h-screen bg-surface">
      <header className="safe-top mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
        <LocaleSwitcher />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <h1 className="text-h2 text-ink md:text-h1">{t("title")}</h1>
        <p className="mt-1 text-small text-muted">{t("updated")}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-h3 text-ink">{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="text-body text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-10">
          <Link
            href="/"
            className="inline-flex min-h-touch items-center font-medium text-primary-700 hover:text-primary-800"
          >
            ← {t("back")}
          </Link>
        </p>
      </main>
    </div>
  );
}
