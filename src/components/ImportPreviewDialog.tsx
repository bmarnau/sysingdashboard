import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, FileJson, Upload, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  JsonImportService,
  type ConflictStrategy,
  type ImportPlan,
  type ImportOptions,
} from "@/lib/json-import-service";
import { ImportLogService, type ImportLogEntry } from "@/lib/import-log-service";
import type { DashboardJsonExport } from "@/lib/json-schema";
import { loadUsers } from "@/lib/user-management";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: string;
  onCompleted?: () => void;
}

type Step = "file" | "review" | "mapping" | "run" | "done";

export function ImportPreviewDialog({ open, onOpenChange, actor, onCompleted }: Props) {
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState<string>("");
  const [doc, setDoc] = useState<DashboardJsonExport | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [strategy, setStrategy] = useState<ConflictStrategy>("merge");
  const [engineerMapping, setEngineerMapping] = useState<Record<string, string>>({});
  const [customerMapping, setCustomerMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportLogEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("file");
    setFileName("");
    setDoc(null);
    setPlan(null);
    setStrategy("merge");
    setEngineerMapping({});
    setCustomerMapping({});
    setResult(null);
    setBusy(false);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setFileName(file.name);
    try {
      const { doc, validation } = await JsonImportService.readFile(file);
      if (!validation.schemaValid || !doc) {
        toast.error("Datei ungültig", {
          description: validation.issues
            .slice(0, 3)
            .map((i) => i.message)
            .join("; "),
        });
        return;
      }
      if (doc.schemaVersion !== JsonImportService.SCHEMA_VERSION) {
        toast.warning("Schema-Version weicht ab", {
          description: `Datei: ${doc.schemaVersion} · erwartet: ${JsonImportService.SCHEMA_VERSION}`,
        });
      }
      setDoc(doc);
      const initialPlan = JsonImportService.buildPlan(doc, { strategy: "merge" });
      setPlan(initialPlan);
      setStep("review");
    } catch (err) {
      toast.error("Datei konnte nicht gelesen werden", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const goMapping = () => {
    if (!doc) return;
    const np = JsonImportService.buildPlan(doc, { strategy });
    setPlan(np);
    setStep("mapping");
  };

  const runImport = async () => {
    if (!doc || !plan) return;
    setBusy(true);
    setStep("run");
    const options: ImportOptions = { strategy, engineerMapping, customerMapping, actor };
    const startedAt = new Date().toISOString();
    const runId = `imp-${crypto.randomUUID()}`;
    try {
      const replanned = JsonImportService.buildPlan(doc, options);
      const { snapshotId, counts, warnings } = JsonImportService.applyPlan(replanned, options);
      const entry: ImportLogEntry = {
        ok: true,
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        actor,
        fileName,
        counts,
        warnings,
        errors: [],
        rollback: false,
        snapshotId,
        conflicts: replanned.timeEntryConflicts,
        mappings: { engineer: engineerMapping, customer: customerMapping },
        scopes: replanned.validation.document?.scopes ?? [],
      };
      await ImportLogService.add(entry);
      setResult(entry);
      setStep("done");
      toast.success("Import abgeschlossen", {
        description: `${counts.created} neu · ${counts.updated} aktualisiert · ${counts.skipped} übersprungen`,
      });
      onCompleted?.();
    } catch (err) {
      const entry: ImportLogEntry = {
        ok: false,
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        actor,
        fileName,
        counts: { created: 0, updated: 0, skipped: 0, errors: 1 },
        warnings: [],
        errors: [(err as Error).message],
        rollback: true,
        conflicts: [],
        mappings: { engineer: engineerMapping, customer: customerMapping },
        scopes: [],
      };
      await ImportLogService.add(entry);
      setResult(entry);
      setStep("done");
      toast.error("Import fehlgeschlagen — Rollback ausgeführt", {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const users = loadUsers();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" /> JSON-Import
          </DialogTitle>
          <DialogDescription>
            Datei → Vorschau → Mapping → Ausführung. Vor dem Schreiben wird ein Pre-Snapshot
            erzeugt; bei Fehler erfolgt automatischer Rollback.
          </DialogDescription>
        </DialogHeader>

        {step === "file" && (
          <div className="space-y-3">
            <Label htmlFor="imp-file" className="text-sm">
              JSON-Datei auswählen
            </Label>
            <input
              id="imp-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full text-sm"
              disabled={busy}
            />
            <Alert>
              <FileJson className="size-4" />
              <AlertDescription className="text-xs">
                Sensible Felder (Passwörter, Tokens, MFA-Secrets) werden vor der Validierung
                entfernt — auch wenn sie in der Datei stehen.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "review" && plan && (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium">
                {plan.schemaValid ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <AlertTriangle className="size-4 text-destructive" />
                )}
                Datei: <span className="font-mono">{fileName}</span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                {Object.entries(plan.diffs).map(([k, list]) => {
                  const creates = list.filter((d) => d.action === "create").length;
                  const updates = list.filter((d) => d.action === "update").length;
                  const skips = list.filter((d) => d.action === "skip").length;
                  return (
                    <div key={k} className="rounded-sm bg-secondary/40 p-2">
                      <div className="font-medium text-foreground">{k}</div>
                      <div>
                        Neu: {creates} · Update: {updates} · Skip: {skips}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-border p-3 text-sm">
              <Label className="text-xs uppercase text-muted-foreground">Konflikt-Strategie</Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as ConflictStrategy)}
                className="mt-2 space-y-1"
              >
                <Row
                  id="s-merge"
                  value="merge"
                  label="Merge — eingehende Felder überschreiben bestehende (Default)"
                />
                <Row
                  id="s-overwrite"
                  value="overwrite"
                  label="Überschreiben — kompletter Datensatz wird ersetzt"
                />
                <Row
                  id="s-keep"
                  value="keep"
                  label="Bestehende behalten — nur neue Datensätze anlegen"
                />
              </RadioGroup>
            </div>

            {plan.timeEntryConflicts.length > 0 && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-xs">
                  <strong>timeEntries gewinnt:</strong> {plan.timeEntryConflicts.length}{" "}
                  Differenz(en) zwischen
                  <span className="font-mono"> activities</span> und{" "}
                  <span className="font-mono">timeEntries</span> — die kanonische Quelle ist{" "}
                  <span className="font-mono">timeEntries</span>.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("file")}>
                Zurück
              </Button>
              <Button onClick={goMapping}>Weiter — Mapping</Button>
            </div>
          </div>
        )}

        {step === "mapping" && plan && (
          <div className="space-y-4">
            {/* Engineer-Mapping */}
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium">
                <UsersRound className="size-4" /> Benutzer-Mapping (engineerId)
              </p>
              {plan.singleEngineerMode ? (
                <p className="text-xs text-muted-foreground">
                  Single-Engineer-Modus erkannt — alle eingehenden engineerIds werden dem aktiven
                  Benutzer zugeordnet bzw. ignoriert.
                  {plan.engineerIdsInDoc.length > 0 &&
                    ` (${plan.engineerIdsInDoc.length} eingehende ID(s))`}
                </p>
              ) : plan.engineerIdsInDoc.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Keine engineerIds in der Datei — Mapping nicht nötig.
                </p>
              ) : (
                <div className="space-y-2">
                  {plan.engineerIdsInDoc.map((eid) => (
                    <div key={eid} className="flex items-center justify-between gap-2">
                      <code className="text-xs">{eid}</code>
                      <Select
                        value={engineerMapping[eid] ?? "__skip__"}
                        onValueChange={(v) => setEngineerMapping((m) => ({ ...m, [eid]: v }))}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">— Überspringen —</SelectItem>
                          <SelectItem value="__create__">Neu anlegen</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.displayName} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer-Mapping */}
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium">
                <Users className="size-4" /> Kunden-Mapping
              </p>
              {plan.customerSuggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keine Verdachts-Duplikate gefunden.</p>
              ) : (
                <div className="space-y-2">
                  {plan.customerSuggestions.map((s) => {
                    const current = customerMapping[s.normalized] ?? s.suggestion ?? s.incomingName;
                    return (
                      <div key={s.normalized} className="flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <div className="font-mono">{s.incomingName}</div>
                          <div className="text-muted-foreground">
                            ähnlich zu <span className="font-mono">{s.suggestion}</span> (Distanz{" "}
                            {s.distance})
                          </div>
                        </div>
                        <Select
                          value={current}
                          onValueChange={(v) =>
                            setCustomerMapping((m) => ({ ...m, [s.normalized]: v }))
                          }
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {s.suggestion && (
                              <SelectItem value={s.suggestion}>
                                Bestehenden „{s.suggestion}" nutzen
                              </SelectItem>
                            )}
                            <SelectItem value={s.incomingName}>
                              Neu „{s.incomingName}" anlegen
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("review")}>
                Zurück
              </Button>
              <Button onClick={runImport} disabled={busy}>
                Import ausführen
              </Button>
            </div>
          </div>
        )}

        {step === "run" && (
          <div className="py-8 text-center text-sm text-muted-foreground">Import läuft …</div>
        )}

        {step === "done" && result && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium">
                {result.ok ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" /> Import abgeschlossen
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-4 text-destructive" /> Import fehlgeschlagen —
                    Rollback ausgeführt
                  </>
                )}
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <Stat label="Neu" value={result.counts.created} />
                <Stat label="Update" value={result.counts.updated} />
                <Stat label="Skip" value={result.counts.skipped} />
                <Stat label="Fehler" value={result.counts.errors} />
              </div>
              {result.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-warning">
                  {result.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              {result.errors.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-destructive">
                  {result.errors.map((e, i) => (
                    <li key={i}>✗ {e}</li>
                  ))}
                </ul>
              )}
              {result.snapshotId && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Pre-Snapshot: <span className="font-mono">{result.snapshotId}</span> — Rollback
                  aus dem Import-Protokoll möglich.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => reset()}>
                Weiteren Import starten
              </Button>
              <Button onClick={() => onOpenChange(false)}>Schließen</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-secondary/40 p-2 text-center">
      <div className="text-muted-foreground">{label}</div>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}
