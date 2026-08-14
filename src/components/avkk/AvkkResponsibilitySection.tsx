/**
 * V — Verantwortung: Zuordnung von Person, Rolle und Verantwortungsarten.
 */
import { useState } from "react";
import type { AvkkResponsibility } from "@/lib/avkk";
import type { ReferenceValue } from "@/lib/reference-data";
import type { UserProfile } from "@/lib/user-management";
import { inputCls } from "@/components/dashboard/constants";

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
  people: readonly UserProfile[];
  roles: readonly ReferenceValue[];
  types: readonly ReferenceValue[];
  readOnly: boolean;
  saving: boolean;
  /** Solange der Serverstand lädt, wird der bestehende Stand nicht behauptet. */
  loading?: boolean;
  onSave: (input: { personId: string; roleKey: string; typeKeys: string[]; note: string }) => void;
}) {
  const [personId, setPersonId] = useState("");
  const [roleKey, setRoleKey] = useState(roles.find((r) => r.isDefault)?.key ?? "");
  const [typeKeys, setTypeKeys] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const active = responsibilities.filter((r) => r.validTo === null);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.displayName ?? id;
  const valid = personId !== "" && roleKey !== "" && typeKeys.length > 0;

  return (
    <div className="space-y-3">
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
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2" disabled={saving}>
          <legend className="sr-only">Verantwortung zuordnen</legend>
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
              disabled={!valid || saving}
              onClick={() => {
                onSave({ personId, roleKey, typeKeys, note });
                setTypeKeys([]);
                setNote("");
              }}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
            >
              Verantwortung zuordnen
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
