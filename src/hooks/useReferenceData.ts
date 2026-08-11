/**
 * Zugriff auf Reference-Data-Kataloge für die UI.
 *
 * Nur dieser Hook (und `useAvkk*`) spricht mit der Fassade `@/lib/reference-data`;
 * Komponenten bekommen fertige Wertelisten und einen expliziten Fehler-/
 * Veraltet-Zustand.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  currentState,
  listValues,
  refresh as refreshCatalogs,
  type ReferenceValue,
} from "@/lib/reference-data";

export interface ReferenceDataResult {
  values: Record<string, ReferenceValue[]>;
  loading: boolean;
  error: string | null;
  /** true, wenn die Daten aus einem älteren Cache stammen. */
  stale: boolean;
  fetchedAt: string | null;
  source: "network" | "cache" | null;
  reload: () => void;
}

export function useReferenceData(catalogKeys: readonly string[]): ReferenceDataResult {
  const keys = useMemo(() => catalogKeys.slice().sort(), [catalogKeys]);
  const signature = keys.join("|");

  const [values, setValues] = useState<Record<string, ReferenceValue[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [meta, setMeta] = useState<{
    stale: boolean;
    fetchedAt: string | null;
    source: "network" | "cache" | null;
  }>({ stale: false, fetchedAt: null, source: null });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const list = signature ? signature.split("|") : [];

    (async () => {
      const entries = await Promise.all(
        list.map(async (key) => [key, await listValues(key, { includeInactive: true })] as const),
      );
      if (cancelled) return;
      setValues(Object.fromEntries(entries));
      const state = currentState();
      setMeta({
        stale: state?.stale ?? false,
        fetchedAt: state?.snapshot.fetchedAt ?? null,
        source: state?.source ?? null,
      });
    })()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Kataloge nicht verfügbar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signature, tick]);

  const reload = useCallback(() => {
    void refreshCatalogs()
      .catch(() => undefined)
      .finally(() => setTick((n) => n + 1));
  }, []);

  return { values, loading, error, reload, ...meta };
}

/** Aktive Werte plus die bereits gespeicherten, inzwischen deaktivierten. */
export function selectableValues(
  all: readonly ReferenceValue[] | undefined,
  usedKeys: readonly string[] = [],
): ReferenceValue[] {
  return (all ?? []).filter((v) => v.isActive || usedKeys.includes(v.key));
}

/** Rangfolge aus `attributes.rank` (z. B. Schweregrade). */
export function ranksOf(all: readonly ReferenceValue[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of all ?? []) {
    const rank = v.attributes?.["rank"];
    if (typeof rank === "number") out[v.key] = rank;
  }
  return out;
}
