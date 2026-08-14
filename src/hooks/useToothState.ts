"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToothRecord } from "@/lib/types/database";
import { buildChartState, extractRecordDates } from "@/components/odontogram/state";
import type { ChartState } from "@/components/odontogram/types";

/**
 * Loads the full tooth_records history of a patient (RLS-scoped) and derives
 * the chart state for "now" or any past date (history slider).
 */
export function useToothState(patientId: string | undefined, atDate?: string | null) {
  const [records, setRecords] = useState<ToothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("tooth_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (error) {
      // Текст для пользователя подставляет компонент через i18n; здесь только диагностика.
      console.error("failed to load tooth records", error);
      setError("load_failed");
    } else {
      setRecords((data ?? []) as ToothRecord[]);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chart: ChartState = useMemo(
    () => buildChartState(records, atDate ?? null),
    [records, atDate]
  );

  const recordDates = useMemo(() => extractRecordDates(records), [records]);

  return { chart, records, recordDates, loading, error, refresh: load };
}
