import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, UserRole, UserStatus } from "@/lib/user-management";

/**
 * Session-basierter aktueller Benutzer.
 *
 * Quelle der Wahrheit ist die Supabase-Session (`auth.uid()`); Profil und
 * Rolle werden aus `public.profiles` bzw. `public.user_roles` gelesen —
 * beide unter RLS. LocalStorage-Manipulationen haben KEINE Wirkung mehr
 * auf die Rolle (Finding SEC-CRIT-002 dauerhaft geschlossen).
 *
 * Bei fehlender Rolle (Race zwischen Signup-Trigger und erstem Read)
 * fällt der Hook konservativ auf `viewer` zurück — die serverseitigen
 * Endpoints prüfen ohnehin per `has_permission()`.
 */
export function useCurrentUser(): UserProfile | null {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) {
        if (!cancelled) setUser(null);
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", authUser.id),
      ]);

      const role: UserRole =
        (roles?.[0]?.role as UserRole | undefined) ?? "viewer";

      const p = profile ?? {
        id: authUser.id,
        first_name: "",
        last_name: "",
        display_name: authUser.email ?? "",
        email: authUser.email ?? "",
        phone: "",
        status: "active" as UserStatus,
        mfa_enabled: false,
        profile_image: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (cancelled) return;
      setUser({
        id: p.id,
        firstName: p.first_name ?? "",
        lastName: p.last_name ?? "",
        displayName: p.display_name || (authUser.email ?? ""),
        email: p.email ?? authUser.email ?? "",
        phone: p.phone ?? "",
        role,
        status: (p.status as UserStatus) ?? "active",
        profileImage: p.profile_image ?? undefined,
        mfaEnabled: !!p.mfa_enabled,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}

/**
 * Legacy-Liste aller lokalen Benutzer. Der Session-Wechsel entwertet den
 * lokalen Store — die Verwaltung läuft künftig gegen `public.profiles`
 * (siehe UserManagementDialog-Refactor in Folgeprompt). Bis dahin liefert
 * dieser Hook eine leere Liste, damit alte Verbraucher nichts anzeigen,
 * das nicht mehr existiert.
 */
export function useUsers(): UserProfile[] {
  return [];
}
