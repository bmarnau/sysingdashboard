import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, UserRole, UserStatus } from "@/lib/user-management";
import { resolveProfileDisplayName } from "@/lib/user-display-name";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";

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
  const publishedUserId = useRef<string | null>(null);
  // Zentraler Refresh liest Profil und Rolle erneut — Quelle bleibt die Session.
  const refreshGeneration = useRefreshSignal();

  useEffect(() => {
    let cancelled = false;
    let loadGeneration = 0;

    function publish(nextUser: UserProfile | null) {
      if (cancelled) return;
      publishedUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
    }

    async function load(observedSession?: Session | null) {
      const generation = ++loadGeneration;
      const sessionData =
        observedSession === undefined
          ? (await supabase.auth.getSession()).data.session
          : observedSession;
      if (cancelled || generation !== loadGeneration) return;
      const authUser = sessionData?.user;
      if (!authUser) {
        publish(null);
        return;
      }

      // Keep mounted state for a revalidation of the same account, but hide
      // the previous account before any profile or permission read can finish.
      if (publishedUserId.current && publishedUserId.current !== authUser.id) publish(null);

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", authUser.id),
      ]);

      const role: UserRole = (roles?.[0]?.role as UserRole | undefined) ?? "viewer";

      const p = profile ?? {
        id: authUser.id,
        first_name: "",
        last_name: "",
        display_name: "",
        email: authUser.email ?? "",
        phone: "",
        status: "active" as UserStatus,
        mfa_enabled: false,
        profile_image: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (cancelled || generation !== loadGeneration) return;
      publish({
        id: p.id,
        firstName: p.first_name ?? "",
        lastName: p.last_name ?? "",
        displayName: resolveProfileDisplayName({
          displayName: p.display_name,
          firstName: p.first_name,
          lastName: p.last_name,
          metadata: authUser.user_metadata as Record<string, unknown> | null,
        }),
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        const observedUserId = session?.user.id ?? null;
        if (
          event === "SIGNED_OUT" ||
          (publishedUserId.current !== null && publishedUserId.current !== observedUserId)
        ) {
          publish(null);
        }
        void load(session);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refreshGeneration]);

  return user;
}

/**
 * Liste aller Benutzer aus `public.profiles` + `public.user_roles`. RLS
 * bestimmt, welche Zeilen sichtbar sind (Admins sehen alle, normale Nutzer
 * nur sich selbst). Refresh-Callback nach Mutationen aus dem Dialog.
 */
import { listUsers } from "@/lib/users-supabase-service";

export function useUsers(): { users: UserProfile[]; loading: boolean; refresh: () => void } {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refreshGeneration = useRefreshSignal();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listUsers()
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, refreshGeneration]);

  return { users, loading, refresh: () => setTick((n) => n + 1) };
}
