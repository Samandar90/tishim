import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/NavTabs";

export default async function DentistLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("dentist");
  const t = await getTranslations("nav");
  const supabase = createClient();

  const { data: dentist } = await supabase
    .from("dentists")
    .select("is_featured")
    .eq("profile_id", profile.id)
    .single();

  const items: NavItem[] = [
    { href: "/dentist", label: t("patients"), icon: "users", exact: true },
    { href: "/dentist/access", label: t("accessByCode"), icon: "key" },
  ];

  if (dentist?.is_featured) {
    const { count } = await supabase
      .from("mapping_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    items.push({
      href: "/dentist/requests",
      label: t("requests"),
      icon: "inbox",
      badge: count ?? 0,
    });
  }

  return (
    <AppShell
      items={items}
      homeHref="/dentist"
      userName={profile.full_name}
      roleLabel={t("roleDentist")}
    >
      {children}
    </AppShell>
  );
}
