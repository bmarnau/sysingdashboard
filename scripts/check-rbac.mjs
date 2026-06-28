#!/usr/bin/env node
/**
 * RBAC-Konsistenz-Check
 *
 * 1. Lädt die Backend-Matrix (`backend/services/rbac.mjs`) direkt.
 * 2. Parst die Frontend-Matrix (`src/lib/rbac/permissions.ts`) per Regex
 *    aus dem TS-Quelltext und vergleicht sie inhaltsgleich.
 * 3. Erzwingt die im Plan dokumentierten Sicherheitsinvarianten.
 *
 * Exit 0 = ok, 1 = Verstoß. Aufruf: `node scripts/check-rbac.mjs`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROLE_PERMISSIONS as BACKEND_MATRIX,
  ROLE_PRIORITY as BACKEND_PRIORITY,
  ALL_ROLES,
  ALL_PERMISSIONS,
} from "../backend/services/rbac.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(p) {
  return readFileSync(resolve(ROOT, p), "utf8");
}

// --- (1) Frontend-Matrix parsen ---------------------------------------------
const tsSrc = read("src/lib/rbac/permissions.ts");

function parseRolePermissions(src) {
  const start = src.indexOf("export const ROLE_PERMISSIONS");
  if (start === -1) throw new Error("ROLE_PERMISSIONS nicht gefunden");
  const obj = src.slice(start);
  const out = {};
  // matcht: <role>: [ "...", "...", ... ],
  const re = /(\w+)\s*:\s*\[([^\]]*)\]/g;
  let m;
  let count = 0;
  while ((m = re.exec(obj)) !== null) {
    const role = m[1];
    if (!ALL_ROLES.includes(role)) continue;
    const perms = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    out[role] = perms;
    count += 1;
    if (count >= ALL_ROLES.length) break;
  }
  return out;
}

function parseRolePriority(src) {
  const start = src.indexOf("export const ROLE_PRIORITY");
  if (start === -1) throw new Error("ROLE_PRIORITY nicht gefunden");
  const end = src.indexOf("]", start);
  return [...src.slice(start, end).matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const FRONTEND_MATRIX = parseRolePermissions(tsSrc);
const FRONTEND_PRIORITY = parseRolePriority(tsSrc);

// --- (2) Vergleich ----------------------------------------------------------
for (const role of ALL_ROLES) {
  const a = BACKEND_MATRIX[role] ?? [];
  const b = FRONTEND_MATRIX[role] ?? [];
  if (a.length !== b.length || a.some((p, i) => p !== b[i])) {
    errors.push(`Matrix-Drift für Rolle "${role}":\n    backend=[${a.join(",")}]\n    frontend=[${b.join(",")}]`);
  }
}
if (BACKEND_PRIORITY.join(",") !== FRONTEND_PRIORITY.join(",")) {
  errors.push(`ROLE_PRIORITY-Drift: backend=[${BACKEND_PRIORITY}] frontend=[${FRONTEND_PRIORITY}]`);
}

// --- (3) Invarianten --------------------------------------------------------
function holders(perm) {
  return ALL_ROLES.filter((r) => (BACKEND_MATRIX[r] ?? []).includes(perm));
}
function eq(a, b) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((x, i) => x === sb[i]);
}
function subset(a, b) {
  return a.every((x) => b.includes(x));
}

const inv = [
  ["azure.database.build ⊆ {systemadministrator}", () => eq(holders("azure.database.build"), ["systemadministrator"])],
  ["roles.manage ⊆ {systemadministrator}", () => eq(holders("roles.manage"), ["systemadministrator"])],
  [
    "azure.import ⊆ {sysadmin, admin}",
    () => subset(holders("azure.import"), ["systemadministrator", "administrator"]),
  ],
  ["Träger(azure.import) ⊆ Träger(azure.export)", () => subset(holders("azure.import"), holders("azure.export"))],
  ["Träger(azure.import) ⊊ Träger(azure.export)", () => holders("azure.export").length > holders("azure.import").length],
  ["users.manage ⊆ {sysadmin, admin}", () => subset(holders("users.manage"), ["systemadministrator", "administrator"])],
  ["auditlog.view ⊆ {sysadmin, admin}", () => subset(holders("auditlog.view"), ["systemadministrator", "administrator"])],
  ["backup.restore ⊆ {sysadmin, admin}", () => subset(holders("backup.restore"), ["systemadministrator", "administrator"])],
  [
    "viewer ist read-only (keine *.edit/azure.*/*.manage/backup.*)",
    () =>
      !(BACKEND_MATRIX.viewer ?? []).some((p) =>
        /\.edit$|^azure\.|\.manage$|^backup\./.test(p),
      ),
  ],
  ["customer hat kein systemstatus.view", () => !(BACKEND_MATRIX.customer ?? []).includes("systemstatus.view")],
  ["alle Rollen haben dashboard.view", () => ALL_ROLES.every((r) => (BACKEND_MATRIX[r] ?? []).includes("dashboard.view"))],
  ["keine unbekannten Permissions", () =>
    ALL_ROLES.every((r) => (BACKEND_MATRIX[r] ?? []).every((p) => ALL_PERMISSIONS.includes(p))),
  ],
];

for (const [name, fn] of inv) {
  let ok = false;
  try {
    ok = fn();
  } catch (e) {
    errors.push(`Invariante "${name}" hat geworfen: ${e.message}`);
    continue;
  }
  if (!ok) errors.push(`Invariante verletzt: ${name}`);
}

// --- Output -----------------------------------------------------------------
const bold = (s) => `\u001b[1m${s}\u001b[0m`;
console.log(bold("RBAC-Check"));
console.log(`  Rollen:        ${ALL_ROLES.length}`);
console.log(`  Permissions:   ${ALL_PERMISSIONS.length}`);
console.log(`  Invarianten:   ${inv.length}`);
if (errors.length) {
  console.error("\nFehler:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ RBAC-Matrix konsistent und Invarianten erfüllt.");
