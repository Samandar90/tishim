import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/NavTabs";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("patient");
  const t = await getTranslations("nav");

  const items: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: "tooth" },
    { href: "/visits", label: t("visits"), icon: "calendar" },
    { href: "/access", label: t("access"), icon: "key" },
    { href: "/ai-check", label: t("aiCheck"), icon: "sparkles" },
  ];

  return (
    <AppShell
      items={items}
      homeHref="/dashboard"
      userName={profile.full_name}
      roleLabel={t("rolePatient")}
    >
      {children}
    </AppShell>
  );
}
