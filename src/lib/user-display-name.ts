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
  /** `auth.users.email` — ausschließlich als letzter Fallback für den Vornamen. */
  email?: string | null;
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

/** Erstes Wort eines Strings, falls vorhanden. */
function firstWord(value: string | null | undefined): string | null {
  const v = usable(value);
  if (!v) return null;
  const word = v.split(/\s+/)[0];
  return word || null;
}

/** E-Mail-Local-Part extrahieren, ohne die Domain anzuzeigen. */
function emailLocalPart(email: string | null | undefined): string | null {
  const v = clean(email);
  if (!v || !looksLikeEmail(v)) return null;
  const local = v.split("@")[0];
  return local || null;
}

/** Sieht ein Wort wie korrekt geschriebenes Title Case aus (erster Buchstabe groß, Rest klein)? */
function looksLikeTitleCaseWord(word: string): boolean {
  const letters = word.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return true;
  const first = letters[0];
  const rest = letters.slice(1);
  return first === first.toUpperCase() && rest === rest.toLowerCase();
}

/**
 * Title-Case-Normalisierung, die korrekte Eigenschreibweisen zusammengesetzter
 * Namen erhält (z. B. Jörg-Michael). Wird nur auf einheitlich groß/kleingeschriebene
 * Eingaben oder abgeleitete Werte angewendet.
 */
function toTitleCase(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/(?:^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
}

/**
 * Normalisiert einen Personen- oder Vornamen: trimmt, entfernt Mehrfachleerzeichen
 * und korrigiert überwiegend fehlerhafte Groß-/Kleinschreibung, ohne bereits
 * korrekt geschriebene Eigennamen unnötig zu verändern.
 */
export function normalizePersonName(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) return "";

  const words = cleaned.split(/[\s-]+/);
  const badWords = words.filter((w) => !looksLikeTitleCaseWord(w)).length;
  const shouldNormalize = badWords > 0 && badWords >= words.length / 2;

  return shouldNormalize ? toTitleCase(cleaned) : cleaned;
}

function fromMetadataFirstName(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;
  const pick = (key: string): string | null =>
    typeof metadata[key] === "string" ? usable(metadata[key] as string) : null;

  const direct = pick("given_name") ?? pick("first_name");
  if (direct) return direct;

  const full = pick("full_name") ?? pick("name") ?? pick("display_name");
  if (full) return firstWord(full);

  return null;
}

/**
 * Liefert den Vornamen für die Begrüßung. Priorität:
 *  1. `firstName` aus dem Profil (unverändert bevorzugt, aber einheitliche
 *     Groß-/Kleinschreibung wird korrigiert).
 *  2. Erstes Wort aus dem fachlichen Display Name.
 *  3. Auth-Metadaten (`given_name`, `first_name`, erstes Wort aus `full_name`/`name`/`display_name`).
 *  4. E-Mail-Local-Part (niemals die vollständige E-Mail-Adresse).
 *  5. Neutraler Fallback "Benutzer".
 */
export function greetingFirstNameOf(sources: DisplayNameSources): string {
  const firstName = usable(sources.firstName);
  if (firstName) return normalizePersonName(firstName);

  const displayFirst = firstWord(sources.displayName);
  if (displayFirst) return normalizePersonName(displayFirst);

  const metaFirst = fromMetadataFirstName(sources.metadata);
  if (metaFirst) return normalizePersonName(metaFirst);

  const local = emailLocalPart(sources.email);
  if (local) return normalizePersonName(local);

  return NEUTRAL_DISPLAY_NAME;
}
