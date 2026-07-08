# Changelog

Zentrale Änderungshistorie des Dashboards. **Pflicht:** Bei jeder Dashboard-Änderung
mit Nutzersichtbarkeit hier einen neuen Eintrag (neueste oben) ergänzen. Diese Datei
wird zur Build-Zeit in das integrierte Benutzerhandbuch (Kapitel
„Änderungshistorie") eingelesen. Die jeweils oberste Version bestimmt automatisch
`DASHBOARD_VERSION`.

Format pro Eintrag:

```
## <semver> - YYYY-MM-DD
- Kurzbeschreibung der Änderung (eine Zeile pro Bullet).
```

## 1.24.0 - 2026-07-08

- **Architekturdokumentation**: Neue `docs/ARCHITECTURE.md` (Systemübersicht, Modulgrenzen, Datenfluss, Runtime-Grenzen, Trust-Boundaries), `docs/API.md` (`/api/status`, `/api/sync`), `docs/DEPLOYMENT.md` (Cloudflare-Worker-Deploy, ENV, CI) und `docs/DATA-SCHEMA.md` (verweist auf `src/lib/json-schema.ts` + Migrationsregeln, kein Doppelbestand).
- **Architecture Decision Records** unter `docs/ADR/` mit Index und Template: ADR-0001 (TanStack Start), ADR-0002 (Frontend-RBAC gespiegelt — mit expliziter Trust-Boundary-Warnung), ADR-0003 (Local-First localStorage), ADR-0004 (Pub-Sub-Store statt Zustand/Redux), ADR-0005 (Frontend-Logger statt Sentry).
- **README** verlinkt die neue Doku-Sektion; neues Handbuch-Kapitel `architektur` mit Kurzfassung und Verlinkung.
- Kritisches Feedback zur ursprünglichen Vorlage: `docs/CONTRIBUTING.md` **nicht** überschrieben (das Bestehende ist gepflegter), Datenmodell **nicht** in Prosa dupliziert (driftet garantiert), zwei zusätzliche ADRs (Store, Logger) für bislang „stille" Entscheidungen.

## 1.23.0 - 2026-07-07

- **Barrierefreiheit (WCAG 2.1 AA)**: Automatisierte A11y-Tests mit `vitest-axe` (`src/__tests__/a11y/smoke.test.tsx`, `keyboard.test.tsx`) — laufen im bestehenden CI-Test-Schritt. Kritisches Feedback zur ursprünglichen Vorlage: bewusst `vitest-axe` statt `jest-axe` (Vitest-Projekt) und **kein Lighthouse in CI** (Overkill, flaky) — statt dessen dokumentierte Empfehlung für lokales Audit.
- Icon-only Header-Buttons (Suche zurücksetzen, Einstellungen, Hilfe, Benutzerprofil) erhalten `aria-label` + `aria-expanded` / `type="button"` + `aria-hidden` an Lucide-Icons.
- Suchfeld erhält `aria-label="Globale Suche"` und `type="search"`.
- `suppressHydrationWarning` auf den vom Dashlane/LastPass/Grammarly-Injektions-Angriff betroffenen Inputs/Buttons — beseitigt die Hydration-Mismatch-Runtime-Errors (kein A11y-Regress, nur Extension-Workaround).
- Neues Handbuch-Kapitel `barrierefreiheit`: Prüfabdeckung (axe automatisch, Screenreader/Tastatur manuell), Konventionen, bekannte Einschränkung PDF-Export (jsPDF ≠ PDF/UA — Empfehlung: TXT-/JSON-Export für strikte A11y).
- Tests: 94 → 98.

## 1.22.0 - 2026-07-06

- Zentraler **Dashboard-Store** (`src/lib/store/dashboard-store.ts`) für Domain-State (Projekte, Arbeitspakete, Tätigkeiten, Engineer) als Modul-Singleton mit Pub-Sub, ohne neue Runtime-Dependency (keine Zustand-/Redux-Bibliothek).
- React-Bindings via `useSyncExternalStore` (`src/lib/store/useDashboardStore.ts`): selektor-basierte Hooks `useProjects`, `useWorkPackages`, `useActivities`, `useEngineer` — Consumer rendern nur bei Änderung ihres Slices.
- **Persistenz-Layer** (`src/lib/store/dashboard-persistence.ts`) mit Debounce (300 ms) statt Full-Blob-Write bei jedem Tastendruck, `storage`-Event-Sync zwischen Tabs, Rehydrate bei Benutzerwechsel; Backwards-compatible zum bestehenden Storage-Key `northbit-dashboard-v2`.
- `src/routes/index.tsx` liest jetzt aus dem Store; UI-State (Dialoge, Suche, Menüs) bleibt bewusst lokal. Prop-Interfaces zu Kind-Komponenten unverändert (Direct-Read-Migration folgt profilergesteuert).
- 16 neue Tests (`dashboard-store`, `dashboard-persistence`, `useDashboardStore`) — Gesamt: 78 → 94.
- Neues Handbuch-Kapitel `state-management` erläutert Store, Persistenz und DevTools-Zugriff (`window.__dashboardStore` nur im DEV-Build).

## 1.21.0 - 2026-07-05


- Zentraler **Logger** (`src/lib/logger.ts`) mit Level `debug|info|warn|error`, In-Memory-Ringpuffer (500 Einträge), asynchronem IndexedDB-Sink (`dashboard-logs`, Rotation nach 1000 Zeilen / 7 Tagen) und automatischer Secret-Redaction (Token/Password/Authorization/Bearer/API-Key, JWT-ähnliche Strings). ESM-Pendant `backend/services/logger.mjs` für Node/Worker.
- Neue **Error-Klassen** (`src/lib/errors.ts`): `DashboardError` + `SyncError`, `ValidationError`, `ImportError`, `ExportError`, `AzureError`, `BackupError`, `RbacError` mit stabilen `code`-Feldern und `toJSON()` für sicheres Logging.
- Kritische Services umgestellt: `backend/services/syncService.mjs` wirft `SyncError` mit Codes, `src/lib/backup-service.ts` nutzt `logger.*` + `BackupError`, `src/lib/azure/azure-service.ts` loggt Stub-Aufrufe.
- Neuer Hook **`useSafeAsync`** (`src/hooks/useSafeAsync.ts`) für Ad-hoc-Async-Handler in Komponenten mit automatischem Logging.
- CI-Guard **`lint:no-console`** (`scripts/check-no-console.mjs`) blockiert direkte `console.*`-Aufrufe in `src/lib/backup-service.ts`, `src/lib/json-import-service.ts`, `src/lib/azure/**` und `backend/services/**`. Nur die drei Logger-Dateien sind ausgenommen.
- 14 zusätzliche Tests (`errors.test.ts`, `logger.test.ts`, `useSafeAsync.test.tsx`) — Testsumme ≥ 75.
- Neues Handbuch-Kapitel **„Fehlerbehandlung & Logging"**.

## 1.20.0 - 2026-07-04

- Test-Infrastruktur eingeführt: **Vitest + @testing-library/react** mit jsdom, `@testing-library/jest-dom` und v8-Coverage. Neue Skripte `test`, `test:watch`, `test:ui`, `test:coverage`.
- Neue Test-Struktur unter `src/__tests__/` mit deterministischen Fixture-Factories (Activities, Users) und **61 Tests** in 7 Dateien: `time-period` (20), `rbac` (13), `user-management` (13), `export-data` (5), `PermissionGate` (4), Integrationstests für Export (2) und Import-Schema-Validation (4).
- Per-File-Coverage-Threshold für `src/lib/time-period.ts` (≥ 80 %) — bewusst kein globaler Gate.
- CI-Pipeline (`.github/workflows/ci.yml`) erweitert: Tests laufen nach Lint/RBAC und vor Build; Coverage-Report wird als Artifact hochgeladen. Merge blockiert, wenn Tests rot sind.
- Neues Handbuch-Kapitel **„Tests & Qualitätssicherung"** ergänzt.

## 1.19.0 - 2026-07-02

- Neuer Servicebereich **Azure Daten** (Service → „Azure Daten…") mit drei Tabs: **Status**, **Aktionen** und **Historie**. UI- und Service-Fassade fertig, Backend-Anbindung folgt später (Stubs antworten `not implemented`, ohne zu werfen).
- Alle Azure-Aktionen laufen ausschließlich manuell per Button: **Verbindung testen**, **Datenbank aufbauen** (Textbestätigung `AUFBAUEN`, nur Systemadministrator), **Nach Azure exportieren** (Bestätigung), **Aus Azure importieren** (Pflicht-Vorschau + Pflicht-Backup + Textbestätigung `IMPORTIEREN`), **Lokale Historie leeren**.
- Buttons werden per `PermissionGate` nur bei vorhandener RBAC-Berechtigung angezeigt; bei fehlender Azure-Konfiguration (DEV) sind ausführende Buttons deaktiviert und der Status zeigt „Not configured". Ein ErrorBoundary im Dialog sorgt dafür, dass ein Azure-Ausfall das Dashboard nicht beeinträchtigt.
- Lokale, secret-freie Anzeige-Historie (`AzureHistoryStore` in `localStorage`) für Verbindungstests, Exporte und Importe.
- Handbuch-Kapitel **„Azure Daten – Servicegebiet"** ergänzt, `DOCUMENTATION_VERSION` auf `1.6.0` angehoben.

## 1.18.4 - 2026-07-01

- Handbuch-Suche erweitert: globale Header-Suche findet jetzt auch Handbuch-Kapitel (Sektion „Handbuch"); Klick öffnet das passende Kapitel mit übernommenem Suchbegriff.
- Im Benutzerhandbuch werden Treffer im Kapiteltext gelb hervorgehoben; Trefferzähler (`n / total`) und Sprung zum nächsten/vorherigen Treffer via Pfeilbuttons oder Enter/Shift+Enter.
- Deep-linkable Suche: aktive Kapitel-ID und Suchbegriff werden als `?help=<id>&hq=<query>` in der URL persistiert und beim Öffnen des Dialogs wieder eingelesen; beim Schließen entfernt.

## 1.18.3 - 2026-07-01


- Neue **Managementübersicht** (`docs/MANAGEMENT_OVERVIEW.md`) mit 14 Sektionen für nicht-technische Entscheider: Zielbild, Sicherheitsarchitektur, ENV-Validierung, Fail-Fast in Produktion, DEV ohne Azure, kein automatischer Sync, lokaler Betrieb bleibt führend, Rollenmodell, Export-/Import, Konflikthandling, Systemstatus, Entra-ID- und Key-Vault-Roadmap, Risiken und Gegenmaßnahmen.
- Handbuch-Kapitel **Managementübersicht** ergänzt (Kategorie „Betrieb"), verweist auf die versionierte MD-Datei.
- Systemstatus (Sektion „Documentation") zeigt Managementübersicht jetzt als vorhanden statt „not configured".
- `DOCUMENTATION_VERSION` auf `1.5.0` angehoben.

## 1.18.2 - 2026-06-30

- Benutzerhandbuch erweitert um die Kapitel **Lokaler Betrieb ohne Azure**, **Azure Servicebereich**, **Azure Datenbank aufbauen**, **Azure Verbindung testen**, **Nach Azure exportieren**, **Aus Azure importieren**, **Konflikthandling beim Import**, **Backup vor Import**, **Sicherheitsprinzipien** und **Was bei Azure-Ausfall passiert**. Neue Kategorien „Azure", „Betrieb" und „Sicherheit" im Navigationsbaum.
- Import-/Datenbank-/Azure-Kapitel mit klaren Warnhinweisen bei Überschreiben und Import; rollenbasierte Sichtbarkeit (`azure-database-build` und `azure-import` nur für berechtigte Rollen). Keine Secrets/Connection-Strings/SAS-Tokens dokumentiert.
- `DOCUMENTATION_VERSION` auf `1.4.0` angehoben; `lastUpdated` aller neuen Kapitel auf 2026-06-30 gesetzt.

## 1.18.1 - 2026-06-29

- Systemstatus (Check 8) auf sieben strukturierte Sektionen umgebaut: **Application**, **GitHub**, **Lovable**, **Azure**, **Security**, **Data**, **Documentation** — exakt gemäß Anforderung.
- `/api/status` (`backend/services/statusService.mjs`) liefert jetzt ein vollständiges, **secret-freies** Payload (nur Booleans, ENV-Namen, Metadaten). Quellen: `secretManager.status()`/`validate()`, `keyVault.isKeyVaultConfigured()`, RBAC-Mirror, `syncService.getSyncMeta()`. Niemals `consume()` — keine Werte, keine Connection-Strings, keine SAS-Tokens, keine Stacktraces im Body.
- Fehlende Felder werden defensiv als "Not configured" angezeigt; fehlt das Backend, bleibt der Dialog dank lokaler Fallbacks (Version, Build, Backup, PROJECT_INFO) voll bedienbar.
- Fehlende ENV-Variablen werden in Sektion 4 und 5 ausschließlich mit **Namen** als Chips dargestellt — keine Werte, keine Previews.
- `useSystemStatusHealth` gibt das komplette Payload typisiert weiter (`SystemStatusPayload`); Startvalidierung (`bootstrapSystemStatusCheck`) und 3-s-Timeout bleiben unverändert.
- Handbuch-Kapitel „Systemstatus" auf neue 7-Sektionen-Struktur aktualisiert (`lastUpdated: 2026-06-29`).

## 1.18.0 - 2026-06-28

- RBAC-Modell eingeführt (Prompt 7): 7 Rollen (System-Administrator, Administrator, Teamleiter, Projektmanager, Systemingenieur, Kunde, Viewer) und 14 atomare Permissions (`dashboard.view`, `documentation.view`, `systemstatus.view`, `project.edit`, `workpackage.edit`, `activity.edit`, `azure.connection.test`, `azure.export`, `azure.import`, `azure.database.build`, `backup.restore`, `users.manage`, `roles.manage`, `auditlog.view`).
- Frontend-Matrix `src/lib/rbac/permissions.ts` (Single Source of Truth) + Hook `usePermission` + UI-Komponente `PermissionGate`. Backend-Mirror in `backend/services/rbac.mjs` für spätere Server-Guards.
- Invarianten (Check 7): `azure.database.build` nur System-Administrator; `azure.import` ⊆ {sysadmin, admin}; Import-Träger ⊆ Export-Träger; `roles.manage` nur sysadmin; `viewer` read-only; `customer` ohne Admin-/Status-Zugriff. CI-Skript `scripts/check-rbac.mjs` (npm script `rbac:check`) vergleicht Frontend- und Backend-Matrix und verifiziert alle Invarianten.
- Sicherheits-Härtung User-Management: letzter aktiver System-Administrator kann nicht degradiert, deaktiviert oder gelöscht werden; Rollen-Select im UserEditor ist außerhalb `roles.manage` gesperrt und blendet die SysAdmin-Rolle aus.
- Einmalige Migration: bestehender Default-Administrator wird beim Start auf `systemadministrator` angehoben (Flag `northbit-rbac-migrated-v1`).
- Entra-ID-Readiness: `config/roleResolver.mjs` mit `resolveRoleFromGroups()` (Least-Privilege-Fallback `viewer`) plus Beispiel-Mapping `config/entraMapping.example.json`. Entra liefert nur Identität; die interne Matrix bleibt autoritativ.

## 1.17.8 - 2026-06-27

- Secret-Management-Check (Check 4) bestanden: alle ENV-Zugriffe laufen über `config/secretManager.mjs`; `src/routes/api/sync.ts` nutzt jetzt `getEnv("SYNC_TRIGGER_TOKEN", false)` statt direktem `process.env`-Zugriff. Kein Secret im Frontend-Bundle, keine Werte in Logs/Responses.
- `config/envValidator.mjs` wieder eingeführt als reine Kompatibilitäts-Fassade (Re-Export aus `secretManager`) — semantischer Name, ohne Duplikate.
- `config/keyVault.mjs` als Architektur-Platzhalter hinzugefügt (`isKeyVaultConfigured`, `resolveSecret`). Aktivierung benötigt später nur `AZURE_KEY_VAULT_URL` plus Azure-Pakete; ENV-Pfad bleibt Default-Fallback.

## 1.17.7 - 2026-06-27

- Konsolidierung: `config/envValidator.mjs` entfernt; Validierung wandert als `validate()` in `config/secretManager.mjs`. Single Source of Truth für die Liste der Azure-Pflicht-ENVs (`KNOWN` / `REQUIRED_IN_PROD`).
- Aufrufer (`backend/server.mjs`, `backend/services/ensure-env.mjs`) importieren jetzt `validate` aus `secretManager`. Verhalten unverändert: PROD-Fail-Fast, DEV-Warnung, keine Werte im Log.
- Handbuch-Kapitel „ENV-Validierung & Production-Gating" und Backend-Typen aktualisiert.

## 1.17.6 - 2026-06-26

- Zentrale ENV-Validierung: neue Datei `config/envValidator.mjs` mit `isDev()`, `isProd()`, `getEnv(name, requiredInProd)` und `validateEnv()`. Pflicht-ENVs (`AZURE_SQL_CONNECTION`, `AZURE_TABLE_CONNECTION`, `AZURE_STORAGE_SAS`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`) sind nur in PROD zwingend; DEV läuft mit Warnung weiter.
- PROD-Fail-Fast: `backend/server.mjs` ruft `validateEnv()` vor `server.listen(...)`; fehlende Pflicht-ENVs werfen aggregiert und stoppen den Boot. TanStack Server-Routes (`/api/status`, `/api/sync`) nutzen den lazy Guard `backend/services/ensure-env.mjs` und antworten generisch mit 500 „Service not configured" — keine Variablennamen/Werte im Body.
- Logging-Regel: ausschließlich Variablennamen werden geloggt, niemals Werte. Modul ist backend-only und wird nicht aus `src/` importiert.

## 1.17.5 - 2026-06-26

- Offline-Check (Check 2) bestanden: Dashboard startet ohne Azure-Konfiguration, Projekte/Arbeitspakete/Tätigkeiten laufen ausschließlich aus `localStorage`, kein automatischer Azure-Aufruf, `/api/status`-Ausfall blockiert nichts. Architektur unverändert — Bestätigung dokumentiert.
- Neues Handbuch-Kapitel „Offline-Betrieb" mit den sieben Offline-Garantien und klarer Abgrenzung lokal/Backend.
- Systemstatus-Dialog: neue Sektion „Security-Scan" listet Custom-Scanner, Gitleaks und CI-Workflow inkl. Trigger-Plan; Health-Block weist darauf hin, dass `/api/status`-„nicht erreichbar" im Static-Deploy erwartet ist und keinen Funktionsverlust bedeutet.

## 1.17.4 - 2026-06-24

- CI-Security-Scan eingeführt: neuer Workflow `.github/workflows/security.yml` läuft bei Push/PR und montags 03:00 UTC. Erkennt Azure-AccountKeys/SAS-Tokens/Connection-Strings, AWS/Stripe/OpenAI/GitHub-Keys, Private-Key-Blöcke, JWT-Literale, gefährliche CORS-/CSP-/X-Frame-Header und dynamisches `dangerouslySetInnerHTML`. CRITICAL/HIGH blocken den Build.
- Neuer Scanner `scripts/security-check.mjs` (plain Node, keine Dependency) + `bun run security:check`. Schreibt `security-report/findings.json` und `findings.md`, die als GitHub-Actions-Artefakt 30 Tage aufbewahrt werden. Inline-Allowlist via `// security-scan-allow: <regel-id>`.
- Zweite Verteidigung: `gitleaks-action@v2` mit `.gitleaks.toml` (Allowlist für Doku/Lockfiles/Typdeklarationen).
- PRs erhalten automatisch einen Sticky-Comment mit dem Markdown-Report.

## 1.17.3 - 2026-06-24

- Sicherheits-Baseline (Check 1) durchgeführt; Ergebnisse in `.lovable/plan.md` dokumentiert. Keine Secrets/SAS-Tokens/Connection-Strings im Frontend, kein Azure-SDK im Client, generische Fehlerantworten an `/api/*`.
- Logging gehärtet: `src/routes/__root.tsx`, `src/start.ts`, `src/server.ts` loggen nur noch gekürzte Error-Messages (max. 200–256 Zeichen) statt voller Error-Objekte oder Response-Bodies.
- `/api/sync` mit Auth-Gate: In Production erforderlich `X-Sync-Token`-Header gegen Server-Secret `SYNC_TRIGGER_TOKEN`; ohne Secret hart deaktiviert (503). Dev-Modus bleibt offen (nur Mock).
- Zod-Längenlimits in `src/lib/json-schema.ts` (`SHORT_ID`/`SHORT_STR`/`LONG_STR`) gegen unbounded Import-Payloads.
- `src/components/ui/chart.tsx`: Security-Kommentar an `dangerouslySetInnerHTML` (niemals User-Input).
- CI: `bun run lint` ohne `|| true`, damit Lint-Fehler den Build wieder rot machen.

- CI-Workflow (`.github/workflows/ci.yml`) auf Bun umgestellt: `oven-sh/setup-bun@v2` + `bun install --frozen-lockfile`, `bun run lint`, `bun run build`. Behebt den Fehler „Dependencies lock file is not found" beim Setup-Node-Schritt (Projekt nutzt `bun.lock`, keine `package-lock.json`).

## 1.17.1 - 2026-06-23

- Systemstatus-Layout responsiv überarbeitet: Label/Wert als Grid (1 Spalte mobil, 2 Spalten ab `sm`), lange URLs/IDs brechen via `overflow-wrap: anywhere` um, kein horizontales Scrollen mehr.
- Maximieren-/Minimieren-Button im Dialog-Header: schaltet auf vollflächige Ansicht (100vw/100dvh) mit zweispaltigem Sektions-Layout ab `lg`; Reset beim Schließen.

## 1.17.0 - 2026-06-23

- Systemstatus repariert: Repository zeigt jetzt fest `bmarnau/sysingdashboard` mit Link auf https://github.com/bmarnau/sysingdashboard (statt "nicht verbunden" wegen fehlendem `git` in der Sandbox). Commit-SHA wird separat als optionales Feld geführt.
- Neue Sektion "Lovable-Deployment" im Systemstatus mit Published-URL (https://sysingdashboard.lovable.app), stabiler Preview-URL, Editor-Link und Projekt-ID.
- Laufzeit-Aktualitätscheck: `bootstrapSystemStatusCheck()` triggert beim Start einmalig `GET /api/status` (Timeout 3 s, flüchtig, kein Polling). Anzeige "Zuletzt geprüft" und "Jetzt prüfen"-Button im Dialog.
- Neue Single Source of Truth `src/lib/project-info.ts` für Repo- und Deploy-Pfade (per `VITE_PROJECT_GITHUB_URL` / `VITE_LOVABLE_PUBLISHED_URL` / `VITE_LOVABLE_PROJECT_ID` überschreibbar).

## 1.16.0 - 2026-06-22

- Backend-API jetzt auch im Lovable-/Cloudflare-Deployment erreichbar: TanStack-Server-Routes \`src/routes/api/sync.ts\` (POST) und \`src/routes/api/status.ts\` (GET) importieren dieselben framework-freien Services aus \`backend/services/\` wie der lokale Standalone-Server.
- Module auf ESM vereinheitlicht: \`config/env.mjs\`, \`config/secretManager.mjs\`, \`backend/services/_.mjs\`, \`backend/routes/_.mjs\`, \`backend/server.mjs\`. Lokal weiterhin via \`node backend/server.mjs\` startbar. Eine Quelle für Sync-/Status-Logik.

## 1.15.0 - 2026-06-22

- Backend-API-Gerüst unter \`/backend\` (Node-HTTP-Server, ohne Dependencies): \`POST /api/sync\` und \`GET /api/status\` mit Trennung Routes/Services. Im development-Mode liefert der Sync ausschließlich Mock-Daten, Azure-Zugriffe sind via \`config/env.mjs\` blockiert. Status meldet Modus, Secret-Verfügbarkeit (maskiert) und letzten Sync-Lauf.
- Hinweis: \`backend/server.mjs\` läuft nur lokal (\`node backend/server.mjs\`); für das Cloudflare-Deployment übernehmen die TanStack-Server-Routes dieselbe Aufgabe.

## 1.14.0 - 2026-06-20

- JSON-Import Stufe 2: vierstufiger Wizard (Datei → Vorschau → Mapping → Ausführung) mit Diff pro Bereich, drei Konflikt-Strategien (Merge/Überschreiben/Behalten), Pre-Snapshot der betroffenen Storage-Keys und automatischem Rollback bei Fehler.
- Benutzer-Mapping (engineerId → bestehender User / neu anlegen / überspringen); im Single-Engineer-Modus wird der Schritt übersprungen und eingehende IDs dem aktiven Benutzer zugeordnet.
- Kunden-Mapping mit automatischer Duplikat-Erkennung (Normalize-Schlüssel + Levenshtein ≤ 2) gegenüber bestehenden \`project.client\` / \`workPackage.client\`-Werten.
- Konfliktregel \`timeEntries\` > \`activities\`: Datum/Dauer/Stundensatz/Abrechnungsstatus/Beschreibung werden aus \`timeEntries\` übernommen; Abweichungen erscheinen als Warnung im Protokoll.
- Persistiertes Import-Protokoll (IndexedDB, Default 90 Tage) mit Zeitstempel, Counts, Warnungen, Konflikten, Mapping-Entscheidungen und Snapshot-ID; Rollback und Löschen direkt aus der Tabelle.
- ZIP-Backup bettet jetzt eine kanonische \`dashboard.json\` (Schema v1) ein — vorbereitend für einen schemavalidierten Restore-Pfad. Alte ZIPs bleiben uneingeschränkt lesbar.
- Sensible Felder werden beim Import VOR der Validierung entfernt (Defense in depth gegen manipulierte Dateien).
- Tests: `bun run test:examples` erweitert um Import-Round-Trip (jede Beispieldatei → buildPlan → applyPlan in einen In-Memory-Mock und zurück).
- Handbuch-Kapitel „Import / Export (JSON)" um Wizard, Mapping, Konfliktregeln, Protokoll und eingebettete dashboard.json ergänzt.

## 1.13.0 - 2026-06-19

- Downloadbereich: konfigurierbare Aufbewahrungsdauer (Default 30 Tage, 1–365 einstellbar), automatischer Status „Abgelaufen" beim Öffnen, endgültiges Löschen nach 7 Tagen Karenz, Aktion „Abgelaufene jetzt löschen" und neue Spalte „Ablauf" mit Restzeit.
- CSV-, JSON- und Azure-Table-Exporte werden jetzt tatsächlich erzeugt, automatisch heruntergeladen und im Downloadbereich registriert (vorher nur Konsole).
- Neue Text-Vorschau (`TextPreviewDialog`) für CSV/JSON/NDJSON-Exporte mit Kopier- und Download-Aktion (bis 256 KB Vorschau).
- Eindeutige Dateinamen: die Report-ID (`REP-YYYYMMDD-HHMMSS`) wird in alle Export-Dateinamen (PDF, CSV, JSON, NDJSON) eingebaut und verhindert Kollisionen bei gleichzeitigen Exporten.
- Persistenzschema (`ArchivedExport`) um `expiresAt` und `retentionDays` erweitert — Vorbereitung für eine spätere Cloud-Synchronisation (Tabelle `export_downloads` + Storage-Bucket), Implementierung folgt bei Bedarf.

## 1.12.0 - 2026-06-18

- Servicebereich: neuer Menüpunkt „Import / Export…" (nur Administrator/Teamleiter) mit Tabs JSON Export, JSON Import (Stufe 2), Beispieldateien, Import-Protokoll (Stufe 2), Backup und Schnittstellen-Dokumentation.
- Neues versioniertes JSON-Schema v1 (`json-schema.ts`, Zod): Voll- und Teil-Export, Brückenfelder `project.customerId` und `activity.engineerId`, synthetische Kunden aus `project.client`, Zeitbuchungen als Projektion aus Aktivitäten.
- Services: `JsonExportService` (Voll/Teil-Export, Download-Center-Integration), `JsonSchemaValidationService` (Zod + referenzielle Integritätsprüfung), `ExampleFileService` (sechs deterministische Beispiel-JSONs).
- Sicherheits-Denylist (Passwörter, Tokens, MFA-Secrets, API-Keys) wird vor jedem Export auf Storage-Keys und Feldnamen angewendet.
- Tests: `scripts/test-example-files.mjs` validiert jede Beispieldatei gegen Schema und Referenzen; per `bun run test:examples` ausführbar.
- Handbuch: neues Kapitel „Import / Export (JSON)" plus Erweiterungen in „Backup" und „Servicebereich".

## 1.11.0 - 2026-06-17

- Servicebereich: neuer Menüpunkt „Downloads…" zeigt alle erzeugten Exporte mit Dateiname, Format, Zeitraum, Erstellt am, Erstellt von, Dateigröße, Status und Aktionen (Herunterladen, Vorschau, Löschen).
- Nach jedem PDF-Export wird automatisch ein Download-Eintrag (Status „Fertig") angelegt; fehlgeschlagene Exporte erscheinen mit Status „Fehlgeschlagen" und Fehlermeldung.
- Neuer `ExportDownloadService` (getDownloads / addDownload / updateDownloadStatus / getDownloadUrl / deleteDownload) auf Basis der bestehenden IndexedDB-Ablage.
- Toast-System (sonner) im Root-Layout aktiviert für Erfolg- und Fehlermeldungen.

## 1.10.0 - 2026-06-16

- Servicebereich: neuer Menüpunkt „Systemstatus" zeigt GitHub-Repository, Branch, Commit-SHA, Build-Zeit, Dashboard-/Handbuch-Version und letztes Backup.
- Build-Info (Commit, Branch, Build-Zeit) wird zur Build-Zeit via `vite.config.ts` injiziert.
- GitHub Actions Workflow `ci.yml` (Lint, docs:check, Build) für jeden Push/PR.
- Doku in `docs/CONTRIBUTING.md` und `docs/GITHUB.md` (Branch- und Commit-Strategie, GitHub-Sync).

## 1.9.1 - 2026-06-16

- Änderungshistorie zentralisiert in `CHANGELOG.md`; Dashboard-Version wird automatisch aus der obersten Version übernommen.
- Doku-Sync-Skript `bun run docs:check` prüft Konsistenz zwischen `CHANGELOG.md`, Handbuch und Code.

## 1.9.0 - 2026-06-15

- Backup-Bereich: tägliches automatisches Daten-Backup, manueller Button, Download-Liste, ZIP-Validierung und Protokoll.

## 1.8.1 - 2026-06-15

- Mehrsprachigkeit (i18n) vorbereitet, Standardsprache Deutsch, HTML-lang auf de gesetzt.

## 1.8.0 - 2026-06-14

- Benutzerhandbuch im Servicebereich integriert (modal, suchbar, rollenabhängig, kontextbezogen).

## 1.7.0 - 2026-06-14

- Engineurprofil übernimmt Werte aus dem Arbeitszeitmodell; Zeit-/Stundenfelder gegen Eingabe gesperrt.
