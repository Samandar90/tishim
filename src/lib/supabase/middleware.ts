import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Кабинеты по ролям. Только отсюда аноним уходит на /login; всё остальное —
 * лендинг, вход, /privacy, robots.txt, sitemap, опечатки в адресе — проходит
 * дальше, и неизвестный путь получает настоящую 404 (not-found.tsx), а не
 * форму входа. Защита данных — RLS, а не этот список (см. CLAUDE.md).
 */
const PROTECTED_PREFIXES = ["/dashboard", "/visits", "/access", "/ai-check", "/dentist", "/admin"];

/** Экраны входа: вошедшего отсюда уводим в его кабинет. */
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

/** Dev-песочница: открыта всем и не участвует в редиректах по роли. */
function isDevSandbox(pathname: string) {
  return process.env.NODE_ENV === "development" && pathname.startsWith("/dev");
}

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isDevSandbox(pathname)) return response;

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (matches(pathname, AUTH_PATHS) || pathname === "/")) {
    // Домашняя страница по роли. Доступ к данным держит RLS; точную роль для
    // каждой зоны проверяет её серверный layout.
    const role = (user.user_metadata?.role as string) ?? "patient";
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname =
      role === "dentist" ? "/dentist" : role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
