/**
 * WorkPackageCategoryDialog — Pflege der systemhausweiten Arbeitspaket-Kategorien
 * (BSF-03D, #103; Katalog `workpackage.category`).
 *
 * - Sichtbar/bedienbar nur mit `referencedata.manage` (UI-Gating ist UX; die
 *   Sicherheitsgrenze sind Grants + RLS in der Datenbank).
 * - Stabile Keys (aus der Bezeichnung abgeleitet, danach unveränderlich),
 *   Deaktivieren statt Löschen, Systemhaus-Bezug explizit.
 */
import { useEffect, useState } from "react";
import { Ban, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermission } from "@/hooks/usePermission";
import { useWorkPackageCategories } from "@/hooks/useWorkPackageCategories";
import {
  CATALOG_KEYS,
  createValue,
  deactivateValue,
  listCatalogs,
  updateValue,
} from "@/lib/reference-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Stabiler, URL-/JSON-sicherer Key aus einer Bezeichnung. */
export function toCategoryKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function WorkPackageCategoryDialog({ open, onOpenChange }: Props) {
  const canManage = usePermission("referencedata.manage");
  const currentUser = useCurrentUser();
  const ctx = useWorkPackageCategories();
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !canManage) return;
    let cancelled = false;
    listCatalogs()
      .then((cats) => {
        if (cancelled) return;
        setCatalogId(cats.find((c) => c.key === CATALOG_KEYS.workPackageCategory)?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setCatalogId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, canManage]);

  const key = toCategoryKey(keyInput || label);
  const duplicate = ctx.allValues.some((v) => v.key === key);
  const createDisabled =
    busy ||
    ctx.status !== "ready" ||
    !catalogId ||
    !ctx.selectedSystemhouseId ||
    key.length === 0 ||
    label.trim().length === 0 ||
    duplicate;

  async function run(action: () => Promise<void>, success: string) {
    if (!currentUser) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      toast.success(success);
      ctx.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arbeitspaket-Kategorien</DialogTitle>
          <DialogDescription>
            Systemhausweite Stammdaten. Alle Kunden desselben Systemhauses nutzen denselben
            aktiven Bestand. Kategorien werden deaktiviert, nie gelöscht; der Schlüssel bleibt
            stabil.
          </DialogDescription>
        </DialogHeader>

        {!canManage ? (
          <p role="status" className="text-sm text-muted-foreground">
            Sie haben keine Berechtigung zur Katalogpflege (erforderlich: „Kataloge pflegen“).
          </p>
        ) : (
          <div className="space-y-4">
            {ctx.systemhouses.length > 1 && (
              <div className="grid gap-1">
                <Label htmlFor="wpcat-systemhouse">Systemhaus</Label>
                <select
                  id="wpcat-systemhouse"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={ctx.selectedSystemhouseId ?? ""}
                  onChange={(e) => ctx.onSelectSystemhouse(e.target.value)}
                >
                  <option value="">— Systemhaus wählen —</option>
                  {ctx.systemhouses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {ctx.status === "no-systemhouse" && (
              <p role="status" className="text-sm text-muted-foreground">
                Keine aktive Systemhaus-Zugehörigkeit — Katalogpflege nicht möglich.
              </p>
            )}
            {ctx.status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {ctx.error ?? "Kataloge derzeit nicht verfügbar."}
              </p>
            )}

            <section aria-label="Vorhandene Kategorien">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Bezeichnung
                    </th>
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Schlüssel
                    </th>
                    <th scope="col" className="py-1 pr-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      <span className="sr-only">Aktion</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.allValues.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-muted-foreground">
                        Noch keine Kategorien vorhanden.
                      </td>
                    </tr>
                  )}
                  {ctx.allValues.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-1.5 pr-2">{v.label}</td>
                      <td className="py-1.5 pr-2 font-mono text-xs">{v.key}</td>
                      <td className="py-1.5 pr-2">{v.isActive ? "aktiv" : "deaktiviert"}</td>
                      <td className="py-1.5 text-right">
                        {v.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            aria-label={`Deaktivieren: ${v.label}`}
                            onClick={() =>
                              void run(
                                () => deactivateValue(v.id, currentUser?.id ?? ""),
                                `Kategorie „${v.label}“ deaktiviert.`,
                              )
                            }
                          >
                            <Ban className="mr-1 size-4" aria-hidden="true" /> Deaktivieren
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            aria-label={`Reaktivieren: ${v.label}`}
                            onClick={() =>
                              void run(
                                () =>
                                  updateValue(
                                    v.id,
                                    { isActive: true, validTo: null },
                                    currentUser?.id ?? "",
                                  ),
                                `Kategorie „${v.label}“ reaktiviert.`,
                              )
                            }
                          >
                            <RotateCcw className="mr-1 size-4" aria-hidden="true" /> Reaktivieren
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <form
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (createDisabled || !catalogId || !ctx.selectedSystemhouseId) return;
                void run(
                  () =>
                    createValue(
                      {
                        catalogId,
                        key,
                        label: label.trim(),
                        sortOrder: ctx.allValues.length + 1,
                        systemhouseId: ctx.selectedSystemhouseId,
                      },
                      currentUser?.id ?? "",
                    ),
                  `Kategorie „${label.trim()}“ angelegt.`,
                ).then(() => {
                  setKeyInput("");
                  setLabel("");
                });
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor="wpcat-label">Bezeichnung</Label>
                <Input
                  id="wpcat-label"
                  value={label}
                  maxLength={120}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="wpcat-key">Schlüssel (stabil, optional abweichend)</Label>
                <Input
                  id="wpcat-key"
                  value={keyInput}
                  maxLength={64}
                  placeholder={key || "wird aus der Bezeichnung abgeleitet"}
                  aria-describedby="wpcat-key-hint"
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <span id="wpcat-key-hint" className="text-xs text-muted-foreground">
                  Ergibt: <code>{key || "—"}</code>
                  {duplicate ? " — bereits vorhanden" : ""}
                </span>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {error}
                </p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createDisabled}>
                  <Plus className="mr-1 size-4" aria-hidden="true" /> Anlegen
                </Button>
              </div>
            </form>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
