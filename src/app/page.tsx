import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Check,
  ClipboardList,
  History,
  Infinity as InfinityIcon,
  KeyRound,
  MapPin,
  Phone,
  Rotate3d,
  ShieldCheck,
  Smartphone,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings";
import { cn, formatMoney } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { DemoJaw } from "@/components/landing/DemoJaw";
import { MappingRequestForm } from "@/components/landing/MappingRequestForm";
import { SectionHeading } from "@/components/landing/SectionHeading";
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

/** Вторичная кнопка на тёмном фоне: шапка, hero и форма живут на slate-900. */
const onDarkSecondary = "border-white/20 bg-white/10 text-white hover:bg-white/20";

/** Мягкое бирюзовое свечение тёмных секций вместо стоковых фото. */
function Glow({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
    />
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const supabase = await createClient();

  const [settings, { data: doctor }, { data: stats }, { data: clinic }] = await Promise.all([
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
    // клиника в подвале не зависит от флагмана: без него на странице не было ни города, ни адреса
    supabase
      .from("clinics")
      .select("name, address")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const place = [t("city"), clinic?.name, clinic?.address].filter(Boolean).join(", ");
  const featured = doctor as unknown as FeaturedDentist | null;
  const mappedCount = (stats as { mapped_patients?: number } | null)?.mapped_patients ?? 0;
  const price =
    settings.initialMappingPrice !== null ? formatMoney(settings.initialMappingPrice, locale) : null;
  const phoneHref = settings.contactPhone
    ? `tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`
    : null;

  const heroFacts = [
    price ? { value: price, label: t("heroFactPriceLabel") } : null,
    { value: t("heroFactTime"), label: t("heroFactTimeLabel") },
    { value: t("heroFactFree"), label: t("heroFactFreeLabel") },
  ].filter((f): f is { value: string; label: string } => f !== null);

  const benefits = [
    { icon: Rotate3d, title: t("benefit1Title"), text: t("benefit1Text") },
    { icon: History, title: t("benefit2Title"), text: t("benefit2Text") },
    { icon: KeyRound, title: t("benefit3Title"), text: t("benefit3Text") },
    { icon: InfinityIcon, title: t("benefit4Title"), text: t("benefit4Text") },
  ];

  const steps = [
    { icon: Phone, title: t("step1Title"), text: t("step1Text") },
    { icon: Stethoscope, title: t("step2Title"), text: t("step2Text") },
    { icon: Smartphone, title: t("step3Title"), text: t("step3Text") },
  ];

  const formNext = [t("formNext1"), t("formNext2"), t("formNext3")];

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
            <ButtonLink href="/login" variant="secondary" className={onDarkSecondary}>
              {t("login")}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- 1. hero ---------- */}
        {/* верхний отступ = высота шапки + «чёлка» в standalone-режиме */}
        <section className="relative overflow-hidden bg-slate-900 pb-14 pt-[calc(6rem+env(safe-area-inset-top))] md:pb-24 md:pt-[calc(8.5rem+env(safe-area-inset-top))]">
          <Glow className="-left-40 -top-40 size-[520px] bg-primary-600/25" />
          <Glow className="-bottom-56 right-0 size-[460px] bg-primary-400/15" />

          <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <span className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-small font-medium text-primary-100 ring-1 ring-inset ring-white/15">
                <ShieldCheck className="size-4" strokeWidth={1.75} />
                {t("heroBadge")}
              </span>
              <h1 className="max-w-xl text-display text-white">{t("title")}</h1>
              <p className="mt-5 max-w-lg text-lede text-slate-300">{t("subtitle")}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="#request-form" size="lg" block className="sm:w-auto">
                  {t("ctaBook")}
                </ButtonLink>
                <ButtonLink
                  href="/login"
                  size="lg"
                  variant="secondary"
                  block
                  className={cn(onDarkSecondary, "sm:w-auto")}
                >
                  {t("login")}
                </ButtonLink>
              </div>

              {/* три факта вместо строки с ценой: цена, длительность, бесплатный доступ */}
              <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-6">
                {heroFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-h3 tabular-nums text-white">{fact.value}</dt>
                    <dd className="mt-0.5 text-small text-slate-400">{fact.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* живая демо-одонтограмма прямо в hero */}
            <Reveal delay={120}>
              <p className="mb-3 text-eyebrow uppercase text-primary-300">{t("demoTitle")}</p>
              <DemoJaw />
            </Reveal>
          </div>
        </section>

        {/* ---------- 2. что вы получаете (белая секция) ---------- */}
        <section className="section-y bg-card">
          <div className="mx-auto max-w-content px-4 md:px-8">
            <Reveal>
              <SectionHeading
                eyebrow={t("benefitsEyebrow")}
                title={t("benefitsTitle")}
                lede={t("benefitsLede")}
              />
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {benefits.map((item, i) => (
                <Reveal key={item.title} delay={i * 80} className="h-full">
                  <div className="h-full rounded-2xl bg-surface p-6">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                      <item.icon className="size-6" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-5 text-h3 text-ink">{item.title}</h3>
                    <p className="mt-2 text-body text-muted">{item.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 3. как это работает (серая секция) ---------- */}
        <section className="section-y bg-surface">
          <div className="mx-auto max-w-content px-4 md:px-8">
            <Reveal>
              <SectionHeading
                eyebrow={t("howEyebrow")}
                title={t("howTitle")}
                lede={t("howSubtitle")}
              />
            </Reveal>

            {/* шаги на одной линии: верхняя граница каждого — отрезок общей оси */}
            <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
              {steps.map((step, i) => (
                <li key={step.title} className="h-full">
                  <Reveal delay={i * 90} className="h-full border-t-2 border-primary-200 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-title tabular-nums text-primary-700">0{i + 1}</span>
                      <span className="flex size-11 items-center justify-center rounded-xl bg-card text-primary-700 shadow-card">
                        <step.icon className="size-5" strokeWidth={1.75} />
                      </span>
                    </div>
                    <h3 className="mt-4 text-h3 text-ink">{step.title}</h3>
                    <p className="mt-2 text-body text-muted">{step.text}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- 4. врач (белая секция) ---------- */}
        {featured && (
          <section className="section-y bg-card">
            <div className="mx-auto max-w-content px-4 md:px-8">
              <Reveal>
                <SectionHeading eyebrow={t("doctorEyebrow")} title={t("doctorTitle")} />
              </Reveal>
              <Reveal delay={80}>
                <Card className="mt-8 max-w-3xl p-6 md:p-8">
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
                            ? {
                                value: `${featured.experience_years}`,
                                label: t("factExperience", { count: featured.experience_years }),
                              }
                            : null,
                          mappedCount > 0
                            ? { value: `${mappedCount}`, label: t("factMapped", { count: mappedCount }) }
                            : null,
                          featured.rating ? { value: `${featured.rating}`, label: t("factRating") } : null,
                        ]
                          .filter(Boolean)
                          .map((fact) => (
                            <div key={fact!.label} className="text-center sm:text-left">
                              <dt className="text-h2 tabular-nums text-primary-700">{fact!.value}</dt>
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

        {/* ---------- 5. форма записи (тёмная секция, как hero) ---------- */}
        <section
          id="request-form"
          className="section-y relative scroll-mt-16 overflow-hidden bg-slate-900"
        >
          <Glow className="-right-40 -top-40 size-[520px] bg-primary-600/20" />
          <div className="relative mx-auto grid max-w-content grid-cols-1 gap-10 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-16">
            <div>
              <Reveal>
                <SectionHeading
                  eyebrow={t("formEyebrow")}
                  title={t("formTitle")}
                  lede={t("formLede")}
                  onDark
                />
              </Reveal>

              <Reveal delay={80}>
                <p className="mt-8 text-small font-medium text-slate-400">{t("formNextTitle")}</p>
                <ol className="mt-3 space-y-3">
                  {formNext.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-body text-slate-200">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-700/40 text-primary-200 ring-1 ring-inset ring-primary-400/40">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>

                {price && (
                  <div className="mt-8 rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/10">
                    <p className="text-small text-slate-400">{t("priceLabel")}</p>
                    <p className="mt-1 text-title tabular-nums text-white">{price}</p>
                    <p className="mt-1 text-small text-slate-400">{t("priceNote")}</p>
                  </div>
                )}

                {settings.contactPhone && phoneHref && (
                  <p className="mt-6 text-body text-slate-400">
                    {t("formCall")}:{" "}
                    <a
                      href={phoneHref}
                      className="inline-flex min-h-touch items-center gap-2 font-medium text-white hover:text-primary-200"
                    >
                      <Phone className="size-4" strokeWidth={1.75} />
                      {settings.contactPhone}
                    </a>
                  </p>
                )}
              </Reveal>
            </div>

            <Reveal delay={120}>
              <div className="rounded-2xl bg-card p-5 shadow-modal md:p-8">
                <MappingRequestForm />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- 6. FAQ (белая секция) ---------- */}
        <section className="section-y bg-card">
          <div className="mx-auto max-w-content px-4 md:px-8">
            <Reveal>
              <SectionHeading
                eyebrow={t("faqEyebrow")}
                title={t("faqTitle")}
                lede={t("faqLede")}
                align="center"
              />
            </Reveal>
            <div className="mx-auto mt-10 max-w-2xl divide-y divide-line rounded-2xl border border-line bg-card">
              {faq.map((item, i) => (
                <Reveal key={i} delay={i * 60}>
                  <details className="group px-5">
                    <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 py-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-muted transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="pb-5 pr-10 text-body text-muted">{item.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------- 7. футер ---------- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-content space-y-10 px-4 py-12 md:px-8 md:py-16">
          <Reveal>
            <div className="flex flex-col gap-5 rounded-2xl bg-primary-50 p-6 ring-1 ring-inset ring-primary-100 md:flex-row md:items-center md:justify-between md:p-8">
              <div>
                <p className="text-h3 text-ink">{t("footerClinicTitle")}</p>
                <p className="mt-1 max-w-md text-body text-muted">{t("footerClinicText")}</p>
              </div>
              <ButtonLink href="#request-form" className="shrink-0">
                <ClipboardList className="size-4" strokeWidth={1.75} />
                {t("footerClinicCta")}
              </ButtonLink>
            </div>
          </Reveal>

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <Logo subtitle={`© ${new Date().getFullYear()}`} />
            <div className="space-y-2 text-body text-muted sm:text-right">
              <p className="font-medium text-ink">{t("footerContacts")}</p>
              <p className="flex items-center gap-2 sm:justify-end">
                <MapPin className="size-4 shrink-0" strokeWidth={1.75} />
                {place}
              </p>
              {settings.contactPhone && phoneHref && (
                <a
                  href={phoneHref}
                  className="inline-flex min-h-touch items-center gap-2 font-medium text-primary-700 hover:text-primary-800"
                >
                  <Phone className="size-4" strokeWidth={1.75} />
                  {settings.contactPhone}
                </a>
              )}
              <p>
                <Link href="/privacy" className="underline-offset-2 hover:text-ink hover:underline">
                  {t("privacyLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
