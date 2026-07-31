/**
 * TechnicalReportDialog — Compliance-Dashboard (Sprint A1).
 *
 * Container-Komponente: Dialog-Chrome, Filter-/Tab-State, Print-Trigger.
 * Alle Darstellungsbausteine liegen in src/components/compliance/.
 * Bericht ist zur Build-Zeit als JSON-Asset gebunden (ADR-0017), kein Runtime-Fetch.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, Printer, ShieldAlert } from "lucide-react";
import reportRaw from "../../test-report/technical-test-report.json?raw";
import { ComplianceSummary } from "./compliance/ComplianceSummary";
import { ComplianceAreaTable } from "./compliance/ComplianceAreaTable";
import { ComplianceDiff } from "./compliance/ComplianceDiff";
import { ComplianceHistory } from "./compliance/ComplianceHistory";
import { ComplianceFilters, EMPTY_FILTER, type FilterState } from "./compliance/ComplianceFilters";
import { ComplianceFindingList } from "./compliance/ComplianceFindingList";
import { ComplianceReportPrint } from "./compliance/ComplianceReportPrint";
import { parseReport, type Finding } from "./compliance/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "all" | "auto" | "manual" | "accepted";

export function TechnicalReportDialog({ open, onOpenChange }: Props) {
  const report = useMemo(() => parseReport(reportRaw), []);
  const [tab, setTab] = useState<TabKey>("all");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const options = useMemo(() => {
    if (!report) return { areas: [], categories: [], statuses: [], buckets: [], efforts: [] };
    const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort();
    return {
      areas: uniq(report.findings.map((f) => f.area)),
      categories: uniq(report.findings.map((f) => f.category)),
      statuses: uniq(report.findings.map((f) => f.status)),
      buckets: uniq(report.findings.map((f) => f.bucket)),
      efforts: uniq(report.findings.map((f) => f.effort)),
    };
  }, [report]);

  const buckets = useMemo(() => splitByTab(report?.findings ?? []), [report]);
  const activeSet = buckets[tab];

  const filtered = useMemo(() => applyFilter(activeSet, filter), [activeSet, filter]);

  // Druck (Sprint 05B): Der Bericht wird als eigenständiges Dokument in ein
  // Portal direkt an <body> gerendert. Grund: Der Dialog liegt in einem
  // Radix-Portal mit `fixed`/`overflow` und wurde von der alten
  // `:not(:has(...))`-Regel selbst ausgeblendet — der Ausdruck blieb leer.
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    if (typeof document === "undefined") return;
    setPrinting(true);
  };

  useEffect(() => {
    if (!printing || typeof window === "undefined") return;
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.body.classList.remove("printing-compliance");
      window.removeEventListener("afterprint", cleanup);
      setPrinting(false);
    };
    window.addEventListener("afterprint", cleanup);
    // Zwei Frames warten, damit das Print-Dokument vollständig im Layout ist.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.classList.add("printing-compliance");
        window.print();
        // Fallback für Browser ohne verlässliches afterprint.
        setTimeout(cleanup, 1000);
      }),
    );
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [printing]);

  // Sicherheitsnetz: falls Dialog geschlossen wird, Print-Klasse zurücksetzen.
  useEffect(() => {
    if (!open && typeof document !== "undefined") {
      document.body.classList.remove("printing-compliance");
      setPrinting(false);
    }
  }, [open]);

  return (
    <>
      {printing &&
        report &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="technical-report-print-root">
            <ComplianceReportPrint report={report} />
          </div>,
          document.body,
        )}
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[min(96vw,56rem)] max-w-4xl overflow-y-auto"
        data-compliance-print-content
      >
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" /> Compliance-Dashboard · Technischer Prüfbericht
          </DialogTitle>
          <DialogDescription>
            Konsolidierte Sicht auf alle Testbereiche zum aktuellen Buildstand (ADR-0017).
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="rounded border border-warning/40 bg-warning/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="size-4" /> Kein Bericht verfügbar
            </div>
            <p className="mt-2 text-muted-foreground">
              <code>bun run report:technical</code> ausführen, um{" "}
              <code>test-report/technical-test-report.json</code> zu erzeugen und das Dashboard neu
              zu bauen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Identität — als kompakte Meta-Zeile über der Summary */}
            <section className="no-print grid grid-cols-1 gap-1 rounded border border-border bg-secondary/20 p-2 text-xs sm:grid-cols-4">
              <Meta k="Version" v={report.identity.dashboardVersion} mono />
              <Meta k="Commit" v={report.identity.commit} mono />
              <Meta k="Testzeit" v={report.identity.testTime} />
              <Meta
                k="Umgebung"
                v={`Node ${report.identity.environment.node} · ${report.identity.environment.platform}${
                  report.identity.environment.ci ? " · CI" : ""
                }`}
              />
            </section>

            <ComplianceSummary report={report} />

            <ComplianceAreaTable areas={report.areas} />

            <ComplianceHistory current={report} />
            {report.diff && <ComplianceDiff diff={report.diff} />}

            {/* Findings-Bereich */}
            <section className="space-y-2">
              <div className="no-print flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Findings</h3>
                <div className="text-xs text-muted-foreground">
                  {filtered.length} von {activeSet.length} angezeigt
                </div>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="no-print">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="all">Alle ({buckets.all.length})</TabsTrigger>
                  <TabsTrigger value="auto">Technisch ({buckets.auto.length})</TabsTrigger>
                  <TabsTrigger value="manual">
                    Organisatorisch ({buckets.manual.length})
                  </TabsTrigger>
                  <TabsTrigger value="accepted">Akzeptiert ({buckets.accepted.length})</TabsTrigger>
                </TabsList>
                <TabsContent value={tab} className="mt-3" />
              </Tabs>

              <ComplianceFilters value={filter} onChange={setFilter} options={options} />

              <ComplianceFindingList findings={filtered} expanded={expanded} onToggle={toggle} />
            </section>
          </div>
        )}

        <div className="no-print mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!report}>
            <Printer className="mr-1.5 size-4" /> Drucken / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}: </span>
      <span className={`truncate ${mono ? "font-mono text-[11px]" : ""}`}>{v}</span>
    </div>
  );
}

function splitByTab(findings: Finding[]): Record<TabKey, Finding[]> {
  return {
    all: findings.filter((f) => !f.accepted),
    auto: findings.filter((f) => !f.accepted && f.source === "auto"),
    manual: findings.filter((f) => !f.accepted && f.source === "manual"),
    accepted: findings.filter((f) => f.accepted),
  };
}

function applyFilter(findings: Finding[], f: FilterState): Finding[] {
  const q = f.query.trim().toLowerCase();
  return findings.filter((x) => {
    if (f.severity !== "ALL" && x.severity !== f.severity) return false;
    if (f.area !== "ALL" && x.area !== f.area) return false;
    if (f.category !== "ALL" && x.category !== f.category) return false;
    if (f.status !== "ALL" && x.status !== f.status) return false;
    if (f.bucket !== "ALL" && x.bucket !== f.bucket) return false;
    if (f.effort !== "ALL" && x.effort !== f.effort) return false;
    if (q) {
      const hay = [
        x.title,
        x.id,
        x.description ?? "",
        x.recommendation ?? "",
        (x.components ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
