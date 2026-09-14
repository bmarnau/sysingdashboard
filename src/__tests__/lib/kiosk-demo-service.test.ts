import { beforeEach, describe, expect, it } from "vitest";
import type { UserProfile } from "@/lib/user-management";
import {
  loadKioskDemoDataForActor,
  removeKioskDemoDataForActor,
} from "@/lib/kiosk/kiosk-demo-service";
import { readKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-repository";

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

describe("kiosk demo service authorization", () => {
  beforeEach(() => window.localStorage.clear());

  it("allows a user manager to load and remove kiosk demo data", () => {
    const admin = actor("administrator");
    expect(loadKioskDemoDataForActor(admin).version).toBe("1.0.0");
    expect(readKioskDemoDataset()).not.toBeNull();
    removeKioskDemoDataForActor(admin);
    expect(readKioskDemoDataset()).toBeNull();
  });

  it("denies the read-only kiosk actor", () => {
    const kiosk = actor("kiosk");
    expect(() => loadKioskDemoDataForActor(kiosk)).toThrow("Permission denied: users.manage");
    expect(() => removeKioskDemoDataForActor(kiosk)).toThrow("Permission denied: users.manage");
  });

  it("denies a normal viewer", () => {
    expect(() => loadKioskDemoDataForActor(actor("viewer"))).toThrow(
      "Permission denied: users.manage",
    );
  });
});
