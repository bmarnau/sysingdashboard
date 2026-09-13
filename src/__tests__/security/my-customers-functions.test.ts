/**
 * BSF-03 „Meine Kunden“ — statische Sicherheitsverträge der Runtime-Schicht.
 *
 * Diese Tests prüfen den Quelltext der Serverfunktionen/des Adapters auf die im
 * Design (§8) geforderten Invarianten. Die eigentliche Zeilengrenze (RLS,
 * `is_my_customer`) ist im SQL-Testartefakt R01–R18 abgedeckt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const fns = read("src/lib/customer-data-runtime/my-customers.functions.ts");
const adapter = read("src/integrations/supabase/my-customers-adapter.ts");
const listRoute = read("src/routes/_authenticated/meine-kunden/index.tsx");
const detailRoute = read("src/routes/_authenticated/meine-kunden/$systemhouseId.$customerId.tsx");

describe("BSF-03 Serverfunktionen (M09–M12)", () => {
  it("M09: beide Serverfunktionen laufen hinter requireSupabaseAuth", () => {
    const count = fns.match(/\.middleware\(\[requireSupabaseAuth\]\)/g)?.length ?? 0;
    expect(count).toBe(2);
    expect(fns).toContain("export const listMyCustomersFn");
    expect(fns).toContain("export const readMyCustomerDetailFn");
  });

  it("M10: keine Service Role / kein Admin-Client im User-Pfad", () => {
    for (const src of [fns, adapter, listRoute, detailRoute]) {
      expect(src).not.toMatch(/client\.server/);
      expect(src).not.toMatch(/supabaseAdmin/);
      expect(src).not.toMatch(/SERVICE_ROLE/);
    }
  });

  it("M11: Detail nutzt beide Scope-IDs, prüft dashboard.view und is_my_customer, lehnt generisch ab", () => {
    expect(fns).toMatch(/systemhouseId:\s*uuid/);
    expect(fns).toMatch(/customerId:\s*uuid/);
    expect(fns).toContain('"dashboard.view"');
    expect(fns).toContain("customers.isMyCustomer(");
    expect(fns).toContain("if (!allowed) throw new Error(DENIED)");
    expect(fns).toContain(
      "if (!customer || !responsibility || !accessLevel) throw new Error(DENIED)",
    );
    // Identität nur aus dem validierten Token
    expect(fns).toContain("context.userId");
    expect(fns).not.toMatch(/data\.userId/);
  });

  it("M12: Adapter liest nur eigene aktive Responsibilities und ruft is_my_customer auf", () => {
    expect(adapter).toContain('.from("customer_responsibility")');
    expect(adapter).toContain('.eq("user_id", userId)');
    expect(adapter).toContain('.eq("status", "active")');
    expect(adapter).toContain('.is("valid_to", null)');
    expect(adapter).toContain('supabase.rpc("is_my_customer"');
    // keine Schreibpfade
    expect(adapter).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });

  it("M13: Read-/Write-Indikator und Verantwortlicher stammen nur aus eigenen Zeilen (user_id = Token)", () => {
    expect(adapter).toContain('.from("customer_access")');
    expect(adapter).toContain('.from("profiles")');
    // customer_access und profiles werden ausschließlich per userId/id des Aufrufers gefiltert
    const accessBlock = adapter.slice(adapter.indexOf('.from("customer_access")'));
    expect(accessBlock).toMatch(/\.eq\("user_id",\s*userId\)/);
    const profileBlock = adapter.slice(adapter.indexOf('.from("profiles")'));
    expect(profileBlock).toMatch(/\.eq\("id",\s*userId\)/);
    // Detail verweigert, wenn Responsibility oder Access im eigenen Kontext fehlt
    expect(fns).toContain(
      "if (!customer || !responsibility || !accessLevel) throw new Error(DENIED)",
    );
    expect(fns).toContain("responsible: { userId: context.userId");
  });

  it("Detailroute hat keine Variante nur über customerId", () => {
    expect(detailRoute).toContain('"/_authenticated/meine-kunden/$systemhouseId/$customerId"');
  });
});
