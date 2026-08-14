/**
 * Zentrale Ermittlung des anzuzeigenden Benutzernamens.
 *
 * Reihenfolge (bewusst fachlich vor technisch):
 *  1. fachlicher Anzeigename aus dem Benutzerprofil (`display_name`)
 *  2. Vor-/Nachname aus dem Profil
 *  3. sinnvoller Name aus den Auth-Metadaten (`full_name`, `name`,
 *     `display_name`, oder `given_name` + `family_name`)
 *  4. neutraler Fallback ("Benutzer")
 *
 * E-Mail-Adressen und deren lokaler Teil gelten NICHT als Anzeigename —
 * damit erscheint nie „Guten Tag, sam." statt des gepflegten Namens.
 */

export const NEUTRAL_DISPLAY_NAME = "Benutzer";

/** Sieht der Wert nach einer E-Mail-Adresse oder einem Login-Handle aus? */
export function looksLikeEmail(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  return /\S+@\S+/.test(v);
}

function clean(value: string | null | undefined): string {
  // Mehrfache Leerzeichen normalisieren, Umlaute bleiben unangetastet.
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function usable(value: string | null | undefined): string | null {
  const v = clean(value);
  if (!v || looksLikeEmail(v)) return null;
  return v;
}

export interface DisplayNameSources {
  /** `profiles.display_name` */
  displayName?: string | null;
  /** `profiles.first_name` */
  firstName?: string | null;
  /** `profiles.last_name` */
  lastName?: string | null;
  /** `auth.users.user_metadata` (beliebige Struktur) */
  metadata?: Record<string, unknown> | null;
}

function fromMetadata(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const pick = (key: string): string | null =>
    typeof metadata[key] === "string" ? usable(metadata[key] as string) : null;

  const direct = pick("full_name") ?? pick("name") ?? pick("display_name");
  if (direct) return direct;

  const given = pick("given_name") ?? pick("first_name");
  const family = pick("family_name") ?? pick("last_name");
  const combined = clean(`${given ?? ""} ${family ?? ""}`);
  return combined || null;
}

/** Liefert den anzuzeigenden Namen — niemals eine E-Mail-Adresse. */
export function resolveDisplayName(sources: DisplayNameSources): string {
  const profileDisplay = usable(sources.displayName);
  if (profileDisplay) return profileDisplay;

  const combined = clean(`${clean(sources.firstName)} ${clean(sources.lastName)}`);
  if (combined && !looksLikeEmail(combined)) return combined;

  return fromMetadata(sources.metadata) ?? NEUTRAL_DISPLAY_NAME;
}

/** Anrede im Kopfbereich — vollständiger fachlicher Name. */
export function greetingNameOf(sources: DisplayNameSources): string {
  return resolveDisplayName(sources);
}
