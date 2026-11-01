import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Проверка живости для Render и внешнего монитора. Без параметров отвечает,
 * не трогая базу: иначе пауза Supabase на free-тарифе роняла бы и сам сервис.
 * С ?deep=1 делает один анонимный запрос к app_settings — это и ловит паузу
 * базы, и держит её «активной», если монитор ходит регулярно.
 */
export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const body: Record<string, unknown> = {
    ok: true,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    time: new Date().toISOString(),
  };

  if (deep) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      body.ok = false;
      body.db = "not_configured";
    } else {
      const started = Date.now();
      const { error } = await createClient(url, key)
        .from("app_settings")
        .select("key", { count: "exact", head: true });
      body.db = error ? `error: ${error.message}` : "ok";
      body.dbMs = Date.now() - started;
      if (error) body.ok = false;
    }
  }

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
