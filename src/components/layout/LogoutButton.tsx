"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/** block — обычная secondary-кнопка на всю ширину (шторка профиля); без него — иконка в шапке. */
export function LogoutButton({ label, block }: { label: string; block?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (block) {
    return (
      <Button variant="secondary" block loading={busy} onClick={logout}>
        {!busy && <LogOut className="size-5" strokeWidth={1.75} />}
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="flex min-h-touch items-center gap-2 rounded-xl px-3 text-body text-muted transition-colors hover:bg-slate-100 hover:text-ink disabled:opacity-50"
      title={label}
    >
      <LogOut className="size-5" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}
