import { registerHelpTopics, type HelpTopic } from "@/lib/help-documentation";

export const dashboardNavigationHelpTopics: HelpTopic[] = [
  {
    id: "navigation-ansichten",
    title: "Navigation und Ansichten im Dashboard",
    category: "Dashboard",
    route: "/",
    component: "Dashboard",
    keywords: [
      "Navigation",
      "Projekte",
      "Arbeitspakete",
      "Tätigkeiten",
      "Abrechnung",
      "AVKK",
      "Hilfe",
    ],
    lastUpdated: "2026-08-22",
    content: `## Hauptnavigation
Die fachlichen Ansichten werden über die Tab-Leiste direkt unter dem Kopfbereich geöffnet:
- **Projekte** — Projektübersicht und Einstieg in das Projektdetail.
- **Arbeitspakete** — Übersicht aller sichtbaren Arbeitspakete.
- **Tätigkeiten** — Übersicht der Tätigkeiten und Zeitbuchungen.
- **Abrechnung** — abrechnungsbezogene Übersicht.
- **Mein AVKK** — persönlicher AVKK-Arbeitsplatz.
- **AVKK Management** — Führungssicht; sichtbar nur mit passender Berechtigung.

## Projektdetail öffnen
Im Tab **Projekte** auf den **Projektnamen** der gewünschten Projektkarte klicken. Das Projektdetail zeigt Projektkopf, Kennzahlen, Arbeitspakete, Tätigkeiten und bei Berechtigung AVKK im Projektkontext. **Zurück zu Projekte** führt wieder in die Übersicht.

Der **Stift** auf der Projektkarte ist ausschließlich zum Bearbeiten der Projektstammdaten vorgesehen und nicht der reguläre Einstieg in das Projektdetail.

## Projektbericht
Im Projektdetail öffnet **Projektbericht** die Berichtsausgabe mit dem aktuell geöffneten Projekt bereits vorausgewählt.

## Hilfe und Services
Das **Fragezeichen** öffnet die Hilfe und das Benutzerhandbuch. Das **Zahnrad** öffnet Einstellungen und Services. Welche Aktionen sichtbar sind, hängt von der Rolle und ihren Berechtigungen ab.`,
    relatedTopics: ["projects", "avkk-arbeitsplatz", "berichte"],
  },
  {
    id: "projects",
    title: "Projekte, Projektdetail und Arbeitspakete",
    category: "Erfassung",
    route: "/",
    component: "ProjectsView",
    keywords: [
      "Projekt",
      "Projektcockpit",
      "Projektdetail",
      "Arbeitspaket",
      "Projektbericht",
      "Stift",
    ],
    lastUpdated: "2026-08-22",
    content: `## Projektübersicht
Über den Tab **Projekte** gelangt man in die Projektübersicht.

## Projektdetail
Ein Klick auf den **Projektnamen** öffnet die konsolidierte Projektsicht. Sie enthält Stammdaten, Kennzahlen, die Arbeitspakete und Tätigkeiten des Projekts sowie bei Berechtigung den AVKK-Projektkontext.

Der **Stift** öffnet ausschließlich **Projekt bearbeiten**. Im Projektdetail stehen zusätzlich **Zurück zu Projekte**, **Projektbericht** und — mit Bearbeitungsrecht — **Projekt bearbeiten** zur Verfügung.

## Eigene Ansichten
Über die oberen Tabs **Arbeitspakete** und **Tätigkeiten** lassen sich diese Bereiche projektübergreifend öffnen. Das Projektdetail bleibt dagegen auf genau ein Projekt begrenzt.

## Berechtigungen
Bearbeitungsaktionen erscheinen nur mit den vorhandenen Rechten für Projekt, Arbeitspaket oder Tätigkeit. Lesende Rollen bleiben read-only.`,
    relatedTopics: ["navigation-ansichten", "time-entries", "berichte"],
  },
];

export function registerDashboardNavigationHelp(): void {
  registerHelpTopics(...dashboardNavigationHelpTopics);
}
