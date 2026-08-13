/**
 * Personenschicht des Systemhaus-Demo-Datensatzes (Sprint 09C, F-11).
 *
 * Zweck: der bestehende Datensatz wird auf vier fiktive Personen verteilt,
 * damit die persönliche Sicht („Mein AVKK"), die Projektsicht und die
 * Führungssicht mit unterschiedlichen Anmeldungen fachlich abnehmbar werden.
 *
 * Ehrliche Einordnung — bitte nicht überinterpretieren:
 * - Die Leseregeln der AVKK-Tabellen prüfen ausschließlich `avkk.view`. Wer
 *   lesen darf, sieht alle Sachverhalte. Die Trennung „Scope A ≠ Scope B" ist
 *   damit eine Sicht-, keine Datenbanktrennung.
 * - Zeilenbezogen wirkt ausschließlich das Schreibrecht (`avkk_can_write`).
 * - Projekte, Arbeitspakete und Tätigkeiten liegen lokal im Browser; dort gibt
 *   es systembedingt keine Mandanten- oder Personentrennung.
 */

export type DemoPersonaId = "alex" | "sam" | "petra" | "georg";

export interface DemoPersona {
  id: DemoPersonaId;
  /** Anzeigename; identisch mit `assignee`/`lead` im lokalen Datensatz. */
  displayName: string;
  /** Fachliche Funktion im Demoszenario. */
  functionLabel: string;
  /** Rolle, die dem zugehörigen Anmeldekonto zugewiesen werden muss. */
  requiredRole: "engineer" | "projectmanager" | "teamlead";
  /** Was diese Person im Demoszenario nachweisen soll. */
  scope: string;
}

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: "alex",
    displayName: "Demo Alex Systemtechnik",
    functionLabel: "Systemingenieur A",
    requiredRole: "engineer",
    scope: "Netzwerk- und Infrastrukturpakete inklusive eines kritischen Sachverhalts.",
  },
  {
    id: "sam",
    displayName: "Demo Sam Infrastruktur",
    functionLabel: "Systemingenieur B",
    requiredRole: "engineer",
    scope: "Microsoft-365- und Backup-Pakete inklusive Voraussetzungs- und Wissenslücke.",
  },
  {
    id: "petra",
    displayName: "Demo Petra Projektleitung",
    functionLabel: "Projektmanagerin",
    requiredRole: "projectmanager",
    scope: "Verantwortet die Demo-Projekte und sieht die Aggregation über A und B.",
  },
  {
    id: "georg",
    displayName: "Demo Georg Geschäftsführung",
    functionLabel: "Führungssicht",
    requiredRole: "teamlead",
    scope: "Portfoliosicht über alle Demo-Projekte ohne Personenrangfolge (ADR-0027).",
  },
] as const;

export const DEMO_PERSONA_IDS: readonly DemoPersonaId[] = DEMO_PERSONAS.map((p) => p.id);

export function getPersona(id: DemoPersonaId): DemoPersona {
  const persona = DEMO_PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unbekannte Demo-Persona: ${id}`);
  return persona;
}

/**
 * Zuordnung Demo-Objekt → Persona. Bewusst über die Objektkennung und nicht
 * über die Fall-Kennung: so bleiben lokaler Bestand und AVKK-Fälle konsistent,
 * auch wenn Fälle später umsortiert werden.
 */
export const DEMO_SUBJECT_PERSONA: Readonly<Record<string, DemoPersonaId>> = {
  "demo-wp-netz-planung": "alex",
  "demo-wp-netz-rollout": "alex",
  "demo-wp-m365-berechtigungen": "sam",
  "demo-wp-m365-migration": "sam",
  "demo-wp-backup-test": "sam",
  "demo-prj-netzwerk": "petra",
  "demo-prj-m365": "petra",
  "demo-prj-backup": "georg",
};

/** Persona eines Demo-Objekts; `null`, wenn keine Zuordnung hinterlegt ist. */
export function personaOfSubject(subjectId: string): DemoPersonaId | null {
  return DEMO_SUBJECT_PERSONA[subjectId] ?? null;
}

/**
 * Abbildung Persona → Benutzerkennung des zugehörigen Anmeldekontos.
 * Nicht zugeordnete Personas fallen auf den einspielenden Benutzer zurück.
 */
export type DemoPersonaAccounts = Partial<Record<DemoPersonaId, string>>;

export function resolvePersonId(
  subjectId: string,
  accounts: DemoPersonaAccounts,
  fallbackUserId: string,
): string {
  const persona = personaOfSubject(subjectId);
  if (!persona) return fallbackUserId;
  return accounts[persona] ?? fallbackUserId;
}
