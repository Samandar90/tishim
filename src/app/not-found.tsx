import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { ToothIcon } from "@/components/icons";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <Logo className="mb-8" />
      <Card className="w-full max-w-sm p-6 text-center md:p-8">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <ToothIcon className="size-8" />
        </span>
        <p className="text-eyebrow uppercase text-muted">404</p>
        <h1 className="mt-1 text-h3 text-ink">{t("notFoundTitle")}</h1>
        <p className="mb-6 mt-1.5 text-body text-muted">{t("notFoundText")}</p>
        <ButtonLink href="/" block>
          {t("goHome")}
        </ButtonLink>
      </Card>
    </div>
  );
}
