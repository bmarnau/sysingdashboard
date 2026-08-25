import { describe, expect, it } from "vitest";
import {
  evaluateCustomerAccess,
  type CustomerAccessGrantRecord,
  type CustomerAccessRequest,
  type SystemhouseMembershipRecord,
} from "@/lib/customer-data/access";

const NOW = Date.parse("2026-08-25T08:00:00.000Z");

const membership: SystemhouseMembershipRecord = {
  id: "membership-1",
  systemhouseId: "systemhouse-a",
  userId: "user-1",
  status: "active",
  validFrom: "2026-01-01T00:00:00.000Z",
};

const readGrant: CustomerAccessGrantRecord = {
  id: "grant-read",
  systemhouseId: "systemhouse-a",
  customerId: "customer-1",
  userId: "user-1",
  accessLevel: "read",
  status: "active",
  validFrom: "2026-01-01T00:00:00.000Z",
};

const request: CustomerAccessRequest = {
  userId: "user-1",
  systemhouseId: "systemhouse-a",
  customerId: "customer-1",
  operation: "read",
  hasResourcePermission: true,
  now: NOW,
};

function membershipWith(
  overrides: Partial<SystemhouseMembershipRecord>,
): SystemhouseMembershipRecord[] {
  return [{ ...membership, ...overrides }];
}

function grantWith(overrides: Partial<CustomerAccessGrantRecord>): CustomerAccessGrantRecord[] {
  return [{ ...readGrant, ...overrides }];
}

function decide(
  overrides: Partial<CustomerAccessRequest> = {},
  memberships: readonly SystemhouseMembershipRecord[] = [membership],
  grants: readonly CustomerAccessGrantRecord[] = [readGrant],
) {
  return evaluateCustomerAccess({ ...request, ...overrides }, memberships, grants);
}

describe("customer access contract", () => {
  it("should_allowRead_when_membershipScopeAndPermissionAreValid", () => {
    const decision = decide();
    expect(decision).toEqual({ allowed: true, reason: "allowed" });
  });

  it("should_allowRead_when_writeScopeExists", () => {
    const decision = decide({}, [membership], grantWith({ accessLevel: "write" }));
    expect(decision).toEqual({ allowed: true, reason: "allowed" });
  });

  it("should_denyWrite_when_onlyReadScopeExists", () => {
    const decision = decide({ operation: "write" });
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_insufficient" });
  });

  it("should_denyWrite_when_resourcePermissionIsMissing_evenWithWriteScope", () => {
    const decision = decide(
      { operation: "write", hasResourcePermission: false },
      [membership],
      grantWith({ accessLevel: "write" }),
    );
    expect(decision).toEqual({ allowed: false, reason: "resource_permission_missing" });
  });

  it("should_denyCrossSystemhouse_when_customerIdMatches", () => {
    const decision = decide({ systemhouseId: "systemhouse-b" });
    expect(decision).toEqual({ allowed: false, reason: "membership_missing" });
  });

  it("should_denyCrossCustomer_when_membershipExists", () => {
    const decision = decide({ customerId: "customer-2" });
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_missing" });
  });

  it("should_denyGuessedCustomerId_when_noExactGrantExists", () => {
    const decision = decide({ customerId: "customer-guessed" });
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_missing" });
  });

  it("should_deny_when_membershipIsInactive", () => {
    const decision = decide({}, membershipWith({ status: "inactive" }));
    expect(decision).toEqual({ allowed: false, reason: "membership_inactive" });
  });

  it("should_deny_when_membershipIsNotYetValid", () => {
    const decision = decide(
      {},
      membershipWith({ validFrom: "2026-08-26T00:00:00.000Z" }),
    );
    expect(decision).toEqual({ allowed: false, reason: "membership_not_yet_valid" });
  });

  it("should_deny_when_membershipHasExpired", () => {
    const decision = decide({}, membershipWith({ validTo: "2026-08-25T07:59:59.000Z" }));
    expect(decision).toEqual({ allowed: false, reason: "membership_expired" });
  });

  it("should_deny_whenCustomerScopeIsInactive", () => {
    const decision = decide({}, [membership], grantWith({ status: "inactive" }));
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_inactive" });
  });

  it("should_deny_whenCustomerScopeIsNotYetValid", () => {
    const decision = decide(
      {},
      [membership],
      grantWith({ validFrom: "2026-08-26T00:00:00.000Z" }),
    );
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_not_yet_valid" });
  });

  it("should_deny_whenCustomerScopeHasExpired", () => {
    const decision = decide(
      {},
      [membership],
      grantWith({ validTo: "2026-08-25T07:59:59.000Z" }),
    );
    expect(decision).toEqual({ allowed: false, reason: "customer_scope_expired" });
  });

  it("should_notProvideImplicitSystemadminBypass_when_membershipIsMissing", () => {
    const decision = decide({}, [], grantWith({ accessLevel: "write" }));
    expect(decision).toEqual({ allowed: false, reason: "membership_missing" });
  });

  it("should_denyInvalidValidityTimestamp_insteadOfFailingOpen", () => {
    const decision = decide({}, membershipWith({ validFrom: "not-a-date" }));
    expect(decision).toEqual({ allowed: false, reason: "membership_not_yet_valid" });
  });
});
