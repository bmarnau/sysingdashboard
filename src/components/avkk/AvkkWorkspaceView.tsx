/**
 * „Mein AVKK" — persönlicher Arbeitsplatz (Sprint 08).
 *
 * Verbindet den lokalen Aufgabenbestand mit dem serverseitigen AVKK-Stand.
 * Datenzugriff ausschließlich über die Hooks; keine Fachwerte im Markup.
 */
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCurrentUser, useUsers } from "@/hooks/useCurrentUser";
import { usePermission } from "@/hooks/usePermission";
import { ranksOf, useReferenceData } from "@/hooks/useReferenceData";
import { useAvkkWorkspace } from "@/hooks/useAvkkWorkspace";
import { CATALOG_KEYS } from "@/lib/reference-data";
import {
  AVKK_FILTERS,
  AVKK_FILTER_LABELS,
  filterRows,
  sortRows,
  summarize,
  type AvkkFilter,
  type AvkkRow,
  type AvkkSort,
  type AvkkTask,
} from "@/lib/avkk/workspace";
import { inputCls } from "@/components/dashboard/constants";
import { AVKK_EXPLANATIONS, AvkkMethodLink } from "./AvkkExplainer";
import { AvkkDetailDialog } from "./AvkkDetailDialog";
import { AvkkTaskTable } from "./AvkkTaskTable";

const CATALOG_LIST = Object.values(CATALOG_KEYS);
/** Ab diesem Rang gilt ein Konsequenz-Schweregrad als kritisch (Katalog: `rank`). */
const CRITICAL_SEVERITY_RANK = 3;

export function AvkkWorkspaceView({
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

  const workspace = useAvkkWorkspace({
    tasks,
    dimensionKeys,
    severityRanks,
    criticalRank: CRITICAL_SEVERITY_RANK,
    personId: user?.id ?? null,
    enabled: !catalogs.loading,
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AvkkFilter>("alle");
  const [sort, setSort] = useState<AvkkSort>("risiko");
  const [selected, setSelected] = useState<AvkkRow | null>(null);

  const visible = useMemo(
    () => sortRows(filterRows(workspace.rows, { query, filter }), sort),
    [workspace.rows, query, filter, sort],
  );
  const summary = useMemo(() => summarize(workspace.rows), [workspace.rows]);

  return (
    <section aria-labelledby="avkk-heading" className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="avkk-heading" className="truncate text-lg font-semibold">
            Mein AVKK
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {AVKK_EXPLANATIONS.aufgabe.split(":")[1]?.trim()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <AvkkMethodLink onOpen={onOpenManual} />
          <button
            type="button"
            onClick={() => {
              catalogs.reload();
              workspace.reload();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 text-sm hover:bg-secondary"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Aktualisieren
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Aufgaben", summary.total],
          ["Mit AVKK-Stand", summary.withDossier],
          ["Gefährdet", summary.atRisk],
          ["Vollständig", summary.complete],
          ["Überfällig", summary.overdue],
          ["Eigene Verantwortung", summary.own],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border bg-secondary/30 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {catalogs.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          Kataloge konnten nicht geladen werden: {catalogs.error}
        </p>
      ) : null}
      {catalogs.stale && catalogs.fetchedAt ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          Katalogstand vom {new Date(catalogs.fetchedAt).toLocaleString("de-DE")} (aus dem lokalen
          Zwischenspeicher).
        </p>
      ) : null}
      {workspace.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          AVKK-Daten konnten nicht geladen werden: {workspace.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="text-xs font-medium">
          <span className="sr-only">AVKK-Aufgaben durchsuchen</span>
          <input
            type="search"
            className={inputCls}
            placeholder="Aufgabe, Kennung oder Bezug suchen"
            aria-label="AVKK-Aufgaben durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium">
          <span className="sr-only">Sortierung</span>
          <select
            className={inputCls}
            aria-label="Sortierung"
            value={sort}
            onChange={(e) => setSort(e.target.value as AvkkSort)}
          >
            <option value="risiko">Sortierung: Gefährdung</option>
            <option value="termin">Sortierung: Termin</option>
            <option value="titel">Sortierung: Titel</option>
          </select>
        </label>
      </div>

      <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
        {AVKK_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs transition ${
              filter === f
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {AVKK_FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {catalogs.loading || workspace.loading ? (
        <p className="text-sm text-muted-foreground">AVKK-Daten werden geladen …</p>
      ) : (
        <AvkkTaskTable rows={visible} onOpen={setSelected} />
      )}

      {selected ? (
        <AvkkDetailDialog
          row={selected}
          catalogs={catalogs.values}
          people={users}
          actorId={user?.id ?? null}
          canEdit={canEdit}
          canAssign={canAssign}
          onClose={() => setSelected(null)}
          onSaved={workspace.reload}
          onOpenManual={onOpenManual}
        />
      ) : null}
    </section>
  );
}
