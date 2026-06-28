import { useEffect, useState } from "react";
import {
  UserManagementService,
  subscribeUserChanges,
  type UserProfile,
} from "@/lib/user-management";

/** Reaktiver Zugriff auf den aktuell aktiven Benutzer. */
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
    sync();
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
