/**
 * L2 / P2 — Server-Lesepfad des Management-Cockpits (docs/L2-COCKPIT-SCHNITT-KONZEPT.md §6, §8, §9).
 * Ausschließlich synthetische Daten (Demo-Kunden A und B). Kein Supabase, keine Uhr:
 * Benutzerkontext (RPC) und Repositories sind Fakes, der Referenzzeitpunkt ist Parameter.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type {
  WorkPackageWorkViewRepository,
  WorkPackageWorkViewSourceRow,
} from "@/lib/avkk/work-package-work-view.types";
import type { MyCustomerCandidate, MyCustomersRepository } from "@/lib/customer-data/my-customers";
import {
  MANAGEMENT_COCKPIT_AUTHORIZATION_FAILED,
  executeManagementCockpitRequest,
  parseManagementCockpitRequest,
  type ManagementCockpitDeps,
} from "@/lib/management-cockpit-runtime/management-cockpit.functions";
import type { AvkkCustomerSignal } from "@/lib/management-cockpit/types";
import type {
  ProjectControllingFilters,
  ProjectControllingRepository,
  ProjectControllingRow,
} from "@/lib/project-controlling/project-controlling-contract";

const SH = "11111111-1111-4111-8111-111111111111";
const SH_FOREIGN = "99999999-9999-4999-8999-999999999999";
const KA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER = "33333333-3333-4333-8333-333333333333";
/** 2026-10-27 04:30 Europe/Berlin (MEZ). */
const NOW = "2026-10-27T03:30:00.000Z";
const AS_OF = "2026-10-27";

type PermissionName = "dashboard.view" | "project.controlling.view" | "avkk.management.view";

interface Grants {
  active?: boolean;
  permissions?: readonly PermissionName[];
  errorFor?: "is_account_active" | "has_permission";
}

const ALL_PERMISSIONS: readonly PermissionName[] = [
  "dashboard.view",
  "project.controlling.view",
  "avkk.management.view",
];

function fakeClient(grants: Grants = {}): SupabaseClient<Database> {
  const permissions = new Set(grants.permissions ?? ALL_PERMISSIONS);
  return {
    async rpc(fn: string, args: Record<string, unknown>) {
      if (grants.errorFor === fn) return { data: null, error: { message: "synthetic rpc error" } };
      if (fn === "is_account_active") return { data: grants.active ?? true, error: null };
      if (fn === "has_permission") {
        return { data: permissions.has(args._perm as PermissionName), error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${fn}` } };
    },
  } as unknown as SupabaseClient<Database>;
}

function candidate(systemhouseId: string, customerId: string, name: string): MyCustomerCandidate {
  return {
    systemhouseId,
    customerId,
    responsibilityStatus: "active",
    responsibleSince: "2026-01-01T00:00:00Z",
    customer: { name, status: "active" },
    accessLevel: "read",
  };
}

function customersRepo(
  candidates: readonly MyCustomerCandidate[],
  options: { listError?: boolean } = {},
): MyCustomersRepository {
  const confirmed = new Set(candidates.map((c) => `${c.systemhouseId}:${c.customerId}`));
  return {
    async listCandidates() {
      if (options.listError) throw new Error("synthetic customers failure");
      return [...candidates];
    },
    async isMyCustomer({ systemhouseId, customerId }) {
      return confirmed.has(`${systemhouseId}:${customerId}`);
    },
    readCustomer: vi.fn(),
    readOwnResponsibility: vi.fn(),
    readOwnAccessLevel: vi.fn(),
    readOwnDisplayName: vi.fn(),
  } as MyCustomersRepository;
}

function wpRow(
  id: string,
  systemhouseId: string,
  customerId: string,
  over: Partial<WorkPackageWorkViewSourceRow> = {},
): WorkPackageWorkViewSourceRow {
  return {
    workPackageId: id,
    sourceId: `src-${id}`,
    systemhouseId,
    customerId,
    customerName: customerId === KA ? "Kunde A" : "Kunde B",
    title: id,
    status: "open",
    due: "2026-10-20",
    responsibilities: [{ personId: "p-petra", displayName: "Petra", role: "owner" }],
    ...over,
  };
}

function workPackagesRepo(
  rows: readonly WorkPackageWorkViewSourceRow[],
  options: { fail?: boolean } = {},
): WorkPackageWorkViewRepository & { calls: number } {
  const repo = {
    calls: 0,
    async listAuthorizedWorkPackages() {
      repo.calls += 1;
      if (options.fail) throw new Error("synthetic work package failure");
      return rows;
    },
  };
  return repo;
}

function controllingRow(over: Partial<ProjectControllingRow> = {}): ProjectControllingRow {
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
    projectSourceId: "proj-virt",
    projectName: "Virtualisierung",
    workPackageSourceId: "wp-1",
    workPackageTitle: "Paket",
    categoryObserved: true,
    categoryKey: "betrieb",
    categoryLabel: "Betrieb",
    categoryState: "known",
    projectPublishedAt: "2026-10-26T08:00:00Z",
    workPackagePublishedAt: "2026-10-26T08:00:00Z",
    activityPublishedAt: "2026-10-26T08:00:00Z",
    ...over,
  };
}

function controllingRepo(
  rows: readonly ProjectControllingRow[],
  options: { fail?: boolean } = {},
): ProjectControllingRepository & { calls: ProjectControllingFilters[] } {
  const repo = {
    calls: [] as ProjectControllingFilters[],
    async listRows(filters: ProjectControllingFilters) {
      repo.calls.push(filters);
      if (options.fail) throw new Error("synthetic controlling failure");
      return rows;
    },
    async listScopeOptions() {
      return [];
    },
  };
  return repo;
}

function deps(over: Partial<ManagementCockpitDeps> = {}): ManagementCockpitDeps {
  return {
    customers: customersRepo([candidate(SH, KA, "Kunde A"), candidate(SH, KB, "Kunde B")]),
    controlling: controllingRepo([controllingRow()]),
    workPackages: workPackagesRepo([]),
    ...over,
  };
}

const run = (grants: Grants, d: ManagementCockpitDeps) =>
  executeManagementCockpitRequest(fakeClient(grants), USER, d, NOW);

describe("L2 P2 — Anfrage", () => {
  it("akzeptiert nur eine leere Anfrage; Scope, Stichtag und Rollen kommen nie vom Client", () => {
    expect(parseManagementCockpitRequest({})).toEqual({});
    expect(() => parseManagementCockpitRequest({ customerId: KA })).toThrow();
    expect(() => parseManagementCockpitRequest({ asOfDate: "2026-01-01" })).toThrow();
    expect(() => parseManagementCockpitRequest({ capabilities: { controlling: true } })).toThrow();
    expect(() => parseManagementCockpitRequest(undefined)).toThrow();
  });
});

describe("L2 P2 — Autorisierung (fail-closed)", () => {
  it("Projektmanager mit Scope Kunde B: nur Kunde B, Fremdzeilen aus der Quelle fallen heraus", async () => {
    const result = await run(
      {},
      deps({
        customers: customersRepo([candidate(SH, KB, "Kunde B")]),
        workPackages: workPackagesRepo([
          wpRow("wp-restore", SH, KB, { title: "Wiederherstellungstest" }),
          wpRow("wp-a", SH, KA, { title: "Firewall-Richtlinie" }),
        ]),
      }),
    );
    expect(result.asOfDate).toBe(AS_OF);
    expect(result.items.map((i) => i.customerId)).toEqual([KB]);
    expect(result.items[0].reasons.map((r) => r.code)).toContain("WP_OVERDUE");
    expect(JSON.stringify(result)).not.toContain(KA);
  });

  it("Cross-Systemhouse: gleiche Customer-ID in fremdem Systemhaus liefert nichts", async () => {
    const result = await run(
      {},
      deps({
        customers: customersRepo([candidate(SH, KB, "Kunde B")]),
        workPackages: workPackagesRepo([wpRow("wp-x", SH_FOREIGN, KB)]),
        controlling: controllingRepo([controllingRow({ systemhouseId: SH_FOREIGN })]),
      }),
    );
    expect(result.items).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(SH_FOREIGN);
  });

  it("Rolle ohne jede Capability (Viewer/Customer/Kiosk): DENIED, keine IDs, Repositories unberührt", async () => {
    const wp = workPackagesRepo([wpRow("wp-b", SH, KB)]);
    const ctl = controllingRepo([controllingRow()]);
    const result = await run({ permissions: [] }, deps({ workPackages: wp, controlling: ctl }));
    expect(result.dataState).toBe("DENIED");
    expect(result.sources).toEqual({
      controlling: "DENIED",
      workPackages: "DENIED",
      avkk: "DENIED",
    });
    expect(result.items).toEqual([]);
    expect(result.counters).toEqual({ attentionItems: null, reasonsByCode: null });
    expect(JSON.stringify(result)).not.toMatch(new RegExp(`${KA}|${KB}|${SH}`));
    expect(wp.calls).toBe(0);
    expect(ctl.calls).toEqual([]);
  });

  it("Konto inaktiv: DENIED, Repositories unberührt", async () => {
    const wp = workPackagesRepo([wpRow("wp-b", SH, KB)]);
    const result = await run({ active: false }, deps({ workPackages: wp }));
    expect(result.dataState).toBe("DENIED");
    expect(result.items).toEqual([]);
    expect(wp.calls).toBe(0);
  });

  it("dashboard.view fehlt: kein Kundenkreis, daher DENIED statt leerer Erfolgsansicht", async () => {
    const result = await run(
      { permissions: ["project.controlling.view", "avkk.management.view"] },
      deps(),
    );
    expect(result.dataState).toBe("DENIED");
    expect(result.counters.attentionItems).toBeNull();
  });

  it("nur project.controlling.view: Controlling AVAILABLE, Arbeitssicht und AVKK DENIED, Arbeitssicht nicht gelesen", async () => {
    const wp = workPackagesRepo([wpRow("wp-b", SH, KB)]);
    const result = await run(
      { permissions: ["dashboard.view", "project.controlling.view"] },
      deps({ workPackages: wp }),
    );
    expect(result.sources).toEqual({
      controlling: "AVAILABLE",
      workPackages: "DENIED",
      avkk: "DENIED",
    });
    expect(result.dataState).toBe("PARTIAL");
    expect(wp.calls).toBe(0);
  });

  it("Fehler bei der Berechtigungsprüfung: generischer Fehler ohne Rohtext, nichts gelesen", async () => {
    const wp = workPackagesRepo([]);
    for (const errorFor of ["is_account_active", "has_permission"] as const) {
      await expect(run({ errorFor }, deps({ workPackages: wp }))).rejects.toThrow(
        MANAGEMENT_COCKPIT_AUTHORIZATION_FAILED,
      );
    }
    expect(wp.calls).toBe(0);
  });
});

describe("L2 P2 — Datenzustände und Teilausfälle", () => {
  it("Kundenkreis nicht ermittelbar: UNAVAILABLE für alle Quellen, nie 'alles gut'", async () => {
    const result = await run({}, deps({ customers: customersRepo([], { listError: true }) }));
    expect(result.dataState).toBe("UNAVAILABLE");
    expect(result.items).toEqual([]);
    expect(result.counters.attentionItems).toBeNull();
  });

  it("eine Quelle fällt aus: PARTIAL, die übrigen liefern weiter (L2-R5)", async () => {
    const result = await run(
      {},
      deps({
        workPackages: workPackagesRepo([], { fail: true }),
        controlling: controllingRepo([controllingRow({ workPackageSourceId: null })]),
      }),
    );
    expect(result.sources.workPackages).toBe("UNAVAILABLE");
    expect(result.sources.controlling).toBe("AVAILABLE");
    expect(result.dataState).toBe("PARTIAL");
    expect(result.items.flatMap((i) => i.reasons.map((r) => r.code))).toContain("CONTROLLING_GAP");
    expect(JSON.stringify(result)).not.toContain("synthetic");
  });

  it("alle Quellen fallen aus: UNAVAILABLE, keine Zähler", async () => {
    const result = await run(
      {},
      deps({
        workPackages: workPackagesRepo([], { fail: true }),
        controlling: controllingRepo([], { fail: true }),
      }),
    );
    expect(result.dataState).toBe("UNAVAILABLE");
    expect(result.counters).toEqual({ attentionItems: null, reasonsByCode: null });
  });

  it("leere Quellen: EMPTY ist etwas anderes als UNAVAILABLE", async () => {
    const result = await run({}, deps({ controlling: controllingRepo([]) }));
    expect(result.sources.controlling).toBe("EMPTY");
    expect(result.sources.workPackages).toBe("EMPTY");
    expect(result.items).toEqual([]);
  });

  it("AVKK ohne Server-Provider: UNAVAILABLE, nicht als 0 Befunde dargestellt", async () => {
    const result = await run({}, deps());
    expect(result.sources.avkk).toBe("UNAVAILABLE");
    expect(result.dataState).toBe("PARTIAL");
    expect(result.items.flatMap((i) => i.reasons.map((r) => r.code))).not.toContain(
      "AVKK_HIGH_OR_CRITICAL",
    );
  });

  it("AVKK-Provider vorhanden: Befunde nur für autorisierte Kunden", async () => {
    const signals: AvkkCustomerSignal[] = [
      { systemhouseId: SH, customerId: KB, highOrCritical: 2 },
      { systemhouseId: SH, customerId: KA, highOrCritical: 5 },
    ];
    const result = await run(
      {},
      deps({
        customers: customersRepo([candidate(SH, KB, "Kunde B")]),
        avkk: { listCustomerSignals: async () => signals },
      }),
    );
    expect(result.sources.avkk).toBe("AVAILABLE");
    expect(result.items.map((i) => i.customerId)).toEqual([KB]);
    expect(result.items[0].reasons.find((r) => r.code === "AVKK_HIGH_OR_CRITICAL")?.count).toBe(2);
  });
});

describe("L2 P2 — Fachregeln über den Server-Pfad", () => {
  it("erledigtes Paket ist nie überfällig (L2-04)", async () => {
    const result = await run(
      {},
      deps({
        workPackages: workPackagesRepo([
          wpRow("wp-lastanalyse", SH, KB, { title: "Lastanalyse", status: "erledigt" }),
        ]),
        controlling: controllingRepo([]),
      }),
    );
    expect(result.items).toEqual([]);
  });

  it("Paket ohne Verantwortliche: WP_UNASSIGNED", async () => {
    const result = await run(
      {},
      deps({
        workPackages: workPackagesRepo([wpRow("wp-u", SH, KA, { responsibilities: [] })]),
        controlling: controllingRepo([]),
      }),
    );
    expect(result.items[0].reasons.map((r) => r.code)).toContain("WP_UNASSIGNED");
  });

  it("Stichtag stammt vom Server (Europe/Berlin), nicht vom Client: 23:30 UTC ist schon der Folgetag", async () => {
    const result = await executeManagementCockpitRequest(
      fakeClient(),
      USER,
      deps(),
      "2026-10-26T23:30:00.000Z",
    );
    expect(result.asOfDate).toBe("2026-10-27");
  });

  it("Controlling wird mit festem 90-Tage-Fenster bis zum Stichtag gelesen, alle Abrechnungsarten", async () => {
    const ctl = controllingRepo([controllingRow()]);
    await run({}, deps({ controlling: ctl }));
    expect(ctl.calls).toHaveLength(1);
    expect(ctl.calls[0]).toMatchObject({ from: "2026-07-30", to: "2026-10-27", billable: "all" });
  });

  it("liefert keine Beträge und keine Personenbewertung (L2-06)", async () => {
    const result = await run({}, deps({ workPackages: workPackagesRepo([wpRow("wp-b", SH, KB)]) }));
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/amount|betrag|rate|satz|score|ranking|billingStatus|Petra/i);
  });
});

describe("L2 P2 — Vertrag der Quelldatei", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/lib/management-cockpit-runtime/management-cockpit.functions.ts"),
    "utf8",
  );

  it("nutzt den User-JWT-Client der Middleware, keinen privilegierten Client", () => {
    expect(source).toContain("requireSupabaseAuth");
    expect(source).not.toMatch(/client\.server|supabaseAdmin|service[_-]?role/i);
  });

  it("ist lesend: keine Schreiboperationen auf der Datenbank", () => {
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});
