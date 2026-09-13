import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { BottomTabs, Sidebar, type NavItem } from "./NavTabs";

/**
 * Единый каркас кабинетов: на десктопе — боковое меню,
 * на мобильном — нижняя таб-панель. Шапка одна и та же.
 */
export async function AppShell({
  items,
  homeHref,
  userName,
  roleLabel,
  children,
}: {
  items: NavItem[];
  homeHref: string;
  userName?: string;
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
            {userName && (
              <span className="hidden text-right lg:block">
                <span className="block max-w-[200px] truncate text-body font-medium text-ink">
                  {userName}
                </span>
                {roleLabel && <span className="block text-small text-muted">{roleLabel}</span>}
              </span>
            )}
            <LocaleSwitcher />
            <LogoutButton label={t("logout")} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-content gap-6 px-4 pb-24 pt-6 md:px-6 md:pb-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24">
            <Sidebar items={items} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomTabs items={items} />
    </div>
  );
}
