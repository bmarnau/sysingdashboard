import { describe, expect, it } from "vitest";
import { DashboardSearchSchema } from "@/components/dashboard/search";

describe("Cockpit-Drill-down ins Dashboard", () => {
  it("übernimmt ausschließlich den vorhandenen AVKK-Management-Reiter", () => {
    expect(DashboardSearchSchema.parse({ tab: "avkk-management", role: "administrator" })).toEqual({
      tab: "avkk-management",
    });
  });
  it.each([{}, { tab: "users" }, { tab: ["avkk-management"] }])(
    "ignoriert unbekannte Reiter %j",
    (input) => {
      expect(DashboardSearchSchema.parse(input).tab).toBeUndefined();
    },
  );
});
