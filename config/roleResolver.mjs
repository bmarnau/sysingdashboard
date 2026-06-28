/**
 * Role Resolver (Backend-only, Stub — Entra ID Vorbereitung).
 *
 * Liefert die effektive interne Rolle für einen Benutzer. Reihenfolge:
 *   1. interner Override (Tabelle `internalUsers[entraOid].role`) — gewinnt immer.
 *   2. Mapping `entra-group-id → interne Rolle` (höchste Priorität gewinnt).
 *   3. Least-Privilege-Fallback: `viewer`.
 *
 * SICHERHEITSREGEL: `systemadministrator` und `administrator` werden NIE
 * über Entra-Gruppen automatisch vergeben — nur über internen Override.
 * Das schützt vor Privilege-Escalation durch Gruppenmitgliedschaften.
 *
 * Heute ungenutzt; aktiviert sich, sobald Entra-Login eingebaut wird.
 */

import { ROLE_PRIORITY } from "../backend/services/rbac.mjs";

const ENTRA_FORBIDDEN_AUTO = new Set(["systemadministrator", "administrator"]);

/**
 * @param {Object} args
 * @param {string} args.entraOid                            - Entra Object ID
 * @param {string[]} args.groupIds                          - Entra-Group-IDs
 * @param {Record<string, { role: string }>} args.internalUsers
 * @param {Record<string, string>} args.mapping             - groupId → role
 * @returns {string} interne Rolle
 */
export function resolveInternalRole({
  entraOid,
  groupIds = [],
  internalUsers = {},
  mapping = {},
}) {
  // 1) Override
  const override = internalUsers[entraOid]?.role;
  if (override && ROLE_PRIORITY.includes(override)) return override;

  // 2) Mapping → höchste Rolle gewinnt
  const candidates = [];
  for (const gid of groupIds) {
    const role = mapping[gid];
    if (!role) continue;
    if (ENTRA_FORBIDDEN_AUTO.has(role)) continue; // Schutz vor Auto-Promotion
    if (ROLE_PRIORITY.includes(role)) candidates.push(role);
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
    return candidates[0];
  }

  // 3) Fallback
  return "viewer";
}

/** Architektur-Indikator für UI/Status — gibt zurück, ob Entra aktiv konfiguriert ist. */
export function isEntraConfigured() {
  return false; // wird in späterem Prompt aktiviert
}
