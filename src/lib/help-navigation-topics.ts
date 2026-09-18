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
    lastUpdated: "2026-09-13",
    content: `## Hauptnavigation
Die fachlichen Ansichten werden über die Tab-Leiste direkt unter dem Kopfbereich geöffnet:
- **Projekte** — Projektübersicht und Einstieg in das Projektdetail.
- **Arbeitspakete** — Übersicht aller sichtbaren Arbeitspakete.
- **Tätigkeiten** — Übersicht der Tätigkeiten und Zeitbuchungen.
- **Abrechnung** — abrechnungsbezogene Übersicht.
- **Mein AVKK** — persönlicher AVKK-Arbeitsplatz.
- **AVKK Management** — Führungssicht; sichtbar nur mit passender Berechtigung.

Zusätzlich stehen im Kopfbereich kunden- und steuerungsbezogene Einstiege zur Verfügung:
- **Meine Kunden** — persönliche, fail-closed Kundensicht für eigene aktive Verantwortungen mit eigenem Kundenzugriff.
- **Kundenverantwortung** — getrennte Verwaltungsansicht; nur sichtbar mit \`customer.responsibility.manage\`.
- **Projektcontrolling** — read-only Leistungssicht für berechtigte Leitungsrollen; sichtbar nur mit \`project.controlling.view\`.

## Projektdetail öffnen
Im Tab **Projekte** auf den **Projektnamen** der gewünschten Projektkarte klicken. Das Projektdetail zeigt Projektkopf, Kennzahlen, Arbeitspakete, Tätigkeiten und bei Berechtigung AVKK im Projektkontext. **Zurück zu Projekte** führt wieder in die Übersicht.

Der **Stift** auf der Projektkarte ist ausschließlich zum Bearbeiten der Projektstammdaten vorgesehen und nicht der reguläre Einstieg in das Projektdetail.

## Projektbericht
Im Projektdetail öffnet **Projektbericht** die Berichtsausgabe mit dem aktuell geöffneten Projekt bereits vorausgewählt.

## Hilfe und Services
Das **Fragezeichen** öffnet die Hilfe und das Benutzerhandbuch. Das **Zahnrad** öffnet Einstellungen und Services. Welche Aktionen sichtbar sind, hängt von der Rolle und ihren Berechtigungen ab.`,
    relatedTopics: [
      "projects",
      "customer-responsibility-management",
      "project-controlling",
      "avkk-arbeitsplatz",
      "berichte",
    ],
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
    id: "customer-responsibility-management",
    title: "Kundenverantwortung verwalten",
    category: "Kunden",
    route: "/kundenverantwortung",
    component: "CustomerResponsibilityManagementView",
    keywords: [
      "Kundenverantwortung",
      "Meine Kunden",
      "Verantwortlicher",
      "Teamlead",
      "Zuweisen",
      "Wechseln",
      "Beenden",
    ],
    lastUpdated: "2026-09-13",
    content: `## Zwei bewusst getrennte Kundensichten
**Meine Kunden** ist die persönliche Kundensicht. Dort erscheinen ausschließlich Kunden, für die gleichzeitig eine eigene aktive Verantwortung, eine aktive Systemhaus-Zugehörigkeit und mindestens lesender eigener Kundenzugriff vorliegen.

**Kundenverantwortung** ist dagegen die Verwaltungsansicht. Sie ist nur für Benutzer mit \`customer.responsibility.manage\` sichtbar: Systemadministrator, Administrator und Teamlead.

## Was darf verwaltet werden?
Ein berechtigter Manager darf die primäre Verantwortung für Kunden des eigenen Systemhauses **zuweisen**, **wechseln** oder **beenden**. Dafür ist kein eigener operativer Kundenzugriff erforderlich.

Die Verwaltungsberechtigung gibt jedoch **keinen** Zugriff auf Projekte, Arbeitspakete oder Tätigkeiten des Kunden. Operative Kundendaten bleiben weiterhin durch \`customer_access\` und RLS geschützt.

## Wer kann verantwortlich sein?
Als Ziel sind aktive Mitglieder desselben Systemhauses mit den Rollen Systemadministrator, Administrator, Teamlead, Projektmanager oder Systemingenieur zulässig. Viewer und Customer sind ausgeschlossen.

Die Auswahlliste ist datenminimiert und enthält nur technische Benutzer-ID und Anzeigename. E-Mail, Telefon, MFA-Informationen oder weitere Profildaten werden nicht bereitgestellt.

## Wechsel und Historie
Beim Wechsel wird die bisherige Responsibility historisch beendet und die neue Responsibility in derselben Datenbanktransaktion angelegt. Schlägt die neue Zuweisung fehl, bleibt die bisherige Verantwortung unverändert. Es gibt keinen Hard Delete der Historie.

## Sicherheitsgrenzen
Cross-Systemhouse-Zugriffe bleiben verweigert. Browser-Rollen oder manipulierte Client-Daten begründen keine Berechtigung; maßgeblich sind die serverseitigen Auth-, RBAC- und RLS-Prüfungen.`,
    relatedTopics: ["navigation-ansichten", "rbac-rollen-berechtigungen", "security-principles"],
  },
  {
    id: "project-controlling",
    title: "Projektcontrolling — Leistungen auswerten",
    category: "Auswertung",
    route: "/projektcontrolling",
    component: "ProjectControllingView",
    roles: ["systemadministrator", "administrator", "teamlead", "projectmanager"],
    keywords: [
      "Projektcontrolling",
      "Leistung",
      "Leistungssicht",
      "Projektmanager",
      "Zeitraum",
      "Systemhaus",
      "Kunde",
      "Projekt",
      "Arbeitspaket",
      "Kategorie",
      "Billable",
      "Drill-down",
    ],
    lastUpdated: "2026-09-18",
    content: `## Zweck
Das **Projektcontrolling** ist eine ausschließlich lesende Leistungssicht. Es verdichtet freigegebene Tätigkeiten aus dem gemeinsamen serverseitigen Datenbestand, ohne Buchungen, Projekte oder Arbeitspakete zu verändern.

## Wer darf die Ansicht nutzen?
Die Ansicht ist für Systemadministrator, Administrator, Teamlead und Projektmanager vorgesehen. Technisch ist die Berechtigung \`project.controlling.view\` erforderlich. Sie allein erweitert den Datenzugriff jedoch nicht: Zusätzlich gelten aktive Systemhaus-Zugehörigkeit, eigener zulässiger Kundenzugriff und die bestehenden Datenbankregeln.

Ein im Projekt gepflegtes Lead-Feld ist **keine** Sicherheitsidentität und schaltet keine Daten frei.

## Zeitraum und Filter
Standard ist der **aktuelle Kalendermonat bis heute**. Ein benutzerdefinierter Zeitraum darf höchstens 366 Tage umfassen.

Die Filter bauen voneinander abhängig auf:
- Systemhaus,
- Kunde,
- Projekt,
- Arbeitspaket,
- Arbeitspaket-Kategorie,
- alle / abrechenbar / nicht abrechenbar.

Kunde, Projekt und Arbeitspaket werden über ihre technischen Identitäten gefiltert. Ein abhängiger Filter wird erst angeboten, wenn sein übergeordneter Scope eindeutig ist.

## Kennzahlen und Verlauf
Die Übersicht zeigt insbesondere:
- Gesamtstunden,
- abrechenbare und nicht abrechenbare Stunden,
- Billable-Quote,
- Anzahl Tätigkeiten, Kunden, Projekte und Arbeitspakete,
- täglichen Stundenverlauf,
- Drill-down **Kunde → Projekt → Arbeitspaket → Tätigkeit**.

Nicht zuordenbare Daten sowie Legacy-, unbekannte oder inzwischen inaktive Kategorien bleiben sichtbar gekennzeichnet; sie werden nicht stillschweigend umgedeutet.

## Große Ergebnismengen
Es werden höchstens 5.000 passende Tätigkeiten ausgewertet. Würde ein Filter mehr liefern, erscheint die Aufforderung, **Zeitraum oder Filter einzuschränken**. Es gibt keine stille Kürzung der Ergebnisliste.

## Bewusste Grenzen
BSF-03A ist read-only:
- keine Änderung von Tätigkeiten oder Abrechenbarkeit,
- keine Finalisierung oder Rechnungsfreigabe,
- keine Eurobeträge,
- keine personenbezogene Leistungsrangliste,
- kein Name des Leistungserbringers in dieser Controlling-Sicht.

Die Datenabgrenzung wird serverseitig geprüft; manipulierte URLs oder IDs erweitern den sichtbaren Scope nicht.`,
    relatedTopics: [
      "navigation-ansichten",
      "meine-kunden",
      "workpackage-categories",
      "rbac-rollen-berechtigungen",
      "security-principles",
    ],
  },
  {
    id: "info-kiosk",
    title: "Info-Kiosk — Demo-Pilot",
    category: "Service",
    route: "/kiosk",
    component: "KioskView",
    keywords: [
      "Info-Kiosk",
      "Kiosk",
      "Demo-Pilot",
      "Demo-Daten",
      "kiosk.view",
      "Servicemenü",
      "Session-Watchdog",
      "read-only",
    ],
    lastUpdated: "2026-09-15",
    content: `## Zweck und Status
Der **Info-Kiosk** ist in KIOSK-01 ein ausschließlich lesender Demo-Pilot. Die Ansicht zeigt permanent **DEMO-DATEN — KEINE LIVE-DATEN**. Sie verwendet keine produktiven externen Datenquellen und ist kein zweites Fachsystem.

## Demo-Datensatz
Die Kiosk-Daten sind lokal, synthetisch und versioniert. Berechtigte Administratoren können sie über **Servicemenü → Demo-Datensatz** laden, als geprüftes JSON importieren oder entfernen. Importiert wird nur das Kiosk-Demoschema; unbekannte oder unvollständige Daten werden vollständig abgewiesen, der letzte gültige Stand bleibt erhalten.

Das technische Kiosk-Konto selbst kann keine Demo-Daten laden, importieren oder entfernen und besitzt keine Fach-, Admin- oder sonstigen Schreibrechte. Seine fachliche Berechtigung ist auf \`kiosk.view\` begrenzt.

## Anmeldung und Sitzung
Der Kiosk verwendet die reguläre Supabase-Anmeldung. Ein gültiges Kiosk-Konto ist auf die Route \`/kiosk\` begrenzt. Manueller Logout bleibt jederzeit verfügbar. Für den unbeaufsichtigten Anzeigebetrieb gilt nur auf \`/kiosk\` die dokumentierte Kiosk-Idle-Ausnahme; Kontoaktivität, Token-Gültigkeit, Rollenexklusivität und der periodische Session-Watchdog bleiben aktiv und arbeiten fail-closed.

## Daten- und Integrationsgrenzen
KIOSK-01 enthält **keine** produktive Microsoft-Graph-, SharePoint-, Exchange-, PRTG-, MCP- oder Agenten-Integration. Die Oberfläche liest über die austauschbare \`KioskDataProvider\`-Grenze. Spätere interne Read-Provider dürfen diese Grenze nutzen, ohne die Kiosk-Oberfläche an einen einzelnen Anbieter zu koppeln.

## Sicherheit
Die Kiosk-Rolle umgeht weder Authentifizierung noch RBAC/RLS. Es werden keine Zugangsdaten in Demo-Dateien, Hilfe oder Quellcode abgelegt. Die produktive Datenbank wird durch Laden oder Entfernen des lokalen Demo-Datensatzes nicht verändert.`,
    relatedTopics: ["navigation-ansichten", "security-principles", "rbac-rollen-berechtigungen"],
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