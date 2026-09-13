import { getTranslations } from "next-intl/server";
import type { Profile } from "@/lib/types/database";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { BottomTabs, Sidebar, type NavItem } from "./NavTabs";
import { ProfileSheet } from "./ProfileSheet";

/**
 * Единый каркас кабинетов. Десктоп: боковое меню, в шапке имя, язык и выход.
 * Телефон: нижняя таб-панель, в шапке только логотип и «Профиль» — шторка
 * с языком и выходом.
 */
export async function AppShell({
  items,
  homeHref,
  profile,
  roleLabel,
  children,
}: {
  items: NavItem[];
  homeHref: string;
  profile: Pick<Profile, "full_name" | "phone">;
  roleLabel?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");

  return (
    <div className="min-h-screen bg-surface">
      <header className="safe-top sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-4 md:px-6">
          <Logo href={homeHref} />
          <div className="flex items-center gap-2">
            {/* Десктопный кластер скрыт CSS, а не пропущен в рендере: сервер и
                клиент отдают одно дерево, matchMedia дал бы расхождение гидрации. */}
            <div className="hidden items-center gap-2 md:flex">
              {profile.full_name && (
                <span className="hidden text-right lg:block">
                  <span className="block max-w-[200px] truncate text-body font-medium text-ink">
                    {profile.full_name}
                  </span>
                  {roleLabel && <span className="block text-small text-muted">{roleLabel}</span>}
                </span>
              )}
              <LocaleSwitcher />
              <LogoutButton label={t("logout")} />
            </div>
            <ProfileSheet name={profile.full_name} phone={profile.phone} roleLabel={roleLabel} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-content gap-6 px-4 pb-24 pt-6 md:px-6 md:pb-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24">
            <Sidebar items={items} />
          </div>
        </aside>

        {/* page-enter — появление страницы после навигации, правило в globals.css */}
        <main className="page-enter min-w-0 flex-1">{children}</main>
      </div>

      <BottomTabs items={items} />
    </div>
  );
}
