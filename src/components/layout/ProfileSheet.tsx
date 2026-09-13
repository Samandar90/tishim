"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Phone, X } from "lucide-react";
import { formatUzPhone } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LogoutButton } from "./LogoutButton";

/**
 * Меню аккаунта на телефоне: кнопка «(инициалы) Профиль» в шапке и светлая
 * шторка с именем, ролью, телефоном, языком и выходом. На md+ кнопка скрыта —
 * там язык и выход живут прямо в шапке.
 */
export function ProfileSheet({
  name,
  phone,
  roleLabel,
}: {
  name: string;
  phone: string | null;
  roleLabel?: string;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* md:hidden только на кнопке: <dialog> обязан жить вне hidden-обёртки —
          display:none у предка не даёт ему выйти в top layer. Шторка внутри
          sticky-шапки с backdrop-blur — top layer игнорирует предков, ToothSheet
          живёт на том же механизме. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="-mr-2 flex min-h-touch items-center gap-2 rounded-xl px-2 text-small font-medium text-muted transition-colors hover:bg-slate-100 hover:text-ink md:hidden"
      >
        <Avatar name={name} size="sm" />
        {t("profile")}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label={t("profile")}>
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-h3 text-ink">{t("profile")}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={tc("close")}
            className="-mr-2 flex size-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="mt-3 flex items-center gap-3">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-ink">{name}</p>
            {roleLabel && <p className="text-small text-muted">{roleLabel}</p>}
            {phone && (
              <p className="flex items-center gap-1.5 text-small text-muted">
                <Phone className="size-3.5" strokeWidth={1.75} />
                {formatUzPhone(phone)}
              </p>
            )}
          </div>
        </div>

        <section className="mt-5">
          <p className="mb-2 text-small font-medium text-muted">{t("language")}</p>
          <LocaleSwitcher block />
        </section>

        <div className="mt-5 border-t border-line pt-4">
          <LogoutButton label={tc("logout")} block />
        </div>
      </Sheet>
    </>
  );
}
