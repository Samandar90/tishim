import { getTranslations } from "next-intl/server";
import { Check, CircleAlert } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * Первая карточка админки: что ещё нужно сделать, чтобы сайт работал для пациентов.
 * Пустая база раньше показывала восемь нулей без подсказки, с чего начать.
 */
export async function LaunchChecklist({
  featured,
  priceSet,
  phoneSet,
  clinicSet,
  newRequests,
}: {
  featured: boolean;
  priceSet: boolean;
  phoneSet: boolean;
  clinicSet: boolean;
  newRequests: number;
}) {
  const t = await getTranslations("admin.checklist");
  const rows = [
    { ok: featured, text: t("featured"), href: "/admin/dentists" },
    { ok: priceSet, text: t("price"), href: "/admin/settings" },
    { ok: phoneSet, text: t("phone"), href: "/admin/settings" },
    { ok: clinicSet, text: t("clinic"), href: "/admin?tab=clinics" },
  ];

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.text} className="flex items-center gap-3 py-2.5">
            <span
              className={
                row.ok
                  ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                  : "flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"
              }
              aria-label={row.ok ? t("done") : t("fix")}
            >
              {row.ok ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
            </span>
            <span className="min-w-0 flex-1 text-body text-ink">{row.text}</span>
            {!row.ok && (
              <ButtonLink href={row.href} variant="secondary" size="sm">
                {t("fix")}
              </ButtonLink>
            )}
          </li>
        ))}
        <li className="flex items-center gap-3 py-2.5">
          <span
            className={
              newRequests === 0
                ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                : "flex size-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700"
            }
          >
            {newRequests === 0 ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
          </span>
          <span className="min-w-0 flex-1 text-body text-ink">
            {t("newRequests", { count: newRequests })}
          </span>
          {newRequests > 0 && (
            <ButtonLink href="/admin/requests" size="sm">
              {t("open")}
            </ButtonLink>
          )}
        </li>
      </ul>
    </Card>
  );
}
