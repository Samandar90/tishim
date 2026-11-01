import { getTranslations } from "next-intl/server";
import { getAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getAppSettings();
  const t = await getTranslations("admin");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="sr-only">{t("settingsTitle")}</h1>
      <SettingsForm
        initialPrice={settings.initialMappingPrice}
        initialPhone={settings.contactPhone}
      />
    </div>
  );
}
