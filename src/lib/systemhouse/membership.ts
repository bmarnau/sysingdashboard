/**
 * Systemhaus-Kontext (BSF-03D, #103) — providerneutraler Vertrag.
 *
 * Systemhausbezogene Stammdaten (z. B. `workpackage.category`) brauchen einen
 * eindeutigen Systemhaus-Bezug. Dieses Modul kennt keinen Provider; die
 * Datenquelle liefert `SystemhouseMembership[]` über ein Repository.
 *
 * Regeln:
 * - Nur aktive, zeitlich gültige Memberships zählen.
 * - Genau eine Membership → automatische Auswahl.
 * - Mehrere Memberships → explizite Auswahl erforderlich; eine Auswahl
 *   außerhalb der eigenen Memberships wird verworfen (kein Cross-Systemhouse).
 * - Keine Membership → keine Auswahl möglich.
 */

export interface SystemhouseMembership {
  systemhouseId: string;
  systemhouseName: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
}

export interface SystemhouseMembershipRepository {
  /** Memberships des angemeldeten Benutzers (serverseitig durch RLS begrenzt). */
  listOwnMemberships(): Promise<SystemhouseMembership[]>;
}

export type SystemhouseSelection =
  | { status: "none"; systemhouseId: null }
  | { status: "choice-required"; systemhouseId: null }
  | { status: "selected"; systemhouseId: string };

export function activeMemberships(
  memberships: readonly SystemhouseMembership[],
  now: Date = new Date(),
): SystemhouseMembership[] {
  const t = now.getTime();
  return memberships
    .filter((m) => m.status === "active")
    .filter((m) => !m.validFrom || new Date(m.validFrom).getTime() <= t)
    .filter((m) => !m.validTo || new Date(m.validTo).getTime() > t)
    .sort((a, b) => a.systemhouseName.localeCompare(b.systemhouseName));
}

export function resolveSystemhouseSelection(
  active: readonly SystemhouseMembership[],
  explicitId: string | null | undefined,
): SystemhouseSelection {
  if (active.length === 0) return { status: "none", systemhouseId: null };
  if (active.length === 1) {
    const only = active[0]!;
    return { status: "selected", systemhouseId: only.systemhouseId };
  }
  if (explicitId && active.some((m) => m.systemhouseId === explicitId)) {
    return { status: "selected", systemhouseId: explicitId };
  }
  return { status: "choice-required", systemhouseId: null };
}
