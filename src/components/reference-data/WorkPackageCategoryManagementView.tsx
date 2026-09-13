import { useState } from "react";
import { AlertTriangle, Plus, ShieldOff } from "lucide-react";
import { Card } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReferenceValue } from "@/lib/reference-data/types";
import type {
  CreateWorkPackageCategoryInput,
  UpdateWorkPackageCategoryInput,
  WorkPackageCategoryManagementPayload,
} from "@/lib/reference-data/workpackage-category-management";

export type WorkPackageCategoryManagementViewState =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error" }
  | { kind: "ready"; payload: WorkPackageCategoryManagementPayload };

interface Props {
  state: WorkPackageCategoryManagementViewState;
  canManage: boolean;
  onSystemhouseChange: (systemhouseId: string) => void;
  onCreate: (input: CreateWorkPackageCategoryInput) => Promise<void> | void;
  onUpdate: (input: UpdateWorkPackageCategoryInput) => Promise<void> | void;
  onDeactivate: (input: { systemhouseId: string; valueId: string }) => Promise<void> | void;
}

type EditState = { mode: "create" } | { mode: "edit"; value: ReferenceValue } | null;

export function WorkPackageCategoryManagementView({
  state,
  canManage,
  onSystemhouseChange,
  onCreate,
  onUpdate,
  onDeactivate,
}: Props) {
  const [edit, setEdit] = useState<EditState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  if (state.kind === "loading") {
    return (
      <section aria-labelledby="workpackage-category-heading">
        <h1 id="workpackage-category-heading" className="text-2xl font-semibold tracking-tight">
          Arbeitspaket-Kategorien
        </h1>
        <div role="status" aria-live="polite" aria-busy="true" className="mt-6 grid gap-3">
          <span className="sr-only">Arbeitspaket-Kategorien werden geladen …</span>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (state.kind === "denied" || state.kind === "error") {
    const denied = state.kind === "denied";
    return (
      <section aria-labelledby="workpackage-category-heading">
        <h1 id="workpackage-category-heading" className="text-2xl font-semibold tracking-tight">
          Arbeitspaket-Kategorien
        </h1>
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          {denied ? (
            <ShieldOff className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <p className="text-muted-foreground">
            {denied
              ? "Die Kategorieverwaltung ist für dieses Konto nicht verfügbar."
              : "Die Arbeitspaket-Kategorien konnten nicht geladen werden."}
          </p>
        </div>
      </section>
    );
  }

  const { payload } = state;
  const selectedSystemhouseId = payload.selectedSystemhouseId;

  return (
    <section aria-labelledby="workpackage-category-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">BSF-03D</p>
          <h1
            id="workpackage-category-heading"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Arbeitspaket-Kategorien
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Systemhausweite Hauptklassifikationen für Arbeitspakete. Kategorien werden deaktiviert
            statt gelöscht; freie Tags bleiben davon unabhängig.
          </p>
        </div>
        {canManage && selectedSystemhouseId && (
          <Button type="button" onClick={() => setEdit({ mode: "create" })}>
            <Plus className="mr-2 size-4" aria-hidden="true" /> Neue Kategorie
          </Button>
        )}
      </div>

      {payload.scopes.length > 1 && (
        <div className="mt-6 max-w-sm">
          <label htmlFor="workpackage-category-systemhouse" className="text-xs font-medium">
            Systemhaus
          </label>
          <select
            id="workpackage-category-systemhouse"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedSystemhouseId ?? ""}
            onChange={(event) => {
              if (event.target.value) onSystemhouseChange(event.target.value);
            }}
          >
            {!selectedSystemhouseId && <option value="">— Systemhaus wählen —</option>}
            {payload.scopes.map((scope) => (
              <option key={scope.systemhouseId} value={scope.systemhouseId}>
                {scope.systemhouseName}
              </option>
            ))}
          </select>
        </div>
      )}

      <Card>
        <div className="mt-6 overflow-x-auto">
          {!selectedSystemhouseId ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Bitte wählen Sie ein Systemhaus aus.
            </p>
          ) : payload.values.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Noch keine Arbeitspaket-Kategorien vorhanden.
            </p>
          ) : (
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Kategorie</th>
                  <th className="px-5 py-3 font-medium">Key</th>
                  <th className="px-5 py-3 font-medium">Beschreibung</th>
                  <th className="px-5 py-3 font-medium">Sortierung</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {canManage && <th className="px-5 py-3 text-right font-medium">Aktion</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payload.values.map((value) => (
                  <tr key={value.id}>
                    <td className="px-5 py-4 font-medium">{value.label}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {value.key}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{value.description || "—"}</td>
                    <td className="px-5 py-4 text-muted-foreground">{value.sortOrder}</td>
                    <td className="px-5 py-4">
                      {value.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Aktiv
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          Deaktiviert
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEdit({ mode: "edit", value })}
                          >
                            Bearbeiten
                          </Button>
                          {value.isActive && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === value.id}
                              onClick={async () => {
                                setBusyId(value.id);
                                setActionError(false);
                                try {
                                  await onDeactivate({
                                    systemhouseId: selectedSystemhouseId,
                                    valueId: value.id,
                                  });
                                } catch {
                                  setActionError(true);
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                            >
                              Deaktivieren
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Die Änderung konnte nicht gespeichert werden.
        </p>
      )}

      {edit && selectedSystemhouseId && (
        <CategoryEditDialog
          edit={edit}
          systemhouseId={selectedSystemhouseId}
          onClose={() => setEdit(null)}
          onCreate={onCreate}
          onUpdate={onUpdate}
        />
      )}
    </section>
  );
}

function CategoryEditDialog({
  edit,
  systemhouseId,
  onClose,
  onCreate,
  onUpdate,
}: {
  edit: Exclude<EditState, null>;
  systemhouseId: string;
  onClose: () => void;
  onCreate: Props["onCreate"];
  onUpdate: Props["onUpdate"];
}) {
  const value = edit.mode === "edit" ? edit.value : null;
  const [key, setKey] = useState(value?.key ?? "");
  const [label, setLabel] = useState(value?.label ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [sortOrder, setSortOrder] = useState(value?.sortOrder ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const valid =
    label.trim().length > 0 && (edit.mode === "edit" || /^[a-z0-9][a-z0-9._-]*$/u.test(key));

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(false);
    try {
      if (edit.mode === "create") {
        await onCreate({
          systemhouseId,
          key: key.trim(),
          label: label.trim(),
          description: description.trim(),
          sortOrder,
        });
      } else {
        await onUpdate({
          systemhouseId,
          valueId: edit.value.id,
          label: label.trim(),
          description: description.trim(),
          sortOrder,
        });
      }
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {edit.mode === "create" ? "Neue Kategorie" : "Kategorie bearbeiten"}
          </DialogTitle>
          <DialogDescription>
            Der technische Key bleibt nach der Anlage unveränderlich.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <label className="grid gap-1 text-sm font-medium">
            Technischer Key
            <input
              className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm"
              value={key}
              disabled={edit.mode === "edit"}
              onChange={(event) => setKey(event.target.value.toLowerCase())}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Bezeichnung
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Beschreibung
            <textarea
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sortierung
            <input
              type="number"
              min={0}
              max={100000}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              Speichern fehlgeschlagen.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" disabled={!valid || busy} onClick={() => void submit()}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
