"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Inbox,
  KeyRound,
  Settings,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavIcon =
  | "tooth"
  | "calendar"
  | "key"
  | "sparkles"
  | "users"
  | "chart"
  | "inbox"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  /** Красный счётчик (например, новые заявки). */
  badge?: number;
};

const ICONS: Record<NavIcon, LucideIcon> = {
  tooth: Stethoscope,
  calendar: CalendarDays,
  key: KeyRound,
  sparkles: Sparkles,
  users: Users,
  chart: BarChart3,
  inbox: Inbox,
  settings: Settings,
};

function Counter({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none text-white",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function useIsActive() {
  const pathname = usePathname();
  return (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Боковая навигация — десктоп (≥ md). */
export function Sidebar({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav className="hidden md:block" aria-label="main">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-touch items-center gap-3 rounded-xl px-3 text-body font-medium transition-colors",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-muted hover:bg-slate-100 hover:text-ink"
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <Counter count={item.badge} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Нижняя таб-панель — мобильный (< md). */
export function BottomTabs({ items }: { items: NavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur safe-bottom md:hidden"
      aria-label="main"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-touch flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium leading-tight transition-colors active:opacity-60",
                active ? "text-primary-700" : "text-muted"
              )}
            >
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.75} />
                <Counter count={item.badge} className="absolute -right-2.5 -top-1.5" />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
