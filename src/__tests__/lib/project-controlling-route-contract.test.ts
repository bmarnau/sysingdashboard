import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routePath = resolve(process.cwd(), "src/routes/_authenticated/projektcontrolling.tsx");
const dashboardPath = resolve(process.cwd(), "src/routes/_authenticated/dashboard.tsx");

describe("BSF-03A project controlling route contract", () => {
  it("registers /projektcontrolling below _authenticated and gates the page with the atomic permission", () => {
    const exists = existsSync(routePath);
    expect(exists).toBe(true);
    if (!exists) return;

    const source = readFileSync(routePath, "utf8");
    expect(source).toContain('createFileRoute("/_authenticated/projektcontrolling")');
    expect(source).toContain('permission="project.controlling.view"');
    expect(source).toContain("readProjectControllingFn");
    expect(source).not.toContain("Project.lead");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  it("shows the dashboard navigation link only through project.controlling.view", () => {
    const source = readFileSync(dashboardPath, "utf8");

    expect(source).toContain('permission="project.controlling.view"');
    expect(source).toContain('to="/projektcontrolling"');
  });
});
