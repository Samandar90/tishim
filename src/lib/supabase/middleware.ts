import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

/** Dev-песочница: открыта всем и не участвует в редиректах по роли. */
function isDevSandbox(pathname: string) {
  return process.env.NODE_ENV === "development" && pathname.startsWith("/dev");
}

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

  if (!user && !isPublic(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isPublic(pathname) || pathname === "/")) {
    // Role-based home. Actual data access is enforced by RLS; the exact
    // role check for each area happens in the area's server layout.
    const role = (user.user_metadata?.role as string) ?? "patient";
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname =
      role === "dentist" ? "/dentist" : role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
