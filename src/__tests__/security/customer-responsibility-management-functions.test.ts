import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const fns = read("src/lib/customer-data-runtime/customer-responsibility-management.functions.ts");
const adapter = read("src/integrations/supabase/customer-responsibility-management-adapter.ts");

describe("BSF-03 P5 Server-/Provider-Sicherheitsvertrag", () => {
  it("alle vier Serverfunktionen erzwingen Supabase-Authentifizierung", () => {
    expect(fns.match(/\.middleware\(\[requireSupabaseAuth\]\)/g)?.length ?? 0).toBe(4);
    expect(fns).toContain("listResponsibilityManagementFn");
    expect(fns).toContain("listResponsibilityCandidatesFn");
    expect(fns).toContain("setCustomerResponsibilityFn");
    expect(fns).toContain("endCustomerResponsibilityFn");
  });

  it("Scope-IDs werden validiert und Benutzeridentität kommt nur aus dem Tokenkontext", () => {
    expect(fns).toContain("z.string().uuid()");
    expect(fns).toContain("context.userId");
    expect(fns).not.toMatch(/data\.(userId|role)/);
  });

  it("kein privilegierter Browser-/Service-Role-Pfad wird eingeführt", () => {
    for (const src of [fns, adapter]) {
      expect(src).not.toMatch(/supabaseAdmin|SERVICE_ROLE|client\.server|getAdminClient/);
    }
  });

  it("Adapter verwendet für fremde Managementdaten ausschließlich die P5-RPCs", () => {
    expect(adapter).toContain('"customer_responsibility_management_overview"');
    expect(adapter).toContain('"customer_responsibility_management_candidates"');
    expect(adapter).toContain('"set_customer_responsibility"');
    expect(adapter).toContain('"end_customer_responsibility"');
    expect(adapter).not.toContain('.from("profiles")');
    expect(adapter).not.toContain('.from("user_roles")');
    expect(adapter).not.toContain('.from("customer")');
    expect(adapter).toContain('.from("systemhouse_membership")');
    expect(adapter).toContain('.eq("user_id", userId)');
  });
});
