/**
 * K — Konsequenz: Bereich, Schweregrad, Terminwirkung und Beschreibung.
 */
import { useState } from "react";
import type { AvkkConsequence } from "@/lib/avkk";
import type { ReferenceValue } from "@/lib/reference-data";
import { inputCls } from "@/components/dashboard/constants";

export function AvkkConsequenceSection({
  consequences,
  areas,
  severities,
  impacts,
  readOnly,
  saving,
  onSave,
}: {
  consequences: readonly AvkkConsequence[];
  areas: readonly ReferenceValue[];
  severities: readonly ReferenceValue[];
  impacts: readonly ReferenceValue[];
  readOnly: boolean;
  saving: boolean;
  onSave: (input: {
    areaKey: string;
    severityKey: string;
    scheduleImpactKey: string;
    description: string;
  }) => void;
}) {
  const [areaKey, setAreaKey] = useState("");
  const [severityKey, setSeverityKey] = useState(severities.find((s) => s.isDefault)?.key ?? "");
  const [scheduleImpactKey, setScheduleImpactKey] = useState(
    impacts.find((s) => s.isDefault)?.key ?? "",
  );
  const [description, setDescription] = useState("");

  const active = consequences.filter((c) => c.supersededAt === null);
  const valid = areaKey !== "" && severityKey !== "" && scheduleImpactKey !== "";

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine Konsequenz erfasst.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-background/40 p-3 text-xs">
              <p className="font-medium">
                {c.areaLabel} — {c.severityLabel}
              </p>
              <p className="mt-1 text-muted-foreground">Terminwirkung: {c.scheduleImpactLabel}</p>
              {c.description ? <p className="mt-1 text-muted-foreground">{c.description}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {readOnly ? (
        <p className="text-xs text-muted-foreground">
          Nur Leserecht — Konsequenzen können nicht erfasst werden.
        </p>
      ) : (
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3" disabled={saving}>
          <legend className="sr-only">Konsequenz erfassen</legend>
          <label className="text-xs font-medium">
            Bereich
            <select
              className={`mt-1 ${inputCls}`}
              value={areaKey}
              onChange={(e) => setAreaKey(e.target.value)}
            >
              <option value="">— Bereich wählen —</option>
              {areas.map((a) => (
                <option key={a.key} value={a.key} className="bg-background">
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Schweregrad
            <select
              className={`mt-1 ${inputCls}`}
              value={severityKey}
              onChange={(e) => setSeverityKey(e.target.value)}
            >
              <option value="">— wählen —</option>
              {severities.map((s) => (
                <option key={s.key} value={s.key} className="bg-background">
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Terminwirkung
            <select
              className={`mt-1 ${inputCls}`}
              value={scheduleImpactKey}
              onChange={(e) => setScheduleImpactKey(e.target.value)}
            >
              <option value="">— wählen —</option>
              {impacts.map((s) => (
                <option key={s.key} value={s.key} className="bg-background">
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium sm:col-span-3">
            Beschreibung
            <input
              className={`mt-1 ${inputCls}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={!valid || saving}
              onClick={() => {
                onSave({ areaKey, severityKey, scheduleImpactKey, description });
                setAreaKey("");
                setDescription("");
              }}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
            >
              Konsequenz erfassen
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
