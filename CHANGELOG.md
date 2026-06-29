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
