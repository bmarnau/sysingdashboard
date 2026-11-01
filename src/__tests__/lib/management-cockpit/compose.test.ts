/**
 * L2 / P1 — RED-Matrix des Management-Cockpits (docs/L2-COCKPIT-SCHNITT-KONZEPT.md §8).
 * Ausschließlich synthetische Daten (Demo-Kunden A und B).
 */
import { describe, expect, it } from "vitest";
import { composeManagementCockpit } from "@/lib/management-cockpit/compose";
import type {
  AvkkCustomerSignal,
  CockpitCapabilities,
  CockpitInput,
  SourceResult,
} from "@/lib/management-cockpit/types";
import type { ProjectControllingRow } from "@/lib/project-controlling/project-controlling-contract";
import type { WorkPackageWorkViewRow } from "@/lib/avkk/work-package-work-view.types";

const SH = "sh-1";
const KA = "cust-a";
const KB = "cust-b";
const AS_OF = "2026-10-26";

const ALL: CockpitCapabilities = { controlling: true, avkkManagement: true, workView: true };
const NONE: CockpitCapabilities = { controlling: false, avkkManagement: false, workView: false };

function wp(
  id: string,
  customerId: string,
  dueGroup: WorkPackageWorkViewRow["dueGroup"],
  owner: WorkPackageWorkViewRow["owner"] = { personId: "p-petra", displayName: "Petra" },
): WorkPackageWorkViewRow {
  return {
    workPackageId: id,
    sourceId: `src-${id}`,
    systemhouseId: SH,
    customerId,
    customerName: customerId === KA ? "Kunde A" : "Kunde B",
    title: id,
    status: dueGroup === "DONE" ? "done" : "open",
    due: dueGroup === "NO_DUE_DATE" ? null : "2026-10-20",
    dueGroup,
    owner,
    deputies: [],
    asOfDate: AS_OF,
  };
}

function row(over: Partial<ProjectControllingRow>): ProjectControllingRow {
  return {
    activityId: "a-1",
    activityDate: "2026-10-20",
    activityTitle: "Tätigkeit",
    durationHours: 1,
    billable: true,
    billingStatus: null,
    systemhouseId: SH,
    systemhouseName: "Demo-Systemhaus",
    customerId: KB,
    customerName: "Kunde B",
    projectSourceId: "proj-1",
    projectName: "Virtualisierung",
    workPackageSourceId: "wp-1",
    workPackageTitle: "Paket",
    categoryObserved: true,
    categoryKey: "betrieb",
    categoryLabel: "Betrieb",
    categoryState: "known",
    projectPublishedAt: "2026-10-25T08:00:00Z",
    workPackagePublishedAt: "2026-10-25T08:00:00Z",
    activityPublishedAt: "2026-10-25T08:00:00Z",
    ...over,
  };
}

const avail = <T>(value: T): SourceResult<T> => ({ state: "AVAILABLE", value });

function input(over: Partial<CockpitInput> = {}): CockpitInput {
  return {
    asOfDate: AS_OF,
    capabilities: ALL,
    authorizedCustomers: new Set([`${SH}:${KA}`, `${SH}:${KB}`]),
    controlling: avail<readonly ProjectControllingRow[]>([row({})]),
    workPackages: avail<readonly WorkPackageWorkViewRow[]>([]),
    avkk: avail<readonly AvkkCustomerSignal[]>([]),
    ...over,
  };
}

describe("L2 Management-Cockpit Composer", () => {
  it("Projektmanager mit Scope Kunde B: nur Kunde B, überfälliges Paket als Grund", () => {
    const result = composeManagementCockpit(
      input({
        authorizedCustomers: new Set([`${SH}:${KB}`]),
        workPackages: avail([
          wp("Wiederherstellungstest", KB, "OVERDUE"),
          wp("Fremdpaket", KA, "OVERDUE"),
        ]),
        controlling: avail([row({})]),
      }),
    );
    expect(result.items.every((i) => i.customerId === KB)).toBe(true);
    const reasons = result.items.flatMap((i) => i.reasons);
    const overdue = reasons.find((r) => r.code === "WP_OVERDUE");
    expect(overdue?.count).toBe(1);
    expect(overdue?.drilldown.target).toBe("WORK_VIEW");
  });

  it("erledigte Pakete zählen nicht als überfällig (L2-04)", () => {
    const result = composeManagementCockpit(
      input({ workPackages: avail([wp("Lastanalyse", KB, "DONE")]) }),
    );
    expect(result.items.flatMap((i) => i.reasons).map((r) => r.code)).not.toContain("WP_OVERDUE");
  });

  it("Pakete ohne Verantwortliche ergeben WP_UNASSIGNED mit Anzahl", () => {
    const rows = Array.from({ length: 5 }, (_, n) => wp(`u-${n}`, KA, "FUTURE", "UNASSIGNED"));
    const result = composeManagementCockpit(input({ workPackages: avail(rows) }));
    const item = result.items.find((i) => i.customerId === KA);
    expect(item?.reasons.find((r) => r.code === "WP_UNASSIGNED")?.count).toBe(5);
  });

  it("erledigte Pakete ohne Verantwortliche zählen nicht als unzugeordnet", () => {
    const result = composeManagementCockpit(
      input({ workPackages: avail([wp("alt", KA, "DONE", "UNASSIGNED")]) }),
    );
    expect(result.items.flatMap((i) => i.reasons).map((r) => r.code)).not.toContain(
      "WP_UNASSIGNED",
    );
  });

  it("AVKK hoch/kritisch wird je Kunde als Grund mit Drill-down geführt", () => {
    const result = composeManagementCockpit(
      input({ avkk: avail([{ systemhouseId: SH, customerId: KB, highOrCritical: 3 }]) }),
    );
    const reason = result.items
      .flatMap((i) => i.reasons)
      .find((r) => r.code === "AVKK_HIGH_OR_CRITICAL");
    expect(reason?.count).toBe(3);
    expect(reason?.drilldown.target).toBe("AVKK_MANAGEMENT");
  });

  it("AVKK mit 0 Befunden erzeugt keinen Grund", () => {
    const result = composeManagementCockpit(
      input({ avkk: avail([{ systemhouseId: SH, customerId: KB, highOrCritical: 0 }]) }),
    );
    expect(result.items).toHaveLength(0);
  });

  it("Controlling-Lücke: Tätigkeit ohne Arbeitspaket → CONTROLLING_GAP im Projektscope", () => {
    const result = composeManagementCockpit(
      input({ controlling: avail([row({ workPackageSourceId: null, workPackageTitle: null })]) }),
    );
    const item = result.items.find((i) => i.projectKey === "proj-1");
    const reason = item?.reasons.find((r) => r.code === "CONTROLLING_GAP");
    expect(reason?.count).toBe(1);
    expect(reason?.drilldown.target).toBe("PROJECT_CONTROLLING");
  });

  it("Kategorie unbekannt zählt als Controlling-Lücke", () => {
    const result = composeManagementCockpit(
      input({ controlling: avail([row({ categoryState: "unknown", categoryKey: null })]) }),
    );
    expect(result.items.flatMap((i) => i.reasons).map((r) => r.code)).toContain("CONTROLLING_GAP");
  });

  it("veralteter Veröffentlichungsstand → DATA_STALE; frischer Stand nicht", () => {
    const stale = composeManagementCockpit(
      input({
        controlling: avail([
          row({
            projectPublishedAt: "2026-10-01T08:00:00Z",
            workPackagePublishedAt: "2026-10-01T08:00:00Z",
            activityPublishedAt: "2026-10-01T08:00:00Z",
          }),
        ]),
      }),
    );
    expect(stale.items.flatMap((i) => i.reasons).map((r) => r.code)).toContain("DATA_STALE");
    const fresh = composeManagementCockpit(input());
    expect(fresh.items.flatMap((i) => i.reasons).map((r) => r.code)).not.toContain("DATA_STALE");
  });

  it("fehlender Veröffentlichungszeitpunkt ist UNKNOWN, kein Grund und keine 0", () => {
    const result = composeManagementCockpit(
      input({
        controlling: avail([
          row({
            projectPublishedAt: null,
            workPackagePublishedAt: null,
            activityPublishedAt: null,
          }),
        ]),
      }),
    );
    expect(result.items.flatMap((i) => i.reasons).map((r) => r.code)).not.toContain("DATA_STALE");
  });

  it("Quelle PARTIAL: Zustand bleibt PARTIAL, nicht AVAILABLE", () => {
    const result = composeManagementCockpit(
      input({
        controlling: { state: "PARTIAL", value: [row({ workPackageSourceId: null })] },
      }),
    );
    expect(result.sources.controlling).toBe("PARTIAL");
    expect(result.dataState).toBe("PARTIAL");
    const reason = result.items.flatMap((i) => i.reasons).find((r) => r.code === "CONTROLLING_GAP");
    expect(reason?.dataState).toBe("PARTIAL");
  });

  it("Rolle ohne Capability (Viewer, Customer, Kiosk): DENIED, kein Zähler, keine ID", () => {
    const result = composeManagementCockpit(
      input({
        capabilities: NONE,
        workPackages: avail([wp("x", KB, "OVERDUE")]),
        avkk: avail([{ systemhouseId: SH, customerId: KB, highOrCritical: 4 }]),
      }),
    );
    expect(result.dataState).toBe("DENIED");
    expect(result.items).toHaveLength(0);
    expect(result.counters.attentionItems).toBeNull();
    expect(result.counters.reasonsByCode).toBeNull();
    expect(JSON.stringify(result)).not.toContain(KB);
  });

  it("einzelne fehlende Capability: Quelle DENIED, Rest bleibt nutzbar (PARTIAL)", () => {
    const result = composeManagementCockpit(
      input({
        capabilities: { ...ALL, avkkManagement: false },
        workPackages: avail([wp("x", KB, "OVERDUE")]),
        avkk: avail([{ systemhouseId: SH, customerId: KB, highOrCritical: 4 }]),
      }),
    );
    expect(result.sources.avkk).toBe("DENIED");
    expect(result.dataState).toBe("PARTIAL");
    expect(result.items.flatMap((i) => i.reasons).map((r) => r.code)).not.toContain(
      "AVKK_HIGH_OR_CRITICAL",
    );
  });

  it("fremder Kunde (Cross-Customer, Cross-Systemhouse) fehlt im Ergebnis", () => {
    const foreign = { ...wp("fremd", "cust-x", "OVERDUE"), systemhouseId: "sh-2" };
    const result = composeManagementCockpit(
      input({
        workPackages: avail([foreign, wp("eigen", KB, "OVERDUE")]),
        avkk: avail([{ systemhouseId: "sh-2", customerId: KB, highOrCritical: 9 }]),
      }),
    );
    const json = JSON.stringify(result);
    expect(json).not.toContain("cust-x");
    expect(json).not.toContain("sh-2");
  });

  it("alle Quellen UNAVAILABLE: Zustand UNAVAILABLE, keine „alles gut“-Darstellung", () => {
    const u = { state: "UNAVAILABLE" } as const;
    const result = composeManagementCockpit(input({ controlling: u, workPackages: u, avkk: u }));
    expect(result.dataState).toBe("UNAVAILABLE");
    expect(result.counters.attentionItems).toBeNull();
  });

  it("alle Quellen EMPTY ohne Befund: EMPTY mit Zähler 0", () => {
    const e = { state: "EMPTY", value: [] } as const;
    const result = composeManagementCockpit(input({ controlling: e, workPackages: e, avkk: e }));
    expect(result.dataState).toBe("EMPTY");
    expect(result.counters.attentionItems).toBe(0);
  });

  it("Handlungsbedarf ist nach Zahl der Gründe sortiert (L2-09)", () => {
    const result = composeManagementCockpit(
      input({
        workPackages: avail([
          wp("o-a", KA, "OVERDUE"),
          wp("u-b", KB, "OVERDUE", "UNASSIGNED"),
          wp("u-b2", KB, "FUTURE", "UNASSIGNED"),
        ]),
        controlling: avail([]),
      }),
    );
    expect(result.items[0]?.customerId).toBe(KB);
    expect(result.items[0]?.reasons.length).toBeGreaterThan(result.items[1]?.reasons.length ?? 0);
  });

  it("ist rein funktional und deterministisch (gleiche Eingabe, gleiche Ausgabe)", () => {
    const i = input({ workPackages: avail([wp("x", KB, "OVERDUE")]) });
    expect(composeManagementCockpit(i)).toEqual(composeManagementCockpit(i));
  });

  it("500 Projekte bleiben unter 100 ms (L2-10)", () => {
    const rows = Array.from({ length: 500 }, (_, n) =>
      row({ activityId: `a-${n}`, projectSourceId: `proj-${n}`, workPackageSourceId: null }),
    );
    const t0 = performance.now();
    composeManagementCockpit(input({ controlling: avail(rows) }));
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it("Ausgabe enthält keine Beträge oder Personenbewertung (L2-06)", () => {
    const json = JSON.stringify(
      composeManagementCockpit(input({ workPackages: avail([wp("x", KB, "OVERDUE")]) })),
    ).toLowerCase();
    for (const forbidden of ["amount", "betrag", "revenue", "hourlyrate", "score", "ranking"]) {
      expect(json).not.toContain(forbidden);
    }
  });
});
