import { describe, expect, it } from "vitest";
import { sharedProjectionPublishSchema } from "@/lib/customer-data-runtime/shared-projection.schema";

const SYSTEMHOUSE_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";

function payload(workPackage: Record<string, unknown> = {}) {
  return {
    systemhouseId: SYSTEMHOUSE_ID,
    customerId: CUSTOMER_ID,
    snapshotComplete: true,
    customerMappings: [],
    projects: [],
    workPackages: [
      {
        id: "wp-1",
        title: "Arbeitspaket 1",
        status: "offen",
        priority: "mittel",
        ...workPackage,
      },
    ],
    activities: [],
  };
}

describe("shared projection publish schema (DUE-DROP)", () => {
  it("keeps due and categoryKey instead of silently stripping them", () => {
    const parsed = sharedProjectionPublishSchema.parse(
      payload({ due: "2026-10-15", categoryKey: "wartung" }),
    );

    expect(parsed.workPackages[0]).toMatchObject({
      id: "wp-1",
      due: "2026-10-15",
      categoryKey: "wartung",
    });
  });

  it("treats an empty due string (cleared dialog field) as no due date", () => {
    const parsed = sharedProjectionPublishSchema.parse(payload({ due: "" }));

    expect(parsed.workPackages[0].due).toBeUndefined();
  });

  it("treats missing or null due and categoryKey as no value", () => {
    const missing = sharedProjectionPublishSchema.parse(payload());
    const nulls = sharedProjectionPublishSchema.parse(payload({ due: null, categoryKey: null }));

    expect(missing.workPackages[0].due).toBeUndefined();
    expect(missing.workPackages[0].categoryKey).toBeNull();
    expect(nulls.workPackages[0].due).toBeUndefined();
    expect(nulls.workPackages[0].categoryKey).toBeNull();
  });

  it("normalizes an empty categoryKey to null", () => {
    const parsed = sharedProjectionPublishSchema.parse(payload({ categoryKey: "  " }));

    expect(parsed.workPackages[0].categoryKey).toBeNull();
  });

  it.each(["15.10.2026", "2026-10-15T10:00:00Z", "2026-02-30", "2026-13-01", "morgen"])(
    "rejects the invalid due value %s",
    (due) => {
      expect(sharedProjectionPublishSchema.safeParse(payload({ due })).success).toBe(false);
    },
  );
});
