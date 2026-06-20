import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  HardDrive,
  Info,
  ListChecks,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  JsonExportService,
  type ExportOptions,
} from "@/lib/json-export-service";
import type { ExportScope } from "@/lib/json-schema";
import { JsonSchemaValidationService, type ValidationResult } from "@/lib/json-schema-validation-service";
import { ExampleFileService } from "@/lib/example-file-service";
import { ExportDownloadService } from "@/lib/export-download-service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserManualDialog } from "@/components/UserManualDialog";
import { ImportPreviewDialog } from "@/components/ImportPreviewDialog";
import { ImportLogService, type ImportLogEntry } from "@/lib/import-log-service";
import { JsonImportService } from "@/lib/json-import-service";

export type ImportExportTab =
  | "export"
  | "import"
  | "examples"
  | "log"
  | "backup"
  | "docs";

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: ImportExportTab;
  onOpenBackup?: () => void;
}

type ScopeChoice = "full" | ExportScope;

const SCOPE_LABELS: Record<ScopeChoice, string> = {
  full: "Alles exportieren",
  users: "Nur Benutzerprofile",
  customers: "Nur Kunden",
  projects: "Nur Projekte",
  workpackages: "Nur Arbeitspakete",
  activities: "Nur Tätigkeiten",
  timeentries: "Nur Zeitbuchungen",
  settings: "Nur Einstellungen",
  targettime: "Nur Arbeitszeitmodelle",
};

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportExportDialog({
  open,
  onOpenChange,
  initialTab = "export",
  onOpenBackup,
}: ImportExportDialogProps) {
  const currentUser = useCurrentUser();
  const [tab, setTab] = useState<ImportExportTab>(initialTab);
  const [scope, setScope] = useState<ScopeChoice>("full");
  const [opts, setOpts] = useState<Required<Omit<ExportOptions, "exportedBy">>>({
    includeUsers: true,
    includeSettings: true,
    includeTimeEntries: true,
    includeManualMeta: true,
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [exampleValidations, setExampleValidations] = useState<Record<string, ValidationResult>>({});

  const exportedBy = currentUser?.email || currentUser?.displayName || "anonymous";

  const handleCheck = () => {
    setBusy(true);
    try {
      const res =
        scope === "full"
          ? JsonExportService.exportFullJson({ ...opts, exportedBy })
          : JsonExportService.exportPartialJson(scope, { ...opts, exportedBy });
      const v = JsonSchemaValidationService.validate(res.document);
      setValidation(v);
    } catch (err) {
      toast.error("Export-Prüfung fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const res =
        scope === "full"
          ? JsonExportService.exportFullJson({ ...opts, exportedBy })
          : JsonExportService.exportPartialJson(scope, { ...opts, exportedBy });
      triggerBrowserDownload(res.blob, res.fileName);
      try {
        await ExportDownloadService.addDownload({
          fileName: res.fileName,
          format: "json",
          period: scope === "full" ? "Komplett" : SCOPE_LABELS[scope],
          createdBy: exportedBy,
          reportId: `json-${scope}-${Date.now()}`,
          status: "ready",
          blob: res.blob,
        });
        window.dispatchEvent(new CustomEvent("export-downloads:changed"));
      } catch {
        /* Download-Center optional — Export ist bereits beim User. */
      }
      toast.success("JSON-Export erzeugt", { description: res.fileName });
    } catch (err) {
      toast.error("JSON-Export fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const examples = useMemo(() => ExampleFileService.listFiles(), []);

  const handleExampleDownload = (name: string) => {
    const built = ExampleFileService.buildBlob(name);
    if (!built) return;
    triggerBrowserDownload(built.blob, built.fileName);
  };

  const handleExampleValidate = (name: string) => {
    const ex = ExampleFileService.getFile(name);
    if (!ex) return;
    const res = JsonSchemaValidationService.validate(ex.build());
    setExampleValidations((prev) => ({ ...prev, [name]: res }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="size-5" /> Import / Export
            </DialogTitle>
            <DialogDescription>
              Strukturierter JSON-Austausch für Backup, Migration, Testdaten und API-Vorbereitung.
              Schema v1 — sensible Felder werden vor jedem Export automatisch entfernt.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as ImportExportTab)}>
            <TabsList className="grid grid-cols-6">
              <TabsTrigger value="export">JSON Export</TabsTrigger>
              <TabsTrigger value="import">JSON Import</TabsTrigger>
              <TabsTrigger value="examples">Beispieldateien</TabsTrigger>
              <TabsTrigger value="log">Import-Protokoll</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="docs">Schnittstelle</TabsTrigger>
            </TabsList>

            {/* ---------------- EXPORT ---------------- */}
            <TabsContent value="export" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border p-4">
                  <Label className="text-xs uppercase text-muted-foreground">Exportumfang</Label>
                  <RadioGroup
                    value={scope}
                    onValueChange={(v) => setScope(v as ScopeChoice)}
                    className="mt-2 space-y-1"
                  >
                    {(Object.keys(SCOPE_LABELS) as ScopeChoice[]).map((k) => (
                      <div key={k} className="flex items-center gap-2">
                        <RadioGroupItem id={`scope-${k}`} value={k} />
                        <Label htmlFor={`scope-${k}`} className="font-normal">
                          {SCOPE_LABELS[k]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="rounded-md border border-border p-4">
                  <Label className="text-xs uppercase text-muted-foreground">Optionen</Label>
                  <div className="mt-3 space-y-3">
                    <ToggleRow
                      label="Benutzerprofile einschließen"
                      checked={opts.includeUsers}
                      onChange={(v) => setOpts((p) => ({ ...p, includeUsers: v }))}
                    />
                    <ToggleRow
                      label="Einstellungen einschließen"
                      checked={opts.includeSettings}
                      onChange={(v) => setOpts((p) => ({ ...p, includeSettings: v }))}
                    />
                    <ToggleRow
                      label="Zeitbuchungen einschließen"
                      checked={opts.includeTimeEntries}
                      onChange={(v) => setOpts((p) => ({ ...p, includeTimeEntries: v }))}
                    />
                    <ToggleRow
                      label="Handbuch-Metadaten einschließen"
                      checked={opts.includeManualMeta}
                      onChange={(v) => setOpts((p) => ({ ...p, includeManualMeta: v }))}
                    />
                  </div>

                  <div className="mt-4 flex items-start gap-2 rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    Passwörter, MFA-Secrets und Token werden grundsätzlich nicht exportiert.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleCheck} disabled={busy}>
                  <ListChecks className="mr-2 size-4" /> Export prüfen
                </Button>
                <Button onClick={handleExport} disabled={busy}>
                  <Download className="mr-2 size-4" /> JSON erzeugen & herunterladen
                </Button>
              </div>

              {validation && <ValidationCard res={validation} />}
            </TabsContent>

            {/* ---------------- IMPORT (Stufe 2) ---------------- */}
            <TabsContent value="import" className="pt-4">
              <PlaceholderCard
                icon={<Upload className="size-5" />}
                title="JSON-Import folgt in Stufe 2"
                body="Datei auswählen → Schema prüfen → Import-Vorschau → Konflikt- und Benutzer-Mapping-Dialog → Ausführung mit Protokoll. Das Schema (json-schema.ts) und der Validierungs-Service stehen bereits bereit."
              />
            </TabsContent>

            {/* ---------------- BEISPIELDATEIEN ---------------- */}
            <TabsContent value="examples" className="pt-4">
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Datei</th>
                      <th className="px-3 py-2 text-left">Beschreibung</th>
                      <th className="px-3 py-2 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {examples.map((f) => {
                      const v = exampleValidations[f.name];
                      return (
                        <tr key={f.name} className="align-top">
                          <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {f.description}
                            {v && (
                              <div className="mt-1 text-xs">
                                {v.ok ? (
                                  <span className="inline-flex items-center gap-1 text-success">
                                    <CheckCircle2 className="size-3" /> Schema gültig
                                    {v.issues.length > 0 && ` · ${v.issues.length} Hinweis(e)`}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="size-3" /> {v.issues.length} Fehler
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExampleValidate(f.name)}
                            >
                              Validieren
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2"
                              onClick={() => handleExampleDownload(f.name)}
                            >
                              <Download className="mr-1 size-3" /> Download
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ---------------- IMPORT-PROTOKOLL (Stufe 2) ---------------- */}
            <TabsContent value="log" className="pt-4">
              <PlaceholderCard
                icon={<ListChecks className="size-5" />}
                title="Import-Protokoll folgt in Stufe 2"
                body="Sobald der JSON-Import aktiv ist, wird hier jeder Lauf mit Zeitstempel, Dateiname, Konflikten und Ergebnis dokumentiert."
              />
            </TabsContent>

            {/* ---------------- BACKUP ---------------- */}
            <TabsContent value="backup" className="space-y-3 pt-4">
              <div className="rounded-md border border-border p-4 text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <HardDrive className="size-4" /> Backup-Bereich
                </p>
                <p className="text-muted-foreground">
                  Das tägliche ZIP-Backup bleibt der Standard. Zusätzlich kann ein
                  JSON-Komplett-Export erzeugt und im Downloadbereich abgelegt werden.
                  Wiederherstellung aus JSON folgt in Stufe 2.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={handleExport}>
                    <Download className="mr-2 size-4" /> JSON-Komplett-Export herunterladen
                  </Button>
                  {onOpenBackup && (
                    <Button variant="outline" onClick={onOpenBackup}>
                      <HardDrive className="mr-2 size-4" /> ZIP-Backup-Dialog öffnen
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ---------------- SCHNITTSTELLEN-DOKU ---------------- */}
            <TabsContent value="docs" className="pt-4">
              <div className="rounded-md border border-border p-4 text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <Info className="size-4" /> Schnittstellen-Dokumentation
                </p>
                <p className="text-muted-foreground">
                  Das Handbuch enthält ein eigenes Kapitel zur JSON-Schnittstelle
                  (Zweck, Schema-Versionierung, Sicherheitsregeln, Beispiel-JSON).
                </p>
                <div className="mt-3">
                  <Button variant="outline" onClick={() => setShowManual(true)}>
                    <Info className="mr-2 size-4" /> Kapitel „Import/Export" öffnen
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <UserManualDialog
        open={showManual}
        onClose={() => setShowManual(false)}
        initialRoute="/"
      />
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ValidationCard({ res }: { res: ValidationResult }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <p className="mb-2 flex items-center gap-2 font-medium">
        {res.ok ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <AlertTriangle className="size-4 text-destructive" />
        )}
        {res.ok ? "Export ist gültig" : "Export enthält Fehler"}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        {Object.entries(res.counts).map(([k, v]) => (
          <div key={k}>
            <span className="capitalize">{k}</span>: <span className="font-mono">{v}</span>
          </div>
        ))}
      </div>
      {res.issues.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-xs">
          {res.issues.map((i, idx) => (
            <li key={idx}>
              <span
                className={
                  i.severity === "error"
                    ? "text-destructive"
                    : i.severity === "warning"
                      ? "text-warning"
                      : "text-muted-foreground"
                }
              >
                [{i.severity}]
              </span>{" "}
              <span className="font-mono">{i.path}</span> — {i.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceholderCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-sm">
      <p className="mb-1 flex items-center gap-2 font-medium">
        {icon}
        {title}
      </p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
