import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const components = [
  "ProjectControllingView.tsx",
  "ProjectControllingFilters.tsx",
  "ProjectControllingSummary.tsx",
  "ProjectControllingDrilldown.tsx",
];

describe("BSF-03A project controlling component architecture", () => {
  it.each(components)("provides %s as a dedicated read-only UI component", (filename) => {
    expect(existsSync(resolve(process.cwd(), "src/components/project-controlling", filename))).toBe(
      true,
    );
  });

  it("delegates the route body to ProjectControllingView", () => {
    const routePath = resolve(process.cwd(), "src/routes/_authenticated/projektcontrolling.tsx");
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain('from "@/components/project-controlling/ProjectControllingView"');
    expect(source).toContain("<ProjectControllingView");
  });
});
