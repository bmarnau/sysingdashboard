/**
 * BSF-03D Review-Fix Runde 1 — statischer Vertragstest der kanonischen
 * Supabase-Repo-Migration
 * `20260913213000_bsf03d_workpackage_category_reference_data.sql`.
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
  "supabase",
  "migrations",
  "20260913213000_bsf03d_workpackage_category_reference_data.sql",
);
const SQL = readFileSync(FILE, "utf8");
const FLAT = SQL.replace(/\s+/g, " ");

describe("BSF-03D Migration — Vertrag (statisch)", () => {
  it("should_qualifyFkExistenceCheckByTable_when_checkingSystemhouseFk", () => {
    const m = FLAT.match(
      /conname = 'reference_value_systemhouse_fk'[^)]*conrelid = 'public\.reference_value'::regclass/,
    );
    expect(
      m,
      "FK-Check muss mit conrelid = 'public.reference_value'::regclass qualifiziert sein",
    ).not.toBeNull();
  });

  it("should_detectLegacyUniqueStructurally_when_replacingCatalogKeyUnique", () => {
    expect(FLAT).not.toMatch(/DROP CONSTRAINT IF EXISTS reference_value_catalog_id_key_key/i);

    const start = FLAT.indexOf("Abloesung des alten globalen Unique-Vertrags");
    const end = FLAT.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS reference_value_global_key_unique");
    expect(start, "Ablöse-Kommentar fehlt").toBeGreaterThan(-1);
    expect(end, "Partieller Global-Index fehlt").toBeGreaterThan(start);
    const BLOCK = FLAT.slice(start, end);

    expect(BLOCK).toMatch(/FROM pg_constraint c/);
    expect(BLOCK).toMatch(/FROM pg_attribute a/);
    expect(BLOCK).toMatch(/c\.conrelid = 'public\.reference_value'::regclass/);
    expect(BLOCK).toMatch(/c\.contype = 'u'/);
    expect(BLOCK).toMatch(/a\.attrelid = c\.conrelid/);
    expect(BLOCK).toMatch(/a\.attnum = ANY \(c\.conkey\)/);

    const setCompare =
      /\( SELECT array_agg\(a\.attname::text ORDER BY a\.attname\) FROM pg_attribute a WHERE a\.attrelid = c\.conrelid AND a\.attnum = ANY \(c\.conkey\) \) = ARRAY\['catalog_id', 'key'\]::text\[\]/;
    expect(BLOCK, "Exakter Mengenvergleich (catalog_id,key) fehlt").toMatch(setCompare);
    expect(BLOCK).not.toMatch(/@>|<@/);
    const arrays = [...BLOCK.matchAll(/ARRAY\[([^\]]*)\]/g)].map((m) => m[1]);
    expect(arrays).toEqual(["'catalog_id', 'key'"]);

    expect(BLOCK).toMatch(
      /EXECUTE format\('ALTER TABLE public\.reference_value DROP CONSTRAINT %I', v_conname\)/,
    );
    expect(BLOCK).not.toMatch(/DROP CONSTRAINT IF EXISTS/i);
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
    expect(FLAT).toMatch(/ADD COLUMN IF NOT EXISTS systemhouse_id uuid/);
  });

  it("should_beIdempotent_when_creatingObjects", () => {
    expect(FLAT).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS reference_value_global_key_unique/);
    expect(FLAT).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS reference_value_systemhouse_key_unique/,
    );
    expect(FLAT).toMatch(/DROP TRIGGER IF EXISTS reference_value_validate_scope/);
    expect(FLAT).toMatch(/ON CONFLICT \(key\) DO NOTHING/);
    const policies = [...FLAT.matchAll(/CREATE POLICY (\w+)/g)].map((m) => m[1]);
    for (const p of policies) {
      expect(FLAT, `DROP POLICY IF EXISTS ${p} fehlt`).toMatch(
        new RegExp(`DROP POLICY IF EXISTS ${p} `),
      );
    }
  });
});
