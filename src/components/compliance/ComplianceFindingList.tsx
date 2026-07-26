import { ChevronRight, Copy } from "lucide-react";
import { severityClasses, type Finding, STATUS_LABEL } from "./types";

interface Props {
  findings: Finding[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  limit?: number;
}

/**
 * Findings-Liste mit klappbarer Detailansicht pro Row.
 */
export function ComplianceFindingList({ findings, expanded, onToggle, limit = 300 }: Props) {
  if (findings.length === 0) {
    return (
      <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Keine Findings passen zu den aktuellen Filtern.
      </p>
    );
  }

  const visible = findings.slice(0, limit);
  const rest = findings.length - visible.length;

  return (
    <ul className="space-y-2">
      {visible.map((f) => {
        const isOpen = expanded.has(f.id);
        const cls = severityClasses(f.severity);
        return (
          <li key={f.id} className="card-print rounded border border-border text-sm">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => onToggle(f.id)}
              className="w-full rounded p-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <ChevronRight
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls.badge}`}>
                      {f.severity}
                    </span>
                    <code className="truncate text-xs text-muted-foreground">{f.id}</code>
                  </div>
                  <div className="mt-0.5 truncate font-medium">{f.title}</div>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {f.source === "manual" ? "manuell" : "auto"} · {f.bucket} · {f.effort}
                  {f.accepted ? " · akzeptiert" : ""}
                </span>
              </div>
            </button>

            {isOpen && <FindingDetail finding={f} />}
          </li>
        );
      })}
      {rest > 0 && (
        <li className="text-xs text-muted-foreground">
          … {rest} weitere Findings. Vollständige Liste in{" "}
          <code>test-report/technical-test-report.md</code>.
        </li>
      )}
    </ul>
  );
}

function FindingDetail({ finding: f }: { finding: Finding }) {
  const copy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="border-t border-border p-3 text-xs">
      {f.description && (
        <p className="whitespace-pre-line">
          <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Beschreibung
          </span>
          {f.description}
        </p>
      )}
      {f.recommendation && (
        <p className="mt-2 whitespace-pre-line">
          <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Handlungsempfehlung
          </span>
          {f.recommendation}
        </p>
      )}

      {f.components && f.components.length > 0 && (
        <div className="mt-2">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Komponenten
          </span>
          <div className="flex flex-wrap gap-1">
            {f.components.map((c) => (
              <span key={c} className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px]">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {(f.evidence?.file || f.evidence?.reportRef) && (
        <div className="mt-2">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Nachweise
          </span>
          <ul className="space-y-1">
            {f.evidence?.file && (
              <li className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5">
                  {f.evidence.file}
                </code>
                <button
                  type="button"
                  onClick={() => copy(f.evidence!.file!)}
                  className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 hover:bg-accent"
                  aria-label="Dateipfad kopieren"
                >
                  <Copy className="size-3" />
                </button>
              </li>
            )}
            {f.evidence?.reportRef && (
              <li className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5">
                  {f.evidence.reportRef}
                </code>
                <button
                  type="button"
                  onClick={() => copy(f.evidence!.reportRef!)}
                  className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 hover:bg-accent"
                  aria-label="Report-Referenz kopieren"
                >
                  <Copy className="size-3" />
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
        <MetaRow k="Bereich" v={f.area} />
        <MetaRow k="Kategorie" v={f.category} />
        <MetaRow k="Bucket" v={f.bucket} />
        <MetaRow k="Aufwand" v={f.effort} />
        <MetaRow k="Quelle" v={f.source === "manual" ? "manuell" : "automatisch"} />
        <MetaRow k="Status" v={STATUS_LABEL[f.status] ?? f.status} />
        <MetaRow k="Akzeptiert" v={f.accepted ? "ja" : "nein"} />
        <MetaRow k="ID" v={f.id} mono />
      </dl>
    </div>
  );
}

function MetaRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className={`truncate ${mono ? "font-mono text-[11px]" : ""}`}>{v}</dd>
    </div>
  );
}
