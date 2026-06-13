import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  EngineerTargetTimeService,
  deriveCounterpart,
  newTargetTimeModelId,
  validateTargetTimeModel,
  type EngineerTargetTimeModel,
  type TargetTimeBase,
} from "@/lib/engineer-target-time";

const inputCls =
  "h-10 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm outline-none transition focus:border-ring";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusOf(m: EngineerTargetTimeModel, now: Date): "aktiv" | "historisch" | "zukünftig" {
  const from = new Date(m.validFrom);
  const until = m.validUntil ? new Date(m.validUntil) : null;
  if (from > now) return "zukünftig";
  if (until && until < now) return "historisch";
  return "aktiv";
}

function emptyModel(engineerId: string): EngineerTargetTimeModel {
  const iso = new Date().toISOString();
  return {
    id: newTargetTimeModelId(),
    engineerId,
    targetTimeBase: "monthly",
    monthlyTargetHours: 168,
    weeklyTargetHours: undefined,
    validFrom: todayISO(),
    validUntil: undefined,
    description: "",
    createdAt: iso,
    updatedAt: iso,
  };
}

export interface WorkingTimeModelsDialogProps {
  models: EngineerTargetTimeModel[];
  onChange: (next: EngineerTargetTimeModel[]) => void;
  onClose: () => void;
  engineerId?: string;
}

export function WorkingTimeModelsDialog({
  models,
  onChange,
  onClose,
  engineerId = "self",
}: WorkingTimeModelsDialogProps) {
  const [editing, setEditing] = useState<EngineerTargetTimeModel | null>(null);
  const now = new Date();

  const sorted = useMemo(
    () => [...models].sort((a, b) => b.validFrom.localeCompare(a.validFrom)),
    [models],
  );
  const active =
    EngineerTargetTimeService.getActiveTargetTimeModel(models, now, engineerId) ?? null;
  const counterpart = active ? deriveCounterpart(active, now) : null;

  const handleSave = (m: EngineerTargetTimeModel) => {
    const others = models.filter((x) => x.id !== m.id);
    const errs = validateTargetTimeModel(m, others);
    if (errs.length > 0) return; // Validierung blockiert den Save in der Form
    const next = [...others, { ...m, updatedAt: new Date().toISOString() }];
    onChange(next);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    onChange(models.filter((m) => m.id !== id));
  };

  const handleEnd = (m: EngineerTargetTimeModel) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const updated: EngineerTargetTimeModel = {
      ...m,
      validUntil: ymd,
      updatedAt: new Date().toISOString(),
    };
    onChange(models.map((x) => (x.id === m.id ? updated : x)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-4xl rounded-2xl border border-border p-6 shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Arbeitszeitmodell</h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md hover:bg-secondary/60"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Aktuelles Modell */}
        <div className="mb-5 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Aktuelles Modell
          </div>
          {active && counterpart ? (
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">Sollzeit-Basis</div>
                <div className="font-semibold">
                  {active.targetTimeBase === "monthly" ? "Monatssollzeit" : "Wochensollzeit"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Monatssoll</div>
                <div className="font-semibold">{counterpart.monthlyHours.toFixed(1)} h</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Wochensoll</div>
                <div className="font-semibold">{counterpart.weeklyHours.toFixed(1)} h</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Gültig seit</div>
                <div className="font-semibold">{fmtDate(active.validFrom)}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kein aktives Arbeitszeitmodell hinterlegt – es wird auf das Profil
              (Monatssoll + Workload) zurückgegriffen.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setEditing(emptyModel(engineerId))}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Plus className="size-3.5" /> Modell hinzufügen
            </button>
            {active && (
              <>
                <button
                  onClick={() => setEditing({ ...active })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  <Pencil className="size-3.5" /> Bearbeiten
                </button>
                <button
                  onClick={() => handleEnd(active)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  Beenden (gestern)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Historie */}
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Arbeitszeitmodell-Historie
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Gültig ab</th>
                <th className="px-3 py-2">Gültig bis</th>
                <th className="px-3 py-2">Basis</th>
                <th className="px-3 py-2 text-right">Monatssoll</th>
                <th className="px-3 py-2 text-right">Wochensoll</th>
                <th className="px-3 py-2">Beschreibung</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Noch keine Modelle hinterlegt.
                  </td>
                </tr>
              )}
              {sorted.map((m) => {
                const cp = deriveCounterpart(m, new Date(m.validFrom));
                const s = statusOf(m, now);
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-3 py-2">{fmtDate(m.validFrom)}</td>
                    <td className="px-3 py-2">{m.validUntil ? fmtDate(m.validUntil) : "offen"}</td>
                    <td className="px-3 py-2">
                      {m.targetTimeBase === "monthly" ? "Monat" : "Woche"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {cp.monthlyHours.toFixed(1)} h
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {cp.weeklyHours.toFixed(1)} h
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{m.description || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "rounded px-2 py-0.5 text-xs " +
                          (s === "aktiv"
                            ? "bg-success/15 text-success"
                            : s === "zukünftig"
                              ? "bg-info/15 text-info"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {s}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditing({ ...m })}
                          className="grid size-7 place-items-center rounded hover:bg-secondary/60"
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="grid size-7 place-items-center rounded text-destructive hover:bg-destructive/10"
                          aria-label="Löschen"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editing && (
          <ModelForm
            initial={editing}
            others={models.filter((x) => x.id !== editing.id)}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

function ModelForm({
  initial,
  others,
  onCancel,
  onSave,
}: {
  initial: EngineerTargetTimeModel;
  others: EngineerTargetTimeModel[];
  onCancel: () => void;
  onSave: (m: EngineerTargetTimeModel) => void;
}) {
  const [form, setForm] = useState<EngineerTargetTimeModel>({ ...initial });
  const errs = validateTargetTimeModel(form, others);
  const errFor = (field: string) => errs.find((e) => e.field === field)?.message;
  const overlapErr = errs.find((e) => e.field === "overlap")?.message;

  const derived = useMemo(() => {
    try {
      return deriveCounterpart(form, new Date(form.validFrom || todayISO()));
    } catch {
      return { monthlyHours: 0, weeklyHours: 0 };
    }
  }, [form]);

  const setBase = (b: TargetTimeBase) => {
    setForm((f) => ({
      ...f,
      targetTimeBase: b,
      monthlyTargetHours: b === "monthly" ? f.monthlyTargetHours ?? 168 : undefined,
      weeklyTargetHours: b === "weekly" ? f.weeklyTargetHours ?? 40 : undefined,
    }));
  };

  return (
    <div className="mt-5 rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-semibold">
        {initial.createdAt === initial.updatedAt
          ? "Neues Arbeitszeitmodell"
          : "Arbeitszeitmodell bearbeiten"}
      </div>

      <div className="mb-3 flex gap-2">
        {(["monthly", "weekly"] as const).map((b) => (
          <label
            key={b}
            className={
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs " +
              (form.targetTimeBase === b
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/40")
            }
          >
            <input
              type="radio"
              className="accent-primary"
              checked={form.targetTimeBase === b}
              onChange={() => setBase(b)}
            />
            {b === "monthly" ? "Monatssollzeit" : "Wochensollzeit"}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {form.targetTimeBase === "monthly" ? (
          <label className="text-xs font-medium">
            Monatssollstunden
            <input
              type="number"
              min={0}
              step={0.5}
              className={`mt-1 ${inputCls}`}
              value={form.monthlyTargetHours ?? ""}
              onChange={(e) =>
                setForm({ ...form, monthlyTargetHours: Number(e.target.value) || 0 })
              }
            />
            {errFor("monthlyTargetHours") && (
              <span className="text-destructive">{errFor("monthlyTargetHours")}</span>
            )}
            <span className="mt-1 block text-muted-foreground">
              ≙ {derived.weeklyHours.toFixed(1)} h/Woche (KW von {fmtDate(form.validFrom)})
            </span>
          </label>
        ) : (
          <label className="text-xs font-medium">
            Wochensollstunden
            <input
              type="number"
              min={0}
              step={0.5}
              className={`mt-1 ${inputCls}`}
              value={form.weeklyTargetHours ?? ""}
              onChange={(e) =>
                setForm({ ...form, weeklyTargetHours: Number(e.target.value) || 0 })
              }
            />
            {errFor("weeklyTargetHours") && (
              <span className="text-destructive">{errFor("weeklyTargetHours")}</span>
            )}
            <span className="mt-1 block text-muted-foreground">
              ≙ {derived.monthlyHours.toFixed(1)} h im Monat von {fmtDate(form.validFrom)}
            </span>
          </label>
        )}

        <label className="text-xs font-medium">
          Beschreibung (optional)
          <input
            className={`mt-1 ${inputCls}`}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="z. B. Elternzeit, Aufstockung …"
          />
        </label>

        <label className="text-xs font-medium">
          Gültig ab
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
          />
          {errFor("validFrom") && (
            <span className="text-destructive">{errFor("validFrom")}</span>
          )}
        </label>

        <label className="text-xs font-medium">
          Gültig bis (optional)
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={form.validUntil ?? ""}
            onChange={(e) =>
              setForm({ ...form, validUntil: e.target.value || undefined })
            }
          />
          {errFor("validUntil") && (
            <span className="text-destructive">{errFor("validUntil")}</span>
          )}
        </label>
      </div>

      {overlapErr && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {overlapErr}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-9 rounded-md border border-border bg-secondary/40 px-4 text-sm hover:bg-secondary"
        >
          Abbrechen
        </button>
        <button
          disabled={errs.length > 0}
          onClick={() => onSave(form)}
          className="h-9 rounded-md px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
