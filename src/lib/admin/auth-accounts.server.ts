/**
 * Serverseitige Hilfsfunktionen für die Auth-Kontenverwaltung.
 *
 * Bewusst getrennt von `auth-accounts.functions.ts`: Server-Function-Module
 * dürfen im Modulrumpf nur Importe, Typen und die Funktionsdeklarationen
 * enthalten. Diese Datei wird durch die Endung `*.server.ts` nie in das
 * Browser-Bundle aufgenommen.
 */

import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AuthAccountSummary {
  id: string;
  email: string;
  confirmed: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  hasProfile: boolean;
  role: string | null;
}

export type AuthContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
};

type AdminClient = typeof supabaseAdmin;

/** Prüft die Berechtigung im Benutzerkontext (nicht privilegiert). */
export async function assertUserManage(context: AuthContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _perm: "users.manage",
  });
  if (error || data !== true) {
    throw new Error("Forbidden: users.manage erforderlich");
  }
}

export function getAdminClient(): AdminClient {
  return supabaseAdmin;
}

export async function writeAudit(
  admin: AdminClient,
  actorId: string,
  action: string,
  target: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.from("audit_log").insert({
      action,
      target,
      actor_id: actorId,
      payload: payload as never,
    } as never);
  } catch {
    // Audit darf die Aktion nicht scheitern lassen; Fehler bleiben serverseitig.
  }
}

/** Anzahl aktiver Systemadministratoren ohne das angegebene Konto. */
export async function countOtherActiveSysadmins(
  admin: AdminClient,
  excludeId: string,
): Promise<number> {
  const { data } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "systemadministrator");
  const ids = ((data ?? []) as { user_id: string }[])
    .map((r) => r.user_id)
    .filter((id) => id !== excludeId);
  if (ids.length === 0) return 0;
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, status")
    .in("id", ids)
    .eq("status", "active");
  return (profiles ?? []).length;
}

/**
 * Ziel der Recovery-Mail: immer die eigene Anwendung (gleicher Ursprung wie
 * die Anfrage). Es wird kein vom Client gelieferter Wert übernommen.
 */
export function resolveRecoveryRedirect(): string | undefined {
  try {
    const request = getRequest();
    const origin =
      request?.headers.get("origin") ??
      (request?.url ? new URL(request.url).origin : undefined) ??
      undefined;
    return origin ? `${origin}/reset-password` : undefined;
  } catch {
    return undefined;
  }
}

/** Liest die Kontenliste inklusive Profil- und Rollenzuordnung. */
export async function listAccounts(admin: AdminClient): Promise<AuthAccountSummary[]> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error("Auth-Konten konnten nicht gelesen werden.");

  const users = data?.users ?? [];
  const ids = users.map((u) => u.id);
  const profileIds = new Set<string>();
  const roleById = new Map<string, string>();
  if (ids.length > 0) {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id").in("id", ids),
      admin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    for (const p of (profiles ?? []) as { id: string }[]) profileIds.add(p.id);
    for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
      roleById.set(r.user_id, r.role);
    }
  }

  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      hasProfile: profileIds.has(u.id),
      role: roleById.get(u.id) ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email, "de"));
}
