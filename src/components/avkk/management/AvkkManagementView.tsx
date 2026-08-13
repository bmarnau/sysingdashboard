/**
 * AVKK-Management — rollenbasierte Führungssicht (Sprint 09).
 *
 * Ziel ist Handlungsbedarf, nicht Personenbewertung: alle Kennzahlen sind
 * anklickbar und filtern dieselbe Zeilenmenge, jede Kategorie nennt ihre Regel.
 * Fachlogik liegt vollständig in `@/lib/avkk/management`.
 */
import { useCallback, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useCurrentUser, useUsers } from "@/hooks/useCurrentUser";
import { usePermission } from "@/hooks/usePermission";
import { ranksOf, useReferenceData } from "@/hooks/useReferenceData";
import { useAvkkManagement } from "@/hooks/useAvkkManagement";
import { CATALOG_KEYS } from "@/lib/reference-data";
import {
  ACTION_LABELS,
  PRIORITY_RULE,
  aggregateCompetenceGaps,
  aggregateConsequences,
  aggregateResponsibility,
  buildActionGroups,
  buildManagementSnapshot,
  buildManagementSummary,
  filterManagementRows,
  prioritize,
  riskDistribution,
  severityDistribution,
  type ActionCategory,
  type ManagementFilter,
} from "@/lib/avkk/management";
import type { AvkkRow, AvkkTask } from "@/lib/avkk/workspace";
import { AvkkDetailDialog } from "../AvkkDetailDialog";
import { AvkkUnderstandPanel } from "./AvkkUnderstandPanel";
import { ManagementKpiGrid } from "./ManagementKpiGrid";
import { ActionNeedPanel } from "./ActionNeedPanel";
import { ManagementFilters } from "./ManagementFilters";
import { ManagementTable } from "./ManagementTable";
import { CompetenceGapPanel } from "./CompetenceGapPanel";
import { ConsequencePanel } from "./ConsequencePanel";
import { ResponsibilityPanel } from "./ResponsibilityPanel";
import { DistributionPanel } from "./DistributionPanel";
import { ContextIndicatorsPlaceholder } from "./ContextIndicatorsPlaceholder";

const CATALOG_LIST = Object.values(CATALOG_KEYS);
const EMPTY_FILTER: ManagementFilter = {};

/** Kennzahl → Filterwirkung (dokumentiert, kein verborgener Zustand). */
const KPI_FILTER: Record<string, Partial<ManagementFilter>> = {
  open: { completeness: "unvollstaendig" },
  atRisk: { risk: "gefaehrdet" },
  overdue: { due: "ueberfaellig" },
  competenceGap: { competenceStatus: "missing" },
  incomplete: { completeness: "unvollstaendig" },
};

export function AvkkManagementView({
  tasks,
  onOpenManual,
}: {
  tasks: readonly AvkkTask[];
  onOpenManual: () => void;
}) {
  const user = useCurrentUser();
  const { users } = useUsers();
  const canEdit = usePermission("avkk.edit");
  const canAssign = usePermission("avkk.responsibility.assign");

  const catalogs = useReferenceData(CATALOG_LIST);
  const dimensionKeys = useMemo(
    () =>
      (catalogs.values[CATALOG_KEYS.competenceDimension] ?? [])
        .filter((v) => v.isActive)
        .map((v) => v.key),
    [catalogs.values],
  );
  const severityRanks = useMemo(
    () => ranksOf(catalogs.values[CATALOG_KEYS.consequenceSeverity]),
    [catalogs.values],
  );

  const management = useAvkkManagement({
    tasks,
    dimensionKeys,
    severityRanks,
    personId: user?.id ?? null,
    enabled: !catalogs.loading,
  });

  const [filter, setFilter] = useState<ManagementFilter>(EMPTY_FILTER);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionCategory | null>(null);
  const [selected, setSelected] = useState<AvkkRow | null>(null);

  const patch = useCallback((p: Partial<ManagementFilter>) => {
    setFilter((f) => ({ ...f, ...p }));
  }, []);

  const reset = useCallback(() => {
    setFilter(EMPTY_FILTER);
    setActiveKpi(null);
    setActiveAction(null);
  }, []);

  // Basis: Filterleiste. Alle Panels rechnen auf genau dieser Menge.
  const baseRows = useMemo(
    () => filterManagementRows(management.rows, { ...filter, keys: null }),
    [management.rows, filter],
  );

  const summary = useMemo(() => buildManagementSummary(baseRows), [baseRows]);
  const actionGroups = useMemo(() => buildActionGroups(baseRows), [baseRows]);
  const competenceGaps = useMemo(() => aggregateCompetenceGaps(baseRows), [baseRows]);
  const consequences = useMemo(() => aggregateConsequences(baseRows), [baseRows]);
  const responsibility = useMemo(() => aggregateResponsibility(baseRows), [baseRows]);

  // Drill-down: Kennzahl oder Handlungskategorie schränkt die Tabelle ein.
  const drillKeys = useMemo(() => {
    if (activeAction) {
      return actionGroups.find((g) => g.category === activeAction)?.keys ?? [];
    }
    return filter.keys ?? null;
  }, [activeAction, actionGroups, filter.keys]);

  const tableRows = useMemo(
    () => prioritize(filterManagementRows(baseRows, { keys: drillKeys })),
    [baseRows, drillKeys],
  );

  const contexts = useMemo(
    () => [...new Set(management.rows.map((r) => r.task.context).filter(Boolean))].sort(),
    [management.rows],
  );
  const responsibilityTypes = useMemo(
    () => responsibility.types.map((t) => ({ key: t.key, label: t.label })),
    [responsibility.types],
  );

  const selectKpi = (id: string) => {
    setActiveAction(null);
    if (activeKpi === id) {
      setActiveKpi(null);
      setFilter((f) => ({ ...f, ...EMPTY_FILTER, query: f.query, keys: null }));
      return;
    }
    setActiveKpi(id);
    if (id === "critical" || id === "highConsequence") {
      patch({ keys: null });
      setActiveAction(id === "critical" ? "kritisch" : "konsequenz-projekt");
      return;
    }
    if (id === "withoutResponsibility") {
      setActiveAction("verantwortung-fehlt");
      return;
    }
    patch({ ...KPI_FILTER[id], keys: null });
  };

  const exportSnapshot = () => {
    const snapshot = buildManagementSnapshot(baseRows, {
      generatedAt: new Date().toISOString(),
      filter,
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avkk-management-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="avkk-management-heading" className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="avkk-management-heading" className="truncate text-lg font-semibold">
            AVKK Management
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Führungssicht auf Aufgaben, Verantwortung, Voraussetzungen und Konsequenzen.{" "}
            {PRIORITY_RULE}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={exportSnapshot}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
          >
            <Download className="size-4" aria-hidden="true" />
            Bericht (JSON)
          </button>
          <button
            type="button"
            onClick={() => {
              catalogs.reload();
              management.reload();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Aktualisieren
          </button>
        </div>
      </header>

      {catalogs.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          Kataloge konnten nicht geladen werden: {catalogs.error}
        </p>
      ) : null}
      {management.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          AVKK-Daten konnten nicht geladen werden: {management.error}
        </p>
      ) : null}

      <ManagementKpiGrid summary={summary} activeId={activeKpi} onSelect={selectKpi} />

      <ManagementFilters
        filter={filter}
        contexts={contexts}
        responsibilityTypes={responsibilityTypes}
        onChange={(p) => {
          setActiveKpi(null);
          setActiveAction(null);
          patch(p);
        }}
        onReset={reset}
      />

      <ActionNeedPanel
        groups={actionGroups}
        activeCategory={activeAction}
        onSelect={(c) => {
          setActiveKpi(null);
          setActiveAction((current) => (current === c ? null : c));
        }}
      />

      <section aria-labelledby="avkk-table-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="avkk-table-heading" className="text-sm font-semibold">
            Aufgabenübersicht
            <span className="ml-2 font-normal text-muted-foreground">
              {tableRows.length} von {management.rows.length}
            </span>
          </h3>
          {activeAction ? (
            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs">
              Auswahl: {ACTION_LABELS[activeAction]}
            </span>
          ) : null}
        </div>
        {catalogs.loading || management.loading ? (
          <p className="text-sm text-muted-foreground">Führungsdaten werden geladen …</p>
        ) : (
          <ManagementTable rows={tableRows} onOpen={setSelected} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DistributionPanel title="Gefährdungsverteilung" data={riskDistribution(baseRows)} />
        <DistributionPanel title="Konsequenzen nach Schweregrad" data={severityDistribution(baseRows)} />
      </div>

      <ResponsibilityPanel
        overview={responsibility}
        onSelectUnassigned={() => {
          setActiveKpi("withoutResponsibility");
          setActiveAction("verantwortung-fehlt");
        }}
      />

      <CompetenceGapPanel
        gaps={competenceGaps}
        activeDimension={null}
        onSelect={(dimensionKey) => {
          const gap = competenceGaps.find((g) => g.dimensionKey === dimensionKey);
          setActiveAction(null);
          setActiveKpi(null);
          patch({ keys: gap?.keys ?? [] });
        }}
      />

      <ConsequencePanel
        groups={consequences}
        activeArea={null}
        onSelect={(areaKey) => {
          const group = consequences.find((g) => g.areaKey === areaKey);
          setActiveAction(null);
          setActiveKpi(null);
          patch({ keys: group?.keys ?? [] });
        }}
      />

      <AvkkUnderstandPanel onOpenManual={onOpenManual} />
      <ContextIndicatorsPlaceholder onOpenManual={onOpenManual} />

      {selected ? (
        <AvkkDetailDialog
          row={selected}
          catalogs={catalogs.values}
          people={users}
          actorId={user?.id ?? null}
          canEdit={canEdit}
          canAssign={canAssign}
          onClose={() => setSelected(null)}
          onSaved={management.reload}
          onOpenManual={onOpenManual}
        />
      ) : null}
    </section>
  );
}
