/**
 * K — Kompetenz: Bewertung je Katalogdimension. Bewertungen werden
 * fortgeschrieben, nicht überschrieben (Service übernimmt das Superseding).
 */
import { useState } from "react";
import type { AvkkCompetence } from "@/lib/avkk";
import type { ReferenceValue } from "@/lib/reference-data";
import { inputCls } from "@/components/dashboard/constants";

export function AvkkCompetenceSection({
  competences,
  dimensions,
  ratings,
  readOnly,
  saving,
  onSave,
}: {
  competences: readonly AvkkCompetence[];
  dimensions: readonly ReferenceValue[];
  ratings: readonly ReferenceValue[];
  readOnly: boolean;
  saving: boolean;
  onSave: (input: {
    dimensionKey: string;
    ratingKey: string;
    supportNeeded: boolean;
    note: string;
  }) => void;
}) {
  const current = new Map(
    competences.filter((c) => c.supersededAt === null).map((c) => [c.dimensionKey, c]),
  );

  return (
    <div className="space-y-2">
      {dimensions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Keine Kompetenzdimensionen im Katalog.</p>
      ) : null}
      {dimensions.map((dim) => (
        <DimensionRow
          key={dim.key}
          dimension={dim}
          ratings={ratings}
          value={current.get(dim.key) ?? null}
          readOnly={readOnly}
          saving={saving}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

function DimensionRow({
  dimension,
  ratings,
  value,
  readOnly,
  saving,
  onSave,
}: {
  dimension: ReferenceValue;
  ratings: readonly ReferenceValue[];
  value: AvkkCompetence | null;
  readOnly: boolean;
  saving: boolean;
  onSave: (input: {
    dimensionKey: string;
    ratingKey: string;
    supportNeeded: boolean;
    note: string;
  }) => void;
}) {
  const [ratingKey, setRatingKey] = useState(value?.ratingKey ?? "");
  const [supportNeeded, setSupportNeeded] = useState(value?.supportNeeded ?? false);
  const [note, setNote] = useState(value?.note ?? "");
  const selectId = `avkk-dim-${dimension.key}`;

  return (
    <div className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border bg-background/40 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <label htmlFor={selectId} className="text-xs font-medium">
          {dimension.label}
        </label>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            id={selectId}
            className={inputCls}
            disabled={readOnly || saving}
            value={ratingKey}
            onChange={(e) => setRatingKey(e.target.value)}
          >
            <option value="">— nicht bewertet —</option>
            {ratings.map((r) => (
              <option key={r.key} value={r.key} className="bg-background">
                {r.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Notiz (optional)"
            aria-label={`Notiz zu ${dimension.label}`}
            disabled={readOnly || saving}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <label className="mt-2 inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="size-4"
            disabled={readOnly || saving}
            checked={supportNeeded}
            onChange={(e) => setSupportNeeded(e.target.checked)}
          />
          Unterstützung nötig
        </label>
        {value ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Gespeichert: {value.ratingLabel}
            {value.supportNeeded ? " · Unterstützungsbedarf" : ""}
          </p>
        ) : null}
      </div>
      {!readOnly && (
        <button
          type="button"
          disabled={saving || ratingKey === ""}
          onClick={() => onSave({ dimensionKey: dimension.key, ratingKey, supportNeeded, note })}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary disabled:opacity-50"
        >
          Bewertung speichern
        </button>
      )}
    </div>
  );
}
