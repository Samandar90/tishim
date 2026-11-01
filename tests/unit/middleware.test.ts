// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { user_metadata: { role?: string } } | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

import { updateSession } from "@/lib/supabase/middleware";

async function location(path: string) {
  const res = await updateSession(new NextRequest(`http://localhost:3000${path}`));
  const target = res.headers.get("location");
  return target ? new URL(target).pathname + new URL(target).search : null;
}

beforeEach(() => {
  currentUser = null;
});

describe("middleware: аноним", () => {
  it.each(["/dashboard", "/visits/abc", "/access", "/ai-check", "/dentist", "/dentist/patient/1", "/admin/settings"])(
    "%s → /login с возвратом",
    async (path) => {
      expect(await location(path)).toBe(`/login?next=${encodeURIComponent(path)}`);
    }
  );

  it.each(["/", "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/robots.txt", "/sitemap.xml", "/opengraph-image", "/nesushestvuet"])(
    "%s проходит без редиректа — неизвестный путь получает 404, а не форму входа",
    async (path) => {
      expect(await location(path)).toBeNull();
    }
  );
});

describe("middleware: вошедший", () => {
  it("с экранов входа и главной уходит в кабинет своей роли", async () => {
    currentUser = { user_metadata: { role: "dentist" } };
    expect(await location("/login")).toBe("/dentist");
    expect(await location("/")).toBe("/dentist");
    currentUser = { user_metadata: { role: "admin" } };
    expect(await location("/register")).toBe("/admin");
    currentUser = { user_metadata: {} };
    expect(await location("/forgot-password")).toBe("/dashboard");
  });

  it("/reset-password и /privacy вошедшего не трогают", async () => {
    currentUser = { user_metadata: { role: "patient" } };
    expect(await location("/reset-password")).toBeNull();
    expect(await location("/privacy")).toBeNull();
  });
});
