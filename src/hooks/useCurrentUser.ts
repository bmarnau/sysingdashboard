import { useEffect, useState } from "react";
import { UserManagementService, type UserProfile } from "@/lib/user-management";

/**
 * Reaktiver Zugriff auf den aktuell aktiven Benutzer.
 * Re-rendert bei Wechsel des aktiven Benutzers oder bei Storage-Events
 * aus anderen Tabs.
 */
export function useCurrentUser(): UserProfile | null {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return UserManagementService.bootstrap();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setUser(UserManagementService.getActiveUser());
    window.addEventListener("storage", sync);
    // Custom event für tab-internen Wechsel (vom UserManagementDialog ausgelöst).
    window.addEventListener("northbit:user-switched", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("northbit:user-switched", sync);
    };
  }, []);

  return user;
}

/** Reaktive Liste aller Benutzer. Re-rendert bei Storage-Änderungen oder Wechsel. */
export function useUsers(): UserProfile[] {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return UserManagementService.loadUsers();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setUsers(UserManagementService.loadUsers());
    window.addEventListener("storage", sync);
    window.addEventListener("northbit:user-switched", sync);
    window.addEventListener("northbit:users-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("northbit:user-switched", sync);
      window.removeEventListener("northbit:users-changed", sync);
    };
  }, []);

  return users;
}
