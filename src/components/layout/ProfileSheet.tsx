"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Cake, Phone } from "lucide-react";
import type { Profile } from "@/lib/types/database";
import { formatDate, formatUzPhone } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ProfileEditForm } from "./ProfileEditForm";
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
  profile,
  roleLabel,
}: {
  profile: Pick<Profile, "id" | "full_name" | "phone" | "birth_date">;
  roleLabel?: string;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tp = useTranslations("profile");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { full_name: name, phone } = profile;

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

      <Sheet open={open} onClose={() => setOpen(false)} title={t("profile")}>
        {editing ? (
          <div>
            <ProfileEditForm
              userId={profile.id}
              initialName={name}
              initialPhone={phone}
              initialBirthDate={profile.birth_date}
              onDone={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar name={name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-body font-medium text-ink">{name || "—"}</p>
              {roleLabel && <p className="text-small text-muted">{roleLabel}</p>}
              {phone && (
                <p className="flex items-center gap-1.5 text-small text-muted">
                  <Phone className="size-3.5" strokeWidth={1.75} />
                  {formatUzPhone(phone)}
                </p>
              )}
              {profile.birth_date && (
                <p className="flex items-center gap-1.5 text-small text-muted">
                  <Cake className="size-3.5" strokeWidth={1.75} />
                  {formatDate(profile.birth_date, locale)}
                </p>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              {tp("edit")}
            </Button>
          </div>
        )}

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
