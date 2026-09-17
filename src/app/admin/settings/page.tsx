import { getAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-lg">
      <SettingsForm
        initialPrice={settings.initialMappingPrice}
        initialPhone={settings.contactPhone}
      />
    </div>
  );
}
