#!/usr/bin/env node
/**
 * CI-Check: Konsistenz und Invarianten des RBAC-Modells.
 *
 * - Parsed Backend-Matrix (`backend/services/rbac.mjs`) zur Laufzeit.
 * - Parsed Frontend-Matrix (`src/lib/rbac/permissions.ts`) per Regex.
 * - Vergleicht beide Matrizen 1:1 (Drift = Fehler).
 * - Verifiziert Invarianten gemäß Prompt 7 / Check 7.
 *
 * Exit 0 = ok, Exit 1 = Verstoß.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ROLE_PERMISSIONS as BACKEND_MATRIX,
  ALL_ROLES,
  ALL_PERMISSIONS,
} from "../backend/services/rbac.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_PATH = resolve(__dirname, "../src/lib/rbac/permissions.ts");

function fail(msg) {
  console.error(`[rbac:check] FAIL — ${msg}`);
  process.exitCode = 1;
}
function ok(msg) {
  console.log(`[rbac:check] ok — ${msg}`);
}

/* -------- 1. Frontend-Matrix parsen -------- */
const src = readFileSync(FRONTEND_PATH, "utf8");
const objStart = src.indexOf("export const ROLE_PERMISSIONS");
if (objStart < 0) {
  fail("ROLE_PERMISSIONS in permissions.ts nicht gefunden");
  process.exit(1);
}
const frontendMatrix = {};
for (const role of ALL_ROLES) {
  // \\b allein reicht nicht (administrator ⊂ systemadministrator) — daher (^|[^a-z]) Lookbehind-Surrogat.
  const re = new RegExp(`(?:^|[^a-zA-Z])${role}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const m = src.slice(objStart).match(re);
  if (!m) {
    fail(`Rolle ${role} fehlt im Frontend`);
    continue;
  }
  const perms = [...m[1].matchAll(/"([a-z.]+)"/g)].map((x) => x[1]);
  frontendMatrix[role] = perms;
}

/* -------- 2. Drift-Vergleich -------- */
for (const role of ALL_ROLES) {
  const a = [...(BACKEND_MATRIX[role] ?? [])].sort();
  const b = [...(frontendMatrix[role] ?? [])].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    fail(`Drift bei Rolle ${role}\n  backend : ${a.join(", ")}\n  frontend: ${b.join(", ")}`);
  }
}
ok("Frontend- und Backend-Matrix sind identisch");

/* -------- 3. Permission-Vollständigkeit -------- */
for (const role of ALL_ROLES) {
  for (const p of frontendMatrix[role] ?? []) {
    if (!ALL_PERMISSIONS.includes(p)) fail(`Unbekannte Permission "${p}" bei Rolle ${role}`);
  }
}
ok("Alle vergebenen Permissions sind im offiziellen Katalog");

/* -------- 4. Invarianten -------- */
const holders = (perm) => ALL_ROLES.filter((r) => BACKEND_MATRIX[r].includes(perm));

const dbBuild = holders("azure.database.build");
if (JSON.stringify(dbBuild) !== JSON.stringify(["systemadministrator"])) {
  fail(`azure.database.build darf nur systemadministrator besitzen, hat: ${dbBuild.join(", ")}`);
} else ok("azure.database.build ⊆ {systemadministrator}");

const importers = holders("azure.import");
const allowedImport = ["systemadministrator", "administrator"];
if (importers.some((r) => !allowedImport.includes(r))) {
  fail(`azure.import darf nur sysadmin/admin besitzen, hat: ${importers.join(", ")}`);
} else ok("azure.import ⊆ {systemadministrator, administrator}");

const exporters = holders("azure.export");
for (const r of importers) {
  if (!exporters.includes(r)) fail(`Rolle ${r} hat azure.import, aber nicht azure.export`);
}
ok("Import-Träger ⊆ Export-Träger");

const rolesMgr = holders("roles.manage");
if (JSON.stringify(rolesMgr) !== JSON.stringify(["systemadministrator"])) {
  fail(`roles.manage nur für systemadministrator erlaubt, hat: ${rolesMgr.join(", ")}`);
} else ok("roles.manage ⊆ {systemadministrator}");

for (const perm of ["users.manage", "auditlog.view", "backup.restore"]) {
  const h = holders(perm);
  if (h.some((r) => !["systemadministrator", "administrator"].includes(r))) {
    fail(`${perm} außerhalb Admin-Scope: ${h.join(", ")}`);
  }
}
ok("users.manage / auditlog.view / backup.restore nur Admins");

const viewerPerms = BACKEND_MATRIX.viewer;
for (const p of viewerPerms) {
  if (
    p.endsWith(".edit") ||
    p.startsWith("azure.") ||
    p.endsWith(".manage") ||
    p.startsWith("backup.")
  ) {
    fail(`viewer ist nicht read-only — besitzt ${p}`);
  }
}
ok("viewer ist read-only");

const customerPerms = BACKEND_MATRIX.customer;
if (customerPerms.includes("systemstatus.view")) {
  fail("customer darf systemstatus.view nicht besitzen");
}
for (const p of customerPerms) {
  if (
    p.endsWith(".edit") ||
    p.startsWith("azure.") ||
    p.endsWith(".manage") ||
    p.startsWith("backup.") ||
    p === "auditlog.view"
  ) {
    fail(`customer hat unzulässige Admin-Permission ${p}`);
  }
}
ok("customer hat keine Admin-/Edit-Permissions");

if (process.exitCode === 1) {
  console.error("\n[rbac:check] RBAC-Verstöße gefunden.");
  process.exit(1);
} else {
  console.log("\n[rbac:check] Alle Invarianten erfüllt.");
}
