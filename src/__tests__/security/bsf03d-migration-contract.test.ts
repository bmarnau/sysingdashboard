/**
 * BSF-03D Review-Fix Runde 1 — statischer Vertragstest der Repo-Migration
 * `0000_bsf03d_reference_data_systemhouse_scope.sql`.
 *
 * Geprüft wird ausschließlich der SQL-Text (keine DB-Verbindung):
 *  - HIGH-2: Alt-Unique-Vertrag (catalog_id,key) wird strukturell über
 *    pg_constraint/pg_attribute erkannt, nicht nur über einen festen Namen.
 *  - MEDIUM-1: FK-Existenzprüfung ist tabellenqualifiziert (conrelid).
 *  - LOW-1: scope_type-Zielvertrag (DEFAULT 'global' + NOT NULL) wird auch
 *    bei bereits vorhandener Spalte hergestellt; NULLs vorher normalisiert.
 *  - Keine Datenlöschung, kein DROP TABLE, kein RESET, keine Service-Role.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = join(
  process.cwd(),
  "drizzle",
  "migrations",
  "0000_bsf03d_reference_data_systemhouse_scope.sql",
);
const SQL = readFileSync(FILE, "utf8");
const FLAT = SQL.replace(/\s+/g, " ");

describe("BSF-03D Migration — Vertrag (statisch)", () => {
  it("should_qualifyFkExistenceCheckByTable_when_checkingSystemhouseFk", () => {
    const m = FLAT.match(
      /conname = 'reference_value_systemhouse_fk'[^)]*conrelid = 'public\.reference_value'::regclass/,
    );
    expect(m, "FK-Check muss mit conrelid = 'public.reference_value'::regclass qualifiziert sein").not.toBeNull();
  });

  it("should_detectLegacyUniqueStructurally_when_replacingCatalogKeyUnique", () => {
    // Kein reiner Namens-Drop mehr.
    expect(FLAT).not.toMatch(/DROP CONSTRAINT IF EXISTS reference_value_catalog_id_key_key/i);
    // Strukturelle Ermittlung: contype 'u' auf public.reference_value über die Spaltenmenge.
    expect(FLAT).toMatch(/pg_constraint/);
    expect(FLAT).toMatch(/pg_attribute/);
    expect(FLAT).toMatch(/contype = 'u'/);
    expect(FLAT).toMatch(/conrelid = 'public\.reference_value'::regclass/);
    expect(FLAT).toMatch(/'catalog_id'/);
    expect(FLAT).toMatch(/'key'/);
    // Der Drop erfolgt dynamisch über den ermittelten Namen.
    expect(FLAT).toMatch(/EXECUTE format\('ALTER TABLE public\.reference_value DROP CONSTRAINT %I'/);
    // Begründung ist dokumentiert.
    expect(SQL).toMatch(/verschiedenen Systemh(ä|ae)usern/);
  });

  it("should_enforceScopeTypeTargetContract_when_columnAlreadyExists", () => {
    expect(FLAT).toMatch(
      /UPDATE public\.reference_catalog SET scope_type = 'global' WHERE scope_type IS NULL/,
    );
    expect(FLAT).toMatch(/ALTER COLUMN scope_type SET DEFAULT 'global'/);
    expect(FLAT).toMatch(/ALTER COLUMN scope_type SET NOT NULL/);
    const idxUpdate = FLAT.indexOf("SET scope_type = 'global' WHERE scope_type IS NULL");
    const idxNotNull = FLAT.indexOf("ALTER COLUMN scope_type SET NOT NULL");
    expect(idxUpdate).toBeGreaterThan(-1);
    expect(idxNotNull).toBeGreaterThan(idxUpdate);
  });

  it("should_containNoDestructiveStatements", () => {
    expect(FLAT).not.toMatch(/DROP TABLE/i);
    expect(FLAT).not.toMatch(/DROP SCHEMA/i);
    expect(FLAT).not.toMatch(/DROP COLUMN/i);
    expect(FLAT).not.toMatch(/TRUNCATE/i);
    expect(FLAT).not.toMatch(/\bDELETE FROM\b/i);
    expect(FLAT).not.toMatch(/\bRESET\b/i);
    expect(FLAT).not.toMatch(/service_role/i);
    expect(FLAT).not.toMatch(/supabase_admin/i);
    // Nur additive Spalten.
    expect(FLAT).toMatch(/ADD COLUMN IF NOT EXISTS systemhouse_id uuid/);
  });

  it("should_beIdempotent_when_creatingObjects", () => {
    expect(FLAT).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS reference_value_global_key_unique/);
    expect(FLAT).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS reference_value_systemhouse_key_unique/);
    expect(FLAT).toMatch(/DROP TRIGGER IF EXISTS reference_value_validate_scope/);
    expect(FLAT).toMatch(/ON CONFLICT \(key\) DO NOTHING/);
    // Kein CREATE POLICY ohne vorheriges DROP POLICY IF EXISTS.
    const policies = [...FLAT.matchAll(/CREATE POLICY (\w+)/g)].map((m) => m[1]);
    for (const p of policies) {
      expect(FLAT, `DROP POLICY IF EXISTS ${p} fehlt`).toMatch(
        new RegExp(`DROP POLICY IF EXISTS ${p} `),
      );
    }
  });
});
