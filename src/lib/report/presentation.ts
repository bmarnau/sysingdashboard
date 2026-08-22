import { ROLE_LABEL, type UserProfile } from "@/lib/user-management";
import { greetingFirstNameOf, resolveDisplayName } from "@/lib/user-display-name";
import type { ReportActor } from "./types";

/**
 * Verbindliche Präsentationsabbildung für Berichtsersteller.
 *
 * Fachliche Berichte dürfen keine technischen Rollen-IDs wie
 * `projectmanager` anzeigen und sollen einen normalisierten Personennamen
 * verwenden. Die Auth-/RBAC-Identität selbst bleibt davon unverändert.
 */
export function reportActorFromUser(user: UserProfile | null): ReportActor {
  if (!user) {
    return {
      id: null,
      displayName: "Unbekannt",
      role: ROLE_LABEL.viewer,
    };
  }

  // Der Vorname wird über die bestehende zentrale Namenslogik normalisiert.
  // Den Nachnamen übernehmen wir bewusst unverändert, um Eigenschreibweisen
  // nicht durch pauschales Title-Casing zu beschädigen.
  const firstName = user.firstName.trim()
    ? greetingFirstNameOf({ firstName: user.firstName })
    : "";
  const lastName = user.lastName.trim();
  const profileName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();

  return {
    id: user.id,
    displayName:
      profileName ||
      resolveDisplayName({
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }),
    role: ROLE_LABEL[user.role],
  };
}
