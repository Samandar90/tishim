import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  classifyPasswordUpdateError,
  validateNewPassword,
} from "@/lib/password";

describe("validateNewPassword", () => {
  it("короткий пароль — tooShort, даже если повтор совпадает", () => {
    expect(validateNewPassword("12345", "12345")).toBe("tooShort");
  });

  it("несовпадающий повтор — mismatch", () => {
    expect(validateNewPassword("secret1", "secret2")).toBe("mismatch");
  });

  it("ровно минимальная длина и совпадение — без замечаний", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword(password, password)).toBeNull();
  });

  it("длина проверяется раньше совпадения", () => {
    expect(validateNewPassword("123", "456")).toBe("tooShort");
  });
});

describe("classifyPasswordUpdateError", () => {
  it.each([
    ["New password should be different from the old password.", "same"],
    ["Password should be at least 6 characters.", "weak"],
    ["Password should contain at least one character of each: abc, ABC, 123.", "weak"],
    ["Auth session missing!", "session"],
    ["invalid JWT: unable to parse or verify signature", "session"],
    ["Request rate limit reached", "unknown"],
  ])("«%s» → %s", (message, expected) => {
    expect(classifyPasswordUpdateError(message)).toBe(expected);
  });
});
