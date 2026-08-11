/**
 * Dossier einer einzelnen Aufgabe laden und speichern.
 * Schreibpfade laufen ausschließlich über `AvkkService` (Audit + RLS).
 */
import { useCallback, useEffect, useState } from "react";
import {
  addConsequence,
  assignResponsibility,
  createSubject,
  getDossier,
  rateCompetence,
  type AvkkDossier,
  type AvkkSubjectType,
} from "@/lib/avkk";
import { isDashboardError } from "@/lib/errors";

export interface AvkkDossierResult {
  dossier: AvkkDossier | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => Promise<void>;
  saveResponsibility: (input: {
    personId: string;
    roleKey: string;
    typeKeys: string[];
    note?: string;
  }) => Promise<void>;
  saveCompetence: (input: {
    dimensionKey: string;
    ratingKey: string;
    supportNeeded?: boolean;
    note?: string;
  }) => Promise<void>;
  saveConsequence: (input: {
    areaKey: string;
    severityKey: string;
    scheduleImpactKey: string;
    description?: string;
  }) => Promise<void>;
}

export function describeError(e: unknown): string {
  if (isDashboardError(e)) return `${e.message} (${e.code})`;
  return e instanceof Error ? e.message : "Unbekannter Fehler.";
}

export function useAvkkDossier(
  task: { subjectType: AvkkSubjectType; subjectId: string; title: string } | null,
  actorId: string | null,
): AvkkDossierResult {
  const [dossier, setDossier] = useState<AvkkDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectType = task?.subjectType ?? null;
  const subjectId = task?.subjectId ?? null;

  const load = useCallback(async () => {
    if (!subjectType || !subjectId) {
      setDossier(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDossier(await getDossier(subjectType, subjectId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [subjectType, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Legt das Subjekt bei Bedarf an und liefert dessen technische Kennung. */
  const ensureSubject = useCallback(async (): Promise<string> => {
    if (dossier) return dossier.subject.id;
    if (!task || !actorId) throw new Error("Kein aktiver Benutzer.");
    const subject = await createSubject({
      subjectType: task.subjectType,
      subjectId: task.subjectId,
      title: task.title,
      actorId,
    });
    return subject.id;
  }, [dossier, task, actorId]);

  const run = useCallback(
    async (fn: (subjectRef: string, actor: string) => Promise<void>) => {
      if (!actorId) throw new Error("Kein aktiver Benutzer.");
      setSaving(true);
      try {
        const subjectRef = await ensureSubject();
        await fn(subjectRef, actorId);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [actorId, ensureSubject, load],
  );

  return {
    dossier,
    loading,
    error,
    saving,
    reload: load,
    saveResponsibility: (input) =>
      run((subjectRef, actor) =>
        assignResponsibility({
          subjectRef,
          personId: input.personId,
          roleKey: input.roleKey,
          typeKeys: input.typeKeys,
          note: input.note,
          actorId: actor,
        }),
      ),
    saveCompetence: (input) =>
      run((subjectRef, actor) =>
        rateCompetence({
          subjectRef,
          dimensionKey: input.dimensionKey,
          ratingKey: input.ratingKey,
          supportNeeded: input.supportNeeded,
          note: input.note,
          actorId: actor,
        }),
      ),
    saveConsequence: (input) =>
      run((subjectRef, actor) =>
        addConsequence({
          subjectRef,
          areaKey: input.areaKey,
          severityKey: input.severityKey,
          scheduleImpactKey: input.scheduleImpactKey,
          description: input.description,
          actorId: actor,
        }),
      ),
  };
}
