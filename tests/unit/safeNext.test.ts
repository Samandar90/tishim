import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safeNext";
import { isNetworkAuthError } from "@/lib/authErrors";

describe("safeNext", () => {
  it("пропускает только путь внутри сайта", () => {
    expect(safeNext("/dashboard", "/")).toBe("/dashboard");
    expect(safeNext("/visits/1?x=1", "/")).toBe("/visits/1?x=1");
  });
  it("внешние адреса и мусор заменяет запасным", () => {
    expect(safeNext("https://evil.example", "/")).toBe("/");
    expect(safeNext("//evil.example", "/")).toBe("/");
    expect(safeNext("/a" + String.fromCharCode(92) + "b", "/")).toBe("/");
    expect(safeNext(null, "/login")).toBe("/login");
    expect(safeNext("", "/login")).toBe("/login");
  });
});

describe("isNetworkAuthError", () => {
  it("узнаёт сетевой сбой по имени или тексту", () => {
    expect(isNetworkAuthError({ name: "AuthRetryableFetchError", message: "" })).toBe(true);
    expect(isNetworkAuthError({ name: "TypeError", message: "Failed to fetch" })).toBe(true);
  });
  it("неверный пароль — не сеть", () => {
    expect(isNetworkAuthError({ name: "AuthApiError", message: "Invalid login credentials" })).toBe(false);
    expect(isNetworkAuthError(null)).toBe(false);
  });
});
