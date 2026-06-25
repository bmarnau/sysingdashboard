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
export const DOCUMENTATION_VERSION = "1.2.0";
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
- Lokal kann zusätzlich \`node backend/server.mjs\` gestartet werden — beide Wege importieren dieselben framework-freien Services aus \`backend/services/\`.

## Sicherheit
- \`config/env.mjs\` blockiert Azure-Aufrufe im Dev-Modus (\`assertAzureAllowed\`).
- \`config/secretManager.mjs\` gibt niemals Roh-Strings zurück; \`consume()\` ist im Dev-Modus blockiert.
- Server antwortet bei Fehlern generisch (keine Stacktraces, keine Secrets im Body).
- Logging gehärtet: Worker und SSR-Middleware loggen nur gekürzte Error-Messages (≤ 256 Zeichen), niemals volle Error-Objekte oder Response-Bodies.
- Import-Schemas (\`src/lib/json-schema.ts\`) erzwingen Längenlimits (IDs 128, Strings 255, Texte 2000 Zeichen) gegen unbounded Payloads.`,
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
    lastUpdated: "2026-06-23",
    content: `## Was zeigt der Systemstatus?
Der Dialog "Service → Systemstatus…" zeigt zur Laufzeit Code-Herkunft, Lovable-Deployment, Versionen und einen Health-Check der Backend-API.

## GitHub
- Repository: fester Pfad \`bmarnau/sysingdashboard\` mit Link auf https://github.com/bmarnau/sysingdashboard. Quelle: \`src/lib/project-info.ts\` (überschreibbar via \`VITE_PROJECT_GITHUB_URL\`).
- Branch: aus Build-Info, Fallback \`main\`.
- Letzter Commit: nur sichtbar, wenn der Build einen Git-SHA mitliefert. In der Lovable-Sandbox ohne \`git\` erscheint "nicht im Build verfügbar" — das ist erwartbar und kein Fehler.
- Build-Zeit: Zeitpunkt des letzten Builds.

## Lovable-Deployment
- Published URL: https://sysingdashboard.lovable.app
- Preview (stabil): \`project--<id>-dev.lovable.app\` — bleibt auch bei Projekt-Umbenennung gleich.
- Editor: Link zum Lovable-Projekt.
- Projekt-ID: zur eindeutigen Zuordnung.

## Versionen & Backend
- Dashboard-, Handbuch-, Paketversion und letzter Handbuch-Stand.
- Letztes automatisches Backup (lokaler IndexedDB-Stand).
- Backend \`/api/status\`: Erreichbarkeit und Modus (development/production).
- Azure-Zugriff erlaubt: spiegelt \`assertAzureAllowed()\` aus dem Backend.
- Zuletzt geprüft: Zeitstempel des letzten Health-Checks.

## Aktualitätsprüfung beim Start
Beim Laden des Dashboards triggert \`bootstrapSystemStatusCheck()\` einmalig einen Fetch auf \`/api/status\` (Timeout 3 s). Der Status liegt flüchtig im Speicher; per "Jetzt prüfen" lässt er sich erneut anstoßen. Bewusst kein Polling und keine Persistenz — nach Reload zählt nur der aktuelle Build.

## Layout & Maximieren
Label/Wert sind in einem responsiven Grid angeordnet (mobil einspaltig, ab \`sm\` zweispaltig). Lange Repository-URLs, Commit-SHAs und Projekt-IDs brechen automatisch um — kein horizontales Scrollen. Über das Symbol oben rechts im Dialog lässt sich die Ansicht maximieren (vollflächig, ab \`lg\` zweispaltige Sektionen) und wieder minimieren.`,
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
