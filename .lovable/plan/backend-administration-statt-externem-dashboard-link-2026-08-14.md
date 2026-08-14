# Backend-Administration statt externem Dashboard-Link

## Befund zuerst (wichtig, ändert die Aufgabenstellung)

Die Sysing-Instanz läuft auf **Lovable Cloud** als Backend-Plattform (Datenbank, Auth, Storage). Diese Instanz ist **plattform-verwaltet**, nicht user-managed: Es gibt für den Projekteigentümer **keinen Login in ein externes Anbieter-Dashboard** und keine ausgebbaren Projekt-Kennungen, Admin-Keys oder Datenbankpasswörter. Der beobachtete "kein Zugriff"-Effekt ist damit erwartbar und kein Konfigurationsfehler.

Konsequenz für die Punkte 3 und 5 des Auftrags: Ein Menüeintrag „Supabase Dashboard“ mit Projekt-Ref und externem Deep-Link wird **nicht** gebaut. Er würde auf eine Oberfläche zeigen, die der Betreiber nicht betreten kann, und technische Kennungen in der UI exponieren, ohne administrativen Nutzen. Punkt 4 des Auftrags (kein Workaround, sauber dokumentieren, als Finding bewerten) wird stattdessen konsequent umgesetzt — plus der eigentliche fachliche Bedarf: die zwei fehlerhaften/unbestätigten Demo-Konten müssen verwaltbar sein.

Der administrative Zugang zur Backend-Oberfläche erfolgt für den Projekteigentümer über die Lovable-Projektumgebung (Backend-Ansicht), nicht über einen Anbieter-Login.

## Was gebaut wird

### 1. Service-Menü: „Backend & Auth-Konten…“
Neuer Eintrag im Servicemenü, sichtbar nur mit `users.manage` (also Administrator/Systemadministrator). Öffnet einen neuen Dialog `BackendAdminDialog`.

Inhalt des Dialogs:
- **Statusblock (secret-frei):** Backend verbunden ja/nein, Auth-Konfigurationsstatus (aus dem vorhandenen `getAuthConfigurationStatus()`), Betriebsmodus. Keine Projekt-Kennungen, keine Keys, keine URLs.
- **Auth-Konten-Tabelle:** E-Mail, Bestätigungsstatus, Anlagedatum, letzter Login, verknüpftes Profil ja/nein.
- **Admin-Aktionen pro Konto:** „E-Mail-Bestätigung erneut senden“, „Konto bestätigen“ (für Demo-/Testkonten), „Konto löschen“ mit Bestätigungsabfrage und Schutz des eigenen bzw. letzten Systemadministrator-Kontos.
- **Hinweistext:** Unterschied Sysing-Anmeldung ↔ Backend-Plattformverwaltung, und dass Sysing keine Plattform-Admin-Zugangsdaten speichert.

Damit ist der reale Abnahmeblocker (zwei kaputte Demo-Konten) direkt in Sysing lösbar, ohne externes Dashboard.

### 2. Serverseitige Absicherung
Neue Serverfunktionen in `src/lib/admin/auth-accounts.functions.ts`:
- `listAuthAccounts`, `confirmAuthAccount`, `resendConfirmation`, `deleteAuthAccount`
- alle mit `requireSupabaseAuth`; im Handler zuerst Rollenprüfung über den Benutzerkontext (`has_permission(..., 'users.manage')`), erst danach dynamischer Import des privilegierten Server-Clients
- Rückgaben enthalten ausschließlich unkritische Felder (E-Mail, Zeitstempel, Bestätigungsflag) — keine Tokens, keine Keys, keine Metadaten-Dumps
- jede schreibende Aktion schreibt einen `audit_log`-Eintrag

Keine Eingabefelder für Plattform-Zugangsdaten, keine Tokenspeicherung — Auftragspunkt 2 bleibt vollständig gewahrt.

### 3. Dokumentation
- Neues Handbuchkapitel „Backend- und Auth-Administration“ in `src/lib/help-documentation.ts`: Zweck, Unterschied der beiden Anmeldungen, wo die Kontoverwaltung stattfindet, Vorgehen bei unbestätigten Test-/Demo-Konten, ausdrücklich keine Admin-Credentials in Sysing.
- Neues `docs/BACKEND-ADMINISTRATION.md` mit derselben Aussage plus Betriebs-/Exit-Betrachtung: welche Abhängigkeit von der verwalteten Plattform besteht und was eine spätere autonome Bereitstellung (eigene Instanz, Docker) erfordert — Schema-Migrationen liegen bereits versioniert vor, Auth-Konten müssten neu angelegt/migriert werden.
- `docs/MVP-ACCEPTANCE-REPORT.md`: neues Finding **F-15 (medium)** „Betreiber hat keinen eigenen Plattform-Administrationszugang zur führenden Auth-/Datenplattform“ mit Bewertung: **kein MVP-Blocker**, weil alle für die Abnahme nötigen Verwaltungsschritte künftig in Sysing selbst verfügbar sind; vor produktivem Kundenbetrieb jedoch zu klären (Übernahme in eine eigene Organisation bzw. eigene Instanz).
- `CHANGELOG.md`, `docs/PROJECT-STATUS.yaml`, `docs/ENTWICKLUNGSTAGEBUCH.md` auf v1.58.7.

### 4. Tests
- Sichtbarkeit des Menüeintrags nur bei `users.manage`
- Statusblock rendert keine Kennungen/Keys (DOM-Assertion gegen Key-Präfixe und URL-Muster)
- Serverfunktionen weisen Aufrufe ohne `users.manage` ab
- Schutzregel: letztes aktives Systemadministrator-Konto nicht löschbar
- Accessible Name/Tooltip des Menüeintrags

Anschließend: `typecheck`, `lint`, `rbac:check`, `docs:check`, komplette Testsuite.

## Nicht angefasst
AVKK, RLS-Policies, RBAC-Matrix (nur Sichtbarkeit des neuen Eintrags), Demo-Daten, Reporting, Backup, Authentifizierungsarchitektur, Azure/Graph/KI.

## Abschlussbewertung (Vorwegnahme)
- Verwendete Instanz: plattform-verwaltetes Lovable-Cloud-Backend
- Betreiberzugriff auf ein externes Anbieter-Dashboard: **NEIN**
- Externer Dashboard-Link eingebaut: **NEIN** (bewusst, siehe Befund)
- Kontoverwaltung für die Abnahme erreichbar: **JA**, künftig in Sysing selbst
- MVP-Bewertung: **FINDING (F-15, medium)** — kein Blocker
