/**
 * useSafeAsync — kleiner Wrapper für Ad-hoc-Async-Aktionen in
 * Komponenten (Button-Handler o. Ä.). Kein Ersatz für TanStack Query.
 *
 * Vorteile gegenüber try/catch im JSX:
 *   - fängt jeden Wurf, konvertiert zu `Error`
 *   - loggt automatisch mit `logger.error(...)` inkl. Funktionsname
 *   - Setzt `isLoading`/`error`/`data` state, `reset()` leert alles
 */
import { useCallback, useRef, useState } from "react";
import { logger } from "@/lib/logger";

export interface UseSafeAsyncResult<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  data: T | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  reset: () => void;
}

export function useSafeAsync<T>(
  fn: (...args: unknown[]) => Promise<T>,
  opts?: { label?: string },
): UseSafeAsyncResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fnRef.current(...args);
        setData(result);
        return result;
      } catch (err) {
        const asError = err instanceof Error ? err : new Error(String(err));
        logger.error("useSafeAsync failed", asError, {
          label: opts?.label ?? fnRef.current.name ?? "anonymous",
        });
        setError(asError);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [opts?.label],
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, data, error, isError: error !== null, isLoading, reset };
}
