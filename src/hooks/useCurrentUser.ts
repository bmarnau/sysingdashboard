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
