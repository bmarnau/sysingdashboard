/**
 * Detailansicht einer Aufgabe entlang der vier AVKK-Dimensionen.
 * Schreibpfade laufen über `useAvkkDossier` → `AvkkService`.
 */
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "@/components/dashboard/primitives";
import { describeError, useAvkkDossier } from "@/hooks/useAvkkDossier";
import { selectableValues } from "@/hooks/useReferenceData";
import { CATALOG_KEYS, type ReferenceValue } from "@/lib/reference-data";
import type { AvkkRow } from "@/lib/avkk/workspace";
import type { UserProfile } from "@/lib/user-management";
import { AVKK_EXPLANATIONS, AvkkExplainer, AvkkMethodLink } from "./AvkkExplainer";
import { AvkkCompetenceSection } from "./AvkkCompetenceSection";
import { AvkkConsequenceSection } from "./AvkkConsequenceSection";
import { AvkkResponsibilitySection } from "./AvkkResponsibilitySection";
import { AvkkRiskBadge } from "./AvkkRiskBadge";

const TYPE_LABEL: Record<string, string> = {
  project: "Projekt",
  workpackage: "Arbeitspaket",
  activity: "Tätigkeit",
  measure: "Maßnahme",
};

export function AvkkDetailDialog({
  row,
  catalogs,
  people,
  actorId,
  canEdit,
  canAssign,
  onClose,
  onSaved,
  onOpenManual,
}: {
  row: AvkkRow;
  catalogs: Record<string, ReferenceValue[]>;
  people: readonly UserProfile[];
  actorId: string | null;
  canEdit: boolean;
  canAssign: boolean;
  onClose: () => void;
  onSaved: () => void;
  onOpenManual: () => void;
}) {
  const { dossier, loading, error, saving, saveResponsibility, saveCompetence, saveConsequence } =
    useAvkkDossier(row.task, actorId);

  const readOnly = !canEdit || actorId === null;

  async function guarded(action: () => Promise<void>, successText: string) {
    try {
      await action();
      toast.success(successText);
      onSaved();
    } catch (e) {
      toast.error(describeError(e));
    }
  }

  const responsibilities = dossier?.responsibilities ?? [];
  const competences = dossier?.competences ?? [];
  const consequences = dossier?.consequences ?? [];

  return (
    <Modal title={`AVKK – ${row.task.title}`} onClose={onClose}>
      <div className="space-y-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p>
              {TYPE_LABEL[row.task.subjectType] ?? row.task.subjectType} · {row.task.subjectId}
              {row.task.context ? ` · ${row.task.context}` : ""}
            </p>
            <p>Termin: {row.task.due ?? "kein Termin hinterlegt"}</p>
          </div>
          <AvkkRiskBadge row={row} />
        </header>

        <AvkkMethodLink onOpen={onOpenManual} />

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
        {loading ? <p className="text-xs text-muted-foreground">Dossier wird geladen …</p> : null}

        <AvkkExplainer letter="A" title="Aufgabe" text={AVKK_EXPLANATIONS.aufgabe}>
          <p className="text-xs">
            {row.task.title}
            {row.task.due ? ` — fällig ${row.task.due}` : ""}
          </p>
        </AvkkExplainer>

        <AvkkExplainer letter="V" title="Verantwortung" text={AVKK_EXPLANATIONS.verantwortung}>
          <AvkkResponsibilitySection
            responsibilities={responsibilities}
            people={people}
            roles={selectableValues(
              catalogs[CATALOG_KEYS.responsibilityRole],
              responsibilities.map((r) => r.roleKey),
            )}
            types={selectableValues(
              catalogs[CATALOG_KEYS.responsibilityType],
              responsibilities.flatMap((r) => r.types.map((t) => t.key)),
            )}
            readOnly={readOnly || !canAssign}
            saving={saving}
            loading={loading}
            onSave={(input) =>
              void guarded(() => saveResponsibility(input), "Verantwortung gespeichert.")
            }
          />
        </AvkkExplainer>

        <AvkkExplainer letter="K" title="Kompetenz" text={AVKK_EXPLANATIONS.kompetenz}>
          <AvkkCompetenceSection
            competences={competences}
            dimensions={selectableValues(
              catalogs[CATALOG_KEYS.competenceDimension],
              competences.map((c) => c.dimensionKey),
            )}
            ratings={selectableValues(
              catalogs[CATALOG_KEYS.competenceRating],
              competences.map((c) => c.ratingKey),
            )}
            readOnly={readOnly}
            saving={saving}
            onSave={(input) => void guarded(() => saveCompetence(input), "Bewertung gespeichert.")}
          />
        </AvkkExplainer>

        <AvkkExplainer letter="K" title="Konsequenz" text={AVKK_EXPLANATIONS.konsequenz}>
          <AvkkConsequenceSection
            consequences={consequences}
            areas={selectableValues(
              catalogs[CATALOG_KEYS.consequenceArea],
              consequences.map((c) => c.areaKey),
            )}
            severities={selectableValues(
              catalogs[CATALOG_KEYS.consequenceSeverity],
              consequences.map((c) => c.severityKey),
            )}
            impacts={selectableValues(
              catalogs[CATALOG_KEYS.scheduleImpact],
              consequences.map((c) => c.scheduleImpactKey),
            )}
            readOnly={readOnly}
            saving={saving}
            onSave={(input) => void guarded(() => saveConsequence(input), "Konsequenz erfasst.")}
          />
        </AvkkExplainer>

        <section className="rounded-xl border border-border bg-secondary/30 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            Kontext und Frühindikator
          </h4>
          {dossier?.atRisk ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Diese Aufgabe gilt als gefährdet.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Aktuell keine Gefährdung abgeleitet.
            </p>
          )}
          <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
            {[...(dossier?.riskReasons ?? []), ...row.contextHints].map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Weiche Kontextfaktoren (Belastung, Teamunterstützung, Störungen) werden bewusst noch
            nicht erfasst. Sie folgen als getrennt berechtigte Ebene, damit keine personenbezogenen
            Bewertungen ohne Rechtsgrundlage entstehen.
          </p>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary"
          >
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
}
