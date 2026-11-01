import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

/**
 * Сюда ведут ссылки из писем Supabase. Обработчик кладёт сессию в cookie и отправляет
 * дальше; путь под /api, потому что middleware его не трогает — анониму туда можно.
 *
 * Две формы ссылки, обе рабочие: token_hash + type — из нашего шаблона письма
 * (supabase/templates), работает в любом браузере; code — из шаблона Supabase по
 * умолчанию (PKCE), работает только в том браузере, где запрашивали письмо, потому что
 * code_verifier лежит у него в cookie.
 */
const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/** Куда вести, если в ссылке нет next: по типу письма; остальное решит middleware по роли. */
const DEFAULT_NEXT: Partial<Record<EmailOtpType, string>> = { recovery: "/reset-password" };

function otpType(raw: string | null): EmailOtpType | null {
  return OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = otpType(searchParams.get("type"));
  const code = searchParams.get("code");

  let verified = false;
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  if (!verified) return redirect("/forgot-password?error=link");

  return redirect(safeNext(searchParams.get("next"), (type && DEFAULT_NEXT[type]) ?? "/"));
}
