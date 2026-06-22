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

## 1.15.0 - 2026-06-22
- Backend-API-Gerüst unter \`/backend\` (Node-HTTP-Server, ohne Dependencies): \`POST /api/sync\` und \`GET /api/status\` mit Trennung Routes/Services. Im development-Mode liefert der Sync ausschließlich Mock-Daten, Azure-Zugriffe sind via \`config/env.cjs\` blockiert. Status meldet Modus, Secret-Verfügbarkeit (maskiert) und letzten Sync-Lauf.
- Hinweis: \`backend/server.cjs\` läuft nur lokal (\`node backend/server.cjs\`); fürs Cloudflare-Deployment müssen die Handler zusätzlich als TanStack-Server-Routes gespiegelt werden — die \`backend/services/*\` sind dafür bereits framework-frei.

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
