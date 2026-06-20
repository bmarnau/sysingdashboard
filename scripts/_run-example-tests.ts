/**
 * Eigentliche Test-Logik — wird von `scripts/test-example-files.mjs` via
 * Bun gestartet. Dadurch können wir die TS-Module direkt importieren.
 */
// Minimaler Browser-Shim für Module, die `window`/`localStorage`
// referenzieren (json-import-service, user-management, target-time).
// Reicht für reine Lese-/Diff-Operationen.
if (typeof (globalThis as Record<string, unknown>).window === "undefined") {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
    clear: () => store.clear(),
  };
  (globalThis as Record<string, unknown>).window = { localStorage: ls } as unknown;
  (globalThis as Record<string, unknown>).localStorage = ls;
}

import { ExampleFileService } from "../src/lib/example-file-service";
import { JsonSchemaValidationService } from "../src/lib/json-schema-validation-service";
import { JSON_SCHEMA_VERSION, isSensitiveFieldName } from "../src/lib/json-schema";
import { JsonImportService } from "../src/lib/json-import-service";

let failures = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${name}`);
    console.error(`     ${err instanceof Error ? err.message : err}`);
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function deepCollectKeys(o: unknown, out = new Set<string>()): Set<string> {
  if (o && typeof o === "object") {
    if (Array.isArray(o)) {
      for (const v of o) deepCollectKeys(v, out);
    } else {
      for (const [k, v] of Object.entries(o)) {
        out.add(k);
        deepCollectKeys(v, out);
      }
    }
  }
  return out;
}

console.log("Beispieldatei-Tests");

for (const file of ExampleFileService.listFiles()) {
  console.log(`\n${file.name}`);
  let doc: ReturnType<typeof file.build>;

  test("JSON ist serialisierbar", () => {
    doc = file.build();
    JSON.parse(JSON.stringify(doc));
  });

  test("Schema-Version vorhanden und korrekt", () => {
    assert(doc.schemaVersion === JSON_SCHEMA_VERSION, `erwartet ${JSON_SCHEMA_VERSION}, erhalten ${doc.schemaVersion}`);
  });

  test("Pflichtfelder vorhanden", () => {
    assert(doc.exportType === "full" || doc.exportType === "partial", "exportType ungültig");
    assert(typeof doc.exportedAt === "string" && doc.exportedAt.length > 0, "exportedAt fehlt");
    assert(typeof doc.exportedBy === "string", "exportedBy fehlt");
    assert(typeof doc.dashboardVersion === "string", "dashboardVersion fehlt");
  });

  test("Schema- und Referenzprüfung gültig", () => {
    const res = JsonSchemaValidationService.validate(doc);
    assert(res.schemaValid, `Schema ungültig: ${res.issues.map((i) => i.message).join("; ")}`);
    const errors = res.issues.filter((i) => i.severity === "error");
    assert(errors.length === 0, `Fehler: ${errors.map((i) => `${i.path}:${i.message}`).join("; ")}`);
  });

  test("Benutzerzuordnung auf engineerId konsistent", () => {
    const userIds = new Set((doc.users ?? []).map((u) => u.id));
    if (userIds.size === 0) return;
    for (const a of doc.activities ?? []) {
      if (a.engineerId) assert(userIds.has(a.engineerId), `engineerId ${a.engineerId} unbekannt`);
    }
    for (const t of doc.timeEntries ?? []) {
      if (t.engineerId) assert(userIds.has(t.engineerId), `engineerId ${t.engineerId} unbekannt`);
    }
  });

  test("Projekt → Arbeitspaket → Tätigkeit-Kette gültig", () => {
    const projectIds = new Set((doc.projects ?? []).map((p) => p.id));
    const wpIds = new Set((doc.workPackages ?? []).map((w) => w.id));
    for (const w of doc.workPackages ?? []) {
      if (w.projectId && projectIds.size > 0) {
        assert(projectIds.has(w.projectId), `wp ${w.id}: unbekanntes projekt ${w.projectId}`);
      }
    }
    for (const a of doc.activities ?? []) {
      if (a.workPackageId && wpIds.size > 0) {
        assert(wpIds.has(a.workPackageId), `activity ${a.id}: unbekanntes wp ${a.workPackageId}`);
      }
    }
  });

  test("Keine sensiblen Felder enthalten", () => {
    const keys = [...deepCollectKeys(doc)];
    const bad = keys.filter((k) => isSensitiveFieldName(k));
    assert(bad.length === 0, `verbotene Feldnamen: ${bad.join(", ")}`);
  });
}

console.log(`\n${total - failures}/${total} Tests grün.`);
if (failures > 0) {
  console.error(`${failures} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
