import { useCallback, useEffect, useState } from "react";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";
import { readResponsibilityPersonViewFn } from "@/lib/avkk-runtime/responsibility-person-view.functions";
import type { ResponsibilityPersonViewRow } from "@/lib/avkk/responsibility-management.types";

export function useResponsibilityPersonView(personId: string | null) {
  const [rows, setRows] = useState<readonly ResponsibilityPersonViewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refreshGeneration = useRefreshSignal();

  useEffect(() => {
    let cancelled = false;
    if (!personId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    readResponsibilityPersonViewFn({ data: { personId } })
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setRows([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Verantwortungen konnten nicht geladen werden.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personId, tick, refreshGeneration]);

  return { rows, loading, error, refresh: useCallback(() => setTick((value) => value + 1), []) };
}
