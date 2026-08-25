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

function decide(
  overrides: Partial<CustomerAccessRequest> = {},
  memberships: readonly SystemhouseMembershipRecord[] = [membership],
  grants: readonly CustomerAccessGrantRecord[] = [readGrant],
) {
  return evaluateCustomerAccess({ ...request, ...overrides }, memberships, grants);
}

describe("customer access contract", () => {
  it("should_allowRead_when_membershipScopeAndPermissionAreValid", () => {
    expect(decide()).toEqual({ allowed: true, reason: "allowed" });
  });

  it("should_allowRead_when_writeScopeExists", () => {
    expect(decide({}, [membership], [{ ...readGrant, accessLevel: "write" }])).toEqual({
      allowed: true,
      reason: "allowed",
    });
  });

  it("should_denyWrite_when_onlyReadScopeExists", () => {
    expect(decide({ operation: "write" })).toEqual({
      allowed: false,
      reason: "customer_scope_insufficient",
    });
  });

  it("should_denyWrite_when_resourcePermissionIsMissing_evenWithWriteScope", () => {
    expect(
      decide(
        { operation: "write", hasResourcePermission: false },
        [membership],
        [{ ...readGrant, accessLevel: "write" }],
      ),
    ).toEqual({ allowed: false, reason: "resource_permission_missing" });
  });

  it("should_denyCrossSystemhouse_when_customerIdMatches", () => {
    expect(decide({ systemhouseId: "systemhouse-b" })).toEqual({
      allowed: false,
      reason: "membership_missing",
    });
  });

  it("should_denyCrossCustomer_when_membershipExists", () => {
    expect(decide({ customerId: "customer-2" })).toEqual({
      allowed: false,
      reason: "customer_scope_missing",
    });
  });

  it("should_denyGuessedCustomerId_when_noExactGrantExists", () => {
    expect(decide({ customerId: "customer-guessed" })).toEqual({
      allowed: false,
      reason: "customer_scope_missing",
    });
  });

  it("should_deny_when_membershipIsInactive", () => {
    expect(decide({}, [{ ...membership, status: "inactive" }])).toEqual({
      allowed: false,
      reason: "membership_inactive",
    });
  });

  it("should_deny_when_membershipIsNotYetValid", () => {
    expect(
      decide({}, [{ ...membership, validFrom: "2026-08-26T00:00:00.000Z" }]),
    ).toEqual({ allowed: false, reason: "membership_not_yet_valid" });
  });

  it("should_deny_when_membershipHasExpired", () => {
    expect(decide({}, [{ ...membership, validTo: "2026-08-25T07:59:59.000Z" }])).toEqual({
      allowed: false,
      reason: "membership_expired",
    });
  });

  it("should_deny_whenCustomerScopeIsInactive", () => {
    expect(decide({}, [membership], [{ ...readGrant, status: "inactive" }])).toEqual({
      allowed: false,
      reason: "customer_scope_inactive",
    });
  });

  it("should_deny_whenCustomerScopeIsNotYetValid", () => {
    expect(
      decide({}, [membership], [{ ...readGrant, validFrom: "2026-08-26T00:00:00.000Z" }]),
    ).toEqual({ allowed: false, reason: "customer_scope_not_yet_valid" });
  });

  it("should_deny_whenCustomerScopeHasExpired", () => {
    expect(
      decide({}, [membership], [{ ...readGrant, validTo: "2026-08-25T07:59:59.000Z" }]),
    ).toEqual({ allowed: false, reason: "customer_scope_expired" });
  });

  it("should_notProvideImplicitSystemadminBypass_when_membershipIsMissing", () => {
    expect(decide({}, [], [{ ...readGrant, accessLevel: "write" }])).toEqual({
      allowed: false,
      reason: "membership_missing",
    });
  });

  it("should_denyInvalidValidityTimestamp_insteadOfFailingOpen", () => {
    expect(decide({}, [{ ...membership, validFrom: "not-a-date" }])).toEqual({
      allowed: false,
      reason: "membership_not_yet_valid",
    });
  });
});
