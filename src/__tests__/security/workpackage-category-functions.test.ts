import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const fns = read("src/lib/reference-data/workpackage-category.functions.ts");
const adapter = read("src/integrations/supabase/workpackage-category-management-adapter.ts");
const route = read("src/routes/_authenticated/arbeitspaket-kategorien/index.tsx");
const menu = read("src/components/dashboard/header/ServiceMenu.tsx");

describe("BSF-03D Server-/Provider-Sicherheitsvertrag", () => {
  it("alle Management-Serverfunktionen erzwingen Supabase-Authentifizierung", () => {
    expect(fns.match(/\.middleware\(\[requireSupabaseAuth\]\)/g)?.length ?? 0).toBe(4);
    expect(fns).toContain("listWorkPackageCategoryManagementFn");
    expect(fns).toContain("createWorkPackageCategoryFn");
    expect(fns).toContain("updateWorkPackageCategoryFn");
    expect(fns).toContain("deactivateWorkPackageCategoryFn");
  });

  it("Autorisierung basiert auf Tokenidentitaet und referencedata.manage", () => {
    expect(fns).toContain("context.userId");
    expect(fns).toContain("referencedata.manage");
    expect(fns).not.toMatch(/data\.(userId|role)/);
  });

  it("kein privilegierter Service-Role-Pfad wird eingefuehrt", () => {
    for (const src of [fns, adapter]) {
      expect(src).not.toMatch(/supabaseAdmin|SERVICE_ROLE|getAdminClient|service_role/i);
    }
  });

  it("Adapter prueft aktive eigene Membership und kapselt alle Supabase-Tabellenzugriffe", () => {
    expect(adapter).toContain('.from("systemhouse_membership")');
    expect(adapter).toContain('.eq("user_id", userId)');
    expect(adapter).toContain('.eq("status", "active")');
    expect(adapter).toContain('.from("reference_catalog")');
    expect(adapter).toContain('.from("reference_value")');
    expect(fns).not.toContain('.from("reference_value")');
    expect(fns).not.toContain('.from("systemhouse_membership")');
  });

  it("Kategorie-Key und Tenant-Scope sind nach Anlage nicht ueber den Updatepfad veraenderbar", () => {
    expect(fns).toContain("valueId");
    expect(fns).not.toMatch(/updateSchema[\s\S]{0,300}\bkey\s*:/);
    expect(adapter).not.toMatch(/\.update\([^)]*\{[^}]*\bkey\s*:/s);
    expect(adapter).not.toMatch(/\.update\([^)]*\{[^}]*systemhouse_id\s*:/s);
  });

  it("Deaktivierung nutzt Update-Semantik und niemals DELETE", () => {
    expect(adapter).toContain("is_active: false");
    expect(adapter).toContain("valid_to");
    expect(adapter).not.toMatch(/\.delete\s*\(/);
  });

  it("Managementroute und Service-Menue sind auf den neuen Bereich verdrahtet", () => {
    expect(route).toContain("Arbeitspaket-Kategorien");
    expect(menu).toContain('can(currentUser, "referencedata.manage")');
    expect(menu).toContain('to: "/arbeitspaket-kategorien"');
  });
});
