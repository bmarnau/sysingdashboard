export type Role =
  | "systemadministrator"
  | "administrator"
  | "teamlead"
  | "projectmanager"
  | "engineer"
  | "customer"
  | "viewer";

export const ALL_ROLES: readonly Role[];
export const ALL_PERMISSIONS: readonly string[];
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly string[]>>;
export function roleCan(role: Role | string, perm: string): boolean;
export function requirePermission(role: Role | string, perm: string): void;
export function permissionsOf(role: Role | string): string[];
