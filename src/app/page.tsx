import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarCheck, ClipboardList, Phone, ShieldCheck, Smartphone, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { DemoOdontogram } from "@/components/landing/DemoOdontogram";
import { MappingRequestForm } from "@/components/landing/MappingRequestForm";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Logo } from "@/components/layout/Logo";

interface FeaturedDentist {
  specialization: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  rating: number | null;
  profile: { full_name: string } | null;
  clinic: { name: string; address: string | null } | null;
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const supabase = createClient();

  const [settings, { data: doctor }, { data: stats }] = await Promise.all([
    getAppSettings(),
    supabase
      .from("dentists")
      .select(
        "specialization, bio, photo_url, experience_years, rating, " +
          "profile:profiles(full_name), clinic:clinics(name, address)"
      )
      .eq("is_featured", true)
      .maybeSingle(),
    // агрегат через RPC: обычный select по visits аноним не видит из-за RLS
    supabase.rpc("get_public_stats"),
  ]);
  const featured = doctor as unknown as FeaturedDentist | null;
  const mappedCount = (stats as { mapped_patients?: number } | null)?.mapped_patients ?? 0;

  const steps = [
    { icon: Phone, title: t("step1Title"), text: t("step1Text") },
    { icon: Stethoscope, title: t("step2Title"), text: t("step2Text") },
    { icon: Smartphone, title: t("step3Title"), text: t("step3Text") },
  ];

  const faq = [1, 2, 3, 4].map((i) => ({
    q: t(`faq${i}q` as "faq1q"),
    a: t(`faq${i}a` as "faq1a"),
  }));

  return (
    <div className="bg-surface">
      {/* ---------- шапка ---------- */}
      <header className="safe-top absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 md:px-8">
          <Logo onDark />
          <div className="flex items-center gap-2">
            <LocaleSwitcher onDark />
            <Link href="/login">
              <Button variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                {t("login")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- 1. hero ---------- */}
      {/* верхний отступ = высота шапки + «чёлка» в standalone-режиме */}
      <section className="relative overflow-hidden bg-slate-900 pb-12 pt-[calc(6rem+env(safe-area-inset-top))] md:pb-20 md:pt-[calc(8rem+env(safe-area-inset-top))]">
        {/* мягкое бирюзовое свечение вместо стоковых фото */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-primary-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-56 right-0 size-[420px] rounded-full bg-primary-400/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-small font-medium text-primary-100 ring-1 ring-inset ring-white/15">
              <ShieldCheck className="size-4" />
              {t("heroBadge")}
            </span>
            <h1 className="text-[34px] font-semibold leading-[42px] text-white md:text-[44px] md:leading-[52px]">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-lg text-[17px] leading-7 text-slate-300">{t("subtitle")}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#request-form" className="sm:w-auto">
                <Button size="lg" block className="sm:w-auto">
                  {t("ctaBook")}
                </Button>
              </a>
              <Link href="/login" className="sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  block
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                >
                  {t("login")}
                </Button>
              </Link>
            </div>

            {settings.initialMappingPrice !== null && (
              <p className="mt-6 text-body text-slate-400">
                {t("priceLabel")}:{" "}
                <span className="font-semibold text-white">
                  {formatMoney(settings.initialMappingPrice, locale)}
                </span>{" "}
                · {t("priceNote")}
              </p>
            )}
          </div>

          {/* живая демо-одонтограмма прямо в hero */}
          <Reveal delay={120}>
            <p className="mb-2 text-small font-medium text-slate-400">{t("demoTitle")}</p>
            <DemoOdontogram onDark />
          </Reveal>
        </div>
      </section>

      {/* ---------- 2. как это работает (белая секция) ---------- */}
      <section className="section-y bg-card">
        <div className="mx-auto max-w-content px-4 md:px-8">
          <Reveal>
            <h2 className="text-center text-h2 text-ink">{t("howTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-body text-muted">
              {t("howSubtitle")}
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 90}>
                <Card className="h-full">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <step.icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-small font-semibold tabular-nums text-primary-600">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1.5 text-h3 text-ink">{step.title}</h3>
                  <p className="text-body text-muted">{step.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 3. врач (серая секция) ---------- */}
      {featured && (
        <section className="section-y bg-surface">
          <div className="mx-auto max-w-content px-4 md:px-8">
            <Reveal>
              <h2 className="text-center text-h2 text-ink">{t("doctorTitle")}</h2>
            </Reveal>
            <Reveal delay={80}>
              <Card className="mx-auto mt-8 max-w-3xl p-6 md:p-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.photo_url ?? "/doctor-placeholder.svg"}
                    alt={featured.profile?.full_name ?? ""}
                    className="size-28 shrink-0 rounded-full object-cover ring-4 ring-primary-50"
                  />
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-h3 text-ink">{featured.profile?.full_name}</p>
                    <p className="mt-0.5 text-body text-primary-700">{featured.specialization}</p>
                    {featured.clinic && (
                      <p className="mt-1 text-small text-muted">
                        {[featured.clinic.name, featured.clinic.address].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {featured.bio && <p className="mt-3 text-body text-muted">{featured.bio}</p>}

                    {/* факты цифрами */}
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
                      {[
                        featured.experience_years
                          ? { value: `${featured.experience_years}`, label: t("factExperience") }
                          : null,
                        mappedCount > 0 ? { value: `${mappedCount}`, label: t("factMapped") } : null,
                        featured.rating ? { value: `${featured.rating}`, label: t("factRating") } : null,
                      ]
                        .filter(Boolean)
                        .map((fact) => (
                          <div key={fact!.label} className="text-center sm:text-left">
                            <dt className="text-h2 tabular-nums text-primary-600">{fact!.value}</dt>
                            <dd className="text-small text-muted">{fact!.label}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- 4. форма записи (белая секция) ---------- */}
      <section id="request-form" className="section-y scroll-mt-16 bg-card">
        <div className="mx-auto max-w-content px-4 md:px-8">
          <Reveal>
            <h2 className="text-center text-h2 text-ink">{t("formTitle")}</h2>
            {settings.initialMappingPrice !== null && (
              <p className="mt-2 text-center text-body text-muted">
                {t("priceLabel")}: {formatMoney(settings.initialMappingPrice, locale)}
              </p>
            )}
          </Reveal>
          <Reveal delay={80}>
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-card md:p-7">
              <MappingRequestForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 5. FAQ (серая секция) ---------- */}
      <section className="section-y bg-surface">
        <div className="mx-auto max-w-content px-4 md:px-8">
          <Reveal>
            <h2 className="text-center text-h2 text-ink">{t("faqTitle")}</h2>
          </Reveal>
          <div className="mx-auto mt-8 max-w-2xl space-y-2">
            {faq.map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <details className="group rounded-2xl border border-line bg-card px-4 shadow-card">
                  <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-muted transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-4 text-body text-muted">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 6. футер ---------- */}
      <footer className="border-t border-line bg-card">
        <div className="mx-auto max-w-content space-y-8 px-4 py-12 md:px-8">
          <Reveal>
            <div className="rounded-2xl bg-slate-900 px-6 py-8 text-center">
              <p className="text-h3 text-white">{t("footerClinicTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-body text-slate-400">
                {t("footerClinicText")}
              </p>
              <a href="#request-form" className="mt-5 inline-block">
                <Button>
                  <ClipboardList className="size-4" />
                  {t("footerClinicCta")}
                </Button>
              </a>
            </div>
          </Reveal>

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo subtitle={`© ${new Date().getFullYear()}`} />
            {settings.contactPhone && (
              <a
                href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                className="flex min-h-touch items-center gap-2 text-body font-medium text-primary-700 hover:text-primary-800"
              >
                <CalendarCheck className="size-4" />
                {settings.contactPhone}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
