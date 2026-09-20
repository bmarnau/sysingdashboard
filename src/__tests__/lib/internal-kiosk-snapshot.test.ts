import { describe, expect, it } from "vitest";
import { mapInternalKioskSnapshot } from "@/lib/kiosk/internal-kiosk-snapshot";
import type { ProjectControllingResult } from "@/lib/project-controlling/project-controlling-contract";

function result(overrides: Partial<ProjectControllingResult> = {}): ProjectControllingResult {
  return {
    filters: {
      from: "2026-09-01",
      to: "2026-09-19",
      billable: "all",
      systemhouseId: "11111111-1111-4111-8111-111111111111",
    },
    summary: {
      activities: 8,
      customers: 2,
      projects: 3,
      workPackages: 5,
      totalHours: 25,
      billableHours: 20,
      nonBillableHours: 5,
      billableQuotePercent: 80,
    },
    trend: [],
    scopeOptions: [],
    rows: [],
    completeness: {
      categoryUnobservedRows: 1,
      categoryUnknownRows: 1,
      rowsWithoutProject: 0,
      rowsWithoutWorkPackage: 0,
    },
    freshness: {
      oldestPublishedAt: "2026-09-14T08:00:00.000Z",
      latestPublishedAt: "2026-09-18T10:00:00.000Z",
      observedRows: 16,
    },
    ...overrides,
  };
}

describe("BSF-KIOSK-02 internal kiosk snapshot mapper", () => {
  it("maps the BSF-03A summary without recalculating hours or billable values", () => {
    const mapped = mapInternalKioskSnapshot(result());

    expect(mapped.period).toEqual({ from: "2026-09-01", to: "2026-09-19" });
    expect(mapped.observedAt).toBe("2026-09-18T10:00:00.000Z");
    expect(mapped.domains.map((domain) => domain.id)).toEqual([
      "projects",
      "workPackages",
      "activities",
    ]);
    expect(mapped.domains.every((domain) => domain.sourceKind === "internal")).toBe(true);
    expect(mapped.domains.every((domain) => domain.observedAt === mapped.observedAt)).toBe(true);

    const activityMetrics = mapped.domains.find((domain) => domain.id === "activities")?.metrics;
    expect(activityMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Tätigkeiten", value: 8 }),
        expect.objectContaining({ label: "Gesamtstunden", value: 25, unit: "h" }),
        expect.objectContaining({ label: "Abrechenbare Stunden", value: 20, unit: "h" }),
        expect.objectContaining({ label: "Nicht abrechenbare Stunden", value: 5, unit: "h" }),
        expect.objectContaining({ label: "Abrechenbarer Anteil", value: 80, unit: "%" }),
      ]),
    );
  });

  it("does not expose customer names, activity titles, engineer identities or euro values", () => {
    const source = result({
      rows: [
        {
          activityId: "secret-activity-id",
          activityDate: "2026-09-01",
          activityTitle: "Vertrauliche Tätigkeit",
          durationHours: 25,
          billable: true,
          billingStatus: "open",
          systemhouseId: "secret-systemhouse-id",
          systemhouseName: "Systemhaus Geheim",
          customerId: "secret-customer-id",
          customerName: "Kunde Geheim",
          projectSourceId: "project-secret",
          projectName: "Projekt Geheim",
          workPackageSourceId: "wp-secret",
          workPackageTitle: "AP Geheim",
          categoryObserved: true,
          categoryKey: "secret-category",
          categoryLabel: "Geheim",
          categoryState: "known",
        },
      ],
    });

    const serialized = JSON.stringify(mapInternalKioskSnapshot(source));

    for (const forbidden of [
      "Vertrauliche Tätigkeit",
      "Kunde Geheim",
      "Systemhaus Geheim",
      "secret-customer-id",
      "secret-systemhouse-id",
      "project-secret",
      "wp-secret",
      "€",
      "EUR",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keeps successful internal data explicit when source freshness is unknown", () => {
    const mapped = mapInternalKioskSnapshot(
      result({
        freshness: {
          oldestPublishedAt: null,
          latestPublishedAt: null,
          observedRows: 0,
        },
      }),
    );

    expect(mapped.observedAt).toBeNull();
    expect(mapped.domains.every((domain) => domain.sourceKind === "internal")).toBe(true);
    expect(mapped.domains.every((domain) => domain.level === "unknown")).toBe(true);
    expect(mapped.domains.every((domain) => domain.observedAt === null)).toBe(true);
    expect(mapped.domains.every((domain) => domain.note?.includes("unbekannt"))).toBe(true);
  });
});
