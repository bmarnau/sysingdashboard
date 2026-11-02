/**
 * L2 / P1 — ManagementCockpitService: reine Komposition (kein React, kein Supabase, keine Uhr).
 *
 * Der Composer konsumiert nur bereits autorisierte Ergebnisse der vorhandenen Read-Modelle
 * (Projektcontrolling, Arbeitssicht, AVKK-Management). Er bildet keine zweite Rechte- oder
 * KPI-Logik. Zur Tiefenverteidigung filtert er zusätzlich auf den autorisierten Kundenkreis.
 */
import type {
  AttentionItem,
  CockpitCounters,
  CockpitDataState,
  CockpitInput,
  CockpitReason,
  CockpitReasonCode,
  CockpitResult,
  CockpitSourceKey,
  SourceResult,
} from "./types";

const DEFAULT_STALE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;
const REASON_ORDER: readonly CockpitReasonCode[] = [
  "WP_OVERDUE",
  "WP_UNASSIGNED",
  "AVKK_HIGH_OR_CRITICAL",
  "CONTROLLING_GAP",
  "DATA_STALE",
];
const USABLE: ReadonlySet<CockpitDataState> = new Set(["AVAILABLE", "EMPTY", "PARTIAL"]);

interface Builder {
  key: string;
  systemhouseId: string;
  customerId: string;
  customerName: string | null;
  projectKey: string | null;
  projectName: string | null;
  reasons: Map<CockpitReasonCode, CockpitReason>;
}

function parseDay(day: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!match) throw new Error(`Cockpit: ungültiges Datum "${day}".`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Einziger Schlüsselbau für den Kundenkreis (`systemhouseId:customerId`); Server und Composer nutzen ihn gemeinsam. */
export function cockpitScopeKey(systemhouseId: string, customerId: string): string {
  return `${systemhouseId}:${customerId}`;
}

function sourceState<T>(
  capability: boolean,
  source: SourceResult<T>,
): { state: CockpitDataState; value: T | null } {
  if (!capability) return { state: "DENIED", value: null };
  if (USABLE.has(source.state) && "value" in source) {
    return { state: source.state, value: source.value };
  }
  return { state: source.state, value: null };
}

function overallState(states: readonly CockpitDataState[]): CockpitDataState {
  const usable = states.filter((s) => USABLE.has(s));
  if (usable.length === 0) {
    if (states.every((s) => s === "DENIED")) return "DENIED";
    if (states.includes("UNAVAILABLE")) return "UNAVAILABLE";
    return "UNKNOWN";
  }
  if (usable.length < states.length || usable.includes("PARTIAL")) return "PARTIAL";
  return usable.every((s) => s === "EMPTY") ? "EMPTY" : "AVAILABLE";
}

/** Zustand eines vorhandenen Befunds: PARTIAL bleibt sichtbar, alles andere gilt als AVAILABLE. */
function reasonState(state: CockpitDataState): CockpitDataState {
  return state === "PARTIAL" ? "PARTIAL" : "AVAILABLE";
}

export function composeManagementCockpit(input: CockpitInput): CockpitResult {
  const asOf = parseDay(input.asOfDate);
  const staleAfterDays = input.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const authorized = input.authorizedCustomers;

  const controlling = sourceState(input.capabilities.controlling, input.controlling);
  const workPackages = sourceState(input.capabilities.workView, input.workPackages);
  const avkk = sourceState(input.capabilities.avkkManagement, input.avkk);
  const sources: Record<CockpitSourceKey, CockpitDataState> = {
    controlling: controlling.state,
    workPackages: workPackages.state,
    avkk: avkk.state,
  };

  const builders = new Map<string, Builder>();
  function builder(
    systemhouseId: string,
    customerId: string,
    projectKey: string | null,
  ): Builder | null {
    if (!authorized.has(cockpitScopeKey(systemhouseId, customerId))) return null;
    const key = projectKey
      ? `${cockpitScopeKey(systemhouseId, customerId)}:${projectKey}`
      : cockpitScopeKey(systemhouseId, customerId);
    let entry = builders.get(key);
    if (!entry) {
      entry = {
        key,
        systemhouseId,
        customerId,
        customerName: null,
        projectKey,
        projectName: null,
        reasons: new Map(),
      };
      builders.set(key, entry);
    }
    return entry;
  }
  function addReason(
    entry: Builder,
    code: CockpitReasonCode,
    count: number,
    state: CockpitDataState,
    target: CockpitReason["drilldown"]["target"],
  ): void {
    entry.reasons.set(code, {
      code,
      count,
      dataState: reasonState(state),
      drilldown: {
        target,
        systemhouseId: entry.systemhouseId,
        customerId: entry.customerId,
        projectKey: entry.projectKey,
      },
    });
  }

  // Arbeitssicht: überfällig (ohne DONE) und ohne Verantwortliche (ohne DONE), je Kunde.
  if (workPackages.value) {
    const perCustomer = new Map<string, { overdue: number; unassigned: number }>();
    for (const row of workPackages.value) {
      if (!authorized.has(cockpitScopeKey(row.systemhouseId, row.customerId))) continue;
      const entry = builder(row.systemhouseId, row.customerId, null);
      if (!entry) continue;
      entry.customerName ??= row.customerName;
      if (row.dueGroup === "DONE") continue;
      const counts = perCustomer.get(entry.key) ?? { overdue: 0, unassigned: 0 };
      if (row.dueGroup === "OVERDUE") counts.overdue += 1;
      if (row.owner === "UNASSIGNED") counts.unassigned += 1;
      perCustomer.set(entry.key, counts);
    }
    for (const [key, counts] of perCustomer) {
      const entry = builders.get(key)!;
      if (counts.overdue > 0)
        addReason(entry, "WP_OVERDUE", counts.overdue, workPackages.state, "WORK_VIEW");
      if (counts.unassigned > 0)
        addReason(entry, "WP_UNASSIGNED", counts.unassigned, workPackages.state, "WORK_VIEW");
    }
  }

  // AVKK-Management: Befunde hoch oder kritisch, je Kunde.
  if (avkk.value) {
    for (const signal of avkk.value) {
      if (signal.highOrCritical <= 0) continue;
      const entry = builder(signal.systemhouseId, signal.customerId, null);
      if (!entry) continue;
      addReason(
        entry,
        "AVKK_HIGH_OR_CRITICAL",
        signal.highOrCritical,
        avkk.state,
        "AVKK_MANAGEMENT",
      );
    }
  }

  // Projektcontrolling: Lücken und veralteter Veröffentlichungsstand, je Projekt.
  if (controlling.value) {
    const groups = new Map<
      string,
      { gaps: number; latest: number | null; first: (typeof controlling.value)[number] }
    >();
    for (const row of controlling.value) {
      if (!authorized.has(cockpitScopeKey(row.systemhouseId, row.customerId))) continue;
      const key = `${cockpitScopeKey(row.systemhouseId, row.customerId)}:${row.projectSourceId ?? ""}`;
      const group = groups.get(key) ?? { gaps: 0, latest: null, first: row };
      if (row.workPackageSourceId === null || row.categoryState === "unknown") group.gaps += 1;
      for (const published of [
        row.projectPublishedAt,
        row.workPackagePublishedAt,
        row.activityPublishedAt,
      ]) {
        if (!published) continue;
        const time = parseDay(published);
        if (group.latest === null || time > group.latest) group.latest = time;
      }
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const row = group.first;
      const entry = builder(row.systemhouseId, row.customerId, row.projectSourceId);
      if (!entry) continue;
      entry.customerName ??= row.customerName;
      entry.projectName ??= row.projectName;
      if (group.gaps > 0)
        addReason(entry, "CONTROLLING_GAP", group.gaps, controlling.state, "PROJECT_CONTROLLING");
      if (group.latest !== null) {
        const ageDays = Math.floor((asOf - group.latest) / DAY_MS);
        if (ageDays > staleAfterDays)
          addReason(entry, "DATA_STALE", ageDays, controlling.state, "PROJECT_CONTROLLING");
      }
    }
  }

  const items: AttentionItem[] = [...builders.values()]
    .filter((entry) => entry.reasons.size > 0)
    .map((entry) => {
      const reasons = REASON_ORDER.flatMap((code) => entry.reasons.get(code) ?? []);
      return {
        key: entry.key,
        systemhouseId: entry.systemhouseId,
        customerId: entry.customerId,
        customerName: entry.customerName ?? entry.customerId,
        projectKey: entry.projectKey,
        projectName: entry.projectName,
        reasons,
        dataState: reasons.some((r) => r.dataState === "PARTIAL") ? "PARTIAL" : "AVAILABLE",
      } satisfies AttentionItem;
    })
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        a.customerName.localeCompare(b.customerName, "de") ||
        (a.projectName ?? "").localeCompare(b.projectName ?? "", "de") ||
        a.key.localeCompare(b.key),
    );

  const dataState = overallState([sources.controlling, sources.workPackages, sources.avkk]);
  const hasNumbers = USABLE.has(dataState);
  const byCode: Partial<Record<CockpitReasonCode, number>> = {};
  for (const item of items)
    for (const reason of item.reasons) byCode[reason.code] = (byCode[reason.code] ?? 0) + 1;
  const counters: CockpitCounters = {
    attentionItems: hasNumbers ? items.length : null,
    reasonsByCode: hasNumbers ? byCode : null,
  };

  return {
    asOfDate: input.asOfDate,
    dataState,
    sources,
    items: hasNumbers ? items : [],
    counters,
  };
}
