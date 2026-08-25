export type MembershipStatus = "active" | "inactive";
export type CustomerAccessLevel = "read" | "write";
export type CustomerAccessGrantStatus = "active" | "inactive";
export type CustomerAccessOperation = "read" | "write";

export interface SystemhouseMembershipRecord {
  id: string;
  systemhouseId: string;
  userId: string;
  status: MembershipStatus;
  validFrom?: string;
  validTo?: string | null;
}

export interface CustomerAccessGrantRecord {
  id: string;
  systemhouseId: string;
  customerId: string;
  userId: string;
  accessLevel: CustomerAccessLevel;
  status: CustomerAccessGrantStatus;
  validFrom?: string;
  validTo?: string | null;
}

export interface CustomerAccessRequest {
  userId: string;
  systemhouseId: string;
  customerId: string;
  operation: CustomerAccessOperation;
  /**
   * Ergebnis der fachlichen Permission-Prüfung, z. B. `activity.edit`.
   * Customer-Scope und globales/fachliches Recht bleiben bewusst getrennt.
   */
  hasResourcePermission: boolean;
  /** Referenzzeit für reproduzierbare Tests; Default ist `Date.now()`. */
  now?: number;
}

export type CustomerAccessDecisionReason =
  | "allowed"
  | "resource_permission_missing"
  | "membership_missing"
  | "membership_inactive"
  | "membership_not_yet_valid"
  | "membership_expired"
  | "customer_scope_missing"
  | "customer_scope_inactive"
  | "customer_scope_not_yet_valid"
  | "customer_scope_expired"
  | "customer_scope_insufficient";

export interface CustomerAccessDecision {
  allowed: boolean;
  reason: CustomerAccessDecisionReason;
}

type WindowState = "active" | "not_yet_valid" | "expired";

function windowState(
  validFrom: string | undefined,
  validTo: string | null | undefined,
  now: number,
): WindowState {
  if (validFrom) {
    const from = Date.parse(validFrom);
    if (!Number.isFinite(from) || now < from) return "not_yet_valid";
  }
  if (validTo) {
    const to = Date.parse(validTo);
    if (!Number.isFinite(to) || now >= to) return "expired";
  }
  return "active";
}

function deny(reason: Exclude<CustomerAccessDecisionReason, "allowed">): CustomerAccessDecision {
  return { allowed: false, reason };
}

/**
 * Providerneutrale Vorstufe der späteren RLS-Entscheidung aus ADR-0031.
 *
 * Sicherheitsregeln:
 * - Fachliches Ressourcenrecht UND Customer-Scope sind notwendig.
 * - Customer-Scope ist nur mit aktiver Systemhouse-Membership wirksam.
 * - `(systemhouseId, customerId)` wird immer gemeinsam geprüft.
 * - `write`-Scope impliziert `read`, `read` erlaubt niemals `write`.
 * - Fehlende, deaktivierte oder abgelaufene Zuordnungen sind deny-by-default.
 * - Es gibt hier bewusst keinen Rollen-/Systemadmin-Bypass; privilegierte
 *   Servicepfade müssen separat und explizit implementiert werden.
 */
export function evaluateCustomerAccess(
  request: CustomerAccessRequest,
  memberships: readonly SystemhouseMembershipRecord[],
  grants: readonly CustomerAccessGrantRecord[],
): CustomerAccessDecision {
  if (!request.hasResourcePermission) return deny("resource_permission_missing");

  const now = request.now ?? Date.now();
  const membership = memberships.find(
    (candidate) =>
      candidate.userId === request.userId && candidate.systemhouseId === request.systemhouseId,
  );

  if (!membership) return deny("membership_missing");
  if (membership.status !== "active") return deny("membership_inactive");

  const membershipWindow = windowState(membership.validFrom, membership.validTo, now);
  if (membershipWindow === "not_yet_valid") return deny("membership_not_yet_valid");
  if (membershipWindow === "expired") return deny("membership_expired");

  const grant = grants.find(
    (candidate) =>
      candidate.userId === request.userId &&
      candidate.systemhouseId === request.systemhouseId &&
      candidate.customerId === request.customerId,
  );

  if (!grant) return deny("customer_scope_missing");
  if (grant.status !== "active") return deny("customer_scope_inactive");

  const grantWindow = windowState(grant.validFrom, grant.validTo, now);
  if (grantWindow === "not_yet_valid") return deny("customer_scope_not_yet_valid");
  if (grantWindow === "expired") return deny("customer_scope_expired");

  if (request.operation === "write" && grant.accessLevel !== "write") {
    return deny("customer_scope_insufficient");
  }

  return { allowed: true, reason: "allowed" };
}

export function canAccessCustomer(
  request: CustomerAccessRequest,
  memberships: readonly SystemhouseMembershipRecord[],
  grants: readonly CustomerAccessGrantRecord[],
): boolean {
  return evaluateCustomerAccess(request, memberships, grants).allowed;
}
