"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
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
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
