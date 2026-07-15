/**
 * TechnicalReportDialog
 *
 * Kompakte UI-Anzeige des zentralen technischen Prüfberichts
 * (Prompt 2A.8, ADR-0017). Der Bericht wird zur Build-Zeit als JSON-Asset
 * eingebunden — keine Runtime-Fetches, kein localStorage als Primärquelle.
 * UI-Filter (Severity/Bereich) dürfen persistent sein, sind hier aber
 * bewusst nur im Component-State gehalten.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ClipboardList, ShieldAlert, XCircle } from "lucide-react";
import reportRaw from "../../test-report/technical-test-report.json?raw";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface Finding {
  id: string;
  severity: Severity;
  category: string;
  area: string;
  title: string;
  description?: string;
  recommendation?: string;
  components?: string[];
  evidence?: { file?: string | null; reportRef?: string | null };
  bucket: string;
  status: string;
  source: "auto" | "manual";
  accepted: boolean;
  effort: string;
}

interface Report {
  generatedAt: string;
  identity: {
    dashboardVersion: string;
    commit: string;
    buildTime: string | null;
    testTime: string;
    environment: { node: string; platform: string; ci: boolean };
  };
  status: string;
  recommendation: { level: string; reason: string };
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    accepted: number;
    sources: Record<string, { status: string; count: number }>;
  };
  areas: Record<string, { status: string; openCritical: number; openHigh: number }>;
  findings: Finding[];
  diff: { new: string[]; fixed: string[]; worse: string[]; same: string[]; reappeared: string[] } | null;
}

const STATUS_LABEL: Record<string, string> = {
  passed: "bestanden",
  "passed-with-findings": "mit Findings",
  failed: "fehlgeschlagen",
  blocked: "blockiert",
  "not-run": "nicht ausgeführt",
};
const REC_LABEL: Record<string, string> = {
  "continue-development": "Entwicklung fortsetzen",
  "pilot-ready": "für Pilot geeignet",
  "restricted-pilot": "nur eingeschränkt pilotfähig",
  "not-pilot": "nicht pilotfähig",
  "not-production": "nicht produktionsfähig",
  "next-phase": "für nächste Phase freigegeben",
};

function parseReport(): Report | null {
  try {
    return JSON.parse(reportRaw) as Report;
  } catch {
    return null;
  }
}

function statusIcon(status: string) {
  if (status === "passed") return <CheckCircle2 className="size-4 text-green-500" />;
  if (status === "failed" || status === "blocked") return <XCircle className="size-4 text-red-500" />;
  return <AlertTriangle className="size-4 text-amber-500" />;
}

function sevBadge(sev: Severity) {
  const color =
    sev === "CRITICAL"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : sev === "HIGH"
        ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        : sev === "MEDIUM"
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-muted text-muted-foreground";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{sev}</span>;
}

export function TechnicalReportDialog({ open, onOpenChange }: Props) {
  const report = useMemo(parseReport, []);
  const [sevFilter, setSevFilter] = useState<Severity | "ALL">("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.findings.filter(
      (f) => (sevFilter === "ALL" || f.severity === sevFilter) && (areaFilter === "ALL" || f.area === areaFilter),
    );
  }, [report, sevFilter, areaFilter]);

  const areas = useMemo(
    () => (report ? Array.from(new Set(report.findings.map((f) => f.area))).sort() : []),
    [report],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" /> Technischer Prüfbericht
          </DialogTitle>
          <DialogDescription>
            Konsolidierter Bericht aller Testbereiche zum aktuellen Buildstand (ADR-0017).
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="size-4" /> Kein Bericht verfügbar
            </div>
            <p className="mt-2 text-muted-foreground">
              <code>bun run report:technical</code> ausführen, um <code>test-report/technical-test-report.json</code>{" "}
              zu erzeugen und das Dashboard neu zu bauen.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Prüfidentität */}
            <section className="grid grid-cols-1 gap-2 rounded border border-border bg-secondary/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Dashboard-Version:</span>{" "}
                <span className="font-medium">{report.identity.dashboardVersion}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commit:</span>{" "}
                <code>{report.identity.commit}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Build-Zeit:</span> {report.identity.buildTime ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Testzeit:</span> {report.identity.testTime}
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Umgebung:</span> Node {report.identity.environment.node} ·{" "}
                {report.identity.environment.platform} · CI={String(report.identity.environment.ci)}
              </div>
            </section>

            {/* Gesamtstatus + Empfehlung */}
            <section className="flex flex-wrap items-center gap-4 rounded border border-border p-3">
              <div className="flex items-center gap-2">
                {statusIcon(report.status)}
                <span className="text-lg font-semibold">
                  Gesamtstatus: {STATUS_LABEL[report.status] ?? report.status}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Empfehlung:</span>{" "}
                <span className="font-medium">{REC_LABEL[report.recommendation.level]}</span> —{" "}
                {report.recommendation.reason}
              </div>
              <div className="ml-auto flex gap-2 text-xs">
                <span className="rounded bg-red-500/15 px-2 py-0.5 font-medium text-red-600 dark:text-red-400">
                  C {report.summary.critical}
                </span>
                <span className="rounded bg-orange-500/15 px-2 py-0.5 font-medium text-orange-600 dark:text-orange-400">
                  H {report.summary.high}
                </span>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                  M {report.summary.medium}
                </span>
                <span className="rounded bg-muted px-2 py-0.5 font-medium">L {report.summary.low}</span>
              </div>
            </section>

            {/* Bereichstabelle */}
            <section>
              <h3 className="mb-2 font-semibold">Testergebnisse nach Bereich</h3>
              <div className="overflow-hidden rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Bereich</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">CRIT offen</th>
                      <th className="px-3 py-2 text-right font-medium">HIGH offen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.areas).map(([area, row]) => (
                      <tr key={area} className="border-t border-border">
                        <td className="px-3 py-2">{area}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            {statusIcon(row.status)} {STATUS_LABEL[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{row.openCritical}</td>
                        <td className="px-3 py-2 text-right">{row.openHigh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Diff */}
            {report.diff && (
              <section className="rounded border border-border p-3 text-sm">
                <h3 className="mb-2 font-semibold">Vergleich zum vorherigen Bericht</h3>
                <div className="flex flex-wrap gap-3">
                  <span>Neu: <strong>{report.diff.new.length}</strong></span>
                  <span>Behoben: <strong>{report.diff.fixed.length}</strong></span>
                  <span>Verschlechtert: <strong>{report.diff.worse.length}</strong></span>
                  <span>Unverändert: <strong>{report.diff.same.length}</strong></span>
                  <span>Wieder aufgetreten: <strong>{report.diff.reappeared.length}</strong></span>
                </div>
              </section>
            )}

            {/* Findings */}
            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Findings ({filtered.length})</h3>
                <div className="flex gap-2 text-xs">
                  <select
                    aria-label="Schweregrad-Filter"
                    className="rounded border border-border bg-background px-2 py-1"
                    value={sevFilter}
                    onChange={(e) => setSevFilter(e.target.value as Severity | "ALL")}
                  >
                    <option value="ALL">Alle Schweregrade</option>
                    <option>CRITICAL</option>
                    <option>HIGH</option>
                    <option>MEDIUM</option>
                    <option>LOW</option>
                    <option>INFO</option>
                  </select>
                  <select
                    aria-label="Bereichs-Filter"
                    className="rounded border border-border bg-background px-2 py-1"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                  >
                    <option value="ALL">Alle Bereiche</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="space-y-2">
                {filtered.slice(0, 200).map((f) => (
                  <li key={f.id} className="rounded border border-border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {sevBadge(f.severity)}
                      <code className="text-xs text-muted-foreground">{f.id}</code>
                      <span className="font-medium">{f.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {f.source === "manual" ? "manuell" : "auto"} · {f.bucket} · {f.effort}
                        {f.accepted ? " · akzeptiert" : ""}
                      </span>
                    </div>
                    {f.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                    )}
                    {f.recommendation && (
                      <p className="mt-1 text-xs">
                        <span className="text-muted-foreground">Empfehlung:</span> {f.recommendation}
                      </p>
                    )}
                    {f.evidence?.reportRef && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nachweis: <code>{f.evidence.reportRef}</code>
                      </p>
                    )}
                  </li>
                ))}
                {filtered.length > 200 && (
                  <li className="text-xs text-muted-foreground">
                    … {filtered.length - 200} weitere. Vollständige Liste in{" "}
                    <code>test-report/technical-test-report.md</code>.
                  </li>
                )}
              </ul>
            </section>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
