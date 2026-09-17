import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const routePath = resolve(process.cwd(), "src/routes/_authenticated/kiosk.tsx");
const authenticatedRoutePath = resolve(process.cwd(), "src/routes/_authenticated/route.tsx");

describe("kiosk route contract", () => {
  it("defines the authenticated /kiosk child route through the provider boundary", () => {
    const exists = existsSync(routePath);
    expect(exists).toBe(true);
    if (!exists) return;

    const source = readFileSync(routePath, "utf8");
    expect(source).toContain('createFileRoute("/_authenticated/kiosk")');
    expect(source).toContain("createDemoKioskDataProvider");
    expect(source).toContain("useKioskSnapshot");
    expect(source).toContain("useKioskSessionWatchdog");
    expect(source).toContain("<KioskView");
    expect(source).toContain("performLogout");
    expect(source).not.toMatch(/supabase\.from\(|service_role|fetch\(/i);
  });

  it("fails closed when kiosk permission lookup is unavailable", () => {
    const source = readFileSync(authenticatedRoutePath, "utf8");

    expect(source).toContain("if (kioskPermissionError)");
    expect(source).toContain('to: "/auth"');
    expect(source).toContain('reason: "unavailable"');
    expect(source).not.toContain("if (!kioskPermissionError)");
  });
});
