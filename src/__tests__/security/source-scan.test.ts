/**
 * Security-Suite – Quellcode-Scans.
 *
 * Zwei statische Prüfungen:
 *  1. `role === "..."` außerhalb von `src/lib/rbac/**` — Vermeidet
 *     lokale Rollen-Vergleiche, die eine neue Rolle sonst überall in
 *     der Codebasis brechen ließen. Whitelist mit Begründung.
 *  2. Keine Token-/JWT-artigen Werte in localStorage/sessionStorage-
 *     Aufrufen — Session-Secrets gehören nicht in Browser-Storage.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full);
  }
  return out;
}

const ALL_FILES = walk(SRC);

describe("Source-Scan – direkte Rollen-Vergleiche", () => {
  const RBAC_ALLOWED = /[/\\](src[/\\]lib[/\\]rbac|__tests__|hooks[/\\]useCurrentUser)/;
  // Whitelist: dokumentierte Ausnahmen. Jede neue Ausnahme braucht Begründung.
  const WHITELIST_FILES = new Set<string>([
    // Wird via helpVisibleForRole geführt — dort ist role-Vergleich absichtlich.
    join(SRC, "lib", "help-documentation.ts"),
    // Kern der Rollen-Definition selbst.
    join(SRC, "lib", "user-management.ts"),
    // Ownership-Filter für Engineer (dokumentiert in permissions.ts).
    join(SRC, "components", "PermissionGate.tsx"),
  ]);

  const OFFENDING = /\brole\s*===\s*["'](systemadministrator|administrator|teamlead|projectmanager|engineer|customer|viewer)["']/;

  it("should_notHaveDirectRoleEqualityChecks_outsideRbacModules", () => {
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (RBAC_ALLOWED.test(file)) continue;
      if (WHITELIST_FILES.has(file)) continue;
      const src = readFileSync(file, "utf8");
      // Kommentare grob filtern (Zeilen, die mit // oder * beginnen).
      const stripped = src
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join("\n");
      if (OFFENDING.test(stripped)) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders, `Nutze can()/PermissionGate statt role===. Offenders:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("Source-Scan – keine Auth-Tokens in Browser-Storage", () => {
  const STORAGE_TOKEN_RE =
    /(local|session)Storage\s*\.\s*setItem\s*\(\s*["'][^"']*(token|jwt|bearer|access_token|refresh_token|session)[^"']*["']/i;

  it("should_notPersistTokenLikeKeys_inLocalOrSessionStorage", () => {
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (/__tests__/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      if (STORAGE_TOKEN_RE.test(src)) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders, `Auth-Tokens gehören nicht in localStorage/sessionStorage:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("should_notImportLocalStorageForAuth_inClientCode", () => {
    // Sanity-Scan: `Authorization`-Header aus localStorage konstruieren
    // wäre ein häufiges Anti-Pattern.
    const OFFENDING = /Authorization["'\s:]+.{0,20}localStorage/i;
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (/__tests__/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      if (OFFENDING.test(src)) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders).toEqual([]);
  });
});
