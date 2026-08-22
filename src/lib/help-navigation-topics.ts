import { registerHelpTopics, type HelpTopic } from "@/lib/help-documentation";
import { avkkHelpTopics } from "@/lib/help-avkk-topics";

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
      "Supabase",
      "Backend",
      "Authentifizierung",
      "Health",
    ],
    lastUpdated: "2026-08-22",
    content: `## Was zeigt der Systemstatus?
**Service → Systemstatus…** zeigt ausschließlich Statusinformationen und nicht-sensible Metadaten. Verbindungsadressen, Schlüssel, Tokens, Passwörter und Connection Strings werden dort nicht ausgegeben.

## GitHub
Die Repository-URL ist die kanonische öffentliche Projektadresse **https://github.com/bmarnau/sysingdashboard**. Interne Git-Remotes einer Hosting-Plattform werden nicht als Repository-URL übernommen.

Branch und Commit werden nur angezeigt, wenn Build- oder Hosting-Umgebung diese Information verlässlich bereitstellen. Fehlt der Commit in einer Lovable-Runtime, erscheint **„vom Hosting nicht bereitgestellt“**. Das bedeutet nicht, dass GitHub falsch konfiguriert ist; für einen reproduzierbaren Freigabenachweis ist weiterhin der in GitHub geprüfte Merge-Commit maßgeblich.

## Supabase als MVP-Plattform
Im Bereich **Data** wird **Supabase** als aktuelle MVP-Daten- und Authentifizierungsplattform ausgewiesen. Die Anzeige **Auth-Konfiguration** prüft nur, ob die erforderliche Client-Konfiguration plausibel vorhanden ist. Sie zeigt weder URL noch Publishable Key an.

## Geschützter Backend-Nachweis
System-Administrator und Administrator besitzen **users.manage**. Nur für diese Rollen führt der Systemstatus beim Öffnen oder mit **Jetzt prüfen** zusätzlich einen geschützten Backend-Nachweis aus. Der Server prüft zuerst Anmeldung und Berechtigung und bestätigt anschließend nur **Provider: Supabase** und **Backend-Verbindung: erreichbar**.

Ein Teamleiter darf den allgemeinen Systemstatus sehen, besitzt aber kein **users.manage**. Deshalb wird für ihn dieser Admin-Nachweis nicht ausgelöst und als **„nicht geprüft — users.manage erforderlich“** gekennzeichnet. Das ist beabsichtigtes Least-Privilege-Verhalten und kein Verbindungsfehler.

## Öffentlicher Health-Status
Der allgemeine **/api/status** bleibt ein secret-freier Health-Endpunkt. Er enthält keine Supabase-Verbindungsadresse, keine Projektkennung und keine Zugangsdaten. Ein administrativer Backend-Nachweis wird bewusst nicht in diesen öffentlichen Endpoint verschoben.

## Weitere Bereiche
Der Dialog zeigt außerdem Application-/Buildinformationen, Lovable-Status, Azure-Readiness, Security/RBAC, lokale Backup-/Dateninformationen, Dokumentationsstand, Backend-Health und Security-Scan-Hinweise.

## Interpretation
- **configured / erreichbar**: der jeweilige technische Nachweis ist positiv.
- **Not configured**: die betreffende optionale Funktion ist nicht konfiguriert.
- **vom Hosting nicht bereitgestellt**: die Hosting-Runtime liefert die Metadaten nicht; dies ist kein Konfigurationsfehler.
- **nicht geprüft — users.manage erforderlich**: der Benutzer darf den geschützten Admin-Nachweis nicht ausführen.`,
    relatedTopics: [
      "rbac-rollen-berechtigungen",
      "security-principles",
      "local-operation",
      "technical-test-report",
    ],
  },
];

export function registerDashboardNavigationHelp(): void {
  registerHelpTopics(...dashboardNavigationHelpTopics, ...avkkHelpTopics);
}
