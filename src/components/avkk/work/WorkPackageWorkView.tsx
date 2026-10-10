import { useMemo, useState } from "react";
import { useWorkPackageWorkView } from "@/hooks/useWorkPackageWorkView";
import { selectWorkPackageWorkView } from "@/lib/avkk/work-package-work-view";
import type { WorkPackageWorkViewSelection } from "@/lib/avkk/work-package-work-view.types";
import { WorkPackageWorkViewControls } from "./WorkPackageWorkViewControls";
import { WorkPackageWorkViewGroups } from "./WorkPackageWorkViewGroups";
import { workDateLabel } from "./work-view-presentation";

export function WorkPackageWorkView() {
  const { rows, loading, error, refresh } = useWorkPackageWorkView();
  const [selection, setSelection] = useState<WorkPackageWorkViewSelection>({
    groupBy: "customer",
    sortBy: "due",
    sortDirection: "asc",
    filters: {},
  });
  const groups = useMemo(() => selectWorkPackageWorkView(rows, selection), [rows, selection]);
  const visibleCount = groups.reduce((total, group) => total + group.rows.length, 0);

  return (
    <section aria-labelledby="work-package-work-view-heading" className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 id="work-package-work-view-heading" className="text-2xl font-semibold">
            Arbeitspaket-Arbeitssicht
          </h1>
          <p className="text-sm text-muted-foreground">
            Freigegebene Arbeitspakete nach Kunde, Verantwortlichem oder Fälligkeit.
          </p>
          {rows[0] && !loading && !error ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Datenstand: {workDateLabel(rows[0].asOfDate)} (Europe/Berlin)
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Arbeitspakete aktualisieren"
          disabled={loading}
          onClick={refresh}
          className="rounded-md border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Aktualisieren
        </button>
      </header>
      <WorkPackageWorkViewControls
        rows={rows}
        selection={selection}
        onChange={setSelection}
        disabled={loading || !!error}
      />
      {loading ? (
        <p role="status">Arbeitspakete werden geladen …</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {visibleCount} von {rows.length} Arbeitspaketen
          </p>
          {rows.length === 0 ? (
            <p>Keine Arbeitspakete im freigegebenen Bereich.</p>
          ) : groups.length === 0 ? (
            <p>Keine Arbeitspakete entsprechen den Filtern.</p>
          ) : (
            <WorkPackageWorkViewGroups groups={groups} groupBy={selection.groupBy} />
          )}
        </>
      )}
    </section>
  );
}
