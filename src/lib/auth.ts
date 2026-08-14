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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { user, profile: profile as Profile };
}

/** Server-side role gate for area layouts. RLS is the actual security boundary. */
export async function requireRole(role: UserRole) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== role) redirect(homeFor(session.profile.role));
  return session;
}
