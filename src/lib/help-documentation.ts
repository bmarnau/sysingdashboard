/**
 * HelpDocumentationService
 *
 * Datengetriebenes Benutzerhandbuch. Kapitelinhalte werden hier zentral
 * gepflegt; jede Komponente kann ein eigenes `HelpTopic` exportieren und es
 * über `registerHelpTopics()` hinzufügen. Das Handbuch rendert alle
 * registrierten Themen automatisch.
 *
 * Inhalte sind als Markdown-ähnliche Texte gespeichert (Überschriften mit
 * `## `, Aufzählungen mit `- `). Der Renderer im UI versteht dieses Subset
 * absichtlich begrenzt — kein externer Markdown-Parser, kein dangerouslySetInnerHTML.
 */

import type { UserRole } from "@/lib/user-management";
// Zentrale Änderungshistorie wird zur Build-Zeit eingelesen.
// Vite stellt den Rohinhalt der Datei als String bereit.
import changelogSource from "../../CHANGELOG.md?raw";

export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  /** Optionaler Route-Match (z. B. "/", "/export") für kontextbezogene Hilfe. */
  route?: string;
  /** Optionaler Komponentenname für Querverweise. */
  component?: string;
  /** Rollen mit Lesezugriff. Leer = alle Benutzer. */
  roles?: UserRole[];
  keywords: string[];
  content: string;
  /** ISO-Datum der letzten Pflege. */
  lastUpdated: string;
  relatedTopics?: string[];
}

export interface SettingDocumentation {
  id: string;
  name: string;
  description: string;
  defaultValue?: string;
  allowedValues?: string[];
  affectedAreas: string[];
}

/* ----------------------------- Changelog ------------------------------ */

export interface ChangelogEntry {
  /** ISO-Datum (YYYY-MM-DD). */
  date: string;
  /** Semver des Dashboards. */
  version: string;
  /** Kurzbeschreibung der Änderung (eine Zeile). */
  change: string;
}

/**
 * Parst die zentrale `CHANGELOG.md` (Format `## <version> - <date>` gefolgt
 * von `- bullet`-Zeilen) in strukturierte Einträge. Mehrere Bullets pro
 * Version werden zu einem mehrzeiligen `change` zusammengeführt.
 */
function parseChangelog(src: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = src.split(/\r?\n/);
  let current: ChangelogEntry | null = null;
  const headerRe = /^##\s+([0-9][0-9A-Za-z.\-+]*)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/;
  for (const line of lines) {
    const m = headerRe.exec(line);
    if (m) {
      if (current) entries.push(current);
      current = { version: m[1], date: m[2], change: "" };
      continue;
    }
    if (current && /^\s*-\s+/.test(line)) {
      const bullet = line.replace(/^\s*-\s+/, "").trim();
      current.change = current.change ? `${current.change} ${bullet}` : bullet;
    }
  }
  if (current) entries.push(current);
  return entries;
}

/** Zentrale, aus `CHANGELOG.md` geparste Änderungshistorie (neueste zuerst). */
export const CHANGELOG: ChangelogEntry[] = parseChangelog(changelogSource);

/** Manuelle Version des Handbuchs. Bei größeren Inhaltsänderungen hochzählen. */
export const DOCUMENTATION_VERSION = "1.10.0";
/** Aktuelle Dashboard-Version. Wird automatisch aus dem obersten CHANGELOG-Eintrag übernommen. */
export const DASHBOARD_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
/** Anzeigename des Dashboards für Handbuch-Footer. */
export const DASHBOARD_VERSION_HINT = `Engineer Console ${DASHBOARD_VERSION}`;

/* ---------------------------- Built-in Topics ---------------------------- */

const builtInTopics: HelpTopic[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard-Übersicht",
    category: "Dashboard",
    route: "/",
    component: "Dashboard",
    keywords: ["Dashboard", "Übersicht", "KPI", "Auslastung", "Billable"],
    lastUpdated: "2026-06-13",
    content: `## Was zeigt das Dashboard?
Das Dashboard zeigt für den aktiven Benutzer eine kompakte Sicht auf Sollarbeitszeit, geleistete Stunden, Auslastung und Abrechenbarkeit.

## KPI-Karten
- Sollstunden: errechnet aus dem aktiven Arbeitszeitmodell und dem gewählten Zeitraum.
- Iststunden: Summe aller gebuchten Tätigkeitsdauern.
- Auslastung: Iststunden geteilt durch Sollstunden in Prozent.
- Billable / Non-Billable: Anteil abrechenbarer Stunden.

## Tipps
- Über die Ansicht-Umschaltung wechselst du zwischen Wochen- und Monatsansicht.
- Mit den Pfeilen navigierst du in vorherige oder folgende Perioden.`,
    relatedTopics: ["view-week-month", "performance-report"],
  },
  {
    id: "view-week-month",
    title: "Wochen- und Monatsansicht",
    category: "Dashboard",
    route: "/",
    keywords: ["Woche", "Monat", "Ansicht", "KW", "Sollstunden", "Teilzeit"],
    lastUpdated: "2026-06-13",
    content: `## Umschaltung
Über die Tab-Leiste lassen sich Wochen- und Monatsansicht wechseln. Die KW-Nummerierung folgt ISO 8601.

## Berechnung der Sollstunden
- Monatsansicht: Sollstunden = Monatssoll des aktiven Arbeitszeitmodells.
- Wochenansicht: Sollstunden anteilig aus dem Monatssoll auf die enthaltenen Arbeitstage verteilt.

## Flexible Teilzeit
Bei flexibler Teilzeit ist nicht die Wochenstundenzahl, sondern das Monatssoll führend. Dadurch dürfen Wochenlasten unterschiedlich sein, solange das Monatsziel erreicht wird.`,
    relatedTopics: ["working-time-model"],
  },
  {
    id: "working-time-model",
    title: "Arbeitszeitmodell",
    category: "Dashboard",
    keywords: ["Arbeitszeitmodell", "Sollzeit", "Teilzeit", "Auslastung", "Modellhistorie"],
    lastUpdated: "2026-06-13",
    content: `## Zweck
Das Arbeitszeitmodell legt fest, wie viele Stunden pro Monat (und abgeleitet pro Woche) der Benutzer leisten soll.

## Felder
- Monatssoll (h): führende Vorgabe.
- Auslastung (%): Anteil einer Vollzeitstelle.
- Wochensoll (h): wird aus dem Monatssoll abgeleitet, kann jedoch zur Plausibilisierung dienen.

## Modellhistorie
Modelle sind zeitlich gültig (von/bis). Pro Stichtag wird automatisch das gültige Modell verwendet. Dadurch bleiben historische Reports konsistent.

## Wichtig
Im Engineer-Profil sind die Zeit-Felder gesperrt, sobald ein aktives Arbeitszeitmodell existiert. Änderungen erfolgen ausschließlich im Dialog "Arbeitszeitmodell".`,
  },
  {
    id: "projects",
    title: "Projekte und Arbeitspakete",
    category: "Erfassung",
    keywords: ["Projekt", "Arbeitspaket", "Kunde", "Lead", "Team"],
    lastUpdated: "2026-06-13",
    content: `## Projekte
Projekte werden über "+ Neu" angelegt und enthalten Name, Kunde, Beschreibung, Start/Deadline, Lead, Team, Budget und Status.

## Arbeitspakete
Arbeitspakete bündeln Tätigkeiten unter einem Projekt (optional auch ohne Projekt). Sie tragen Titel, Status, Priorität, Fälligkeit, Schätzung und Tags.

## Tätigkeiten zuordnen
Tätigkeiten verweisen optional auf ein Arbeitspaket. Ohne Zuordnung erscheinen sie unter "Ohne Projekt".`,
  },
  {
    id: "time-entries",
    title: "Zeitbuchungen",
    category: "Erfassung",
    keywords: ["Tätigkeit", "Buchung", "Stunden", "billable", "Beschreibung"],
    lastUpdated: "2026-06-13",
    content: `## Erfassen
Über "+ Neu → Tätigkeit" wird eine Buchung mit Datum, Uhrzeit (optional), Dauer in Stunden, Stundensatz und Beschreibung erfasst.

## Billable markieren
Aktivierst du "abrechenbar", fließt die Buchung in die Billable-Quote und in den Umsatz. Nicht-abrechenbare Stunden zählen weiterhin zur Auslastung.

## Status
- offen / abgerechnet / nicht abrechenbar.`,
  },
  {
    id: "performance-report",
    title: "Persönlicher Leistungsreport",
    category: "Reporting",
    keywords: ["Leistung", "Report", "Soll", "Ist", "Überstunden", "Auslastung", "Billable"],
    lastUpdated: "2026-06-13",
    content: `## Was enthält der Report?
Der Leistungsreport zeigt eine mehrmonatige Trendansicht: Soll, Ist, Über-/Unterstunden, Auslastung und Billable-Quote.

## Zeiträume
- 3, 6 oder 12 Monate
- YTD (Jahresbeginn bis aktueller Monat)
- Benutzerdefiniert (von/bis)

## Verwendung
Der Report dient als Grundlage für Feedbackgespräche, Forecasting und für den späteren mehrmonatigen PDF-Export.`,
  },
  {
    id: "export",
    title: "Exportfunktion",
    category: "Export",
    route: "/export",
    keywords: ["Export", "PDF", "CSV", "JSON", "Azure Table", "Gruppierung", "Sortierung"],
    lastUpdated: "2026-06-13",
    content: `## Formate
- PDF: Stundennachweis mit Deckblatt und Tätigkeiten.
- CSV: tabellarischer Export für Excel.
- JSON: Datenstruktur 1:1.
- Azure Table: vorbereitete Form für den späteren Cloud-Sync.

## Optionen
- Monat auswählen
- Gruppierung (z. B. nach Projekt, Arbeitspaket, Kunde)
- Sortierung (z. B. Datum, Dauer)
- PDF-Vorschau vor dem Download

## Dateiname
Der Dateiname wird aus Monat und Benutzer abgeleitet, kann aber im Dialog überschrieben werden.`,
    relatedTopics: ["pdf-report"],
  },
  {
    id: "pdf-report",
    title: "PDF-Report",
    category: "Export",
    keywords: ["PDF", "Deckblatt", "Stammdaten", "Management Summary"],
    lastUpdated: "2026-06-13",
    content: `## Aufbau
- Deckblatt mit Kunde, Zeitraum und Ersteller.
- Stammdaten des Benutzers (Name, Rolle, E-Mail, Telefon).
- Arbeitszeitprofil (Monatssoll, Auslastung).
- Liste aller Tätigkeiten im Zeitraum, gruppiert und sortiert nach Auswahl.
- Summen je Gruppe und Gesamt.
- Management Summary mit Auslastung und Über-/Unterstunden.

## Druckausgabe
Über "PDF Drucken" im Servicebereich öffnet sich der Druckdialog des Browsers für die aktuelle Ansicht.`,
  },
  {
    id: "user-profile",
    title: "Benutzerprofil und Sicherheit",
    category: "Benutzer",
    keywords: ["Profil", "E-Mail", "Telefon", "Passwort", "MFA"],
    lastUpdated: "2026-06-13",
    content: `## Profilangaben
Im Benutzerprofil pflegst du Vor- und Nachname, Anzeigename, E-Mail-Adresse, Telefonnummer und Profilbild.

## Passwort
Sobald die Anmeldemaske aktiv ist, kann das Passwort hier geändert werden. Bis dahin ist die Authentifizierung noch lokal.

## MFA
Die MFA-Option ist vorbereitet (mfaEnabled). Die Aktivierung erfolgt mit Einführung des Auth-Providers (Lovable Cloud / Entra ID).`,
  },
  {
    id: "user-management",
    title: "Benutzerverwaltung",
    category: "Benutzer",
    roles: ["administrator", "teamlead"],
    keywords: ["Benutzer", "Profile", "Rollen", "Berechtigungen", "Profilwechsel"],
    lastUpdated: "2026-06-13",
    content: `## Profile anlegen
Administratoren legen neue Benutzer mit Rolle und Status an. Pflichtfelder sind Vor- und Nachname.

## Rollen
- Administrator: Vollzugriff inkl. Benutzerverwaltung.
- Teamleiter: Sicht auf eigenes Team.
- Systemingenieur: Erfassung, Reports, Export.
- Projektmanager: Projektsicht.
- Kunde: eingeschränkte Lesesicht (geplant).

## Profilwechsel
Über das Benutzer-Menü wechselst du zwischen Profilen. Alle gescopten Daten (Tätigkeiten, Modelle, Einstellungen) folgen dem aktiven Benutzer.

## Letzter Administrator
Der letzte aktive Administrator kann nicht gelöscht oder deaktiviert werden, um Aussperren zu verhindern.`,
  },
  {
    id: "settings",
    title: "Einstellungen",
    category: "Service",
    keywords: ["Einstellungen", "Standardansicht", "Export", "PDF-Vorschau"],
    lastUpdated: "2026-06-13",
    content: `## Dashboard-Einstellungen
Die wichtigsten Einstellungen sind im Kapitel "Einstellungen im Überblick" aufgelistet (siehe unten).

## Lokale Ablage
Über "Lokale Ablage" werden Daten zwischen Geräten exportiert/importiert. Der Reset löscht alle benutzerbezogenen Daten unwiderruflich.`,
  },
  {
    id: "service-area",
    title: "Servicebereich",
    category: "Service",
    keywords: ["Service", "Menü", "Export", "Engineer", "Arbeitszeitmodell", "Reset"],
    lastUpdated: "2026-06-18",
    content: `## Funktionen im Servicebereich
- Export: öffnet den Exportdialog.
- Leistungsreport: blendet den Report im Dashboard ein/aus.
- Benutzer & Profile: Benutzerverwaltung.
- Engineer-Stammdaten: Stammdaten des Engineers.
- Arbeitszeitmodell: Pflege der Modelle und Modellhistorie.
- Downloads: Übersicht aller erzeugten Exporte.
- Backup: tägliches automatisches ZIP-Backup der Dashboard-Daten inkl. Downloadbereich und Protokoll.
- Import / Export: strukturierter JSON-Austausch (Voll-/Teil-Export, Beispieldateien, Schema-Doku, JSON-Backup). Nur für Administrator/Teamleiter.
- Systemstatus: GitHub-, Build- und Versionsinformationen.
- PDF Drucken: Druckdialog für die aktuelle Ansicht.
- Handbuch: dieses Benutzerhandbuch.
- Reset: löscht alle benutzerbezogenen Daten.`,
  },
  {
    id: "backend-api",
    title: "Backend-API",
    category: "Service",
    keywords: ["API", "Backend", "Sync", "Status", "Azure", "Endpunkt"],
    lastUpdated: "2026-06-24",
    content: `## Endpunkte
- \`POST /api/sync\` — Body \`{ "source": "manual" }\`. Triggert einen Sync-Lauf. Im Development-Modus liefert er ausschließlich Mock-Daten; eine Azure-Verbindung wird nicht aufgebaut. **In Production erfordert der Endpunkt einen \`X-Sync-Token\`-Header**, der dem Server-Secret \`SYNC_TRIGGER_TOKEN\` entspricht. Ist das Secret nicht gesetzt, antwortet der Endpunkt mit 503 ("Sync trigger disabled").
- \`GET /api/status\` — Liefert Modus (\`development\`/\`production\`), Verfügbarkeit der Azure-Secrets (nur Boolean, keine Klartexte) und Metadaten des letzten Sync-Laufs.

## Architektur
- Frontend ruft ausschließlich \`/api/...\` (same-origin), kein direkter Azure-Zugriff im Browser.
- TanStack-Server-Routes unter \`src/routes/api/\` sind der Production-Pfad (Cloudflare Workers).
- Framework-freie Services unter \`backend/services/\` werden von den Server-Routes importiert. Der frühere Standalone-Node-Server ist ins Archiv verschoben (\`archive/legacy-standalone-backend/\`).

## Sicherheit
- \`config/env.mjs\` blockiert Azure-Aufrufe im Dev-Modus (\`assertAzureAllowed\`).
- \`config/secretManager.mjs\` gibt niemals Roh-Strings zurück; \`consume()\` ist im Dev-Modus blockiert.
- Server antwortet bei Fehlern generisch (keine Stacktraces, keine Secrets im Body).
- Logging gehärtet: Worker und SSR-Middleware loggen nur gekürzte Error-Messages (≤ 256 Zeichen), niemals volle Error-Objekte oder Response-Bodies.
- Import-Schemas (\`src/lib/json-schema.ts\`) erzwingen Längenlimits (IDs 128, Strings 255, Texte 2000 Zeichen) gegen unbounded Payloads.`,
  },
  {
    id: "offline-mode",
    title: "Offline-Betrieb",
    category: "Service",
    keywords: ["Offline", "localStorage", "Azure", "Sync", "Backend", "Ausfall"],
    lastUpdated: "2026-06-26",
    content: `## Garantien
Das Dashboard ist offline-first und arbeitet ohne Backend vollständig im Browser.

| Garantie | Umsetzung |
| --- | --- |
| Start ohne Azure-Konfiguration | \`config/env.mjs\` defaultet auf \`development\`; \`assertAzureAllowed()\` blockt jeden Azure-Zugriff. |
| Projekte / Arbeitspakete / Tätigkeiten lokal | Persistenz in \`localStorage\` (user-scoped, \`UserManagementService.userScopedKey\`). |
| localStorage bleibt aktiv | Alle Module (\`export-archive\`, \`backup-service\`, \`engineer-target-time\`, \`export-download-service\`) nutzen \`window.localStorage\`. |
| Azure-Ausfall blockiert nichts | Einziger Startup-Call ist \`/api/status\` (read-only, 3 s Timeout) — Fehler landen flüchtig im State, UI bleibt nutzbar. |
| Keine automatische Azure-Aktion | \`runSync\` wird nirgends automatisch getriggert; kein \`setInterval\`, kein Auto-Sync. |

## Was lokal funktioniert
Dashboard-Ansichten, Projekte, Arbeitspakete, Tätigkeiten, Leistungsreport, Export (PDF/CSV/JSON), Downloads, Backup-ZIP, Import/Export-Wizard, Handbuch, Systemstatus-Anzeige (ohne Live-Health).

## Was Backend braucht
Nur der manuell ausgelöste **Sync** über \`POST /api/sync\` (mit \`X-Sync-Token\` in Production). Ohne erreichbares Backend bleibt der Button im Dialog deaktivierbar — alle anderen Funktionen sind unberührt.

## Erwartete Anzeige im Systemstatus
Im reinen Static-Deploy ohne Backend meldet die Sektion „Versionen & Backend": \`Backend /api/status — nicht erreichbar\`. Das ist **kein Fehler**, sondern korrektes Verhalten: das Dashboard arbeitet vollständig lokal.`,
  },
  {
    id: "env-validation",
    title: "ENV-Validierung & Production-Gating",
    category: "Service",
    keywords: ["ENV", "Environment", "Azure", "Production", "Validierung", "Secrets", "Boot"],
    lastUpdated: "2026-06-27",
    content: `## Zweck
Zentrale, sichere Prüfung aller produktionskritischen ENV-Variablen. Verhindert, dass der Backend-Server in Production ohne Pflicht-ENVs startet, hält aber den Development-Modus ohne Azure-Konfiguration lauffähig.

## Datei
\`config/secretManager.mjs\` (backend-only, niemals aus \`src/\` importieren). Validierung und Secret-Zugriff liegen in einem Modul — Single Source of Truth für die Liste der Azure-ENVs.

## API
- \`isDev()\` / \`isProd()\` — Re-Export aus \`config/env.mjs\`.
- \`getEnv(name, requiredInProd = true)\` — liest eine ENV; in PROD bei \`requiredInProd\` Throw, sonst Warnung + \`undefined\`.
- \`validate()\` — prüft Pflichtliste, gibt \`{ mode, missing, ok }\`.
- \`has()\` / \`preview()\` / \`status()\` / \`consume()\` — bekannte Secret-Helfer (maskiert; \`consume()\` nur in PROD).

## Pflicht-ENVs (nur in PROD zwingend)
- \`AZURE_SQL_CONNECTION\`
- \`AZURE_TABLE_CONNECTION\`
- \`AZURE_STORAGE_SAS\`
- \`AZURE_CLIENT_ID\`
- \`AZURE_TENANT_ID\`

## Startpunkte
- **TanStack Server-Routes** (\`src/routes/api/*.ts\`): \`backend/services/ensure-env.mjs\` cached die Prüfung beim ersten Request. PROD-Fehler → generische 500-Antwort \`"Service not configured"\`. (Der frühere Standalone-Node-Server ist archiviert; siehe \`archive/legacy-standalone-backend/\`.)

## Sicherheitsregeln
- Niemals ENV-Werte loggen — nur Variablennamen.
- Keine Defaults, keine Hardcoded Secrets, keine Fallback-Strings.
- API-Fehlerantworten enthalten keine Variablennamen.
- Frontend-Bundle (\`src/\`) importiert weder \`secretManager\` noch \`envValidator\`/\`keyVault\`.

## Key-Vault-Readiness
- \`config/keyVault.mjs\` ist als Platzhalter angelegt (\`isKeyVaultConfigured()\`, \`resolveSecret()\`).
- Aktivierung später: \`AZURE_KEY_VAULT_URL\` setzen, \`@azure/identity\` + \`@azure/keyvault-secrets\` installieren, \`resolveSecret\` implementieren. Managed Identity bevorzugt vor Client-Secret.
- \`config/envValidator.mjs\` existiert als Kompatibilitäts-Fassade (Re-Export aus \`secretManager\`); kein doppelter Code.`,
  },
  {
    id: "ci-security-scan",
    title: "CI-Security-Scan",
    category: "Service",
    keywords: ["CI", "Security", "Scan", "Secrets", "gitleaks", "Azure", "Header", "Artefakt"],
    lastUpdated: "2026-06-24",
    content: `## Zweck
Automatischer Sicherheits-Scan bei jedem Push/PR auf \`main\`/\`develop\` und zusätzlich montags 03:00 UTC.
Findet Secrets, gefährliche HTTP-Header und unerlaubte Azure-/Connection-Strings im Code,
bevor sie produktiv werden.

## Komponenten
- **\`scripts/security-check.mjs\`** — projektspezifischer Scanner (plain Node, keine Dependency).
  Aufruf: \`bun run security:check\`. Schreibt \`security-report/findings.json\` und \`findings.md\`.
- **gitleaks** — zweite Verteidigungslinie für bekannte Secret-Formate, Config \`.gitleaks.toml\`.
- **\`.github/workflows/security.yml\`** — orchestriert beide Scanner und lädt den Report
  als Artefakt \`security-report-<run-id>\` hoch (Aufbewahrung 30 Tage).
- **PR-Kommentar** — \`marocchino/sticky-pull-request-comment\` postet \`findings.md\` in den PR.

## Regel-Severities
- **CRITICAL** (blockt Build): Azure AccountKey/SAS/Connection-String, Azure SQL Server=…;Password=,
  AWS-Key (\`AKIA…\`), Stripe Live (\`sk_live_…\`), OpenAI (\`sk-…\`), GitHub PAT (\`ghp_…\`),
  Slack Token, Private-Key-Block, JWT-Literal.
- **HIGH** (blockt Build): Azure-SDK-Import im Frontend, \`process.env.AZURE_*\`/\`*CONNECTION*\`
  außerhalb des Server-Scopes, CORS-Wildcard + Credentials, \`X-Frame-Options: ALLOWALL\`,
  CSP mit \`unsafe-eval\`, \`dangerouslySetInnerHTML\` mit dynamischem Input.
- **MEDIUM** (Warnung): \`console.error(error)\` mit komplettem Objekt, \`eval\`/\`new Function\`,
  CORS-Wildcard ohne Credentials, direkter Fetch zu externer URL aus dem Frontend.

## Funde lesen
1. Im GitHub-Run das Artefakt \`security-report-<run-id>\` herunterladen.
2. \`findings.md\` öffnet die Tabellen pro Severity mit Datei, Zeile und Snippet.
3. \`findings.json\` für maschinelle Auswertung.

## Treffer unterdrücken
- **Pro Treffer:** Code-Kommentar in derselben Zeile oder direkt darüber:
  \`// security-scan-allow: <regel-id>\` (z. B. \`security-scan-allow: cors-wildcard-only\`).
- **Pro Datei (gitleaks):** Pfad in \`.gitleaks.toml\` → \`[allowlist] paths\` ergänzen.
- **Globale Ausnahme:** \`IGNORE_FILES\` in \`scripts/security-check.mjs\` erweitern.

## Lokal ausführen
\`\`\`bash
bun run security:check
\`\`\`
Exit-Code \`0\` heißt: keine CRITICAL/HIGH-Funde. \`1\` blockt CI.`,
  },
];

/* ---------------------------- Settings catalog ---------------------------- */

const builtInSettings: SettingDocumentation[] = [
  {
    id: "default-view",
    name: "Standardansicht",
    description: "Welche Ansicht beim Öffnen des Dashboards aktiv ist.",
    defaultValue: "Monat",
    allowedValues: ["Woche", "Monat"],
    affectedAreas: ["Dashboard"],
  },
  {
    id: "target-basis",
    name: "Sollzeit-Basis",
    description: "Ob Soll-Stunden aus Monats- oder Wochensoll abgeleitet werden.",
    defaultValue: "Monatssoll",
    allowedValues: ["Monatssoll", "Wochensoll"],
    affectedAreas: ["Dashboard", "Leistungsreport"],
  },
  {
    id: "export-format",
    name: "Exportformat",
    description: "Standardformat im Exportdialog.",
    defaultValue: "PDF",
    allowedValues: ["PDF", "CSV", "JSON", "Azure Table"],
    affectedAreas: ["Export"],
  },
  {
    id: "grouping",
    name: "Gruppierung",
    description: "Wie Tätigkeiten im Export gruppiert werden.",
    defaultValue: "Projekt",
    allowedValues: ["Projekt", "Arbeitspaket", "Kunde", "keine"],
    affectedAreas: ["Export", "PDF-Report"],
  },
  {
    id: "sorting",
    name: "Sortierung",
    description: "Sortierreihenfolge der Tätigkeiten im Export.",
    defaultValue: "Datum aufsteigend",
    allowedValues: ["Datum aufsteigend", "Datum absteigend", "Dauer", "Titel"],
    affectedAreas: ["Export", "PDF-Report"],
  },
  {
    id: "pdf-preview",
    name: "PDF-Vorschau",
    description: "Zeigt vor dem Download eine Seitenvorschau des PDFs.",
    defaultValue: "aktiviert",
    allowedValues: ["aktiviert", "deaktiviert"],
    affectedAreas: ["Export"],
  },
  {
    id: "mfa",
    name: "MFA",
    description:
      "Multi-Faktor-Authentifizierung. Wird mit Einführung der Anmeldemaske scharf geschaltet.",
    defaultValue: "deaktiviert",
    allowedValues: ["aktiviert", "deaktiviert"],
    affectedAreas: ["Benutzerprofil"],
  },
];

/* ---------------------------- Registry / API ---------------------------- */

const dynamicTopics: HelpTopic[] = [];
const dynamicSettings: SettingDocumentation[] = [];

/** Erlaubt Komponenten, eigene Hilfethemen beizusteuern. Idempotent über `id`. */
export function registerHelpTopics(...topics: HelpTopic[]): void {
  for (const t of topics) {
    const idx = dynamicTopics.findIndex((x) => x.id === t.id);
    if (idx >= 0) dynamicTopics[idx] = t;
    else dynamicTopics.push(t);
  }
}

export function registerSettings(...items: SettingDocumentation[]): void {
  for (const s of items) {
    const idx = dynamicSettings.findIndex((x) => x.id === s.id);
    if (idx >= 0) dynamicSettings[idx] = s;
    else dynamicSettings.push(s);
  }
}

/* ---------------- Auto-generierte Topics ---------------- */

/** Baut die Änderungshistorie als Markdown-Tabelle aus dem CHANGELOG. */
function buildChangelogContent(): string {
  const lines = [
    "## Änderungshistorie",
    "Die folgende Liste wird automatisch aus dem zentralen CHANGELOG erzeugt. Jede Dashboard-Änderung mit Nutzersichtbarkeit muss hier dokumentiert werden.",
    "",
    "| Datum | Version | Änderung |",
    "| --- | --- | --- |",
    ...CHANGELOG.map((e) => `| ${e.date} | ${e.version} | ${e.change} |`),
  ];
  return lines.join("\n");
}

const generatedTopics: HelpTopic[] = [
  {
    id: "changelog",
    title: "Änderungshistorie",
    category: "Service",
    keywords: ["Changelog", "Historie", "Versionen", "Releases", "Änderungen"],
    lastUpdated: CHANGELOG[0]?.date ?? new Date().toISOString().slice(0, 10),
    content: buildChangelogContent(),
  },
  {
    id: "fehlerbehandlung-logging",
    title: "Fehlerbehandlung & Logging",
    category: "Sicherheit",
    keywords: [
      "Logger",
      "Logging",
      "Fehler",
      "Error",
      "DashboardError",
      "SyncError",
      "ImportError",
      "BackupError",
      "IndexedDB",
      "DevTools",
    ],
    lastUpdated: "2026-07-05",
    content: `## Zentrale Fehlerbehandlung
Alle kritischen Services (Sync, Import/Export, Backup, Azure) werfen ausschließlich Instanzen von \`DashboardError\` (bzw. den Subklassen \`SyncError\`, \`ValidationError\`, \`ImportError\`, \`ExportError\`, \`AzureError\`, \`BackupError\`, \`RbacError\`). Jeder Fehler trägt einen stabilen \`code\` (z. B. \`SYNC_MISSING_SECRETS\`, \`BACKUP_FAILED\`) sowie einen strukturierten \`context\`.

## Logger
\`src/lib/logger.ts\` ist die einzige Stelle im Frontend, an der \`console.*\` erlaubt ist. Alle anderen Services rufen \`logger.debug\` / \`.info\` / \`.warn\` / \`.error\` — das wird durch \`bun run lint:no-console\` in der CI geprüft.

- **DEV**: schreibt in die Browser-Console.
- **PROD**: hält die letzten 500 Einträge im Speicher-Ringpuffer und spiegelt sie asynchron in IndexedDB (\`dashboard-logs\`, Rotation nach 1000 Zeilen / 7 Tagen).
- **Secret-Redaction**: Keys mit Namen wie \`token\`, \`secret\`, \`password\`, \`authorization\`, \`bearer\`, \`apikey\` sowie JWT-ähnliche Strings werden vor dem Sink-Write als \`[REDACTED]\` maskiert.

## Backend-Logger
\`backend/services/logger.mjs\` bietet die gleiche API (nur Console-Sink) für Node/Worker. \`syncService.mjs\` nutzt ihn ausschließlich.

## useSafeAsync-Hook
\`src/hooks/useSafeAsync.ts\` kapselt Ad-hoc-Async-Handler in Komponenten. Er fängt Fehler, loggt automatisch \`logger.error\` und stellt \`{ data, error, isError, isLoading, execute, reset }\` bereit — Ersatz für rohe \`try/catch\`-Blöcke in Buttons.

## Zugriff auf Logs (Entwickler)
In DEV liegen alle Einträge zusätzlich unter \`window.__dashboardLogger.getRecent()\` — nützlich zum Debuggen ohne Netzwerkzugriff.

## Tests
Fehler- und Logging-Verhalten ist in \`src/__tests__/lib/errors.test.ts\`, \`logger.test.ts\` und \`src/__tests__/hooks/useSafeAsync.test.tsx\` abgesichert (Redaction, Ringpuffer-Rotation, Subklassen-Guards).`,
  },
  {
    id: "state-management",
    title: "Zentrales State-Management",
    category: "Technik",
    keywords: [
      "State",
      "Store",
      "Dashboard-Store",
      "Persistenz",
      "localStorage",
      "useSyncExternalStore",
      "Selektoren",
      "Performance",
    ],
    lastUpdated: "2026-07-06",
    content: `## Warum ein Store
Der Domain-State (Projekte, Arbeitspakete, Tätigkeiten, Engineer-Profil) lebt zentral im \`dashboardStore\` (\`src/lib/store/dashboard-store.ts\`) — als Modul-Singleton mit Pub-Sub, ohne zusätzliche Bibliothek (kein Zustand, kein Redux). Damit verschwinden Prop-Drilling und der zuvor teure Full-Blob-Write pro Tastendruck.

## Was NICHT im Store liegt
UI-State (offene Dialoge, Suchtext, Menüs, ausgewählter Tab, Periodenoffset) bleibt bewusst lokal in den Komponenten. Nur echter Anwendungsdaten-Zustand wandert in den Store.

## React-Bindings
Komponenten binden über selektor-basierte Hooks an:
- \`useProjects()\`, \`useWorkPackages()\`, \`useActivities()\`, \`useEngineer()\`
- \`useProjectById(id)\`, \`useWorkPackageById(id)\`
- \`useDashboardStore(selector)\` für eigene Selektoren.

Intern nutzt jede Bindung \`useSyncExternalStore\`. Consumer rendern nur neu, wenn sich IHR Slice ändert — im Gegensatz zu naivem React-Context.

## Persistenz
\`src/lib/store/dashboard-persistence.ts\` sorgt für:
- Einmalige Hydration beim App-Start (kompatibel zum bestehenden Storage-Key \`northbit-dashboard-v2\`, user-scoped).
- Debounced Write (300 ms) statt Full-Blob-Effect bei jedem Zeichen.
- Rehydrate bei Benutzerwechsel (\`subscribeUserChanges\`) und bei Änderungen aus anderen Tabs (\`storage\`-Event).
- Fallback auf Fixture + \`logger.warn\` bei korruptem JSON.

## DevTools-Zugriff
Nur im DEV-Build ist der Store unter \`window.__dashboardStore\` erreichbar (getState / replaceAll / reset). In PROD ist der globale Verweis nicht gesetzt.

## Tests
\`src/__tests__/lib/store/\` deckt Store-Mutatoren, Referenz-Gleichheit unveränderter Slices, Persistenz-Debounce, Fallback-Verhalten und selektor-basierte Re-Render-Vermeidung ab.`,
  },
  {
    id: "architektur",
    title: "Architektur & Entscheidungshistorie",
    category: "Technik",
    keywords: [
      "Architektur",
      "ADR",
      "Architecture Decision Record",
      "TanStack",
      "Cloudflare",
      "RBAC",
      "Local-First",
      "Store",
      "Logger",
    ],
    lastUpdated: "2026-07-09",
    content: `## Übersicht
Das Dashboard ist eine **TanStack Start v1**-Anwendung (React 19, Vite 7), die als **Cloudflare Worker** (mit \`nodejs_compat\`) läuft. State wird lokal-first in \`localStorage\` gehalten und über einen eigenen Pub-Sub-Store (\`src/lib/store/\`) mit React 18 \`useSyncExternalStore\` an die UI gebunden.

## Wo steht was?
Die vollständige Doku liegt im Repository unter \`docs/\`:
- \`docs/ARCHITECTURE.md\` — Modulgrenzen, Datenfluss, Runtime-Grenzen, Trust-Boundaries, Performance-Strategie.
- \`docs/API.md\` — Server-Routen (\`GET /api/status\`, \`POST /api/sync\`).
- \`docs/DEPLOYMENT.md\` — Build, ENV, CI, Cloudflare-Deploy, Rollback.
- \`docs/DATA-SCHEMA.md\` — Export-/Import-Format + Migrationsregeln (Wahrheit: \`src/lib/json-schema.ts\`).
- \`docs/CONTRIBUTING.md\` — Branch-Strategie, Commit-Konvention, Doku-Sync-Pflicht.

## Entscheidungshistorie (ADRs)
Jede signifikante Architekturentscheidung liegt als eigenes ADR unter \`docs/ADR/\`:
- **ADR-0001** — TanStack Start v1 statt Next.js/Remix (SSR + Worker-Kompatibilität).
- **ADR-0002** — RBAC im Frontend gespiegelt zum Backend; **derzeit UX-Komfort, keine Trust-Boundary** — bis echte Auth aktiv ist.
- **ADR-0003** — Local-First mit \`localStorage\` (user-scoped), Azure-Sync nur manuell.
- **ADR-0004** — Eigener Pub-Sub-Store statt Zustand/Redux/Jotai (Zero-Dep, Referenz-Stabilität).
- **ADR-0005** — Frontend-Logger + IndexedDB-Ringbuffer statt Sentry (Privacy, Kosten).
- **ADR-0006** — Kein Virtual Scrolling (aktuelle Listen zu klein, Aufnahme erst mit Messnachweis).

Neue Entscheidungen bekommen ein **neues** ADR (nicht bestehende überschreiben). Template in \`docs/ADR/README.md\`.

## Performance
- **Lazy-Loading**: 11 schwere Dashboard-Dialoge (Export, Backup, Systemstatus, Azure, PerformanceReport mit recharts, PDF-Export mit jsPDF …) sind via \`React.lazy\` + \`Suspense\` ausgelagert und werden erst beim ersten Öffnen geladen.
- **Bundle-Analyse**: \`bun run analyze\` erzeugt \`dist/stats.html\` (rollup-plugin-visualizer, gitignored) — nur opt-in, kein Default-Overhead.
- Kein spekulatives \`React.memo\` — Referenz-Stabilität liefert bereits der Pub-Sub-Store (ADR-0004).`,
  },
  {
    id: "barrierefreiheit",
    title: "Barrierefreiheit (WCAG 2.1 AA)",
    category: "Technik",
    keywords: [
      "A11y",
      "Barrierefreiheit",
      "WCAG",
      "Accessibility",
      "Tastatur",
      "Screenreader",
      "Kontrast",
      "ARIA",
    ],
    lastUpdated: "2026-07-07",
    content: `## Anspruch
Das Dashboard richtet sich nach **WCAG 2.1 AA**. Grundlage sind shadcn/ui-Komponenten (Radix UI) — Fokus-Management, ARIA-Rollen und Tastaturbedienung sind dort korrekt implementiert. Eigene Komponenten müssen dieses Niveau halten.

## Automatisiert getestet (CI)
- **vitest-axe** prüft im Test-Suite jedes gerenderte Panel auf axe-core-Violations.
  - \`src/__tests__/a11y/smoke.test.tsx\` — kritische Panels/Dialoge.
  - \`src/__tests__/a11y/keyboard.test.tsx\` — ESC schließt Dialoge, Fokus-Reihenfolge.
- Axe deckt herstellerseitig ca. 57 % der WCAG-Kriterien automatisiert ab. Der Rest ist manuell.

## Manuell zu prüfen
- **Tastaturbedienung**: Alle Aktionen müssen mit Tab / Shift+Tab / Enter / Space / Esc erreichbar sein. Kein Handler nur auf \`onClick\` eines \`<div>\`.
- **Screenreader** (NVDA / VoiceOver): Formulare, Toasts, Dialoge und Import-/Export-Feedback müssen angesagt werden. Toaster (\`sonner\`) setzt \`aria-live\` selbst.
- **Kontrast**: Design-Tokens sind AA-konform. Keine ad-hoc \`text-gray-*\`/\`text-muted-foreground/50\` einführen — Skill-Guide-Regel.
- **Zoom / 200 %**: Layout muss ohne horizontales Scrollen weiter nutzbar bleiben.

## Bekannte Einschränkung: PDF-Export
Der PDF-Export via jsPDF erzeugt **kein PDF/UA-konformes Structure-Tree**. Für strikt barrierefreie Ausgabe steht der **TXT-Export** bzw. **JSON-Export** zur Verfügung — beide Formate sind screenreader-freundlich und werden im Export-Dialog empfohlen.

## Konventionen für neue Komponenten
- **Icon-only Buttons** brauchen immer \`aria-label\` (Lucide-Icons zusätzlich \`aria-hidden="true"\`).
- **Formulare**: sichtbares \`<label>\` oder \`aria-label\`.
- **Dynamische Meldungen**: \`role="status" aria-live="polite"\` für nicht-kritische Updates.
- **Semantisches HTML** vor ARIA: \`<button>\`, \`<table>\`, \`<nav>\` statt \`role="…"\` auf \`<div>\`.
- **Fokus-Indikator** nicht per \`outline: none\` deaktivieren — Tailwind \`focus-visible:ring\` reicht.

## Browser-Extensions
Manche Extensions (Dashlane, LastPass, Grammarly) injizieren \`data-*\`-Attribute in Inputs und Buttons und lösen dadurch React-Hydration-Mismatches aus. Auf betroffenen Feldern setzen wir \`suppressHydrationWarning\` — das ist ein Extension-Workaround, kein Verzicht auf A11y.`,
  },

  {
    id: "backup",
    title: "Backup",
    category: "Service",
    route: "/",
    component: "BackupDialog",
    keywords: ["Backup", "Sicherung", "ZIP", "Download", "Wiederherstellung", "Quellcode"],
    lastUpdated: "2026-06-18",
    content: `## Daten-Backup
Das Dashboard erzeugt einmal pro Kalendertag automatisch ein vollständiges ZIP-Backup aller Dashboard-Daten (Engineure, Arbeitszeitmodelle, Benutzer, Einstellungen, Berichte, Export-Ablage-Index).

## Manuelles Backup
Über "Backup jetzt erstellen" wird sofort ein neues Backup erzeugt. Vor dem Packen läuft eine Konsistenzprüfung, nach dem Packen wird das ZIP testweise entpackt und validiert.

## Downloadbereich
Jedes Backup zeigt Dateiname, Erstellungsdatum, Größe und Prüfstatus. Über den Download-Button wird das ZIP heruntergeladen.

## Backup-Protokoll
Das einklappbare Protokoll zeigt alle Backup-Läufe inklusive Warnungen und Fehlern.

## Quellcode
Aus der Browser-App heraus kann der Projekt-Quellcode nicht gesichert werden. Den vollständigen Quellcode für einen eigenen Webserver erhalten Sie über Lovable (Code-Editor → Codebase herunterladen) oder die GitHub-Integration. Im ZIP liegt dazu eine Anleitung in INSTALL.md.

## Sicherheit
Schlüssel mit Hinweisen auf Passwörter, Tokens, API-Keys oder JWTs werden vor dem Packen ausgeschlossen und niemals ins ZIP geschrieben.

## JSON-Komplett-Export (zusätzlich)
Im Bereich „Service → Import / Export → Backup" steht zusätzlich ein JSON-Komplett-Export bereit (Dateiname \`dashboard-backup_YYYY-MM-DD_HHMMSS.json\`). Er nutzt Schema v1 und erscheint im Downloadbereich. Das tägliche automatische ZIP-Backup bleibt unverändert der Standard.`,
  },
  {
    id: "downloads",
    title: "Downloads",
    category: "Service",
    route: "/",
    component: "DownloadCenterDialog",
    keywords: [
      "Downloads",
      "Export-Downloads",
      "PDF",
      "Report",
      "Datei",
      "Herunterladen",
      "Vorschau",
      "Ablage",
    ],
    lastUpdated: "2026-06-19",
    content: `## Downloadbereich
Der Dialog "Service → Downloads…" zeigt alle erzeugten Export-Dateien (PDF, CSV, JSON, Azure Table) mit Dateiname, Format, Zeitraum, Erstellt am, Erstellt von, Dateigröße, Status und verbleibender Aufbewahrungszeit.

## Status
- **In Erstellung** — der Export wird gerade erzeugt.
- **Fertig** — Datei steht zum Download bereit.
- **Fehlgeschlagen** — die Erzeugung wurde abgebrochen, eine Fehlermeldung wird angezeigt.
- **Abgelaufen** — die Aufbewahrungsdauer ist erreicht; nach 7 Tagen Karenzzeit wird der Eintrag automatisch gelöscht.

## Aktionen pro Eintrag
- **Herunterladen** — speichert die Datei in den Standard-Downloads-Ordner.
- **Vorschau öffnen** — öffnet PDF-Reports in der pdf.js-Vorschau, CSV/JSON/Azure-Exporte in einer Monospace-Textvorschau (bis 256 KB).
- **Löschen** — entfernt den Eintrag aus dem Downloadbereich.

## Aufbewahrung & automatischer Ablauf
Pro neuem Export wird ein Ablaufdatum gesetzt (Default 30 Tage, einstellbar im Dialog zwischen 1 und 365 Tagen). Beim Öffnen des Dialogs werden überschrittene Einträge automatisch auf "Abgelaufen" markiert; nach weiteren 7 Tagen Karenz werden sie endgültig gelöscht. Mit der Schaltfläche „Abgelaufene jetzt löschen" lässt sich die Karenz manuell umgehen. Die Spalte „Ablauf" zeigt die Restzeit pro Eintrag.

## Verhalten nach Export-Erstellung
Nach erfolgreicher Erzeugung erscheint die Datei automatisch im Downloadbereich (Status "Fertig"). Ein Toast bestätigt: "<Format>-Report wurde erstellt und steht im Downloadbereich bereit." Fehlgeschlagene Exporte werden mit Status "Fehlgeschlagen" und Fehlertext sichtbar gemacht. Der Dateiname enthält die Report-ID (\`REP-YYYYMMDD-HHMMSS\`), wodurch gleichzeitige Exporte garantiert eindeutige Dateinamen erhalten.

## Unterstützte Formate
Alle vier Export-Pfade legen automatisch Download-Einträge an: **PDF** (Leistungsnachweis mit Vorschau), **CSV** (semikolongetrennt, UTF-8 mit BOM für Excel), **JSON** (Konfiguration + Summary + Tätigkeiten) und **Azure Table** (NDJSON, eine Entität pro Zeile, PartitionKey = Monat, RowKey = Activity-ID).

## Speicherort
Die Ablage liegt lokal im Browser (IndexedDB) und verlässt das Gerät nicht. Manuelle Speicherorte (Datei-Dialog, Standard-Download) bleiben über den Speichern-Dialog der Vorschau weiterhin verfügbar. Eine optionale Cloud-Synchronisation ist im Service vorbereitet (Schema mit \`expiresAt\`, \`retentionDays\`, \`reportId\`), aber bewusst noch nicht aktiviert.`,
  },
  {
    id: "system-status",
    title: "Systemstatus",
    category: "Service",
    route: "/",
    component: "SystemStatusDialog",
    keywords: [
      "Systemstatus",
      "GitHub",
      "Commit",
      "Branch",
      "Version",
      "Lovable",
      "Publish",
      "Preview",
      "Health",
    ],
    lastUpdated: "2026-06-29",
    content: `## Was zeigt der Systemstatus?
Der Dialog "Service → Systemstatus…" ist in **sieben Sektionen** gegliedert und zeigt ausschließlich Booleans, Status und ENV-Variablen­**namen**. Werte, Secrets, Connection Strings und SAS-Tokens werden **niemals** angezeigt.

## 1. Application
Application-Name, Version (\`DASHBOARD_VERSION\` aus \`CHANGELOG.md\`), Build-Date und Runtime-Mode (\`development\`/\`production\` vom Backend).

## 2. GitHub
Repository-URL (Single Source \`src/lib/project-info.ts\`, in CI über \`GITHUB_REPOSITORY\` überschreibbar), Current Branch und Commit-Hash. Fehlt der Commit (z. B. in der Lovable-Sandbox ohne \`git\`), erscheint "Not configured".

## 3. Lovable
Current Publish URL, Deployment-Status, Last Deployment, Project-ID. Ohne ENV-Konfiguration: "Not configured".

## 4. Azure
Azure-Access (allowed/blocked), SQL/Table/Storage je als configured-Badge, Auth-Mode (managed-identity / client-secret / none), Last Connection Test und **Missing ENV Variables** als reine Namensliste. Quelle: \`secretManager.has()\` und \`validate()\` — niemals \`consume()\`.

## 5. Security
Authentication-Mode, RBAC-Status (Anzahl Rollen × Permissions), Secret-Manager-Status, ENV-Validation (ok/failed plus fehlende Namen) und Key-Vault-Readiness (\`config/keyVault.isKeyVaultConfigured()\`).

## 6. Data
Local Storage (immer aktiv), Last Local Backup (\`BackupService.lastAuto\`), Last Azure Export/Import. Fehlende Werte → "Not configured".

## 7. Documentation
User-Manual-Version, Management-Overview-Status, Last Documentation Update.

## Startvalidierung
Beim Laden des Dashboards triggert \`bootstrapSystemStatusCheck()\` einmalig einen Fetch auf \`/api/status\` (Timeout 3 s). Das Backend ruft \`secretManager.validate()\` pro Request auf (PROD-Fail-Fast, DEV-Warn). Frontend rendert defensiv: fehlt eine Antwort, bleiben lokale Werte (Version, Build, Backup) sichtbar und alle Server-Felder erscheinen als "Not configured".

## Sicherheitsregeln
- Frontend importiert weder \`secretManager\` noch \`envValidator\`/\`keyVault\`.
- \`/api/status\`-Payload enthält ausschließlich Booleans, Variablennamen und Metadaten.
- Fehlende Werte brechen die Anzeige nie — pro Feld Fallback "Not configured".`,
  },

  {
    id: "import-export",
    title: "Import / Export (JSON)",
    category: "Service",
    route: "/",
    component: "ImportExportDialog",
    keywords: [
      "Import",
      "Export",
      "JSON",
      "Schema",
      "Backup",
      "Migration",
      "Testdaten",
      "Beispieldateien",
      "Schnittstelle",
    ],
    lastUpdated: "2026-06-20",
    content: `## Zweck der JSON-Schnittstelle
Die Schnittstelle erlaubt strukturiertes Sichern, Migrieren und Austauschen von Dashboard-Daten im JSON-Format (Schema v1). Sie ist Grundlage für Backup, Wiederherstellung, Testdaten, spätere API-Anbindung und Dokumentation der Datenstruktur.

## Komplett-Export
Eine einzige JSON-Datei enthält alle Bereiche (Benutzer, Kunden, Projekte, Arbeitspakete, Tätigkeiten, Zeitbuchungen, Arbeitszeitmodelle, Einstellungen, Handbuch-Metadaten). Dateiname: \`dashboard-backup_YYYY-MM-DD_HHMMSS.json\`.

## Teil-Export
Pro Domäne (z. B. nur Projekte oder nur Zeitbuchungen) wird eine eigene Datei erzeugt. Dateiname: \`dashboard-<scope>_YYYY-MM-DD_HHMMSS.json\`. Geeignet für gezielten Import oder Austausch.

## JSON-Import (Stufe 2)
Wizard mit vier Schritten:
1. Datei auswählen — JSON wird geparst, sensible Felder vor der Validierung entfernt, Schema-Version geprüft.
2. Vorschau — pro Bereich (Benutzer, Projekte, Arbeitspakete, Tätigkeiten, Arbeitszeitmodelle, Einstellungen) Anzahl Neuanlagen, Aktualisierungen und Skips. Konflikt-Strategie wählen: Merge (Default, eingehende Felder kippen), Überschreiben (kompletter Datensatz) oder Behalten (nur Neuanlagen).
3. Mapping — Benutzer-Mapping (engineerId → bestehender User / neu anlegen / überspringen) und Kunden-Mapping mit automatischer Vorschlagsliste für Verdachts-Duplikate (Levenshtein-Distanz ≤ 2 oder gleicher Normalize-Schlüssel).
4. Ausführung — vor dem Schreiben wird ein Pre-Snapshot der betroffenen Storage-Keys erzeugt. Bei Fehler erfolgt automatischer Rollback; das Protokoll markiert den Lauf entsprechend.

## Konfliktregel timeEntries vs. activities
Sobald in derselben Datei sowohl \`activities\` als auch \`timeEntries\` für dieselbe Tätigkeit existieren, ist \`timeEntries\` die kanonische Quelle (Datum, Dauer, Stundensatz, Abrechnungsstatus, Beschreibung). Abweichungen erscheinen als Warnung im Import-Protokoll.

## Single-Engineer-Modus
Solange das Dashboard nur einen Benutzer kennt, ist \`activity.engineerId\` kosmetisch. Der Mapping-Schritt wird übersprungen, eingehende engineerIds werden dem aktiven Benutzer zugeordnet oder ignoriert (mit Hinweis im Protokoll).

## Kunden-Normalisierung
Kunden werden nicht als eigene Entität gespeichert, sondern als Freitext in \`project.client\` / \`workPackage.client\`. Der Import normalisiert Namen (trim + Whitespace + Casefold) und schlägt für jeden eingehenden Kunden den ähnlichsten bestehenden vor. Die Wahl wird beim Apply auf alle abhängigen Felder projiziert.

## Import-Protokoll
Jeder Lauf wird in IndexedDB persistiert: Zeitstempel, Dateiname, Auslöser, Zähler (Neu/Update/Skip/Fehler), Warnungen, Konflikte, Mapping-Entscheidungen und Pre-Snapshot-ID. Solange der Snapshot in derselben Session existiert, kann der Lauf mit einem Klick zurückgerollt werden. Standard-Aufbewahrung 90 Tage, konfigurierbar.

## Beispieldateien
Im Tab „Beispieldateien" stehen sechs deterministische Beispiel-JSONs zum Download bereit. Jede Datei kann live validiert werden.

## Brückenfelder
Heute ist das Datenmodell nicht alle Bereiche nativ abbildet, ergänzt das Schema zwei optionale Felder:
- \`project.customerId\` — synthetische Kunden-ID, abgeleitet aus \`project.client\`.
- \`activity.engineerId\` — Zuordnung einer Tätigkeit zu einem Benutzerprofil.

## Schema-Versionierung
Jede Datei enthält im Kopf \`schemaVersion\` (aktuell \`1.0.0\`), \`exportType\`, \`exportedAt\`, \`exportedBy\` und \`dashboardVersion\`. Schema-Mismatches stoppen den Import vor dem Schreiben.

## Sicherheitsregeln
- Passwörter, Passwort-Hashes, MFA-Secrets, OAuth/Bearer-Token und API-Keys werden **niemals** exportiert.
- Beim Import werden dieselben Felder VOR der Validierung entfernt — auch wenn eine manipulierte Datei sie enthält.
- Die zentrale Denylist greift sowohl auf Storage-Keys als auch auf Feldnamen von Objekten.
- Sichtbarkeit der Menüpunkte ist auf die Rollen „Administrator" und „Teamleiter" beschränkt.

## ZIP-Backup mit eingebetteter dashboard.json
Backups ab Version 1.14 enthalten zusätzlich eine kanonische \`dashboard.json\` (Schema v1). Beim Restore wird sie bevorzugt; nur wenn sie fehlt oder ungültig ist, greift der Restore auf die rohen Storage-Dumps zurück. Alte ZIPs bleiben uneingeschränkt lesbar.`,
  },
  {
    id: "rbac-rollen-berechtigungen",
    title: "Rollen & Berechtigungen (RBAC)",
    category: "Sicherheit",
    route: "/",
    component: "RBAC",
    keywords: [
      "RBAC",
      "Rollen",
      "Berechtigungen",
      "Permissions",
      "Entra",
      "Administrator",
      "Viewer",
    ],
    lastUpdated: "2026-07-13",
    content: `## Rollen
Sieben Rollen mit klarer Privileg-Reihenfolge (hoch → niedrig):
1. **System-Administrator** — darf alles. Einzige Rolle für Datenbankaufbau (\`azure.database.build\`) und Rollenverwaltung (\`roles.manage\`).
2. **Administrator** — Tagesbetrieb inkl. Benutzerverwaltung, Audit Logs, Backup-Restore, Azure-Export/Import. Kein Datenbankaufbau, keine Rollenverwaltung.
3. **Teamleiter** — bearbeitet Projekte / Arbeitspakete / Tätigkeiten und darf nach Azure exportieren. Kein Import.
4. **Projektmanager** — wie Teamleiter, aber ohne Systemstatus-Einsicht.
5. **Systemingenieur** — bearbeitet Arbeitspakete und Tätigkeiten.
6. **Kunde** — sieht Dashboard und Dokumentation, sonst nichts. Keine Admin- oder Statusansichten.
7. **Viewer** — read-only.

## Permission-Matrix (14 atomare Rechte)
\`dashboard.view\`, \`documentation.view\`, \`systemstatus.view\`, \`project.edit\`, \`workpackage.edit\`, \`activity.edit\`, \`azure.connection.test\`, \`azure.export\`, \`azure.import\`, \`azure.database.build\`, \`backup.restore\`, \`users.manage\`, \`roles.manage\`, \`auditlog.view\`.

Single Source of Truth: \`src/lib/rbac/permissions.ts\` (Frontend) mit identischem Mirror in \`backend/services/rbac.mjs\` (Server). Der CI-Check \`bun run rbac:check\` (Script \`scripts/check-rbac.mjs\`) vergleicht beide Matrizen und failed bei Drift.

## Garantierte Invarianten
- \`azure.database.build\` ⊆ {System-Administrator}
- \`azure.import\` ⊆ {System-Administrator, Administrator}
- Träger(\`azure.import\`) ⊆ Träger(\`azure.export\`) — Import ist strikter als Export.
- \`roles.manage\` ⊆ {System-Administrator}
- \`users.manage\`, \`auditlog.view\`, \`backup.restore\` nur für Admins.
- Viewer hat keine Edit-/Azure-/Manage-/Backup-Permission.
- Kunde sieht keinen Systemstatus.

## Schutz vor Self-Lockout
Der letzte aktive System-Administrator kann nicht degradiert, deaktiviert oder gelöscht werden. Im Benutzer-Editor ist die Rollen-Auswahl ohne \`roles.manage\` gesperrt und die SysAdmin-Rolle ausgeblendet.

## Migration
Bestehende Default-Administratoren werden beim Start einmalig auf \`systemadministrator\` angehoben (Flag \`northbit-rbac-migrated-v1\`). Nachfolgende Starts ändern nichts mehr.

## Entra-ID-Readiness
\`config/roleResolver.mjs\` enthält \`resolveRoleFromGroups(groupIds, mapping)\`. Mehrere Treffer ergeben die höchstprivilegierte Rolle, kein Treffer ergibt \`viewer\` (Least-Privilege-Fallback). Beispielmapping: \`config/entraMapping.example.json\`. Entra liefert nur Identität — die interne Permission-Matrix bleibt die einzige Autorität für Aktionen.

## UI-Gating vs. Server-Guard
\`PermissionGate\` und \`usePermission()\` blenden UI rein lokal. Sobald serverseitige Auth aktiv ist, muss jede schreibende Server-Route zusätzlich \`requirePermission()\` aus \`backend/services/rbac.mjs\` aufrufen — UI-Gating ist niemals der einzige Schutz.

## Ausblick: RBAC v2 Assignments
Die Weiterentwicklung Richtung Multi-Customer, Azure-Ressourcen-Scopes und Entra-Gruppen ist in **ADR-0007** (Typen) und **ADR-0008** (Assignment-Architektur) beschrieben. Solange keine Assignments gepflegt sind, gilt weiterhin die flache v1-Matrix.`,
  },
  {
    id: "local-operation",
    title: "Lokaler Betrieb ohne Azure",
    category: "Betrieb",
    keywords: ["lokal", "offline", "Azure", "Standalone", "Browser", "localStorage"],
    lastUpdated: "2026-06-30",
    content: `## Worum geht es?
Das Dashboard funktioniert vollständig ohne Azure und ohne Backend. Alle Daten liegen lokal im Browser (localStorage / IndexedDB) und verlassen das Gerät nur, wenn Sie es aktiv anstoßen (Export, Backup-Download, Sync).

## Was lokal funktioniert
- Anlage und Pflege von Projekten, Arbeitspaketen und Tätigkeiten
- Wochen- und Monatsansicht inkl. Leistungsreport
- PDF-, CSV- und JSON-Export
- Tägliches ZIP-Backup, Downloadbereich
- Import/Export-Wizard
- Benutzerhandbuch, Systemstatus-Anzeige
- Benutzerverwaltung und Rollen-Wechsel

## Was zusätzlich Azure braucht
- Aktiver Sync nach Azure SQL / Table Storage
- Datenbankaufbau in Azure
- Cloud-übergreifender Datenaustausch zwischen mehreren Geräten

## Empfehlung
Wenn Sie das Dashboard nur als Einzelplatz nutzen, ist keine Azure-Konfiguration nötig. Die Sektion "Azure" im Systemstatus bleibt dann auf "Not configured" — das ist beabsichtigt.`,
    relatedTopics: ["offline-mode", "azure-service-area"],
  },
  {
    id: "azure-service-area",
    title: "Azure Servicebereich",
    category: "Azure",
    keywords: ["Azure", "Service", "SQL", "Table", "Storage", "Sync"],
    lastUpdated: "2026-06-30",
    content: `## Überblick
Der Azure-Servicebereich bündelt alle Cloud-Funktionen: Datenbankaufbau, Verbindungstest, Export nach Azure und Import aus Azure. Sichtbarkeit und Ausführung sind über Rollen abgesichert.

## Voraussetzungen
- Runtime-Mode \`production\` oder ein Backend, das Azure-Aufrufe erlaubt
- Vollständig konfigurierte ENV-Variablen (siehe Kapitel "ENV-Validierung")
- Erfolgreicher Verbindungstest

## Berechtigungen (Kurzform)
- **Verbindung testen**: System-Administrator, Administrator, Teamleiter
- **Nach Azure exportieren**: System-Administrator, Administrator, Teamleiter, Projektmanager
- **Aus Azure importieren**: System-Administrator, Administrator
- **Datenbank aufbauen**: ausschließlich System-Administrator

## Sicherheit
Alle Azure-Aufrufe laufen serverseitig. Das Browser-Bundle enthält weder Connection-Strings noch SAS-Tokens. Im Development-Modus sind Azure-Aufrufe grundsätzlich blockiert (\`assertAzureAllowed\`).`,
    relatedTopics: [
      "azure-database-build",
      "azure-connection-test",
      "azure-export",
      "azure-import",
      "env-validation",
    ],
  },
  {
    id: "azure-database-build",
    title: "Azure Datenbank aufbauen",
    category: "Azure",
    roles: ["systemadministrator"],
    keywords: ["Azure", "Datenbank", "Schema", "Aufbau", "SQL", "Migration"],
    lastUpdated: "2026-06-30",
    content: `## Zweck
Initialer Aufbau der Azure-Datenbank inklusive aller Tabellen, Indizes und Berechtigungen. Wird einmalig bei der Inbetriebnahme oder gezielt bei Schema-Updates ausgeführt.

## Voraussetzungen
- Rolle **System-Administrator** (einzige Rolle mit \`azure.database.build\`)
- Gültige Verbindung (vorher "Verbindung testen" erfolgreich)
- ENV-Validierung "ok"

## Ablauf
1. Service → Azure → "Datenbank aufbauen" öffnen.
2. Zielumgebung bestätigen (Anzeige des Ziel-Hosts ohne Credentials).
3. Schema-Version prüfen.
4. Aufbau starten. Fortschritt und Logs erscheinen direkt im Dialog.

## Warnhinweise
> ⚠️ **Achtung:** Der Datenbankaufbau kann bestehende Strukturen verändern oder neu anlegen. Führen Sie vorher ein vollständiges Backup aus (Service → Backup → "Backup jetzt erstellen").
> ⚠️ Niemals ohne Rücksprache in einer produktiven Umgebung ausführen.
> ⚠️ Es werden **keine** Secrets oder Connection-Strings angezeigt oder geloggt — nur Tabellen-/Schema-Operationen.`,
    relatedTopics: ["azure-connection-test", "backup-before-import", "rbac-rollen-berechtigungen"],
  },
  {
    id: "azure-connection-test",
    title: "Azure Verbindung testen",
    category: "Azure",
    keywords: ["Azure", "Test", "Verbindung", "Health", "Connection"],
    lastUpdated: "2026-06-30",
    content: `## Zweck
Prüft, ob die hinterlegten Azure-ENVs gültig sind und die Zielressourcen (SQL, Table Storage) erreichbar sind. Ergebnis: ok / fehlgeschlagen samt Zeitstempel.

## Ablauf
1. Service → Azure → "Verbindung testen" öffnen.
2. Test starten. Der Aufruf läuft serverseitig.
3. Ergebnis erscheint im Dialog und im Systemstatus (Sektion Azure → "Last Connection Test").

## Was angezeigt wird
- Ergebnis (ok / fehlgeschlagen)
- Zeitstempel
- Bei Fehler: generische Fehlerklasse (z. B. "Authentifizierung fehlgeschlagen", "Timeout"), **niemals** Roh-Fehler, Secrets oder Stacktraces.

## Bei Fehlschlag
- Prüfen Sie im Systemstatus die Sektion Azure: "Missing ENV Variables" listet fehlende Namen.
- Prüfen Sie den Auth-Mode (managed-identity / client-secret / none).
- Bei "Timeout" liegt häufig eine Firewall-Regel auf Azure-Seite vor.`,
    relatedTopics: ["env-validation", "system-status"],
  },
  {
    id: "azure-export",
    title: "Nach Azure exportieren",
    category: "Azure",
    keywords: ["Azure", "Export", "Sync", "Upload", "Cloud"],
    lastUpdated: "2026-06-30",
    content: `## Zweck
Überträgt lokale Dashboard-Daten in die konfigurierte Azure-Zielumgebung. Standardziel ist Azure Table Storage; die SQL-Pipeline ist optional aktivierbar.

## Voraussetzungen
- Erfolgreicher Verbindungstest
- Rolle mit \`azure.export\` (System-Administrator, Administrator, Teamleiter, Projektmanager)

## Ablauf
1. Service → Azure → "Nach Azure exportieren" öffnen.
2. Zeitraum und Bereiche wählen (z. B. nur Tätigkeiten).
3. Vorschau prüfen: Anzahl Neuanlagen und Aktualisierungen pro Bereich.
4. Export starten. Fortschritt und Ergebnis erscheinen im Dialog und im Downloadbereich (als JSON-Snapshot).

## Sicherheit
- Passwörter, MFA-Secrets, Tokens und API-Keys werden **niemals** mitgesendet.
- Der Export läuft serverseitig; das Browser-Bundle erhält keinen Direktzugriff auf Azure.
- Jeder Lauf wird in der Sync-Historie (Systemstatus → Data) protokolliert.`,
    relatedTopics: ["azure-connection-test", "azure-conflict-handling", "downloads"],
  },
  {
    id: "azure-import",
    title: "Aus Azure importieren",
    category: "Azure",
    roles: ["systemadministrator", "administrator"],
    keywords: ["Azure", "Import", "Download", "Cloud", "Restore"],
    lastUpdated: "2026-06-30",
    content: `## Zweck
Holt Daten aus der konfigurierten Azure-Quelle ins lokale Dashboard. Bewusst restriktiver als der Export, weil Importe lokale Daten überschreiben können.

## Voraussetzungen
- Rolle **System-Administrator** oder **Administrator** (\`azure.import\`)
- Erfolgreicher Verbindungstest
- **Pflicht:** Aktuelles lokales Backup (siehe Kapitel "Backup vor Import")

## Ablauf
1. Service → Azure → "Aus Azure importieren".
2. Bereich und Zeitraum wählen.
3. Vorschau und Konflikt-Strategie wählen (Merge / Überschreiben / Behalten) — siehe Kapitel "Konflikthandling".
4. Vor der Ausführung erzeugt das Dashboard automatisch einen **Pre-Snapshot** der betroffenen Storage-Keys (Rollback-Punkt).
5. Import starten. Bei Fehler wird automatisch zurückgerollt.

## Warnhinweise
> ⚠️ **Überschreibungs-Risiko:** Mit der Strategie "Überschreiben" gehen lokale Änderungen ohne Vorwarnung verloren. Standard ist deshalb "Merge".
> ⚠️ Führen Sie vor jedem Import ein vollständiges Backup aus.
> ⚠️ Importe können nicht teilweise rückgängig gemacht werden, sobald der Pre-Snapshot verworfen ist.`,
    relatedTopics: ["azure-conflict-handling", "backup-before-import", "azure-export"],
  },
  {
    id: "azure-conflict-handling",
    title: "Konflikthandling beim Import",
    category: "Azure",
    keywords: ["Konflikt", "Merge", "Überschreiben", "Behalten", "Strategie", "Duplikate"],
    lastUpdated: "2026-06-30",
    content: `## Wann tritt ein Konflikt auf?
Ein Konflikt entsteht, sobald ein eingehender Datensatz dieselbe ID oder denselben Schlüssel hat wie ein lokaler Datensatz.

## Strategien
- **Merge (Default)** — eingehende Felder kippen lokale Werte feldweise. Fehlende Felder bleiben unverändert. Geeignet für Routine-Updates.
- **Überschreiben** — der eingehende Datensatz ersetzt den lokalen Datensatz komplett. Lokale Ergänzungen gehen verloren.
- **Behalten** — bestehende Datensätze werden nicht angefasst; nur Neuanlagen werden geschrieben.

## Spezialregel: timeEntries vs. activities
Sind beide Listen für dieselbe Tätigkeit enthalten, gilt \`timeEntries\` als kanonische Quelle. Abweichungen erscheinen als Warnung im Import-Protokoll.

## Duplikatprüfung bei Kunden
Eingehende Kundennamen werden normalisiert (trim + Whitespace + Casefold) und per Levenshtein-Distanz mit bestehenden Namen verglichen. Verdachts-Duplikate (Distanz ≤ 2 oder gleicher Normalize-Schlüssel) werden zur manuellen Bestätigung vorgeschlagen.

## Warnhinweise
> ⚠️ Die Strategie "Überschreiben" lässt sich nur über den Pre-Snapshot zurücknehmen — solange die Session offen ist.
> ⚠️ Jede Konflikt-Entscheidung wird im Import-Protokoll dauerhaft festgehalten.`,
    relatedTopics: ["azure-import", "backup-before-import", "import-export"],
  },
  {
    id: "azure-data-service-area",
    title: "Azure Daten – Servicebereich",
    category: "Azure",
    keywords: ["Azure", "Service", "Aktionen", "Historie", "Vorschau", "Backup"],
    lastUpdated: "2026-07-02",
    content: `## Überblick
Der neue Servicebereich **Azure Daten** bündelt alle Azure-Interaktionen in einem Dialog mit drei Tabs: **Status**, **Aktionen** und **Historie**. Öffnen über Service → „Azure Daten…".

## Regeln
- Jede Aktion wird ausschließlich per Button gestartet.
- Es läuft **nichts automatisch** – kein Polling, kein Auto-Sync.
- Buttons werden nur angezeigt, wenn die passende RBAC-Berechtigung vorhanden ist.
- Fehlt die Azure-Konfiguration (z. B. im DEV-Modus), bleibt der Bereich sichtbar und zeigt „Not configured". Ausführende Buttons sind dann deaktiviert.
- Fällt Azure oder der Statusdienst aus, bleibt das übrige Dashboard uneingeschränkt nutzbar.

## Tab „Status"
- Azure erlaubt, Auth-Modus, SQL/Table/Storage konfiguriert
- ENV-Validierung mit Liste fehlender Variablennamen (nur Namen, niemals Werte)
- Letzter Verbindungstest / letzter Export / letzter Import
- Button **„Status aktualisieren"** – einziger manueller Refresh

## Tab „Aktionen"
- **Verbindung testen** – einfacher Klick
- **Datenbank aufbauen** – nur Systemadministrator, mit Text-Bestätigung (\`AUFBAUEN\`)
- **Nach Azure exportieren** – mit Bestätigungsdialog
- **Aus Azure importieren** – erzwingt Vorschau **und** Pflicht-Backup, anschließend zweite Text-Bestätigung (\`IMPORTIEREN\`)
- **Lokale Historie leeren** – löscht nur die Browser-Anzeige

## Tab „Historie"
Zeigt die letzten Verbindungstests, Exporte und Importe (lokal, secret-frei).

## Sicherheit
Das Frontend liest nie ENV. Alle Azure-Aufrufe werden später serverseitig ausgeführt; das Browser-Bundle enthält keine Connection-Strings oder SAS-Tokens.`,
    relatedTopics: [
      "azure-service-area",
      "azure-connection-test",
      "azure-export",
      "azure-import",
      "azure-conflict-handling",
      "backup-before-import",
      "env-validation",
    ],
  },
  {
    id: "backup-before-import",
    title: "Backup vor Import",
    category: "Sicherheit",
    keywords: ["Backup", "Import", "Snapshot", "Rollback", "Restore"],
    lastUpdated: "2026-06-30",
    content: `## Zwei Schutzebenen
1. **Manuelles ZIP-Backup** (empfohlen vor jedem Import). Service → Backup → "Backup jetzt erstellen". Das ZIP enthält den vollständigen Datenstand und kann jederzeit wieder eingespielt werden.
2. **Automatischer Pre-Snapshot** beim Import. Vor dem ersten Schreibvorgang werden alle betroffenen Storage-Keys gesichert. Bei Fehler erfolgt automatischer Rollback. Solange die Session offen ist, kann der Lauf zusätzlich manuell zurückgerollt werden.

## Empfohlener Ablauf
1. Backup erzeugen (ZIP herunterladen und an einem sicheren Ort ablegen).
2. Import-Wizard starten.
3. Vorschau und Konflikt-Strategie prüfen.
4. Importieren.
5. Ergebnis im Import-Protokoll prüfen.

## Warnhinweise
> ⚠️ Ohne aktuelles Backup ist ein Import ein riskanter Vorgang. Der Pre-Snapshot deckt nur die laufende Session ab.
> ⚠️ Das ZIP-Backup enthält **keine** Passwörter, Tokens oder API-Keys — diese Felder werden vor dem Packen aktiv entfernt.
> ⚠️ Bewahren Sie ZIP-Backups verschlüsselt auf, wenn sie das Gerät verlassen.`,
    relatedTopics: ["backup", "azure-import", "import-export"],
  },
  {
    id: "security-principles",
    title: "Sicherheitsprinzipien",
    category: "Sicherheit",
    keywords: ["Sicherheit", "Prinzipien", "Secrets", "RBAC", "Least Privilege", "ENV", "Logging"],
    lastUpdated: "2026-06-30",
    content: `## Leitlinien
- **Least Privilege** — jede Rolle erhält nur die für ihre Aufgabe nötigen Permissions. Importe sind strikter als Exporte; Datenbankaufbau und Rollenverwaltung nur für System-Administratoren.
- **Defense in Depth** — UI-Gating (\`PermissionGate\`) plus serverseitige Guards (\`requirePermission\`) plus RLS/Provider-seitige Prüfungen.
- **Secret-Freiheit des Frontends** — das Browser-Bundle enthält weder Connection-Strings noch SAS-Tokens noch Service-Keys. ENV-Zugriff ausschließlich über \`config/secretManager.mjs\` im Backend.
- **No Plain Logs** — Error-Logs sind auf 256 Zeichen begrenzt; keine vollständigen Error-Objekte, keine Response-Bodies, keine Secrets.
- **Sichere Defaults** — Development-Modus blockiert Azure-Aufrufe; \`/api/sync\` erfordert in Production einen \`X-Sync-Token\`.
- **Schema-Härtung** — Importe werden gegen Zod-Schemas mit Längenlimits validiert (IDs 128, Strings 255, Texte 2000 Zeichen).
- **Sensible Felder entfernen** — Passwörter, Hashes, MFA-Secrets, Tokens und API-Keys werden vor Export und Import aktiv entfernt (Denylist auf Storage-Keys und Feldnamen).
- **Audit** — Importe, Konflikt-Entscheidungen und Sync-Läufe werden protokolliert.
- **CI-Security** — \`scripts/security-check.mjs\` plus gitleaks blockieren CRITICAL/HIGH-Funde vor dem Merge.

## Verantwortung der Anwender
- ZIP-Backups verschlüsselt aufbewahren.
- Keine produktiven Secrets in Test-/Dev-Umgebungen verwenden.
- Bei Verdacht auf Kompromittierung umgehend Secrets rotieren und Audit-Logs prüfen.`,
    relatedTopics: [
      "rbac-rollen-berechtigungen",
      "env-validation",
      "ci-security-scan",
      "backup-before-import",
    ],
  },
  {
    id: "azure-outage",
    title: "Was bei Azure-Ausfall passiert",
    category: "Betrieb",
    keywords: ["Azure", "Ausfall", "Outage", "Offline", "Fallback", "Resilienz"],
    lastUpdated: "2026-06-30",
    content: `## Kurzfassung
Ein Azure-Ausfall beeinträchtigt **keine** lokalen Funktionen. Das Dashboard bleibt voll bedienbar.

## Was weiter funktioniert
- Anlage und Pflege von Projekten, Arbeitspaketen, Tätigkeiten
- Wochen- und Monatsansicht, Leistungsreport
- PDF-/CSV-/JSON-Export, Downloadbereich
- Tägliches Backup, Wiederherstellung aus ZIP
- Benutzerhandbuch, Systemstatus (lokale Werte)

## Was nicht funktioniert
- Sync nach Azure SQL / Table Storage
- Aus Azure importieren
- Verbindungstest endet mit "fehlgeschlagen"
- Sektion Azure im Systemstatus zeigt "Last Connection Test: fehlgeschlagen"

## Anzeige
- Systemstatus → Azure: "Last Connection Test" zeigt das letzte Ergebnis und den Zeitstempel.
- Systemstatus → Versionen & Backend: \`Backend /api/status — nicht erreichbar\` ist möglich, wenn auch das Backend betroffen ist. Lokale Felder bleiben gefüllt.
- Sync-Buttons sind deaktiviert oder melden generisch "Service nicht erreichbar".

## Empfehlung
- Sync später wiederholen, sobald der Verbindungstest wieder "ok" liefert.
- In der Zwischenzeit lokal weiterarbeiten; alle Änderungen werden beim nächsten erfolgreichen Sync übertragen.
- Bei längerem Ausfall ein ZIP-Backup zur Sicherheit erzeugen.`,
    relatedTopics: ["offline-mode", "local-operation", "system-status"],
  },
  {
    id: "management-overview",
    title: "Managementübersicht",
    category: "Betrieb",
    keywords: [
      "Management",
      "Übersicht",
      "Entscheider",
      "Architektur",
      "Roadmap",
      "Risiken",
      "Zielbild",
    ],
    lastUpdated: "2026-07-01",
    content: `## Zweck
Kompakte Darstellung von Zielbild, Sicherheitsarchitektur, Betriebsmodell, Rollen, Datenaustausch, Roadmap sowie Risiken und Gegenmaßnahmen — geschrieben für nicht-technische Entscheider. Enthält keine Secrets oder Konfigurationswerte.

## Kerninhalte
- **Zielbild** — Lokal betreibbares Dashboard, Azure optional als Spiegel.
- **Sicherheitsarchitektur** — Least Privilege, RBAC, maskierte Secrets, CI-Security-Scan.
- **ENV-Validierung** — Zentraler Check aller Pflichtvariablen beim Start.
- **Kein Production-Start ohne notwendige ENV** — Fail-Fast in Produktion.
- **DEV-Betrieb ohne Azure-ENV** — Azure-Zugriffe im Development-Modus blockiert.
- **Kein automatischer Sync** — Datenaustausch wird immer manuell ausgelöst.
- **Lokaler Betrieb bleibt führend** — Azure dient nur der Konsolidierung.
- **Rollenmodell** — 7 Rollen, RBAC-Matrix, Admin-Lockout-Schutz.
- **Export-/Import-Prozess** — JSON-Schema, Vorschau, Snapshot vor Import.
- **Konflikthandling** — Dublettenerkennung, protokollierte Entscheidungen.
- **Systemstatus** — 7 Sektionen plus Backend-Health, nur secret-freie Metadaten.
- **Roadmap Entra ID** — Vorbereitet für zentrales SSO und Rollenmapping.
- **Roadmap Azure Key Vault** — Fassade vorhanden, transparent aktivierbar.
- **Risiken und Gegenmaßnahmen** — Tabellarische Übersicht.

## Fundstelle
Vollständiges Dokument: \`docs/MANAGEMENT_OVERVIEW.md\` im Projekt-Root. Wird
im Repository versioniert und ist ohne Dashboard-Start prüfbar (z. B. für
Audits oder Managementreviews).`,
    relatedTopics: [
      "security-principles",
      "env-validation",
      "system-status",
      "rbac-rollen-berechtigungen",
      "azure-outage",
    ],
  },
  {
    id: "handbuch-suche",
    title: "Handbuch durchsuchen",
    category: "Service",
    keywords: ["Suche", "Handbuch", "Volltext", "Highlight", "Treffer", "Deep-Link", "URL"],
    lastUpdated: "2026-07-01",
    content: `## Ziel
Handbuchinhalte schnell auffindbar machen — sowohl aus dem Dashboard heraus als auch beim direkten Öffnen eines Kapitels.

## Suche im Handbuch
- Suchfeld oben im Handbuch-Dialog durchsucht Titel, Kategorien, Inhalte und Schlagworte aller sichtbaren Kapitel.
- Treffer werden in der Seitennavigation als „Treffer (n)" gruppiert.
- Im geöffneten Kapitel werden alle Fundstellen gelb hervorgehoben.
- Trefferzähler zeigt „aktueller / gesamt" an. Mit den Pfeiltasten oder Enter (Shift+Enter rückwärts) springt die Ansicht zum jeweils nächsten Treffer.

## Globale Header-Suche
- Das Suchfeld in der Dashboard-Kopfzeile durchsucht Projekte, Arbeitspakete, Tätigkeiten und jetzt auch Handbuch-Kapitel.
- Ein Klick auf ein Handbuch-Ergebnis öffnet das Handbuch direkt am passenden Kapitel und übernimmt den Suchbegriff für die Trefferhervorhebung.

## Deep-Links
- Aktive Kapitel-ID und Suchbegriff werden in der URL persistiert (\`?help=<id>&hq=<query>\`).
- Der Link kann geteilt oder als Bookmark abgelegt werden — beim Öffnen des Dialogs werden Kapitel und Suchbegriff wieder eingelesen.
- Beim Schließen des Handbuch-Dialogs werden die Parameter automatisch aus der URL entfernt.

## Hinweise
- Die Sichtbarkeit der Kapitel richtet sich nach der Rolle des angemeldeten Benutzers (RBAC).
- Für Volltextsuche über nicht sichtbare Kapitel muss die entsprechende Rolle vorhanden sein.`,
    relatedTopics: ["rbac-rollen-berechtigungen"],
  },
  {
    id: "tests-qualitaetssicherung",
    title: "Tests & Qualitätssicherung",
    category: "Betrieb",
    keywords: ["Tests", "Vitest", "Testing Library", "CI", "Coverage", "Qualität"],
    lastUpdated: "2026-07-04",
    content: `## Test-Infrastruktur
Das Dashboard nutzt **Vitest** mit **@testing-library/react** und **jsdom** für Unit- und Integrationstests. Die Konfiguration liegt in \`vitest.config.ts\`, Testdateien unter \`src/__tests__/\`.

## Skripte
- \`bun run test\` — einmaliger Lauf (CI-Modus).
- \`bun run test:watch\` — interaktiver Watch-Modus während der Entwicklung.
- \`bun run test:ui\` — Vitest UI im Browser.
- \`bun run test:coverage\` — Coverage-Report unter \`coverage/\` (v8-Provider).

## Abgedeckte Bereiche
- **Geschäftslogik**: \`time-period\` (Feiertage, Werktage, Sollstunden, Auslastung), \`export-data\` (Filter, Summen, Gruppierung), \`user-management\` (RBAC-Guards, Lifecycle, Scoped Storage).
- **Sicherheit**: \`rbac\` — Matrix-Invarianten (z. B. \`azure.database.build\` ausschließlich Systemadministrator, \`azure.import ⊆ azure.export\`, Viewer/Customer ohne Edit- und Azure-Rechte).
- **Integrationspfade**: JSON-Export-Round-Trip und Schema-Validation für Import-Payloads.
- **UI**: \`PermissionGate\` als deterministisches Beispiel; komplexere Route-Tests folgen als Playwright-Smoke.

## Regeln
- Namenskonvention: \`should_<verhalten>_when_<kontext>\`.
- Arrange-Act-Assert-Kommentare in jedem Test.
- Deterministische Fixtures (kein Zufall) für reproduzierbare Feiertags-/Datumsberechnungen.
- Keine echten API-Calls — Services werden per \`vi.mock\` gemockt.

## Coverage-Gate
Nur \`src/lib/time-period.ts\` hat einen harten Threshold (≥ 80 %). Globale Gates werden bewusst vermieden, um wartungsintensive Rot-Zustände ohne Sicherheitsgewinn zu verhindern.

## CI
Die GitHub-Actions-Pipeline (\`.github/workflows/ci.yml\`) führt \`bun run test:coverage\` nach Lint/RBAC und vor dem Build aus. Der Coverage-Report wird als Artifact hochgeladen. Ein rot geschlagener Test blockiert den Merge (Branch-Protection in GitHub-Settings aktivieren).`,
  },
  {
    id: "log-viewer",
    title: "Log Viewer",
    category: "Service",
    component: "LogViewerDialog",
    keywords: [
      "Log",
      "Logs",
      "Logger",
      "IndexedDB",
      "Debug",
      "Fehleranalyse",
      "Service",
      "Diagnose",
    ],
    lastUpdated: "2026-07-10",
    content: `## Zweck
Der Log Viewer (Servicemenü → *Log Viewer…*) macht die vorhandene Logger-Infrastruktur (\`src/lib/logger.ts\`) sichtbar. Er führt zwei Quellen zusammen: den In-Memory-Ringpuffer (letzte 500 Einträge der aktuellen Session) und den persistierten IndexedDB-Sink (\`dashboard-logs\`, Rotation nach 1000 Zeilen / 7 Tagen). Es wird **keine** neue Log-Infrastruktur eingeführt.

## Filter
- **Level**: debug / info / warn / error — beliebig kombinierbar.
- **Zeitraum**: Letzte 15 min, 1 h, 24 h, 7 Tage oder alle.
- **Quelle**: Multi-Select aus \`context.label\` / \`.module\` / \`.operation\` / \`.component\`, sofern gesetzt.
- **Volltextsuche**: durchsucht Message, Fehler und den JSON-serialisierten Kontext.

## Detailansicht
Klick auf eine Zeile öffnet ein Seiten-Sheet mit ISO-Timestamp, vollständigem Kontext-JSON und (falls vorhanden) Stacktrace. Der Eintrag lässt sich als JSON in die Zwischenablage kopieren.

## Aktionen
- **Aktualisieren** / **Auto (5 s)**: erneut lesen bzw. periodisch pollen.
- **Export**: lädt die aktuell gefilterten Einträge als \`logs-YYYY-MM-DD-HHmm.json\` herunter.
- **Löschen**: leert Ringpuffer und IndexedDB-Sink (bestätigt via Browser-Dialog).

## Sicherheit
Secrets sind bereits im Logger maskiert (Keys wie \`token\`, \`password\`, \`authorization\` sowie JWT-artige Strings → \`[REDACTED]\`). Der Log Viewer verarbeitet die Daten unverändert weiter — es findet **kein** Upload statt, alles bleibt lokal im Browser.

## Grenzen
- Anzeige ist auf 1000 Zeilen begrenzt (bewusst kein Virtual Scrolling, siehe ADR-0006). Bei mehr Treffern erscheint ein Hinweis „N weitere gefiltert".
- In DEV schreibt der Logger zusätzlich in die Browser-Console; IndexedDB-Persistenz greift erst im PROD-Build.`,
    relatedTopics: ["fehlerbehandlung-logging"],
  },
  {
    id: "test-instance",
    title: "Testinstanz und Qualitätssicherung",
    category: "Service",
    keywords: [
      "Test",
      "Testinstanz",
      "Qualität",
      "QA",
      "Vitest",
      "Playwright",
      "E2E",
      "Coverage",
      "Regression",
      "MSW",
      "Mock",
    ],
    lastUpdated: "2026-07-13",
    content: `## Zweck
Die Testinstanz prüft den **aktuellen Buildstand** des Dashboards — sie ist keine zweite Anwendung und kein separater Entwicklungszweig. Alle Testmodi laufen gegen dieselbe Codebasis. Ziel: reproduzierbare Prüfung von Frontend, Backend, API, Daten, UI, Sicherheit, Dokumentation und technischer Qualität.

## Aufbau
- **Runner**: Vitest (bestehend) für Unit-, Komponenten-, Integrations-, Backend-, API-, Security-, Azure-, I/O-, Backup- und A11y-Tests.
- **UI-E2E**: Playwright gegen den lokalen Dev-Server (Port 8080).
- **HTTP-Isolation**: MSW (Node) für Azure- und API-Mocks.
- **Guards**: \`src/__tests__/env/test-instance.ts\` erzwingt Testumgebung, setzt Storage-Präfix (\`test:\`), IndexedDB-Namen (\`sysingdashboard-test\`), Fake Timer und einen seeded PRNG.

## Testmodi
| Modus | Kommando | Umfang |
| ----- | -------- | ------ |
| Unit | \`bun run test:unit\` | Reine Logik in \`src/lib\` und \`src/hooks\` |
| Komponenten | \`bun run test:components\` | UI-Komponenten unter jsdom |
| Frontend-Integration | \`bun run test:integration\` | Store, Import/Export, Persistenz |
| Backend-Integration | \`bun run test:backend\` | \`backend/services/*.mjs\` |
| API/Endpoint | \`bun run test:api\` | TSS-Server-Handler direkt |
| Import/Export | \`bun run test:io\` | JSON-Pipeline |
| Backup/Restore | \`bun run test:backup\` | ZIP-Erzeugung, Konsistenz |
| Azure-Mock | \`bun run test:azure\` | MSW-basiert, blockt Live-Aufrufe |
| Accessibility | \`bun run test:a11y\` | vitest-axe |
| Security/RBAC | \`bun run test:security\` | RBAC-Matrix + Secret-Scan + Docs |
| Performance/Bundle | \`bun run test:perf\` | \`dist/\`-Chunk-Analyse |
| Doku/Version | \`bun run test:docs\` | CHANGELOG ↔ Handbuch |
| Technical Debt | \`bun run test:debt\` | TODO/HACK/ts-ignore-Trend |
| UI-E2E | \`bun run test:e2e\` | Playwright Smoke + Gating |
| Regression | \`bun run test:regression\` | Vitest + E2E |
| Full | \`bun run test:full\` | Alles inkl. Lint + Debt |

## Datentrennung (verpflichtend)
- Storage-Präfix \`test:\` verhindert, dass Testläufe produktive localStorage-Einträge überschreiben.
- Eigene IndexedDB \`sysingdashboard-test\` für Logger und Downloads.
- Deterministische Zeitstempel (\`2026-01-01T00:00:00Z\`) und seeded PRNG.
- Kein Zugriff auf produktives Azure — MSW-Mock aktiv, \`AZURE_TEST_LIVE=1\` ist der einzige Bypass.

## Ausführung
- **Lokal**: \`bun run test:full\` deckt Lint, Vitest, Security, A11y, Performance, Docs und Debt ab. \`bun run test:e2e\` startet den Dev-Server automatisch (Playwright \`webServer\`).
- **CI**: \`.github/workflows/ci.yml\` führt alle Modi aus und lädt \`coverage/\`, \`test-report/\` und \`playwright-report/\` als Artefakte hoch.

## Interpretation der Ergebnisse
- **Coverage-Report** (\`coverage/\`): v8-Instrumentierung; harter Threshold nur für \`src/lib/time-period.ts\`.
- **Bundle-Report** (\`test-report/bundle.json\`): Top-15-Chunks nach Größe. Kein hartes Budget — Trendbeobachtung.
- **Technical-Debt-Report** (\`test-report/tech-debt.json\`): TODO/FIXME/HACK-Zähler + \`@ts-ignore\` + Dateien > 500 Zeilen.
- **Prüfbericht** (\`test-report/summary.md\`): Aggregation aller Bereiche für den Managementbericht.

## Managementsicht
- Reproduzierbare Prüfung des jeweils aktuellen Buildstands (kein Drift).
- Klar getrennte Modi ermöglichen risikobezogene Auslieferung: Kritische Änderungen erfordern \`test:full\`, Textkorrekturen nur \`test:unit\`.
- Sicherheitskritische Bereiche (RBAC, Secrets, Azure-Gate) sind eigenständige Modi mit expliziten Guards.
- Reporting-Kadenz: Jeder CI-Lauf produziert einen aggregierten Prüfbericht als Artefakt.

## Entwicklersicht
- Neue Tests werden im passenden Ordner unter \`src/__tests__/<modus>/\` abgelegt und importieren \`../env/test-instance\` als erste Zeile.
- Fixtures (deterministische Testdaten) liegen unter \`src/__tests__/fixtures/\`.
- MSW-Handler zentral unter \`src/__tests__/mocks/handlers/\`.
- Playwright-Tests unter \`e2e/\`, Fixtures in \`e2e/fixtures.ts\`.

## Grenzen
- Azure-Live-Modus ist vorbereitet, aber nicht produktionsbereit — Aktivierung nur nach expliziter Freigabe.
- Kein Virtual Scrolling in Testreports (ADR-0006): Anzeigelimits gelten weiterhin.`,
    relatedTopics: ["log-viewer", "fehlerbehandlung-logging", "system-status", "tech-debt"],
  },
  {
    id: "tech-debt",
    title: "Technical-Debt-Analyse",
    category: "Service",
    keywords: [
      "Debt",
      "Schulden",
      "Qualität",
      "Architektur",
      "Report",
      "Findings",
      "Priorisierung",
      "ADR",
    ],
    lastUpdated: "2026-07-13",
    content: `## Zweck
Die Technical-Debt-Analyse macht mit jedem aktuellen Buildstand nachvollziehbar sichtbar, welche strukturellen, qualitativen und dokumentarischen Schulden im Projekt bestehen. Sie ist bewusst **kein** Ersatz für den Security-Scan (\`scripts/security-check.mjs\`) — der bleibt separater, harter Gate.

## Analyseverfahren
Zwei Quellen laufen durch dasselbe Schema und werden vom Runner \`scripts/tech-debt/run.mjs\` zusammengeführt:

1. **Automatisierte Detektoren** unter \`scripts/tech-debt/detectors/\`:
   - \`cyclic-deps\`: Import-Zyklen (Regex-basierter Modul-Graph).
   - \`layer-violations\`: UI-Komponenten, die Persistenz- oder Azure-Interna direkt statt über Facades importieren.
   - \`oversize-modules\`: Dateien über LOC-Schwelle (400 Komponenten / 600 Libs).
   - \`endpoint-guards\`: Fehlender Auth-Guard, fehlende Zod-Validierung, fehlende strukturierte Fehlerantwort in \`src/routes/api/**\`.
   - \`orphan-modules\`: Vermutlich ungenutzte Dateien.
   - \`doc-drift\`: Handbuch-Kapitel mit \`lastUpdated\` > 180 Tage.
   - \`coverage-gaps\`: Kritische Services (\`src/lib/{azure,rbac,backup-service,json-*,user-management,logger*}\`) unter 50 % Line-Coverage.
   - \`console-usage\`: Direkte \`console.*\`-Aufrufe außerhalb der Logger-Fassade.
2. **Kuratierter Manual-Katalog** in \`tech-debt/findings.json\`. Vom Team gepflegt; deckt alles ab, was kein Detektor sinnvoll erkennen kann.

## Ausgabe
Jeder Lauf schreibt nach \`test-report/\`:

| Datei | Zweck |
| ----- | ----- |
| \`tech-debt.json\` | Maschinenlesbarer Voll-Report inkl. Summary und Diff |
| \`tech-debt.md\` | Vollständiger Bericht, nach Kategorie gegliedert |
| \`tech-debt-summary.md\` | Management-Zusammenfassung (Top-10, Verteilung, Delta) |
| \`tech-debt-actions.md\` | Sortierte Maßnahmenliste (offen/geplant) |
| \`tech-debt-diff.json\` | Neue / behobene / bestehende Funde ggü. dem Vorlauf |

Ein Actions-Cache in CI persistiert \`tech-debt.prev.json\` pro Branch, damit der Diff über Runs stabil bleibt.

## Priorisierung
Findings werden nach diesem Ranking sortiert:

1. Security-Lücken → 2. Datenverlust/-manipulation → 3. offene privilegierte Endpoints → 4. Auth-/RBAC-Lücken → 5. Backup-/Restore-Risiken → 6. funktionale Fehler → 7. Stabilität → 8. Architektur/Wartbarkeit → 9. Performance → 10. Dokumentation → 11. Kosmetik.

Innerhalb einer Prioritätsstufe entscheidet Severity, dann \`recommendedOrder\`.

## CI-Gate
Nur **Critical**-Funde brechen die Pipeline (Exit 2). High/Medium/Low/Informational sind reine Trend-Metriken — das verhindert Bypass-Reflexe und hält den Report ehrlich.

## Grenzen (bewusst nicht automatisiert)
- „Zu viele Verantwortlichkeiten pro Komponente" — braucht semantisches Verständnis; im Manual-Katalog dokumentiert.
- „Widerspruch zwischen README, Architektur, API und ADR" — nur mit Review greifbar.
- „Instabile Tests" — Flakiness ist ein CI-Signal, kein statisches.
- „Unklare Ownership" — nur mit \`CODEOWNERS\` messbar (aktuell nicht vorhanden).
- Regex-basierte Detektoren übersehen dynamische Imports und Barrel-Files; entsprechende Whitelists werden je Detektor gepflegt, nicht global.

## Bedienung
- Lokal: \`bun run test:debt\`.
- Als Teil der Vollprüfung: \`bun run test:full\`.
- Manual-Katalog erweitern: neuen Eintrag in \`tech-debt/findings.json\` mit stabiler \`id\` (\`td-manual-<slug>\`) — der Runner validiert das Schema und weist Abweichungen sofort ab.

## Verhältnis zu anderen Prüfungen
- **Security-Scan** (\`scripts/security-check.mjs\`): harter Gate für Secrets/Header, bleibt getrennt.
- **RBAC-Check** (\`scripts/check-rbac.mjs\`): prüft Matrix-Drift Frontend↔Backend.
- **Docs-Sync** (\`scripts/check-docs-sync.mjs\`): erzwingt Handbuch-Pflege bei Änderungen.
- **Tech-Debt**: aggregiert alles Übrige zu einem sichtbaren Trend, ohne Doppelung mit den harten Gates.`,
    relatedTopics: ["test-instance", "system-status", "fehlerbehandlung-logging"],
  },
  {
    id: "api-endpoint-tests",
    title: "API- und Endpoint-Tests",
    category: "Service",
    keywords: [
      "API",
      "Endpoint",
      "Contract",
      "Registry",
      "Runner",
      "Matrix",
      "Zod",
      "Security-Scan",
      "Playwright",
    ],
    lastUpdated: "2026-07-13",
    content: `## Zweck
Alle Server-Routen des Dashboards werden mit positiven und negativen Fällen automatisiert geprüft. Ziel: Kontrakt-Regressionen (Schema-Drift), Secret-Lecks im Response, ungeschützte Methoden und instabiles Fehler-Handling frühzeitig fangen — bei jedem Build.

## Architektur (ADR-0011)
- **Registry** unter \`src/__tests__/api/registry/\`: jede Route ist ein \`EndpointContract\` (Pfad, Methoden, Auth, Zod-Schemas, \`loadRoute()\`). Neue Route → ein Eintrag, kein neuer Testcode.
- **Generischer Runner** (\`src/__tests__/api/runner.test.ts\`): iteriert die Registry und erzeugt pro aktivem Endpoint dieselben Kategorien.
- **Handler-direct**: Handler werden ohne Netz aufgerufen — millisekundenschnell und deterministisch. Für Middleware-/Framework-Verhalten existiert die schmale Playwright-Suite \`e2e/api-smoke.spec.ts\`.
- **Matrix-Report**: \`test-report/api-matrix.{md,json}\` mit Endpoint, Methode, Auth, Permission, Scope, Schema-Status, Case-Zahl und offenen Risiken. In CI als Artefakt hochgeladen.

## Aktueller Testumfang
| Endpoint | Methoden | Status |
| -------- | -------- | ------ |
| \`/api/status\` | GET | active |
| \`/api/sync\` | POST | active |
| \`/api/azure/*\` | POST | planned (Registry-Platzhalter) |
| \`/api/rbac/assignments\` | GET/POST/DELETE | planned |

## Testkategorien pro Endpoint
- **Grundfunktion**: erlaubte Methoden liefern JSON und passen zum Zod-Response-Schema; nicht erlaubte Methoden dürfen keinen Handler haben.
- **Payload-Varianten**: ungültiges JSON, leerer Body, 1 MB Oversize, unerwartete Felder, Injection-nahe Eingaben (SQL-ähnliche Strings dürfen nicht reflektiert werden).
- **Security**: Response-Body und Header werden hart auf JWT-, Bearer-, Connection-String-, SAS- und Stacktrace-Muster gescannt. Sensitive Header (\`set-cookie\`, \`x-powered-by\`, \`server\`) sind verboten. Bei \`authRequired: true\` wird der Anonym-Zugriff auf 401/403 geprüft.
- **Stabilität**: 10 parallele Requests dürfen keinen 5xx-Crash produzieren.
- **Nachvollziehbarkeit**: Fehlerantworten müssen strukturiert sein (\`{ ok: false, error: string }\`).

## Ausführung
\`\`\`
bun run test:api        # nur Endpoint-Suite
bun run test:e2e        # inkl. Playwright-Smoke gegen den Dev-Server
\`\`\`
Der Runner schreibt \`test-report/api-matrix.{md,json}\` nach jedem Lauf.

## Fehlerinterpretation
- **Schema-Verletzung** → Route hat ihr Response-Shape geändert, ohne die Registry anzupassen. Entweder Route zurückrollen oder Schema aktualisieren.
- **Handler existiert für nicht gelistete Methode** → entweder Methode zur Registry hinzufügen oder aus der Route entfernen (typisches Copy-Paste-Risiko).
- **Secret-Muster im Response** → Sofort-Blocker. Antwort niemals mergen, bevor die Quelle behoben ist.
- **Anonymer Zugriff auf geschützte Route erlaubt** → Blocker. Auth-Middleware prüfen.

## Sicherheitsgrenzen
- **Handler-direct umgeht Middleware**: reale CORS-Header, Cloudflare-Worker-Body-Limits und globale Request-Middleware sieht der Runner nicht. Deshalb der Playwright-Smoke gegen \`http://localhost:8080\` als Ergänzung.
- **Kein Live-Azure**: geplante Azure-Routen liegen im Runner als \`test.todo\`; produktive Endpunkte werden nie kontaktiert.
- **Kein Fuzzing**: bewusst außen vor. Property-Based-Erweiterung (fast-check) folgt erst bei nachgewiesener Regression.

## Bekannte Einschränkungen
- **Correlation-ID**: seit v1.32.0 vollständig aktiv — siehe eigenes Kapitel „Correlation-ID & Nachverfolgung". Der API-Runner prüft das Feld jetzt hart.
- Der Idempotenz-Check ist auf „nicht crashen bei Wiederholung" reduziert; echte Response-Gleichheit prüft der Runner erst, wenn Routen sie garantieren können.
- Archivierte Legacy-Routen unter \`archive/legacy-standalone-backend/routes/\` sind bewusst nicht in der Registry — sie sind nicht Teil des Live-Bundles.`,
    relatedTopics: ["test-instance", "system-status", "security-principles", "tech-debt"],
  },
  {
    id: "ui-e2e-tests",
    title: "UI- und End-to-End-Tests",
    category: "Service",
    keywords: ["Playwright", "E2E", "UI-Tests", "axe", "Rollen-Matrix", "Responsive", "Fehlerzustände"],
    lastUpdated: "2026-07-13",
    content: `## Zweck
Die Anwendung wird aus Sicht eines tatsächlichen Benutzers automatisiert geprüft: Navigation, Dashboard, Servicefunktionen, Fehlerzustände, Responsive-Verhalten, Barrierefreiheit und Rollen-Sichtbarkeit. Ergänzt die Handler-direct-Suite aus dem API-Kapitel um echte Browser-Interaktion.

## Struktur
- \`e2e/specs/navigation.spec.ts\` — Haupt-/Servicemenü, Deep Links, Browser-Back
- \`e2e/specs/dashboard.spec.ts\` — Suche, Reset, Persistenz-Anker, Benutzeranzeige
- \`e2e/specs/service-menu.spec.ts\` — Servicemenü-Einträge (Log Viewer, Systemstatus, Backup, Handbuch)
- \`e2e/specs/error-states.spec.ts\` — leerer/korrupter Storage, Storage-Quota, API-Ausfall, Not-Found
- \`e2e/specs/responsive.spec.ts\` — Desktop/Tablet/Mobile/kleine Höhe + 200 % Zoom
- \`e2e/specs/a11y.spec.ts\` — axe-core (WCAG 2.1 A/AA) + Fokus-Anker
- \`e2e/specs/rbac/role-matrix.spec.ts\` — datengetrieben über alle 7 Rollen
- \`e2e/specs/rbac/backend-denial.spec.ts\` — direkte HTTP-Requests auf geschützte Endpunkte
- \`e2e/api-smoke.spec.ts\` — API-Round-Trip (unverändert seit v1.30.0)

## Werkzeug (ADR-0012)
- **Playwright** gegen den lokalen Vite-Dev-Server, **Chromium-only** in CI.
- **Rollen-Seeding** erfolgt clientseitig via \`localStorage\` (\`e2e/fixtures/roles.ts\`). Ausreichend für UI-Sichtbarkeit — **kein** Sicherheitsnachweis.
- **@axe-core/playwright** für Accessibility-Scans, gekapselt in \`e2e/fixtures/axe.ts\`.
- **Traces, Screenshots und Videos** nur bei Fehlern (CI-Kosten).

## Ausführung
\`\`\`
bun run test:e2e            # vollständige Suite
bun run test:e2e:ui         # lokal headed / debug
bun run test:e2e:report     # generiert e2e/reports/test-report.md aus Playwright-JSON
\`\`\`
Artefakte in CI: \`playwright-report/\` (HTML + JSON + Traces), \`e2e/reports/\` (Matrix, Lücken, Report).

## Reports
- \`e2e/reports/ui-matrix.md\` — Zuordnung UI-Funktion ↔ Testfall (manuell gepflegt)
- \`e2e/reports/untested.md\` — bewusste Lücken (nur Smoke, nicht funktional geprüft)
- \`e2e/reports/test-report.md\` — auto-generiert nach jedem Lauf

## Bekannte Einschränkungen
- Servicemenü-Dialoge sind nur auf **„öffnet sich"-Ebene** geprüft. Tiefergehende Interaktionen (Bearbeitung, Wizards, Zeiterfassung) brauchen stabile \`data-testid\`-Anker — dokumentiert in \`untested.md\`.
- Rollen-Matrix prüft nur den Servicemenü-Öffner-Button. Fein-granulare Aktions-Sichtbarkeit fehlt.
- Kein Cross-Browser (Firefox/WebKit), keine visuellen Regressions-Snapshots, kein echter Wrangler-Worker-Preview — siehe ADR-0012 für die Begründungen.
- Keine \`aria-required-attr\`- oder Kontrast-Tests jenseits der axe-Standardregeln.

## Ergänzung, nicht Ersatz
Die E2E-Suite ergänzt die Unit-, Component-, API- und Security-Suiten. Ein grüner Playwright-Lauf ist **kein** Beweis für serverseitige Berechtigungsprüfung — dafür bleibt \`rbac/backend-denial.spec.ts\` plus \`test:security\` maßgeblich.`,
    relatedTopics: ["test-instance", "api-endpoint-tests", "barrierefreiheit", "system-status"],
  },
];


function allTopicsBase(): HelpTopic[] {
  const merged = new Map<string, HelpTopic>();
  for (const t of builtInTopics) merged.set(t.id, t);
  for (const t of generatedTopics) merged.set(t.id, t);
  for (const t of dynamicTopics) merged.set(t.id, t);
  return [...merged.values()];
}

const allTopics = allTopicsBase;

function topicVisible(t: HelpTopic, role: UserRole | null): boolean {
  if (!t.roles || t.roles.length === 0) return true;
  if (!role) return false;
  return t.roles.includes(role);
}

function normalize(s: string): string {
  return s.toLowerCase();
}

export const HelpDocumentationService = {
  getAllTopics(role: UserRole | null = null): HelpTopic[] {
    return allTopics().filter((t) => topicVisible(t, role));
  },
  getTopicById(id: string): HelpTopic | null {
    return allTopics().find((t) => t.id === id) ?? null;
  },
  getTopicsByCategory(role: UserRole | null = null): Record<string, HelpTopic[]> {
    const out: Record<string, HelpTopic[]> = {};
    for (const t of allTopics()) {
      if (!topicVisible(t, role)) continue;
      (out[t.category] ??= []).push(t);
    }
    return out;
  },
  searchTopics(query: string, role: UserRole | null = null): HelpTopic[] {
    const q = normalize(query.trim());
    if (!q) return HelpDocumentationService.getAllTopics(role);
    return allTopics().filter((t) => {
      if (!topicVisible(t, role)) return false;
      const hay = [t.title, t.category, t.content, ...(t.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  },
  getTopicsForRoute(route: string, role: UserRole | null = null): HelpTopic[] {
    return allTopics().filter((t) => topicVisible(t, role) && t.route && route.startsWith(t.route));
  },
  getTopicsForRole(role: UserRole): HelpTopic[] {
    return allTopics().filter((t) => topicVisible(t, role));
  },
  getLastUpdated(): string {
    const dates = allTopics()
      .map((t) => t.lastUpdated)
      .filter(Boolean)
      .sort();
    return dates[dates.length - 1] ?? "—";
  },
  getDocumentationVersion(): string {
    return DOCUMENTATION_VERSION;
  },
  getDashboardVersion(): string {
    return DASHBOARD_VERSION;
  },
  getChangelog(): ChangelogEntry[] {
    return [...CHANGELOG];
  },
  getAllSettings(): SettingDocumentation[] {
    const merged = new Map<string, SettingDocumentation>();
    for (const s of builtInSettings) merged.set(s.id, s);
    for (const s of dynamicSettings) merged.set(s.id, s);
    return [...merged.values()];
  },
};
