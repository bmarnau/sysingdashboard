import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import {
  REC_LABEL,
  STATUS_LABEL,
  SEVERITY_ORDER,
  severityClasses,
  statusToneClass,
  type Report,
  type Severity,
} from "./types";

function statusIcon(status: string) {
  if (status === "passed") return <CheckCircle2 className="size-4 text-success" />;
  if (status === "failed" || status === "blocked") return <XCircle className="size-4 text-destructive" />;
  if (status === "not-run") return <ShieldAlert className="size-4 text-muted-foreground" />;
  return <AlertTriangle className="size-4 text-warning" />;
}

interface Props {
  report: Report;
}

/**
 * Management-Ansicht: Statusband, Severity-Kacheln und Quellen-Statusleiste.
 * Reine Darstellung, keine Fachlogik.
 */
export function ComplianceSummary({ report }: Props) {
  const sevCounts: Record<Severity, number> = {
    CRITICAL: report.summary.critical,
    HIGH: report.summary.high,
    MEDIUM: report.summary.medium,
    LOW: report.summary.low,
    INFO: Math.max(
      0,
      (report.summary.openTotal ?? report.summary.total) -
        report.summary.critical -
        report.summary.high -
        report.summary.medium -
        report.summary.low,
    ),
  };
  const openTotal = report.summary.openTotal ?? report.summary.total;

  return (
    <section className="card-print space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Statusband */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 shrink-0">{statusIcon(report.status)}</div>
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Gesamtstatus</div>
            <div className="truncate text-lg font-semibold">
              {STATUS_LABEL[report.status] ?? report.status}
            </div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Empfehlung: </span>
              <span className="font-medium">
                {REC_LABEL[report.recommendation.level] ?? report.recommendation.level}
              </span>
              <span className="text-muted-foreground"> — {report.recommendation.reason}</span>
            </div>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:grid-cols-1">
          <Stat label="Offen" value={openTotal} />
          <Stat label="Gesamt" value={report.summary.total} />
          <Stat label="Akzeptiert" value={report.summary.accepted} />
          <Stat label="Version" value={report.identity.dashboardVersion} mono />
        </div>
      </div>

      {/* Severity-Kacheln */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {SEVERITY_ORDER.filter((s) => s !== "INFO").map((sev) => {
          const cls = severityClasses(sev);
          const count = sevCounts[sev];
          return (
            <div
              key={sev}
              className={`card-print rounded-md border p-3 ${cls.tile}`}
              aria-label={`${cls.label}: ${count}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide">{cls.label}</span>
                <span className={`size-2 rounded-full ${cls.dot}`} aria-hidden />
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{count}</div>
              <div className="text-xs text-muted-foreground">{sev}</div>
            </div>
          );
        })}
      </div>

      {/* Quellen-Chips */}
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quellen
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(report.summary.sources).map(([key, val]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs"
              title={`${STATUS_LABEL[val.status] ?? val.status} · ${val.count} Findings`}
            >
              <span className={`inline-flex ${statusToneClass(val.status)}`}>{statusIcon(val.status)}</span>
              <span className="font-medium">{key}</span>
              <span className="text-muted-foreground">{val.count}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded border border-border bg-secondary/30 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${mono ? "font-mono" : "tabular-nums"}`}>{value}</div>
    </div>
  );
}
