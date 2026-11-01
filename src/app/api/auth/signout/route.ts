import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Выход из route handler: здесь cookie сессии стираются, в Server Component — нет.
 * Нужен getSessionProfile, когда у пользователя есть сессия, но нет профиля.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
