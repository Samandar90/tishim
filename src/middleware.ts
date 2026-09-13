import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest, icon/*, apple-icon — ресурсы PWA без расширения в URL;
    // без исключения аноним получал на них 307 на /login, и браузер не предлагал установку.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon/|apple-icon|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
