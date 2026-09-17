import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/NavTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  const t = await getTranslations("nav");

  const items: NavItem[] = [
    { href: "/admin", label: t("admin"), icon: "chart", exact: true },
    { href: "/admin/dentists", label: t("dentists"), icon: "users" },
    { href: "/admin/requests", label: t("requests"), icon: "inbox" },
    { href: "/admin/settings", label: t("settings"), icon: "settings" },
  ];

  return (
    <AppShell
      items={items}
      homeHref="/admin"
      userName={profile.full_name}
      roleLabel={t("roleAdmin")}
    >
      {children}
    </AppShell>
  );
}
