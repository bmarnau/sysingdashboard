/**
 * Lädt den AVKK-Stand aller lokalen Aufgabenobjekte und leitet die
 * Arbeitsplatz-Zeilen ab. Fachlogik liegt in `@/lib/avkk/workspace`,
 * Datenzugriff ausschließlich über die AVKK-Fassade.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDossier, listSubjects, registerSubjectResolver, type AvkkDossier } from "@/lib/avkk";
import { buildRows, taskKey, type AvkkRow, type AvkkTask } from "@/lib/avkk/workspace";

export interface AvkkWorkspaceResult {
  rows: AvkkRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAvkkWorkspace(input: {
  tasks: readonly AvkkTask[];
  dimensionKeys: readonly string[];
  severityRanks: Record<string, number>;
  criticalRank?: number;
  personId: string | null;
  enabled?: boolean;
}): AvkkWorkspaceResult {
  const { tasks, dimensionKeys, severityRanks, criticalRank, personId, enabled = true } = input;
  const [dossiers, setDossiers] = useState<Map<string, AvkkDossier>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Existenzprüfung der Anwendungsschicht (ADR-0025): der lokale Bestand ist
  // die Wahrheit, die Datenbank kennt keinen Fremdschlüssel darauf.
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

    (async () => {
      const subjects = await listSubjects();
      const loaded = await Promise.all(
        subjects.map(async (s) => {
          const dossier = await getDossier(s.subjectType, s.subjectId);
          return dossier ? ([taskKey(s.subjectType, s.subjectId), dossier] as const) : null;
        }),
      );
      if (cancelled) return;
      setDossiers(new Map(loaded.filter((x): x is [string, AvkkDossier] => x !== null)));
    })()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "AVKK-Daten nicht verfügbar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

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
