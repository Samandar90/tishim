import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/clipboard";

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

function setExecCommand(impl: (() => boolean) | undefined) {
  Object.defineProperty(document, "execCommand", { value: impl, configurable: true, writable: true });
}

afterEach(() => {
  setClipboard(undefined);
  setExecCommand(undefined);
});

describe("copyText", () => {
  it("пишет через Clipboard API, когда он доступен", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyText("+998 90 123 45 67")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("+998 90 123 45 67");
  });

  it("Clipboard API запрещён — выручает execCommand, временное поле убирается", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    let copied = "";
    setExecCommand(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });

    await expect(copyText("+998 91 765 43 21")).resolves.toBe(true);
    expect(copied).toBe("+998 91 765 43 21");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("Clipboard API нет вовсе (страница не по https) — тоже execCommand", async () => {
    setClipboard(undefined);
    setExecCommand(() => true);

    await expect(copyText("x")).resolves.toBe(true);
  });

  it("не вышло ни одним способом — false, без исключения", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    setExecCommand(() => {
      throw new Error("unsupported");
    });

    await expect(copyText("x")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});
