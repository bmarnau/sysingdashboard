import { describe, expect, it } from "vitest";
import {
  hasProjectControllingFilterErrors,
  validateProjectControllingFilters,
} from "@/lib/project-controlling/filter-validation";
import { PROJECT_CONTROLLING_MAX_DAYS } from "@/lib/project-controlling/project-controlling-contract";

describe("project controlling filter validation (CONTROLLING-FILTER)", () => {
  it("accepts a valid range", () => {
    const errors = validateProjectControllingFilters({ from: "2026-09-01", to: "2026-09-30" });

    expect(errors).toEqual({});
    expect(hasProjectControllingFilterErrors(errors)).toBe(false);
  });

  it("reports an empty date field while typing instead of calling the server", () => {
    const errors = validateProjectControllingFilters({ from: "", to: "2026-09-30" });

    expect(errors.from).toBeDefined();
    expect(errors.to).toBeUndefined();
    expect(hasProjectControllingFilterErrors(errors)).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    const errors = validateProjectControllingFilters({ from: "2026-02-30", to: "2026-03-05" });

    expect(errors.from).toBeDefined();
  });

  it("rejects a range that ends before it starts", () => {
    const errors = validateProjectControllingFilters({ from: "2026-09-10", to: "2026-09-01" });

    expect(errors.to).toBeDefined();
  });

  it("counts the range inclusively and accepts exactly the maximum", () => {
    // 2026-01-01 .. 2027-01-01 = 366 Kalendertage (2026 hat 365 Tage, Start und Ende inklusive)
    expect(PROJECT_CONTROLLING_MAX_DAYS).toBe(366);
    const atLimit = validateProjectControllingFilters({ from: "2026-01-01", to: "2027-01-01" });

    expect(atLimit).toEqual({});
  });

  it("rejects a range longer than the maximum", () => {
    const errors = validateProjectControllingFilters({ from: "2026-01-01", to: "2027-01-02" });

    expect(errors.to).toContain(String(PROJECT_CONTROLLING_MAX_DAYS));
  });
});
