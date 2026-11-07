/**
 * QS-06 / A42 — Vertrag: Jede Rolle mit `backup.restore` hat `billing.view`.
 *
 * Hintergrund: Das ZIP-Backup 2.0 (`src/lib/backup/zip.ts`, `buildZip`) bettet
 * `dashboard.json` mit `includeBilling: true` ein (seit PR 283). Die Sicherung
 * enthält damit immer Stundensätze (`hourlyRate`). Das ist nur zulässig, solange
 * jede Rolle, die Sicherungen erstellen darf, auch Abrechnungsdaten sehen darf.
 *
 * Geprüft werden alle Rollen der Frontend-Matrix (Single Source of Truth) und
 * der gespiegelten Backend-Matrix. Die Prüffunktion ist parametrierbar; ein
 * Negativfall belegt, dass sie eine Verletzung erkennt.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/lib/rbac/permissions";

type Matrix = Readonly<Record<string, readonly string[]>>;

const RESTORE = "backup.restore";
const BILLING = "billing.view";

const HINT =
  `QS-06: Rollen mit ${RESTORE} müssen ${BILLING} haben, weil src/lib/backup/zip.ts ` +
  "(buildZip, includeBilling: true) hourlyRate immer in die Sicherung schreibt. " +
  "Entweder die Rolle um billing.view ergänzen oder zip.ts auf rollenabhängiges includeBilling umstellen.";

/** Rollen, die `backup.restore` tragen, aber kein `billing.view`. */
function rolesViolatingBackupBillingContract(matrix: Matrix): string[] {
  return Object.entries(matrix)
    .filter(([, perms]) => perms.includes(RESTORE) && !perms.includes(BILLING))
    .map(([role]) => role)
    .sort();
}

function restoreHolders(matrix: Matrix): string[] {
  return Object.entries(matrix)
    .filter(([, perms]) => perms.includes(RESTORE))
    .map(([role]) => role)
    .sort();
}

function assertContract(matrix: Matrix): void {
  const violations = rolesViolatingBackupBillingContract(matrix);
  expect(violations, `${HINT} Verletzt durch: ${violations.join(", ")}`).toEqual([]);
}

async function backendMatrix(): Promise<Matrix> {
  const backend = (await import("../../../backend/services/rbac.mjs")) as {
    ROLE_PERMISSIONS: Matrix;
  };
  return backend.ROLE_PERMISSIONS;
}

describe("QS-06 Vertrag backup.restore ⇒ billing.view (A42)", () => {
  it("Frontend-Matrix: jede Rolle mit backup.restore hat billing.view", () => {
    assertContract(ROLE_PERMISSIONS);
  });

  it("Frontend-Matrix: Prüfung läuft nicht ins Leere (mindestens eine Rolle mit backup.restore)", () => {
    expect(restoreHolders(ROLE_PERMISSIONS).length).toBeGreaterThan(0);
  });

  it("Backend-Matrix: jede Rolle mit backup.restore hat billing.view", async () => {
    assertContract(await backendMatrix());
  });

  it("Frontend und Backend nennen dieselben Rollen mit backup.restore", async () => {
    expect(restoreHolders(await backendMatrix())).toEqual(restoreHolders(ROLE_PERMISSIONS));
  });

  it("Negativfall: künstliche Matrix ohne billing.view wird erkannt", () => {
    const broken: Matrix = {
      ...ROLE_PERMISSIONS,
      administrator: ROLE_PERMISSIONS.administrator.filter((p) => p !== BILLING),
      kuenstlich: [RESTORE],
    };
    expect(rolesViolatingBackupBillingContract(broken)).toEqual(["administrator", "kuenstlich"]);
    expect(() => assertContract(broken)).toThrow(/src\/lib\/backup\/zip\.ts/);
  });

  it("Positivfall: Rolle ohne backup.restore braucht kein billing.view", () => {
    expect(rolesViolatingBackupBillingContract({ nurLesen: ["dashboard.view"] })).toEqual([]);
  });

  it("Anker: zip.ts setzt includeBilling weiterhin fest auf true (sonst Vertrag neu bewerten)", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "backup", "zip.ts"), "utf8");
    expect(src).toMatch(/includeBilling:\s*true/);
  });
});
