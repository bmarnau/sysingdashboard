/**
 * Entra-ID Rollenauflösung (Readiness-Stub).
 *
 * Heute: lokales Rollenmodell, keine Entra-Anbindung aktiv.
 * Vorbereitet: Mapping von Entra-Gruppen-Object-IDs auf interne Rollen
 * (siehe `config/entraMapping.example.json`). Bei späterer Aktivierung
 * liefert `resolveRoleFromGroups()` die höchstprivilegierte gemappte Rolle
 * (Least-Privilege-Fallback: `viewer`).
 *
 * WICHTIG: Entra liefert nur Identität & Gruppenmitgliedschaft.
 * Die interne Permission-Matrix bleibt die einzige Autorität für
 * Aktionen — Entra-Gruppen ersetzen das interne Rollenmodell NICHT.
 */

import { ALL_ROLES } from "../backend/services/rbac.mjs";

/** Privileg-Reihenfolge (hoch → niedrig). */
const ROLE_PRIORITY = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

/**
 * @param {string[]} groupIds  Entra-Gruppen-Object-IDs des Benutzers.
 * @param {Record<string,string>} mapping  groupId → interne Rolle.
 * @returns {string} interne Rolle; Fallback `viewer`.
 */
export function resolveRoleFromGroups(groupIds, mapping) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return "viewer";
  if (!mapping || typeof mapping !== "object") return "viewer";
  const matched = groupIds
    .map((g) => mapping[g])
    .filter((r) => typeof r === "string" && ALL_ROLES.includes(r));
  if (matched.length === 0) return "viewer";
  // höchstprivilegierte gemappte Rolle gewinnt
  for (const r of ROLE_PRIORITY) {
    if (matched.includes(r)) return r;
  }
  return "viewer";
}

export const ENTRA_READINESS = Object.freeze({
  enabled: false,
  reason: "Entra ID ist noch nicht angebunden. Lokales Rollenmodell ist aktiv.",
});
