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

/** Manuelle Version des Handbuchs. Bei größeren Inhaltsänderungen hochzählen. */
export const DOCUMENTATION_VERSION = "1.1.0";
/** Aktuelle Dashboard-Version (semver). Bei Releases hochzählen. */
export const DASHBOARD_VERSION = "1.9.0";
/** Anzeigename des Dashboards für Handbuch-Footer. */
export const DASHBOARD_VERSION_HINT = `Engineer Console ${DASHBOARD_VERSION}`;

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
 * Zentrale Änderungshistorie. Pflicht: bei jeder Dashboard-Änderung mit
 * Nutzersichtbarkeit hier einen Eintrag ergänzen (neueste oben). Wird im
 * Handbuch automatisch als Kapitel "Änderungshistorie" gerendert.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-06-15",
    version: "1.9.0",
    change:
      "Backup-Bereich: tägliches automatisches Daten-Backup, manueller Button, Download-Liste, ZIP-Validierung und Protokoll.",
  },
  {
    date: "2026-06-15",
    version: "1.8.1",
    change:
      "Mehrsprachigkeit (i18n) vorbereitet, Standardsprache Deutsch, HTML-lang auf de gesetzt.",
  },
  {
    date: "2026-06-14",
    version: "1.8.0",
    change:
      "Benutzerhandbuch im Servicebereich integriert (modal, suchbar, rollenabhängig, kontextbezogen).",
  },
  {
    date: "2026-06-14",
    version: "1.7.0",
    change:
      "Engineurprofil übernimmt Werte aus dem Arbeitszeitmodell; Zeit-/Stundenfelder gegen Eingabe gesperrt.",
  },
];

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
    lastUpdated: "2026-06-13",
    content: `## Funktionen im Servicebereich
- Export: öffnet den Exportdialog.
- Leistungsreport: blendet den Report im Dashboard ein/aus.
- Benutzer & Profile: Benutzerverwaltung.
- Engineer-Stammdaten: Stammdaten des Engineers.
- Arbeitszeitmodell: Pflege der Modelle und Modellhistorie.
- Lokale Ablage: Datenübertragung und Backup.
- PDF Drucken: Druckdialog für die aktuelle Ansicht.
- Handbuch: dieses Benutzerhandbuch.
- Reset: löscht alle benutzerbezogenen Daten.`,
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

function allTopics(): HelpTopic[] {
  const merged = new Map<string, HelpTopic>();
  for (const t of builtInTopics) merged.set(t.id, t);
  for (const t of dynamicTopics) merged.set(t.id, t);
  return [...merged.values()];
}

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
      const hay = [
        t.title,
        t.category,
        t.content,
        ...(t.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  },
  getTopicsForRoute(route: string, role: UserRole | null = null): HelpTopic[] {
    return allTopics().filter(
      (t) => topicVisible(t, role) && t.route && route.startsWith(t.route),
    );
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
  getAllSettings(): SettingDocumentation[] {
    const merged = new Map<string, SettingDocumentation>();
    for (const s of builtInSettings) merged.set(s.id, s);
    for (const s of dynamicSettings) merged.set(s.id, s);
    return [...merged.values()];
  },
};
