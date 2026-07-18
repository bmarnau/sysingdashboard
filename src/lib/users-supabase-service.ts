/**
 * users-supabase-service
 *
 * Datenzugriff für Profil- und Rollenverwaltung gegen `public.profiles` und
 * `public.user_roles`. Ersetzt für den UserManagementDialog die localStorage-
 * basierte `UserManagementService`-Implementierung.
 *
 * Sicherheitsmodell: Schreib-/Leserechte werden ausschließlich über die RLS-
 * Policies der beiden Tabellen durchgesetzt (siehe Migration v1.39.0). Der
 * Client-seitige Lockout-Guard in `setUserRole` ist reine UX-Absicherung
 * gegen versehentliche Sysadmin-Deprivilegierung — der eigentliche Schutz
 * gehört später in einen DB-Trigger (siehe CHANGELOG 1.40.0 / offener
 * Sicherheits-Kandidat im Review).
 */

import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, UserRole, UserStatus } from "@/lib/user-management";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  status: UserStatus;
  mfa_enabled: boolean;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
};

type UserRoleRow = { user_id: string; role: UserRole };

function toProfile(p: ProfileRow, role: UserRole): UserProfile {
  return {
    id: p.id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    displayName: p.display_name || p.email || "Unbenannt",
    email: p.email ?? "",
    phone: p.phone ?? "",
    role,
    status: (p.status as UserStatus) ?? "active",
    profileImage: p.profile_image ?? undefined,
    mfaEnabled: !!p.mfa_enabled,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function listUsers(): Promise<UserProfile[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").order("display_name", { ascending: true }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const roleByUser = new Map<string, UserRole>();
  for (const r of (rolesRes.data ?? []) as UserRoleRow[]) {
    // Bei mehreren Rollen die zuletzt gelesene gewinnen (RLS liefert alle sichtbaren).
    roleByUser.set(r.user_id, r.role);
  }
  return ((profilesRes.data ?? []) as ProfileRow[]).map((p) =>
    toProfile(p, roleByUser.get(p.id) ?? "viewer"),
  );
}

export interface UpdateProfilePatch {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  profileImage?: string | null;
  status?: UserStatus;
}

function toRowPatch(patch: UpdateProfilePatch): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (patch.firstName !== undefined) row.first_name = patch.firstName;
  if (patch.lastName !== undefined) row.last_name = patch.lastName;
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.profileImage !== undefined) row.profile_image = patch.profileImage;
  if (patch.status !== undefined) row.status = patch.status;
  return row;
}

/** Eigener Profileintrag. RLS-Policy `profiles_self_update` gilt. */
export async function updateOwnProfile(id: string, patch: UpdateProfilePatch): Promise<void> {
  const { error } = await supabase.from("profiles").update(toRowPatch(patch)).eq("id", id);
  if (error) throw error;
}

/** Fremdes Profil (Admin). RLS-Policy `profiles_admins_update_all` gilt. */
export async function updateUserProfile(id: string, patch: UpdateProfilePatch): Promise<void> {
  const { error } = await supabase.from("profiles").update(toRowPatch(patch)).eq("id", id);
  if (error) throw error;
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw error;
}

/**
 * Setzt Rolle des Users. Löscht bestehende Rollen und legt genau eine neue an
 * (aktueller RBAC-Ansatz: eine primäre Rolle pro User). Nur SysAdmin darf
 * überhaupt schreiben (RLS `user_roles_sysadmin_*`).
 *
 * Client-Lockout-Guard: blockiert das Herabstufen des letzten aktiven
 * Systemadministrators — reine UX, ersetzt keinen DB-Constraint.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  if (role !== "systemadministrator") {
    const users = await listUsers();
    const target = users.find((u) => u.id === userId);
    const activeSysAdmins = users.filter(
      (u) => u.role === "systemadministrator" && u.status === "active",
    );
    if (
      target?.role === "systemadministrator" &&
      target.status === "active" &&
      activeSysAdmins.length <= 1
    ) {
      throw new Error(
        "Aktion blockiert: Der letzte aktive System-Administrator kann nicht herabgestuft werden.",
      );
    }
  }

  const del = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (del.error) throw del.error;
  const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (ins.error) throw ins.error;
}

export const UsersSupabaseService = {
  listUsers,
  updateOwnProfile,
  updateUserProfile,
  setUserStatus,
  setUserRole,
};
