import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

export function homeFor(role: UserRole): string {
  switch (role) {
    case "dentist":
      return "/dentist";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export async function getSessionProfile(): Promise<{ user: User; profile: Profile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Сбой чтения при живой сессии раньше выглядел как «профиля нет»: страница слала
  // на /login, middleware по user_metadata возвращал в кабинет — бесконечный редирект.
  if (error && error.code !== "PGRST116") {
    throw new Error(`Supabase: ${error.message}`, { cause: error });
  }
  // Пользователь есть, профиля нет (триггер handle_new_user не отработал). Закрыть
  // сессию из Server Component нельзя — cookie не пишутся, — поэтому выход через
  // route handler; без него та же петля между /login и кабинетом.
  if (!profile) redirect("/api/auth/signout");
  return { user, profile: profile as Profile };
}

/** Server-side role gate for area layouts. RLS is the actual security boundary. */
export async function requireRole(role: UserRole) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== role) redirect(homeFor(session.profile.role));
  return session;
}
