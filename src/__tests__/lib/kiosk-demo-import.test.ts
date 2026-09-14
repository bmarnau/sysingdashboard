import { beforeEach, describe, expect, it } from "vitest";
import type { UserProfile } from "@/lib/user-management";
import {
  loadKioskDemoDataset,
  readKioskDemoDataset,
} from "@/lib/kiosk/kiosk-demo-repository";
import { importKioskDemoJsonForActor } from "@/lib/kiosk/kiosk-demo-service";

function actor(role: UserProfile["role"]): UserProfile {
  return {
    id: `test-${role}`,
    firstName: "Test",
    lastName: role,
    displayName: `Test ${role}`,
    email: `${role}@example.invalid`,
    phone: "",
    role,
    status: "active",
    mfaEnabled: false,
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
  };
}

function validJson(): string {
  return JSON.stringify({
    schemaVersion: "sysing.kiosk.demo.v1",
    synthetic: true,
    snapshot: {
      mode: "demo",
      datasetVersion: "1.0.0",
      generatedAt: "2026-09-14T00:00:00Z",
      observedAt: "2026-09-14T00:00:00Z",
      domains: [
        {
          id: "projects",
          title: "Projekte",
          level: "ok",
          metrics: [{ value: 8, label: "Aktive Projekte", level: "ok" }],
        },
      ],
    },
  });
}

describe("kiosk demo JSON import", () => {
  beforeEach(() => window.localStorage.clear());

  it("imports a validated synthetic demo snapshot for an administrator", () => {
    const result = importKioskDemoJsonForActor(actor("administrator"), validJson(), () =>
      new Date("2026-09-14T08:00:00Z"),
    );

    expect(result.version).toBe("1.0.0");
    expect(result.loadedAt).toBe("2026-09-14T08:00:00.000Z");
    expect(result.domains[0]?.id).toBe("projects");
    expect(readKioskDemoDataset()).toEqual(result);
  });

  it("fails closed and preserves last-good data on invalid input", () => {
    const lastGood = loadKioskDemoDataset(() => new Date("2026-09-14T07:00:00Z"));
    const invalid = JSON.stringify({
      schemaVersion: "sysing.kiosk.demo.v1",
      synthetic: false,
      snapshot: { mode: "demo", datasetVersion: "1.0.0", domains: [] },
    });

    expect(() => importKioskDemoJsonForActor(actor("administrator"), invalid)).toThrow();
    expect(readKioskDemoDataset()).toEqual(lastGood);
  });

  it("rejects an unknown root field", () => {
    const parsed = JSON.parse(validJson()) as Record<string, unknown>;
    parsed.extra = "not allowed";
    expect(() =>
      importKioskDemoJsonForActor(actor("administrator"), JSON.stringify(parsed)),
    ).toThrow();
  });

  it("rejects oversized input before replacing the dataset", () => {
    const lastGood = loadKioskDemoDataset();
    const oversized = `${validJson()}${" ".repeat(256 * 1024)}`;
    expect(() => importKioskDemoJsonForActor(actor("administrator"), oversized)).toThrow();
    expect(readKioskDemoDataset()).toEqual(lastGood);
  });

  it("denies kiosk and viewer actors", () => {
    expect(() => importKioskDemoJsonForActor(actor("kiosk"), validJson())).toThrow(
      "Permission denied: users.manage",
    );
    expect(() => importKioskDemoJsonForActor(actor("viewer"), validJson())).toThrow(
      "Permission denied: users.manage",
    );
  });
});
