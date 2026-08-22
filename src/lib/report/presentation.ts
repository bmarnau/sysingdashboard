import { ROLE_LABEL, type UserProfile } from "@/lib/user-management";
import { greetingFirstNameOf, resolveDisplayName } from "@/lib/user-display-name";
import type { ReportActor } from "./types";

/**
 * Normalisiert nur eindeutig fehlerhaft einheitlich geschriebene, einfache
 * Nachnamen. Mehrteilige oder gemischt geschriebene Eigennamen bleiben
 * unangetastet, damit Schreibweisen wie `de Vries` oder `McDonald` nicht
 * durch eine pauschale Title-Case-Regel verfälscht werden.
 */
function normalizeSimpleFamilyName(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || /[\s-]/u.test(cleaned)) return cleaned;

  const letters = cleaned.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return cleaned;

  const allLower = letters === letters.toLocaleLowerCase("de-DE");
  const allUpper = letters === letters.toLocaleUpperCase("de-DE");
  if (!allLower && !allUpper) return cleaned;

  return (
    cleaned.slice(0, 1).toLocaleUpperCase("de-DE") + cleaned.slice(1).toLocaleLowerCase("de-DE")
  );
}

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

  // Vorname und klar fehlerhaft einheitlich geschriebene einfache Nachnamen
  // werden für die Berichtsdarstellung normalisiert. Komplexe Eigenschreibweisen
  // bleiben unverändert.
  const firstName = user.firstName.trim() ? greetingFirstNameOf({ firstName: user.firstName }) : "";
  const lastName = normalizeSimpleFamilyName(user.lastName);
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
