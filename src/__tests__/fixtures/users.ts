import type { UserProfile, UserRole } from "@/lib/user-management";

let seq = 0;

export function makeUser(role: UserRole, overrides: Partial<UserProfile> = {}): UserProfile {
  seq += 1;
  const id = overrides.id ?? `usr-test-${seq}`;
  return {
    id,
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "User",
    displayName: overrides.displayName ?? `Test User ${seq}`,
    email: overrides.email ?? `test${seq}@example.com`,
    phone: overrides.phone ?? "",
    role,
    status: overrides.status ?? "active",
    profileImage: overrides.profileImage,
    mfaEnabled: overrides.mfaEnabled ?? false,
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2025-01-01T00:00:00.000Z",
  };
}
