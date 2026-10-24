import { beforeEach, describe, expect, it } from "vitest";
import type { Activity, Project, WorkPackage } from "@/lib/dashboard-data";
import {
  buildPublishPayload,
  effectiveEngineerId,
  collectLocalCustomerNames,
  findInvalidEntries,
  groupByReason,
  previewPublish,
  readStoredNameSelection,
  writeStoredNameSelection,
} from "@/lib/customer-data/publish-to-team";
import type { SharedCustomerProjectionSnapshot } from "@/lib/customer-data/shared-projection-runtime";
import { sharedProjectionPublishSchema } from "@/lib/customer-data-runtime/shared-projection.schema";

const SYSTEMHOUSE = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const ME = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const scope = { systemhouseId: SYSTEMHOUSE, customerId: CUSTOMER };

const project: Project = {
  id: "P-1",
  name: "Cloud Identity 2026",
  client: "Brunner Logistik AG",
  status: "on_track",
};

const workPackage: WorkPackage = {
  id: "WP-2041",
  title: "Active Directory Migration zu Entra ID",
  projectId: "P-1",
  client: "Brunner Logistik AG",
  status: "in_arbeit",
  priority: "hoch",
  due: "2026-11-30",
  categoryKey: null,
};

function snapshot(overrides: Partial<Parameters<typeof previewPublish>[0]["snapshot"]> = {}) {
  return {
    projects: [project],
    workPackages: [workPackage],
    activities: [] as Activity[],
    ...overrides,
  };
}

function current(overrides: Partial<SharedCustomerProjectionSnapshot> = {}) {
  return {
    systemhouseId: SYSTEMHOUSE,
    customerId: CUSTOMER,
    projects: [],
    workPackages: [],
    activities: [],
    ...overrides,
  } as SharedCustomerProjectionSnapshot;
}

describe("publish-to-team payload", () => {
  it("keeps the due date through the server input contract (DUE-DROP)", () => {
    const payload = buildPublishPayload({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
    });

    const parsed = sharedProjectionPublishSchema.parse(payload);
    expect(parsed.workPackages[0].due).toBe("2026-11-30");
    expect(parsed.snapshotComplete).toBe(true);
  });

  it("treats an empty due date as no due date", () => {
    const payload = buildPublishPayload({
      scope,
      snapshot: snapshot({ workPackages: [{ ...workPackage, due: "" }] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
    });

    expect(sharedProjectionPublishSchema.parse(payload).workPackages[0].due).toBeUndefined();
  });

  it("assigns activities without a real engineer id to the publisher so the server contract holds", () => {
    const activity: Activity = {
      id: "A-1",
      title: "Analyse",
      workPackageId: "WP-2041",
      engineerId: "MH",
      client: "Brunner Logistik AG",
      date: "2026-10-01",
      duration: 2,
      hourlyRate: 120,
      billable: true,
      billingStatus: "offen",
    };

    const payload = buildPublishPayload({
      scope,
      snapshot: snapshot({ activities: [activity] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
    });

    expect(payload.activities[0].engineerId).toBe(ME);
    expect(() => sharedProjectionPublishSchema.parse(payload)).not.toThrow();
  });

  it("maps only explicitly selected local names and never guesses", () => {
    const none = buildPublishPayload({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: [],
      publisherUserId: ME,
    });
    expect(none.customerMappings).toEqual([]);

    const some = buildPublishPayload({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: ["Brunner Logistik AG", "  brunner  logistik ag "],
      publisherUserId: ME,
    });
    expect(some.customerMappings).toEqual([
      { legacyName: "Brunner Logistik AG", customerId: CUSTOMER },
    ]);
  });
});

describe("publish-to-team preview", () => {
  it("publishes mapped objects and counts them", () => {
    const preview = previewPublish({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.publish).toEqual({ projects: 1, workPackages: 1, activities: 0 });
    expect(preview.canPublish).toBe(true);
    expect(preview.unresolved).toEqual([]);
  });

  it("reports unmapped local customers with a reason and publishes nothing", () => {
    const preview = previewPublish({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: [],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.canPublish).toBe(false);
    expect(preview.unresolved.map((entry) => entry.reason)).toEqual([
      "mapping_missing",
      "mapping_missing",
    ]);
    expect(groupByReason(preview.unresolved)).toEqual([
      expect.objectContaining({ reason: "mapping_missing", count: 2 }),
    ]);
  });

  it("skips a work package whose project is missing locally, with a reason", () => {
    const preview = previewPublish({
      scope,
      snapshot: snapshot({ projects: [] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.publish.workPackages).toBe(0);
    expect(preview.skipped).toEqual([
      expect.objectContaining({ sourceId: "WP-2041", reason: "parent_missing" }),
    ]);
  });

  it("publishes activities without an engineer id under the publisher", () => {
    const activity: Activity = {
      id: "A-1",
      title: "Analyse",
      workPackageId: "WP-2041",
      client: "Brunner Logistik AG",
      date: "2026-10-01",
      duration: 2,
      hourlyRate: 120,
      billable: true,
      billingStatus: "offen",
    };

    const preview = previewPublish({
      scope,
      snapshot: snapshot({ activities: [activity] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.publish.activities).toBe(1);
    expect(preview.skipped.some((entry) => entry.reason === "engineer_missing")).toBe(false);
  });

  it("still skips activities that belong to another account", () => {
    const other = "44444444-4444-4444-8444-444444444444";
    const activity: Activity = {
      id: "A-2",
      title: "Fremde Tätigkeit",
      workPackageId: "WP-2041",
      engineerId: other,
      client: "Brunner Logistik AG",
      date: "2026-10-01",
      duration: 1,
      hourlyRate: 120,
      billable: true,
      billingStatus: "offen",
    };

    const preview = previewPublish({
      scope,
      snapshot: snapshot({ activities: [activity] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.publish.activities).toBe(0);
    expect(preview.skipped).toEqual([
      expect.objectContaining({ sourceId: "A-2", reason: "engineer_mismatch" }),
    ]);
  });

  it("resolves the effective engineer id deterministically", () => {
    const other = "44444444-4444-4444-8444-444444444444";
    expect(effectiveEngineerId({}, ME)).toBe(ME);
    expect(effectiveEngineerId({ engineerId: "  " }, ME)).toBe(ME);
    expect(effectiveEngineerId({ engineerId: "MH" }, ME)).toBe(ME);
    expect(effectiveEngineerId({ engineerId: ` ${other} ` }, ME)).toBe(other);
  });

  it("estimates withdrawals only for objects the current publisher published", () => {
    const row = (sourceId: string, publishedBy: string) => ({ sourceId, publishedBy });
    const preview = previewPublish({
      scope,
      snapshot: snapshot(),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current({
        workPackages: [
          row("WP-2041", ME),
          row("WP-OLD-MINE", ME),
          row("WP-OLD-OTHER", OTHER),
        ] as unknown as SharedCustomerProjectionSnapshot["workPackages"],
      }),
    });

    expect(preview.withdrawals).toEqual({ projects: 0, workPackages: 1, activities: 0 });
  });

  it("blocks publishing when a local entry would be rejected by the server", () => {
    const preview = previewPublish({
      scope,
      snapshot: snapshot({ workPackages: [{ ...workPackage, due: "30.11.2026" }] }),
      selectedLegacyNames: ["Brunner Logistik AG"],
      publisherUserId: ME,
      current: current(),
    });

    expect(preview.canPublish).toBe(false);
    expect(preview.invalid).toEqual([
      expect.objectContaining({ sourceId: "WP-2041", entityType: "workpackage" }),
    ]);
    expect(preview.publish).toEqual({ projects: 0, workPackages: 0, activities: 0 });
  });

  it("flags entries without id or with an impossible calendar date", () => {
    const invalid = findInvalidEntries({
      projects: [{ ...project, id: "  " }],
      workPackages: [{ ...workPackage, due: "2026-02-31" }],
      activities: [],
    });

    expect(invalid.map((entry) => entry.problem)).toEqual([
      "Keine ID",
      "Fälligkeit ist kein gültiges Datum (JJJJ-MM-TT)",
    ]);
  });
});

describe("publish-to-team helpers", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists local customer names once per normalized spelling", () => {
    expect(
      collectLocalCustomerNames({
        projects: [{ ...project, client: "Brunner Logistik AG" }],
        workPackages: [{ ...workPackage, client: "  brunner logistik ag" }],
        activities: [],
      }),
    ).toEqual(["Brunner Logistik AG"]);
  });

  it("remembers the name selection per user and customer", () => {
    expect(readStoredNameSelection(ME, CUSTOMER)).toEqual([]);
    writeStoredNameSelection(ME, CUSTOMER, ["Brunner Logistik AG"]);
    expect(readStoredNameSelection(ME, CUSTOMER)).toEqual(["Brunner Logistik AG"]);
    expect(readStoredNameSelection(OTHER, CUSTOMER)).toEqual([]);
  });

  it("ignores a damaged stored selection", () => {
    window.localStorage.setItem(`sysing.publish-name-selection.v1:${ME}:${CUSTOMER}`, "{kaputt");
    expect(readStoredNameSelection(ME, CUSTOMER)).toEqual([]);
  });
});
