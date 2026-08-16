/**
 * Datenzugriff der AVKK-Führungssicht.
 *
 * Lädt alle für den angemeldeten Benutzer sichtbaren Dossiers **gebündelt**
 * (ein Listenaufruf, ein Schwellwert-Aufruf) und leitet daraus die
 * Arbeitsplatz-Zeilen ab. RLS bleibt maßgeblich — es gibt keine privilegierte
 * Abfrage im Browser. Fachlogik liegt in `@/lib/avkk/management`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { listDossiers, registerSubjectResolver, type AvkkDossier } from "@/lib/avkk";
import { buildRows, taskKey, type AvkkRow, type AvkkTask } from "@/lib/avkk/workspace";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";

export interface AvkkManagementResult {
  rows: AvkkRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAvkkManagement(input: {
  tasks: readonly AvkkTask[];
  dimensionKeys: readonly string[];
  severityRanks: Record<string, number>;
  criticalRank?: number;
  personId: string | null;
  enabled?: boolean;
}): AvkkManagementResult {
  const { tasks, dimensionKeys, severityRanks, criticalRank, personId, enabled = true } = input;
  const [dossiers, setDossiers] = useState<Map<string, AvkkDossier>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refreshGeneration = useRefreshSignal();

  useEffect(() => {
    const index = new Map(tasks.map((t) => [taskKey(t.subjectType, t.subjectId), t.title]));
    registerSubjectResolver((type, id) => index.get(taskKey(type, id)) ?? null);
    return () => registerSubjectResolver(null);
  }, [tasks]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    listDossiers()
      .then((all) => {
        if (cancelled) return;
        setDossiers(
          new Map(all.map((d) => [taskKey(d.subject.subjectType, d.subject.subjectId), d])),
        );
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "AVKK-Daten nicht verfügbar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, tick, refreshGeneration]);

  const rows = useMemo(
    () =>
      buildRows(tasks, dossiers, {
        dimensionKeys,
        personId,
        today: new Date().toISOString().slice(0, 10),
        severityRanks,
        criticalRank,
      }),
    [tasks, dossiers, dimensionKeys, personId, severityRanks, criticalRank],
  );

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { rows, loading, error, reload };
}
