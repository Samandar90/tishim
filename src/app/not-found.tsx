import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ToothIcon } from "@/components/icons";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
          <ToothIcon className="size-8" />
        </span>
        <h1 className="mb-2 text-lg font-semibold text-slate-900">{t("notFoundTitle")}</h1>
        <p className="mb-5 text-sm text-slate-600">{t("notFoundText")}</p>
        <Link href="/">
          <Button className="w-full">{t("goHome")}</Button>
        </Link>
      </Card>
    </div>
  );
}
