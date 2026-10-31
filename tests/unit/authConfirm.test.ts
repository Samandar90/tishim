// @vitest-environment node
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/confirm/route";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

// redirect подменён в vitest.setup.ts: настоящий бросает исключение
const redirectMock = vi.mocked(redirect);

function get(query: string) {
  return GET(new NextRequest(`http://localhost:3000/api/auth/confirm${query}`));
}

beforeEach(() => {
  verifyOtp.mockReset().mockResolvedValue({ error: null });
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  redirectMock.mockClear();
});

describe("GET /api/auth/confirm", () => {
  it("token_hash из письма гасится через verifyOtp и ведёт на next", async () => {
    await get("?token_hash=abc&type=recovery&next=%2Freset-password");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/reset-password");
  });

  it("без next письмо recovery ведёт на /reset-password само", async () => {
    await get("?token_hash=abc&type=recovery");
    expect(redirectMock).toHaveBeenCalledWith("/reset-password");
  });

  it("code из PKCE-ссылки обменивается на сессию", async () => {
    await get("?code=xyz&next=%2Freset-password");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/reset-password");
  });

  it("внешний адрес в next не пропускается — это был бы открытый редирект", async () => {
    await get("?token_hash=abc&type=recovery&next=https%3A%2F%2Fevil.example");
    expect(redirectMock).toHaveBeenLastCalledWith("/reset-password");
    await get("?token_hash=abc&type=recovery&next=%2F%2Fevil.example");
    expect(redirectMock).toHaveBeenLastCalledWith("/reset-password");
  });

  it("ошибка проверки ведёт на запрос новой ссылки", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
    await get("?token_hash=abc&type=recovery");
    expect(redirectMock).toHaveBeenCalledWith("/forgot-password?error=link");
  });

  it("неизвестный type до Supabase не доходит", async () => {
    await get("?token_hash=abc&type=hack");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/forgot-password?error=link");
  });

  it("без параметров — тоже на запрос новой ссылки", async () => {
    await get("");
    expect(redirectMock).toHaveBeenCalledWith("/forgot-password?error=link");
  });
});
