import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest, icon/*, apple-icon — ресурсы PWA без расширения в URL;
    // без исключения аноним получал на них 307 на /login, и браузер не предлагал установку.
    // glb — модели зубов из public/models: статике сессия не нужна, а аноним на лендинге
    // получил бы тот же 307.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon/|apple-icon|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|glb)$).*)",
  ],
};
