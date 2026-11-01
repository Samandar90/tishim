import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mustCount } from "@/lib/supabase/result";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/NavTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  const t = await getTranslations("nav");
  const supabase = await createClient();
  // Новые заявки раньше были невидимы: ни счётчика в меню, ни на главной
  const newRequests = await mustCount(
    supabase.from("mapping_requests").select("id", { count: "exact", head: true }).eq("status", "new")
  );

  const items: NavItem[] = [
    { href: "/admin", label: t("admin"), icon: "chart", exact: true },
    { href: "/admin/dentists", label: t("dentists"), icon: "users" },
    { href: "/admin/requests", label: t("requests"), icon: "inbox", badge: newRequests },
    { href: "/admin/settings", label: t("settings"), icon: "settings" },
  ];

  return (
    <AppShell
      items={items}
      homeHref="/admin"
      profile={profile}
      roleLabel={t("roleAdmin")}
    >
      {children}
    </AppShell>
  );
}
