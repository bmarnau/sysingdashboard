import { useEffect, useState } from "react";
import {
  UserManagementService,
  subscribeUserChanges,
  type UserProfile,
} from "@/lib/user-management";

/** Reaktiver Zugriff auf den aktuell aktiven Benutzer. */
export function useCurrentUser(): UserProfile | null {
  // Immer mit `null` starten, damit Server- und erster Client-Render identisch
  // sind. Die Auflösung passiert in useEffect nach der Hydration — verhindert
  // Hydration-Mismatch (SSR hat kein localStorage, Client hatte einen Wert).
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setUser(UserManagementService.bootstrap());
    } catch {
      setUser(null);
    }
    const sync = () => setUser(UserManagementService.getActiveUser());
    const unsub = subscribeUserChanges(sync);
    window.addEventListener("storage", sync);
    return () => {
      unsub();
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}

/** Reaktive Liste aller Benutzer. */
export function useUsers(): UserProfile[] {
  // Gleiches Muster wie useCurrentUser — SSR-safe leere Liste, Auflösung in useEffect.
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setUsers(UserManagementService.loadUsers());
    sync();
    const unsub = subscribeUserChanges(sync);
    window.addEventListener("storage", sync);
    return () => {
      unsub();
      window.removeEventListener("storage", sync);
    };
  }, []);

  return users;
}
