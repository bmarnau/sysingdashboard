export type KioskSessionCheckResult = "valid" | "invalid" | "inactive" | "unavailable";

export interface KioskSessionWatchdogClient {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
  rpc(
    fn: "is_account_active",
    args: { _user_id: string },
  ): Promise<{ data: boolean | null; error: unknown }>;
}

/**
 * Prüft eine bereits aufgebaute Kiosk-Sitzung ohne sie künstlich aktiv zu
 * halten. Auth-Verlust ist ungültig, ein explizit inaktives Konto wird
 * gesondert gemeldet. Kann der Kontostatus temporär nicht bestätigt werden,
 * liefert die Funktion `unavailable`, damit die UI fail-safe blockieren kann.
 */
export async function checkKioskSession(
  client: KioskSessionWatchdogClient,
  expectedUserId: string,
): Promise<KioskSessionCheckResult> {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user || userData.user.id !== expectedUserId) {
      return "invalid";
    }

    const { data: active, error: activeError } = await client.rpc("is_account_active", {
      _user_id: expectedUserId,
    });
    if (activeError) return "unavailable";
    if (active === false) return "inactive";
    if (active !== true) return "unavailable";
    return "valid";
  } catch {
    return "unavailable";
  }
}
