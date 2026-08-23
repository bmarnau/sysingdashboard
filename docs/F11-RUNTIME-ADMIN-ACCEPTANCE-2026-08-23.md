# F-11 Runtime-/Administrator-Abnahme — 2026-08-23

## Zweck

Dieses Dokument ist das fortlaufende, git-gesicherte Arbeitsprotokoll für die verbleibende F-11-Runtime- und Administrator-Abnahme. Es verhindert, dass Prüfschritte nur in einer lokalen oder temporären Umgebung verbleiben.

Verbindliche Regel für diesen Lauf: Ein Prüfschritt gilt erst dann als dauerhaft gesichert, wenn sein Ergebnis in diesem Branch dokumentiert und nachfolgend per Pull Request nachvollziehbar ist. Nicht visuell oder fachlich geprüfte Punkte werden nicht als PASS gewertet.

## Ausgangsbasis

- GitHub-Repository: `bmarnau/sysingdashboard`
- Baseline `main`: `b86cc96bd6b64f81c42084c5e5dca929f3f22e34`
- Baseline enthält Merge von PR #38 `Docs/F-11: laufaktuellen technischen Prüfbericht nachweisen`.
- F-11 bleibt formal `MANUAL VERIFICATION REQUIRED`.
- Technischer Prüfbericht ist nach PR #37 als laufaktueller, reproduzierbarer CI-Nachweis PASS.

## Schritt 1 — GitHub → Lovable Synchronisation

Status: **TECHNISCH PASS**

Nachgewiesen am 2026-08-23:

- Lovable-Projekt `sysingdashboard` / `IT Task Hub` ist veröffentlicht unter `https://sysingdashboard.lovable.app`.
- Lovable-Projektstatus: `completed`.
- Die Lovable-Edit-Historie weist den GitHub-Merge-Commit `b86cc96bd6b64f81c42084c5e5dca929f3f22e34` als `completed` aus.
- Damit ist die aktuelle GitHub-Baseline in Lovable angekommen; es besteht für diesen Prüfschritt kein nur lokaler Zwischenstand.

Abgrenzung: Dieser Nachweis bestätigt Synchronisation und Projektstatus, nicht die visuelle Browserabnahme einzelner Oberflächen.

## Schritt 2 — Backend-Grundstatus

Status: **TECHNISCH PASS**

Nachgewiesen am 2026-08-23 über die verbundene Lovable-Projektinstanz:

- Datenbank-Backend ist aktiviert.
- Backend-Stack: `supabase`.

Abgrenzung: Dieser Nachweis bestätigt den Plattform-/Backend-Grundstatus. Er ersetzt nicht den visuellen F-11-Systemstatus-Retest und keine RBAC-/RLS-Einzelprüfung.

## Schritt 3 — UI-Pfade und Testgrenze aus aktuellem `main`

Status: **TECHNISCH PASS — Prüfanweisung verifiziert**

Aus `src/components/dashboard/header/ServiceMenu.tsx` auf der Baseline wurden die aktuellen Bedienpfade verifiziert. Ausgangspunkt ist jeweils der Dashboard-Button `Einstellungen und Services`.

- Benutzerverwaltung: `Einstellungen und Services` → `Benutzer & Profile…`
- Downloadbereich: `Einstellungen und Services` → `Downloads…`
- Backup: `Einstellungen und Services` → `Backup…`; Anzeige ist an `backup.restore` gebunden.
- Log Viewer: `Einstellungen und Services` → `Log Viewer…`
- Systemstatus: `Einstellungen und Services` → `Systemstatus…`; Anzeige ist an `systemstatus.view` gebunden.
- Backend-/Auth-Administration: `Einstellungen und Services` → `Backend & Auth-Konten…`; Anzeige ist an `users.manage` gebunden.

Der aktuelle Systemstatus-Dialog weist ausdrücklich darauf hin, dass nur sichere Status- und Metadaten und keine Secrets oder Verbindungswerte dargestellt werden. Für die visuelle Abnahme sind insbesondere folgende Bereiche relevant:

- Application: Version, Build-Datum, Runtime-Modus,
- GitHub: kanonische Repository-URL, Branch und optional Commit; fehlt der Hosting-Commit, ist `vom Hosting nicht bereitgestellt` der erwartete neutrale Zustand,
- Lovable: Publish-URL und Deployment-Status,
- Security/Auth: Authentication mode, Auth-Konfiguration, RBAC-Status und geschützter Backendstatus.

Die Playwright-Spezifikation `e2e/specs/service-menu.spec.ts` bestätigt für `systemadministrator`, dass Log Viewer, Systemstatus und Backup im Servicemenü sichtbar sind. Die Spezifikation grenzt sich aber selbst ausdrücklich als Smoke-Prüfung ab: Das Öffnen eines Dialogs ist kein Funktionstest. Die verbleibenden manuellen F-11-Prüfungen werden deshalb nicht durch diesen automatischen Nachweis ersetzt.

## Schritt 4 — Automatisierter Lovable-Runtime-Versuch

Status: **NOT TESTED — keine angemeldete Administrator-Session verfügbar**

Am 2026-08-23 wurde die verbundene Lovable-Projektinstanz ausdrücklich read-only angewiesen, die verbliebenen F-11-Administratorpfade ohne Code-, Datenbank-, Benutzer-, Rollen- oder Konfigurationsänderung zu prüfen.

Der Auftrag wurde von Lovable angenommen, konnte aber die geschützten Administrator-Dialoge ohne vorhandene authentifizierte Sitzung nicht belastbar als manuellen Runtime-Nachweis abschließen. Deshalb wird daraus kein PASS abgeleitet.

Konsequenz: Die visuelle Restabnahme erfolgt bewusst durch den Betreiber in der veröffentlichten App. Die Ergebnisse werden unmittelbar danach in diesem GitHub-Branch dokumentiert.

## Manueller Prüfschritt A — Systemstatus

Status: **FUNKTIONAL PASS — 3 Findings dokumentiert**

Manuell am 2026-08-23 als System-Administrator in der veröffentlichten App geprüft. Drei Screenshots decken den Systemstatus vom oberen Application-/GitHub-/Lovable-Bereich bis Security, Data, Documentation, Backend health und Security-Scan ab. Die Bildinhalte wurden in diesem Git-Nachweis transkribiert; der Prüfschritt hängt damit nicht ausschließlich an einer temporären Bilddatei.

### Bestanden

- Dialog `Systemstatus` öffnet vollständig, ist scrollbar und visuell ohne erkennbare Überlagerung oder Renderfehler.
- Application: `Engineer Console`, Version `1.59.6`, Runtime mode `production`.
- GitHub: Repository-Anzeige `bmarnau/sysingdashboard`; Branch `main`.
- GitHub-Commit: neutraler Zustand `vom Hosting nicht bereitgestellt` — erwartungskonform und kein Fehler.
- Keine interne Git-Remote, kein lokaler Pfad und keine Zugangsinformation in der GitHub-Anzeige sichtbar.
- Lovable Publish URL: `sysingdashboard.lovable.app`.
- Authentication mode: `supabase`.
- Auth-Konfiguration: `vollständig konfiguriert`.
- RBAC: `enabled — 7 roles · 20 permissions`.
- Secret management: `enabled (secretManager.mjs)`.
- MVP-Datenplattform: `Supabase`.
- Geschützte Backend-Verbindung: `erreichbar — geschützte Admin-Prüfung`.
- `/api/status`: `reachable (production)`.
- Correlation-ID-Middleware aktiv.
- Security-Scan verweist auf Custom-Scanner, gitleaks und Security-Workflow.
- In den Screenshots sind keine Passwörter, Access-/Refresh-Tokens, API-Keys, Service-Role-Keys, Connection-String-Werte, Benutzerlisten oder E-Mail-Listen sichtbar.
- Bei fehlenden Azure-Variablen werden ausschließlich Variablennamen, keine Werte dargestellt.

### Finding SYSSTAT-01 — Lovable Deploymentstatus nicht laufzeitaktuell

Beobachtung:

- `Current publish URL` ist korrekt und die App ist nachweislich veröffentlicht.
- Im Dialog stehen gleichzeitig `Deployment status: Not configured` und `Last deployment: Not configured`.

Bewertung: **nicht blockierend für die aktuelle Funktion**, aber sachlich irreführende Statusdarstellung. Die verbundene Lovable-Projektinstanz hatte die Baseline zuvor als `completed` bestätigt. Vor endgültigem F-11-Abschluss ist zu entscheiden, ob der Systemstatus diesen Wert korrekt aus einer verfügbaren Quelle beziehen oder neutral als `nicht vom Hosting bereitgestellt` kennzeichnen soll.

### Finding SYSSTAT-02 — Lovable Project ID sichtbar

Beobachtung:

- Der Dialog zeigt eine Lovable `Project ID` als UUID.

Bewertung: **kein Secret im engeren Sinn**, aber unnötige provider-spezifische Kennung in einer Oberfläche, deren Zweck ausdrücklich sichere/minimale Betriebsmetadaten sind. Die F-11-Prüfanweisung hatte Projektkennungen vorsorglich ausgeschlossen. Empfehlung: vor endgültigem Abschluss prüfen, ob die Kennung einen operativen Nutzen hat; andernfalls aus der normalen Systemstatus-Anzeige entfernen oder nur in einem gezielt administrativen Detailbereich zeigen.

### Finding SYSSTAT-03 — optionale Azure-Zielplattform erzeugt roten ENV-Fehler

Beobachtung:

- Azure SQL, Azure Table Storage, Azure Blob/SAS, Azure auth mode und Key Vault sind `Not configured`.
- Gleichzeitig zeigt Security `ENV validation: failed — 5 missing` und nennt ausschließlich die fehlenden Azure-Variablennamen.
- Der produktive MVP arbeitet nachweislich mit Supabase; Azure ist der vorgesehene spätere Provider-/Migrationspfad.

Bewertung: **kein aktueller Supabase-MVP-Ausfall und kein Secret-Leak**. Die Darstellung kann jedoch den Eindruck eines produktiven Sicherheitsfehlers erzeugen, obwohl ausschließlich optionale zukünftige Azure-Konfiguration fehlt. Vor endgültigem Abschluss sollte die Validierung zwischen für den aktuellen Provider erforderlichen ENV-Werten und optionalen Zielprovider-Werten unterscheiden oder den Zustand entsprechend als optional/nicht konfiguriert kennzeichnen.

### Ergebnis des manuellen Systemstatus-Tests

- Bedienbarkeit: PASS
- Supabase/Auth/RBAC/Backend-Kernnachweis: PASS
- GitHub-Minimalisierung nach PR #30/#33: PASS
- Secret-/Credential-Sichtprüfung: PASS
- Lovable-Deploymentanzeige: FINDING
- provider-spezifische Project ID: FINDING
- Azure-ENV-Statusdarstellung: FINDING

Der Systemstatus-Retest ist damit **manuell durchgeführt und funktional bestanden**. Die drei Findings bleiben als konkrete Restpunkte sichtbar und werden nicht durch ein pauschales `Systemstatus ok` verloren.

## Noch offene F-11-Restschritte

1. Visueller Namens-Retest in der Benutzerverwaltung nach PR #31.
2. Backup als visueller Administrator-Bedienpfad.
3. Downloadbereich als visueller Administrator-Bedienpfad.
4. Log Viewer als visueller Administrator-Bedienpfad.
5. Abschließende Administrator-Sichtprüfung.
6. Fachliche Entscheidung zu `Role Preview` und anschließende Dokumentationsbereinigung oder gezielte Folgeumsetzung.
7. Einordnung/Behebung der Systemstatus-Findings `SYSSTAT-01` bis `SYSSTAT-03` vor formalem F-11-Abschluss.

## Role Preview — aktueller technischer Befund

Noch kein fachlicher Abschluss.

Die Repository-Suche auf aktuellem `main` zeigt keinen aktuellen Produktcode-Einstieg für `Role Preview`. Treffer liegen in Abnahme-/Statusdokumentation und historischen Planungsartefakten. Deshalb wird der Punkt bis zur fachlichen Entscheidung weiterhin als Produkt-/Dokumentationsdrift geführt und nicht künstlich als PASS bewertet.

## Abschlussstatus dieses Checkpoints

- GitHub-Baseline verifiziert: PASS
- Lovable-Synchronisation verifiziert: PASS
- Supabase-Backend-Grundstatus verifiziert: PASS
- aktuelle UI-Prüfpfade verifiziert: PASS
- automatische Smoke-Testgrenze dokumentiert: PASS
- automatisierter Lovable-Runtime-Test ohne Auth: NOT TESTED
- visueller Systemstatus: FUNKTIONAL PASS, 3 Findings
- visuelle Administrator-Restabnahme: OFFEN
- Role Preview: OFFEN
- F-11 gesamt: `MANUAL VERIFICATION REQUIRED`
