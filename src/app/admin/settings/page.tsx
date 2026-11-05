import { getTranslations } from "next-intl/server";
import { getAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AdminSettingsPage() {
  const settings = await getAppSettings();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-5">
      <PageHeader title={t("settingsTitle")} description={t("settingsSubtitle")} />
      <div className="max-w-lg">
        <SettingsForm
          initialPrice={settings.initialMappingPrice}
          initialPhone={settings.contactPhone}
        />
      </div>
    </div>
  );
}
