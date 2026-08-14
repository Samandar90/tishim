import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = [
  {
    id: "r1",
    visit_id: "v1",
    patient_id: "p1",
    tooth_fdi: 16,
    surfaces: ["O"],
    condition: "caries",
    procedure: null,
    note: null,
    price: 0,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "r2",
    visit_id: "v2",
    patient_id: "p1",
    tooth_fdi: 16,
    surfaces: ["O"],
    condition: "filling",
    procedure: null,
    note: null,
    price: 0,
    created_at: "2026-05-01T10:00:00Z",
  },
];

const order = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order }),
      }),
    }),
  }),
}));

import { useToothState } from "@/hooks/useToothState";

beforeEach(() => {
  order.mockReset();
  order.mockResolvedValue({ data: rows, error: null });
});

describe("useToothState", () => {
  it("сворачивает историю в текущее состояние", async () => {
    const { result } = renderHook(() => useToothState("p1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chart[16].surfaces.O?.condition).toBe("filling");
    expect(result.current.recordDates).toEqual(["2026-03-01", "2026-05-01"]);
  });

  it("atDate откатывает карту на прошлую дату", async () => {
    const { result } = renderHook(() => useToothState("p1", "2026-03-15"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chart[16].surfaces.O?.condition).toBe("caries");
  });

  it("ошибка запроса выставляет error и не роняет хук", async () => {
    order.mockResolvedValue({ data: null, error: { message: "boom" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useToothState("p1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("load_failed");
    expect(result.current.chart).toEqual({});
    spy.mockRestore();
  });
});
