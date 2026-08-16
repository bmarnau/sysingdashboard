/**
 * UI-Fassade des zentralen Daten-Refresh.
 *
 * Die UI kennt weder Provider noch einzelne Services — sie ruft nur
 * `refresh()` auf und liest Zustand und Teilfehler ab.
 */
import { useCallback, useEffect, useState } from "react";
import {
  isRefreshRunning,
  lastRefreshResult,
  runRefresh,
  subscribeRefresh,
} from "@/lib/refresh/refresh-coordinator";
import { registerDefaultRefreshSteps } from "@/lib/refresh/steps";
import type { RefreshFailure } from "@/lib/refresh/types";

export interface UseRefreshResult {
  running: boolean;
  lastRefreshedAt: string | null;
  failed: RefreshFailure[];
  refresh: () => Promise<void>;
}

export function useRefresh(): UseRefreshResult {
  const [running, setRunning] = useState(() => isRefreshRunning());
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(
    () => lastRefreshResult()?.finishedAt ?? null,
  );
  const [failed, setFailed] = useState<RefreshFailure[]>(() => lastRefreshResult()?.failed ?? []);

  useEffect(() => {
    registerDefaultRefreshSteps();
    return subscribeRefresh(() => {
      const result = lastRefreshResult();
      setLastRefreshedAt(result?.finishedAt ?? null);
      setFailed(result?.failed ?? []);
    });
  }, []);

  const refresh = useCallback(async () => {
    // Mehrfachklick ist unschädlich: der Koordinator arbeitet Single-Flight.
    setRunning(true);
    try {
      await runRefresh();
    } finally {
      setRunning(isRefreshRunning());
    }
  }, []);

  return { running, lastRefreshedAt, failed, refresh };
}
