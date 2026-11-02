import type {
  CockpitDataState,
  CockpitReasonCode,
  CockpitResult,
  DrilldownTarget,
} from "@/lib/management-cockpit/types";

export type ManagementCockpitViewState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; result: CockpitResult };

const STATE_LABELS: Record<CockpitDataState, string> = {
  AVAILABLE: "Verfügbar",
  EMPTY: "Leer",
  PARTIAL: "Teilweise",
  UNKNOWN: "Unbekannt",
  UNAVAILABLE: "Nicht verfügbar",
  DENIED: "Nicht berechtigt",
};
const REASON_LABELS: Record<CockpitReasonCode, string> = {
  WP_OVERDUE: "Überfällige offene Arbeitspakete",
  WP_UNASSIGNED: "Ohne Verantwortlichen",
  AVKK_HIGH_OR_CRITICAL: "Hohe oder kritische AVKK-Folge",
  CONTROLLING_GAP: "Controlling-Lücke",
  DATA_STALE: "Veröffentlichungsstand prüfen",
};
const TARGETS: Record<DrilldownTarget, string> = {
  WORK_VIEW: "/verantwortungen?tab=workpackages",
  AVKK_MANAGEMENT: "/dashboard?tab=avkk-management",
  PROJECT_CONTROLLING: "/projektcontrolling",
};
const USABLE = new Set<CockpitDataState>(["AVAILABLE", "EMPTY", "PARTIAL"]);

function StateLabel({ state }: { state: CockpitDataState }) {
  return (
    <span className="inline-block rounded border border-border bg-secondary/40 px-2 py-0.5 text-xs font-medium">
      {STATE_LABELS[state]}
    </span>
  );
}

function valueLabel(value: number | null | undefined, state: CockpitDataState): string {
  return USABLE.has(state) && value != null ? String(value) : "Nicht ermittelbar";
}

/** Reine Darstellung des Serverergebnisses; keine lokale Datenquelle oder neue KPI-Ableitung. */
export function ManagementCockpitView({ state }: { state: ManagementCockpitViewState }) {
  if (state.kind === "loading") return <p role="status">Managementcockpit wird geladen …</p>;
  if (state.kind === "unavailable") return <p role="alert">Nicht verfügbar</p>;

  const { result } = state;
  if (result.dataState === "DENIED") return <p role="alert">Nicht berechtigt</p>;
  const usable = USABLE.has(result.dataState);

  return (
    <div className="min-w-0 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Managementcockpit</h1>
        <p className="text-sm text-muted-foreground">
          Handlungsbedarf im freigegebenen Kundenbereich. Schreibgeschützte Übersicht.
        </p>
        <p className="text-sm">Stichtag: {result.asOfDate} (Europe/Berlin)</p>
        <div className="flex flex-wrap items-center gap-2">
          <span>Gesamtzustand:</span> <StateLabel state={result.dataState} />
        </div>
      </header>

      <section aria-labelledby="cockpit-attention" className="space-y-4">
        <h2 id="cockpit-attention" className="text-xl font-semibold">
          Handlungsbedarf
        </h2>
        {!usable ? (
          <p>Der Handlungsbedarf ist derzeit nicht ermittelbar.</p>
        ) : result.items.length === 0 ? (
          <p>
            {result.dataState === "PARTIAL"
              ? "Keine Aufmerksamkeitsgründe in den verfügbaren Quellen. Die Sicht ist unvollständig."
              : "Keine Aufmerksamkeitsgründe in den verfügbaren Quellen."}
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {result.items
              .filter((item) => item.dataState !== "DENIED")
              .map((item) => (
                <li
                  key={item.key}
                  className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold">
                      {item.customerName === item.customerId
                        ? "Autorisierter Kunde"
                        : item.customerName}
                      {item.projectName
                        ? ` · ${item.projectName === item.projectKey ? "Projekt" : item.projectName}`
                        : ""}
                    </h3>
                    <StateLabel state={item.dataState} />
                  </div>
                  <ul className="space-y-3">
                    {item.reasons
                      .filter((reason) => reason.dataState !== "DENIED")
                      .map((reason) => (
                        <li key={reason.code} className="flex flex-wrap items-center gap-2 text-sm">
                          <a
                            href={TARGETS[reason.drilldown.target]}
                            className="min-w-0 break-words rounded underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {REASON_LABELS[reason.code]}
                          </a>
                          <span>
                            {valueLabel(reason.count, reason.dataState)}
                            {reason.code === "DATA_STALE" &&
                            reason.count !== null &&
                            USABLE.has(reason.dataState)
                              ? " Tage"
                              : ""}
                          </span>
                          <StateLabel state={reason.dataState} />
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Die Links öffnen die bestehende Fachansicht in deren freigegebenem Bereich.
        </p>
      </section>

      <section
        aria-labelledby="cockpit-metrics"
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h2 id="cockpit-metrics" className="text-xl font-semibold">
          Kennzahlen
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt>Einträge mit Handlungsbedarf</dt>
            <dd className="font-semibold">
              {valueLabel(result.counters.attentionItems, result.dataState)}
            </dd>
          </div>
          <div>
            <dt>Datenzustand der Kennzahlen</dt>
            <dd>
              <StateLabel state={result.dataState} />
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="cockpit-sources" className="space-y-3">
        <h2 id="cockpit-sources" className="text-lg font-semibold">
          Datenquellen
        </h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["controlling", "Projektcontrolling"],
              ["workPackages", "Arbeitssicht"],
              ["avkk", "AVKK Management"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <dt>{label}</dt>
              <dd>
                <StateLabel state={result.sources[key]} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
