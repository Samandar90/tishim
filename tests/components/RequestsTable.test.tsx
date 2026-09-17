import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/ru.json";
import { RequestsTable } from "@/components/requests/RequestsTable";
import type { MappingRequest } from "@/lib/types/database";

const t = messages.requests;

type UpdateResult = { data: { id: string }[] | null; error: { message: string } | null };

// Ответ базы на update().eq().select() — каждый тест задаёт свой
const updateResult = vi.fn<() => Promise<UpdateResult>>();
const updatePayload = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (payload: unknown) => {
        updatePayload(payload);
        return { eq: () => ({ select: () => updateResult() }) };
      },
    }),
  }),
}));

function request(id: string, patch: Partial<MappingRequest> = {}): MappingRequest {
  return {
    id,
    full_name: `Заявитель ${id}`,
    phone: "+998 90 123 45 67",
    preferred_date: null,
    comment: null,
    status: "new",
    created_at: "2026-09-17T09:30:00.000Z",
    ...patch,
  };
}

function renderTable(requests: MappingRequest[]) {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages} timeZone="Asia/Tashkent">
      <RequestsTable requests={requests} />
    </NextIntlClientProvider>
  );
}

function statusSelect(name: string): HTMLSelectElement {
  const card = screen.getByText(name).closest("li")!;
  return within(card).getByRole("combobox", { name: t.statusLabel }) as HTMLSelectElement;
}

function choose(name: string, status: string) {
  fireEvent.change(statusSelect(name), { target: { value: status } });
}

beforeEach(() => {
  updateResult.mockReset();
  updatePayload.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("RequestsTable", () => {
  it("выбранный статус виден сразу и остаётся после успешного сохранения", async () => {
    let resolve!: (value: UpdateResult) => void;
    updateResult.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTable([request("1")]);

    choose("Заявитель 1", "contacted");

    // запрос ещё идёт: без оптимистичного значения здесь стояло бы прежнее «new»
    expect(statusSelect("Заявитель 1")).toHaveValue("contacted");
    expect(statusSelect("Заявитель 1")).toBeDisabled();
    expect(updatePayload).toHaveBeenCalledWith({ status: "contacted" });

    resolve({ data: [{ id: "1" }], error: null });

    await waitFor(() => expect(statusSelect("Заявитель 1")).toBeEnabled());
    expect(statusSelect("Заявитель 1")).toHaveValue("contacted");
    expect(screen.queryByText(t.statusError)).not.toBeInTheDocument();
  });

  it("ошибка базы откатывает статус и показывает сообщение", async () => {
    updateResult.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderTable([request("1")]);

    choose("Заявитель 1", "scheduled");

    expect(await screen.findByText(t.statusError)).toBeInTheDocument();
    expect(statusSelect("Заявитель 1")).toHaveValue("new");
  });

  it("отказ RLS — ошибки нет, но и строк ноль — тоже откат", async () => {
    updateResult.mockResolvedValue({ data: [], error: null });
    renderTable([request("1")]);

    choose("Заявитель 1", "done");

    expect(await screen.findByText(t.statusError)).toBeInTheDocument();
    expect(statusSelect("Заявитель 1")).toHaveValue("new");
  });

  it("счётчик новых считает и ещё не сохранённый выбор", async () => {
    updateResult.mockReturnValue(new Promise(() => undefined));
    renderTable([request("1"), request("2"), request("3", { status: "done" })]);

    expect(screen.getByText("Новых: 2")).toBeInTheDocument();

    choose("Заявитель 2", "contacted");

    expect(screen.getByText("Новых: 1")).toBeInTheDocument();
  });

  it("«Отменена» спрашивает подтверждение; отказ ничего не меняет", () => {
    renderTable([request("1")]);

    choose("Заявитель 1", "cancelled");

    expect(screen.getByText(t.cancelConfirmTitle)).toBeInTheDocument();
    expect(updatePayload).not.toHaveBeenCalled();
    expect(statusSelect("Заявитель 1")).toHaveValue("new");
  });

  it("кнопка копирует номер и подтверждает это", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderTable([request("1")]);

    fireEvent.click(screen.getByRole("button", { name: `${t.copyPhone}: +998 90 123 45 67` }));

    expect(writeText).toHaveBeenCalledWith("+998 90 123 45 67");
    expect(await screen.findByText(t.phoneCopied)).toBeInTheDocument();
  });

  it("буфер обмена недоступен — сообщение об ошибке, а не тишина", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    renderTable([request("1")]);

    fireEvent.click(screen.getByRole("button", { name: `${t.copyPhone}: +998 90 123 45 67` }));

    expect(await screen.findByText(t.copyError)).toBeInTheDocument();
  });

  it("без заявок — пустое состояние", () => {
    renderTable([]);

    expect(screen.getByText(t.empty)).toBeInTheDocument();
  });
});
