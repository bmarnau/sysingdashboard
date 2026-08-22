/**
 * V — Verantwortung: Zuordnung von Person, Rolle und Verantwortungsarten.
 */
import { useState } from "react";
import type { AvkkResponsibility } from "@/lib/avkk";
import type { ReferenceValue } from "@/lib/reference-data";
import { inputCls } from "@/components/dashboard/constants";

export interface AvkkResponsibilityPerson {
  id: string;
  displayName: string;
}

function sameKeySet(left: readonly string[], right: readonly string[]): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function AvkkResponsibilitySection({
  responsibilities,
  people,
  roles,
  types,
  readOnly,
  saving,
  loading = false,
  onSave,
}: {
  responsibilities: readonly AvkkResponsibility[];
  people: readonly AvkkResponsibilityPerson[];
  roles: readonly ReferenceValue[];
  types: readonly ReferenceValue[];
  readOnly: boolean;
  saving: boolean;
  /** Solange der Serverstand lädt, wird der bestehende Stand nicht behauptet. */
  loading?: boolean;
  onSave: (input: {
    personId: string;
    roleKey: string;
    typeKeys: string[];
    note: string;
  }) => Promise<boolean>;
}) {
  const defaultRoleKey = roles.find((r) => r.isDefault)?.key ?? "";
  const [personId, setPersonId] = useState("");
  const [roleKey, setRoleKey] = useState(defaultRoleKey);
  const [typeKeys, setTypeKeys] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = responsibilities.filter((r) => r.validTo === null);
  const nameOf = (id: string) =>
    people.find((p) => p.id === id)?.displayName ?? "Person nicht verfügbar";
  const duplicateActive =
    personId !== "" &&
    roleKey !== "" &&
    typeKeys.length > 0 &&
    active.some(
      (responsibility) =>
        responsibility.personId === personId &&
        responsibility.roleKey === roleKey &&
        sameKeySet(
          responsibility.types.map((type) => type.key),
          typeKeys,
        ),
    );
  const valid = personId !== "" && roleKey !== "" && typeKeys.length > 0 && !duplicateActive;
  const busy = saving || submitting;

  if (loading) {
    return <p className="text-xs text-muted-foreground">Verantwortung wird geladen …</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold">Zugeordnet</p>
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine Verantwortung zugeordnet.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background/40 p-3 text-xs">
              <p className="font-medium">
                {nameOf(r.personId)} — {r.roleLabel}
              </p>
              <p className="mt-1 text-muted-foreground">
                {r.types.map((t) => t.label).join(", ") || "Keine Verantwortungsart"}
              </p>
              {r.note ? <p className="mt-1 text-muted-foreground">{r.note}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {readOnly ? (
        <p className="text-xs text-muted-foreground">
          Nur Leserecht — Verantwortung kann nicht geändert werden.
        </p>
      ) : (
        <fieldset
          className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2"
          disabled={busy}
        >
          <legend className="text-xs font-semibold">Weitere Verantwortung hinzufügen</legend>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Diese Auswahl ergänzt eine zusätzliche Zuordnung; bestehende Verantwortliche bleiben
            unverändert.
          </p>
          <label className="text-xs font-medium">
            Person
            <select
              className={`mt-1 ${inputCls}`}
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">— Person wählen —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">
                  {p.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Rolle
            <select
              className={`mt-1 ${inputCls}`}
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
            >
              <option value="">— Rolle wählen —</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key} className="bg-background">
                  {r.label}
                  {r.isActive ? "" : " (deaktiviert)"}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <p className="text-xs font-medium">Verantwortungsarten</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {types.map((t) => (
                <label key={t.key} className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={typeKeys.includes(t.key)}
                    onChange={(e) =>
                      setTypeKeys((prev) =>
                        e.target.checked ? [...prev, t.key] : prev.filter((k) => k !== t.key),
                      )
                    }
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {duplicateActive ? (
            <p role="alert" className="text-xs text-warning sm:col-span-2">
              Diese Verantwortung ist bereits aktiv zugeordnet.
            </p>
          ) : null}

          <label className="text-xs font-medium sm:col-span-2">
            Notiz (optional)
            <input
              className={`mt-1 ${inputCls}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={!valid || busy}
              onClick={async () => {
                if (!valid || busy) return;
                setSubmitting(true);
                try {
                  const saved = await onSave({ personId, roleKey, typeKeys, note });
                  if (!saved) return;
                  setPersonId("");
                  setRoleKey(defaultRoleKey);
                  setTypeKeys([]);
                  setNote("");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Verantwortung wird gespeichert …" : "Verantwortung zuordnen"}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
