import { useEffect, useState, useSyncExternalStore } from "react";
import {
  UserManagementService,
  subscribeUserChanges,
  type UserProfile,
} from "@/lib/user-management";

/** Liefert die aktuelle Liste aller Benutzer reaktiv. */
export function useUsers(): UserProfile[] {
  return useSyncExternalStore(
    (cb) => subscribeUserChanges(cb),
    () => UserManagementService.loadUsers(),
    () => [],
  );
}

/** Liefert den aktiven Benutzer reaktiv. Bootstrappt clientseitig idempotent. */
export function useCurrentUser(): UserProfile | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    UserManagementService.bootstrap();
    setReady(true);
  }, []);
  const user = useSyncExternalStore(
    (cb) => subscribeUserChanges(cb),
    () => UserManagementService.getActiveUser(),
    () => null,
  );
  return ready ? user : null;
}
