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
 *  - Rückgaben enthalten ausschließlich unkritische Felder. Niemals Passwörter,
 *    Tokens, Keys, Projektkennungen oder Rohmetadaten.
 *
 * Dieses Modul ist bewusst ein dünner Wrapper: Hilfslogik liegt in
 * `auth-accounts.server.ts`.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthAccountSummary, AuthContext } from "@/lib/admin/auth-accounts.server";

export type { AuthAccountSummary };

export const listAuthAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuthAccountSummary[]> => {
    const helpers = await import("@/lib/admin/auth-accounts.server");
    await helpers.assertUserManage(context as unknown as AuthContext);
    return helpers.listAccounts(helpers.getAdminClient());
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
    const helpers = await import("@/lib/admin/auth-accounts.server");
    await helpers.assertUserManage(context as unknown as AuthContext);
    const admin = helpers.getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(data.userId, { email_confirm: true });
    if (error) throw new Error("Konto konnte nicht bestätigt werden.");
    await helpers.writeAudit(admin, context.userId, "auth_account.confirm", data.userId, {});
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
    const helpers = await import("@/lib/admin/auth-accounts.server");
    await helpers.assertUserManage(context as unknown as AuthContext);
    const admin = helpers.getAdminClient();
    const { error } = await admin.auth.resend({ type: "signup", email: data.email });
    if (error) throw new Error("Bestätigungsmail konnte nicht gesendet werden.");
    await helpers.writeAudit(
      admin,
      context.userId,
      "auth_account.resend_confirmation",
      data.email,
      {},
    );
    return { ok: true };
  });

/**
 * Stößt den regulären Passwort-Wiederherstellungsablauf an. Administratoren
 * setzen dabei **kein** Passwort und sehen weder Passwort noch Recovery-Token;
 * es wird ausschließlich eine Recovery-Mail an die registrierte Adresse
 * gesendet.
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
    const helpers = await import("@/lib/admin/auth-accounts.server");
    await helpers.assertUserManage(context as unknown as AuthContext);
    const admin = helpers.getAdminClient();

    // Zieladresse nie vom Client übernehmen, sondern serverseitig auflösen.
    const { data: found, error: lookupError } = await admin.auth.admin.getUserById(data.userId);
    const email = found?.user?.email ?? "";
    if (lookupError || !email) {
      throw new Error("Konto wurde nicht gefunden.");
    }

    const redirectTo = helpers.resolveRecoveryRedirect();
    const { error } = await admin.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    await helpers.writeAudit(
      admin,
      context.userId,
      "auth.password_reset_requested",
      data.userId,
      { result: error ? "failed" : "sent" },
    );
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
    const helpers = await import("@/lib/admin/auth-accounts.server");
    await helpers.assertUserManage(context as unknown as AuthContext);
    if (data.userId === context.userId) {
      throw new Error("Das eigene Konto kann hier nicht gelöscht werden.");
    }
    const admin = helpers.getAdminClient();

    // Rollenabfrage bewusst als Datenbankfilter (kein Rollenvergleich im Code).
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("role", "systemadministrator");
    const isSysadmin = (roleRows ?? []).length > 0;
    if (isSysadmin && (await helpers.countOtherActiveSysadmins(admin, data.userId)) < 1) {
      throw new Error("Der letzte aktive Systemadministrator kann nicht gelöscht werden.");
    }

    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Konto konnte nicht gelöscht werden.");
    await helpers.writeAudit(admin, context.userId, "auth_account.delete", data.userId, {});
    return { ok: true };
  });
