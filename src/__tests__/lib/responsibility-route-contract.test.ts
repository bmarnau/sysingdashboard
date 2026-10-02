import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routePath = resolve(process.cwd(), "src/routes/_authenticated/verantwortungen.tsx");
const dashboardPath = resolve(process.cwd(), "src/routes/_authenticated/dashboard.tsx");

describe("BSF-03E P3a responsibility person-view route contract", () => {
  it("registers /verantwortungen with its accessible local permission fallback", () => {
    expect(existsSync(routePath)).toBe(true);
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain('createFileRoute("/_authenticated/verantwortungen")');
    expect(source).toContain('permission="avkk.management.view"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("Keine Berechtigung für die Verantwortungsansicht.");
    expect(source).toContain("max-w-7xl");
    expect(source).toContain("PersonResponsibilityView");
  });

  it("shows the dashboard entry only through avkk.management.view", () => {
    const source = readFileSync(dashboardPath, "utf8");

    expect(source).toContain('permission="avkk.management.view"');
    expect(source).toContain('to="/verantwortungen"');
  });
});
