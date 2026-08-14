/**
 * Admin-Serverfunktionen für Auth-Konten.
 *
 * Zweck: Administratoren sollen fehlerhafte oder unbestätigte Anmeldekonten
 * direkt im Sysing Dashboard prüfen und bereinigen können, ohne eine externe
 * Plattform-Administrationsoberfläche zu benötigen und ohne dass Sysing
 * Plattform-Zugangsdaten speichert.
 *
 * Sicherheitsmodell:
 *  - Jede Funktion läuft hinter `requireSupabaseAuth` (gültiges Bearer-Token).
 *  - Danach wird serverseitig die Berechtigung `users.manage` über den
 *    Benutzerkontext geprüft (RLS-konform, nicht über den privilegierten
 *    Client).
 *  - Erst nach bestandener Prüfung wird der privilegierte Server-Client
 *    dynamisch geladen (darf niemals im Client-Bundle landen).
 *  - Rückgaben enthalten ausschließlich unkritische Felder. Niemals Tokens,
 *    Keys, Projektkennungen oder Rohmetadaten.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AuthAccountSummary {
  id: string;
  email: string;
  confirmed: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  hasProfile: boolean;
  role: string | null;
}

type AuthContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
};

async function assertUserManage(context: AuthContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _perm: "users.manage",
  });
  if (error || data !== true) {
    throw new Error("Forbidden: users.manage erforderlich");
  }
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AdminClient = Awaited<ReturnType<typeof loadAdmin>>;

async function writeAudit(
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
async function countOtherActiveSysadmins(admin: AdminClient, excludeId: string): Promise<number> {
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
function resolveRecoveryRedirect(): string | undefined {
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

export const listAuthAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuthAccountSummary[]> => {
    await assertUserManage(context as unknown as AuthContext);
    const admin = await loadAdmin();

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
  });

export const confirmAuthAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => {
    if (!input || typeof input.userId !== "string" || input.userId.length < 10) {
      throw new Error("Ungültige Kontokennung.");
    }
    return { userId: input.userId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertUserManage(context as unknown as AuthContext);
    const admin = await loadAdmin();
    const { error } = await admin.auth.admin.updateUserById(data.userId, { email_confirm: true });
    if (error) throw new Error("Konto konnte nicht bestätigt werden.");
    await writeAudit(admin, context.userId, "auth_account.confirm", data.userId, {});
    return { ok: true };
  });

export const resendConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => {
    const email = String(input?.email ?? "").trim();
    if (!email || email.length > 254 || !email.includes("@")) {
      throw new Error("Ungültige E-Mail-Adresse.");
    }
    return { email };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertUserManage(context as unknown as AuthContext);
    const admin = await loadAdmin();
    const { error } = await admin.auth.resend({ type: "signup", email: data.email });
    if (error) throw new Error("Bestätigungsmail konnte nicht gesendet werden.");
    await writeAudit(admin, context.userId, "auth_account.resend_confirmation", data.email, {});
    return { ok: true };
  });

/**
 * Stößt den regulären Passwort-Wiederherstellungsablauf für ein bestehendes
 * Konto an. Administratoren setzen dabei **kein** Passwort und sehen weder
 * Passwort noch Recovery-Token; es wird ausschließlich eine Recovery-Mail an
 * die registrierte Adresse gesendet.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => {
    if (!input || typeof input.userId !== "string" || input.userId.length < 10) {
      throw new Error("Ungültige Kontokennung.");
    }
    return { userId: input.userId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true; email: string }> => {
    await assertUserManage(context as unknown as AuthContext);
    const admin = await loadAdmin();

    // Zieladresse nie vom Client übernehmen, sondern serverseitig auflösen.
    const { data: found, error: lookupError } = await admin.auth.admin.getUserById(data.userId);
    const email = found?.user?.email ?? "";
    if (lookupError || !email) {
      throw new Error("Konto wurde nicht gefunden.");
    }

    const redirectTo = resolveRecoveryRedirect();
    const { error } = await admin.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    await writeAudit(admin, context.userId, "auth.password_reset_requested", data.userId, {
      result: error ? "failed" : "sent",
    });
    if (error) throw new Error("Passwort-Reset-Mail konnte nicht gesendet werden.");
    return { ok: true, email };
  });

export const deleteAuthAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => {
    if (!input || typeof input.userId !== "string" || input.userId.length < 10) {
      throw new Error("Ungültige Kontokennung.");
    }
    return { userId: input.userId };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertUserManage(context as unknown as AuthContext);
    if (data.userId === context.userId) {
      throw new Error("Das eigene Konto kann hier nicht gelöscht werden.");
    }
    const admin = await loadAdmin();

    // Rollenabfrage bewusst als Datenbankfilter (kein Rollenvergleich im Code).
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("role", "systemadministrator");
    const isSysadmin = (roleRows ?? []).length > 0;
    if (isSysadmin && (await countOtherActiveSysadmins(admin, data.userId)) < 1) {
      throw new Error("Der letzte aktive Systemadministrator kann nicht gelöscht werden.");
    }

    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Konto konnte nicht gelöscht werden.");
    await writeAudit(admin, context.userId, "auth_account.delete", data.userId, {});
    return { ok: true };
  });
