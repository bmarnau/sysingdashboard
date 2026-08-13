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

## 1.56.0 - 2026-08-14

- **Berichte**: Neuer Servicemenü-Punkt „Berichte…" mit drei rollengeschützten AVKK-Berichten (persönlich, Projekt, Management).
- **Formate**: PDF, Druck, JSON, CSV und Word sind freigegeben; jede Datei landet zusätzlich im Downloadbereich. Excel bleibt als geplante Erweiterung dokumentiert.
- **Corporate Templates**: Kopf-/Fußzeile, Farben und Organisationsangabe kommen aus austauschbaren Vorlagen mit garantiertem neutralem Fallback.
- **Dateinamen**: Einheitliche TDF-Benennung aus Dokumentkennung, Titel, Version und Zeitstempel.
- **Demodaten**: Reproduzierbarer, vollständig fiktiver Systemhaus-Datensatz mit `demo-`-Präfix, idempotent einspielbar und rückstandsfrei entfernbar.
- **Handbuch**: Neues Kapitel „Berichte und Dokumentausgabe".

## 1.55.0 - 2026-08-13

- **AVKK Management**: Neue rollengeschützte Führungssicht (Recht „AVKK-Führungssicht anzeigen") mit Kennzahlen, Handlungsbedarf, Aufgabenübersicht sowie Verantwortungs-, Kompetenz- und Konsequenzauswertung.
- **Drill-down**: Jede Kennzahl und jede Handlungskategorie ist anklickbar und schränkt die Aufgabenübersicht ein; ein Klick auf eine Aufgabe öffnet den vollständigen AVKK-Sachverhalt.
- **Nachvollziehbare Priorisierung**: Reihenfolge und Regeln jeder Kategorie stehen im Klartext in der Oberfläche — keine verborgene Punktzahl.
- **Keine Leistungsbewertung**: Verantwortung wird nur als Zuordnungsstatus, Kompetenz nur je Dimension aggregiert; personenbezogene Ranglisten sind ausgeschlossen (ADR-0027).
- **Bericht (JSON)**: Gefilterter Führungsstand als versionierter Datenvertrag 1.0.0 exportierbar, ohne Personenbezug.
- **Kontextindikatoren**: Als getrennte Ebene konzipiert und dokumentiert (`docs/AVKK-CONTEXT-INDICATORS.md`); es werden derzeit keine Kontextdaten erhoben oder gespeichert.
- **Handbuch**: Neues Kapitel „AVKK Management — Führungssicht"; manueller Abnahmetest in `docs/AVKK-MANAGEMENT-MANUAL-ACCEPTANCE.md`.

## 1.54.0 - 2026-08-12

- **AVKK im Backup**: Jedes ZIP enthält jetzt `avkk.json` (Führungsdaten) und `reference-data.json` (Katalogstand) als reguläre Manifest-Einträge mit SHA-256-Prüfsumme.
- **Geprüfter, aber nicht schreibender Restore**: AVKK-Daten werden vor jedem Schreibvorgang vollständig validiert (Pflichtfelder, eindeutige Kennungen, Subjektbezüge, bekannte Katalogwerte, Katalogversionen) und als Bericht ausgewiesen; sie werden bewusst nicht in die Datenbank zurückgeschrieben (ADR-0026).
- **Quarantäne**: AVKK-Datensätze ohne lokalen Aufgabenbezug erscheinen mit Begründung im Restore-Bericht; fehlt der lokale Bestand, wird die ungeprüfte Lage ausdrücklich gemeldet.
- **JSON-Schema 1.1.0**: Optionaler Block `avkk` samt Katalogwerten, neuer Teil-Export „Nur AVKK-Führungsdaten"; nur für Benutzer mit `avkk.view`.
- **Sicherheitswarnungen bewertet**: Fehlende Löschregeln für AVKK- und Katalogtabellen sowie der Lesezugriff auf `app_settings` sind als bewusste Entscheidungen dokumentiert (ADR-0026) — Löschen bleibt ausgeschlossen, Historisierung ist der Standard.

## 1.53.0 - 2026-08-11

- **Persönlicher AVKK-Arbeitsplatz**: neuer Dashboard-Tab „Mein AVKK" mit Aufgabenliste, Suche, Filtern (gefährdet, kritisch, unvollständig, fällig, überfällig, eigene Verantwortung) und Kennzahlen.
- **Detailansicht** entlang A–V–K–K mit Katalogauswahl aus Reference Data, Speichern über `AvkkService` (Audit + RLS) und ausgeschriebenen Gründen des Frühindikators.
- **Methodik im Arbeitsfluss**: Kurzerklärung je Dimension plus Einstieg „AVKK verstehen" ins Handbuch.
- **Neu**: `src/lib/avkk/workspace.ts` (reine Ableitungslogik), Hooks `useReferenceData`, `useAvkkWorkspace`, `useAvkkDossier`, Doku `docs/AVKK-MANUAL-ACCEPTANCE.md`.
- **Bekannte Grenze**: AVKK liegt serverseitig und ist noch nicht Teil von Backup/JSON-Export (Blocker für Sprint 09).

## 1.52.0 - 2026-08-10

- **AVKK-Datenmodell produktiv**: Tabellen `avkk_subject`, `avkk_responsibility`, `avkk_responsibility_type`, `avkk_competence` und `avkk_consequence` in Supabase angelegt, inklusive Constraints, Indizes, Grants und Audit-Triggern.
- **Reference Data produktiv**: `reference_catalog`, `reference_value` und `reference_value_history` angelegt; Werte werden deaktiviert statt gelöscht, jede Änderung erhöht die Katalogversion und schreibt Historie.
- **Services**: `src/lib/reference-data/` mit Read-Through-Cache (24 h, Kennzeichnung veralteter Stände, expliziter Offlinefehler statt leerer Liste) und `src/lib/avkk/` mit Aggregatladen, Kompetenz-Fortschreibung und abgeleitetem Frühindikator „zugeordnet, aber gefährdet".
- **RBAC/RLS**: Sechs neue Berechtigungen (`avkk.view`, `avkk.edit`, `avkk.responsibility.assign`, `avkk.management.view`, `referencedata.view`, `referencedata.manage`) in Datenbank, Frontend und Backend gespiegelt; alle Policies auf angemeldete Benutzer beschränkt, Ingenieure schreiben nur an eigenen oder ihnen zugeordneten Sachverhalten.
- **Audit**: AVKK- und Katalogänderungen werden ausschließlich durch Datenbank-Trigger in `audit_log` geschrieben; Client-Inserts bleiben blockiert.
- **Tests**: Neue Vitest-Suiten für beide Services sowie ein statischer Sicherheitstest, der Schichtgrenzen und die dokumentierte `avkk_can_write`-Ausnahme absichert.
- **ADR-0025**: Technische Umsetzung, RLS-Modell, Cacheverhalten, Sicherheitsbewertung von `avkk_can_write`, verworfene Alternativen und Migrationspfad zu echter Fremdschlüsselintegrität dokumentiert; `docs/DATA-SCHEMA.md` bildet den tatsächlichen Datenbankstand ab.
- **Bekannte Einschränkungen**: Keine referenzielle Integrität zwischen AVKK-Datensätzen und den weiterhin lokal geführten Aufgabenobjekten (Absicherung über Prüfregeln, Titel-Snapshots und `findOrphanSubjects()`); die Bestands-Statuswerte des Dashboards sind noch nicht nach Reference Data migriert; keine AVKK-Oberfläche (folgt in Sprint 08).

## 1.51.0 - 2026-08-08

- **Phase 2 gestartet**: Beginn der Fachmodellphase; Phase 1 „Technische Plattform" bleibt abgeschlossen (v1.50.0).
- **AVKK-Führungsmodell**: Neues Dokument `docs/AVKK.md` definiert AVKK (Aufgabe, Verantwortung, Kompetenz, Konsequenz) als Führungs- und Steuerungsmethodik inklusive Nutzenbeschreibung, Aufgabentypen, Verantwortungsarten, Kompetenzdimensionen, Konsequenzbewertung, Datenmodellentwurf, RBAC-/RLS-Zielkonzept und Reportvorbereitung.
- **Kontextindikatoren abgegrenzt**: Stress, Belastung und vergleichbare Indikatoren sind ausdrücklich nicht Teil von AVKK, sondern eine spätere, getrennt berechtigte Ebene mit Aggregationspflicht und Datenschutzprüfung.
- **Reference Data**: Neues Dokument `docs/REFERENCE-DATA.md` beschreibt Referenzdaten als allgemeinen Plattformdienst mit Katalogen, Versionierung, Historie, Deaktivierung statt Löschung, Caching und Servicevertrag.
- **Architekturentscheidung**: ADR-0024 „AVKK als Führungsmodell und Reference Data als Plattformdienst" angenommen; ADR-Index um ADR-0023 und ADR-0024 ergänzt.
- **Handbuch**: Neue Kapitel „AVKK — Führungsmodell" und „Referenzdaten" erklären Methodik, Nutzen und Abgrenzung zur Leistungsüberwachung.
- **Project Manifest**: Sprint 07A als abgeschlossen geführt, Sprint 07B (produktive AVKK- und Reference-Data-Implementierung) in die Roadmap aufgenommen, Phase 2 auf „in-progress" gesetzt.

## 1.50.0 - 2026-08-07

- **Abschluss der Infrastrukturphase**: Phase 1 „Technische Plattform" ist abgeschlossen; Phase 2 „AVKK-Fachmodell" ist die nächste Phase (ADR-0023).
- **Architektur**: `docs/ARCHITECTURE.md` vollständig neu aufgebaut — Schichtenmodell, Supabase, RBAC, RLS, Backup/Restore, Project Manifest, Governance, geplante Bausteine (Reference Data, AVKK, Report Service, Microsoft 365, KI-Agenten), Docker- und Azure-Zielarchitektur.
- **Handbuch**: Neues Kapitel „Dialog-Referenz" dokumentiert die zehn bislang nicht beschriebenen Dialoge mit Zweck, Benutzergruppe, Berechtigung, Eingaben, Ergebnis und Besonderheiten; `docs:check` meldet keine offenen Dialoge mehr.
- **Qualität**: Neue Testsuite `src/__tests__/scripts/project-status-validator.test.ts` prüft den Manifest-Validator (gültiges Manifest, YAML-Fehler, Schemaverstoß, doppelte IDs, unbekannter Sprint, Roadmap-Referenz, fehlende Pflichtfelder, Versionskonflikt) und validiert zusätzlich das reale Manifest.
- **Project Manifest**: Neuer Abschnitt `phases` im Manifest und Schema (schemaVersion 1.3.0); Sprint 06B als abgeschlossen geführt, Roadmap und Risiken aktualisiert.
- **Prüfbericht**: Technischer Prüfbericht neu erzeugt und Integrität erneut verifiziert.
- Qualitätsgates repariert: Prettier/ESLint projektweit fehlerfrei (0 Errors), generierte Berichtsartefakte in `.prettierignore`, `report-2.test.ts` typsicher, CI-Workflow-YAML gültig formatiert.
- Technischer Prüfbericht v7 neu erzeugt; Manifest-Nachweise für Governance, Projektmanifest, Layer-Architektur, Backupformat 2.0 und Infrastrukturabschluss ergänzt.

## 1.49.0 - 2026-08-06

- **Project Governance**: Neues verbindliches Regelwerk `docs/PROJECT-GOVERNANCE.md` (Vision, Architekturprinzipien, Definition of Done, Versionierungsregeln, Dokumentenhierarchie).
- **Project Manifest**: `docs/PROJECT-STATUS.yaml` ist formal als Single Source of Truth definiert — beschrieben in `docs/PROJECT-STATUS.md`, geprüft gegen `docs/project-status.schema.json`.
- Neuer Validator `bun run project-status:check`: prüft YAML-Gültigkeit, Schemakonformität, Versionsgleichheit mit dem CHANGELOG, eindeutige IDs, auflösbare Sprint-Abhängigkeiten und Referenzen.
- CI-Gate: Die Manifestprüfung läuft im Static-Job der Pipeline und in `bun run test:full`.
- **Layer-Architektur**: Die Dashboard-Route greift nicht mehr direkt auf die Persistenzschicht zu; Hydration läuft über die Facade `src/hooks/useDashboardPersistence.ts` (Tech-Debt-Finding `td-layer-d1e551ce`).

## 1.48.0 - 2026-08-05

- **Backupformat 2.0**: `manifest.json` enthält jetzt eine vollständige Zuordnungstabelle `entries[]` (logischer Name, Storage-Key, Speicheradresse, SHA-256-Prüfsumme, Größe, Dateityp, Zeitstempel).
- Dateinamen im Archiv haben keine fachliche Bedeutung mehr — die Wiederherstellung arbeitet ausschließlich über das Manifest; Originalschlüssel werden unmaskiert exakt zurückgeschrieben.
- Manifestbasierte Integritätsprüfung: fehlende oder verwaiste Dateien, falsche Prüfsummen, falsche Größen, unplausible Dateitypen sowie doppelte Storage-Keys/logische Namen brechen den Restore vor jedem Schreibvorgang ab.
- Ältere Backups (Manifest ohne `entries[]`) bleiben lesbar; die Zuordnung wird intern migriert und als Warnung im Restore-Protokoll ausgewiesen.
- Neue Module `src/lib/backup/checksum.ts` und `src/lib/backup/manifest.ts`; ADR-0022 ergänzt. Handbuchkapitel „Backup" aktualisiert.

## 1.47.0 - 2026-08-03

- **Backup-/Restore-Service modularisiert** (verhaltensneutral): `src/lib/backup-service.ts` (1083 Zeilen) aufgeteilt in `src/lib/backup/` mit `constants`, `storage`, `snapshot`, `templates`, `zip`, `integrity`, `audit`, `rollback`, `merge`, `restore`, `create-backup`, `types`, `index`.
- Öffentliche API und alle bestehenden Importpfade unverändert — `src/lib/backup-service.ts` bleibt als reine Fassade erhalten.
- Secret-Filterung (Allowlist/Denylist) und Rollback-Logik liegen jetzt in eigenen, isoliert prüfbaren Modulen; jedes Modul unter der 500-Zeilen-Schwelle.
- Neue Entscheidung **ADR-0021**; ADR-0019 um den Umsetzungsstand ergänzt.

## 1.46.0 - 2026-08-03

- **Entwicklungstagebuch** im Servicemenü (`Service → Entwicklungstagebuch…`): Vision, Managementübersicht, Zeitstrahl Idee→Prototyp→MVP, Sprintübersicht bis heute, Schwierigkeiten und Architekturentscheidungen — sichtbar mit Berechtigung `documentation.view`.
- Einzige Quelle ist `docs/ENTWICKLUNGSTAGEBUCH.md`; die Datei wird zur Build-Zeit eingelesen, keine zweite Kopie im Code und keine Datenbanktabelle.
- Neuer sicherer Markdown-Renderer `src/lib/markdown/render-basic.tsx` (Überschriften, Listen, Tabellen, Codeblöcke, Fettdruck) ohne externe Bibliothek und ohne HTML-Injektion.
- Dialog mit Kapitelnavigation und Kapitel-Suche; Handbuchkapitel „Entwicklungstagebuch" ergänzt.

## 1.45.0 - 2026-08-02

- **Automatische Abmeldung bei Inaktivität** (Standard 5 Minuten): Überwachung von Maus-, Tastatur-, Scroll- und Touch-Aktivität im geschützten Bereich; Vorwarndialog mit Countdown, „Angemeldet bleiben" und „Jetzt abmelden".
- Tab-übergreifende Synchronisierung über `BroadcastChannel` (Fallback: `storage`-Event) — es werden ausschließlich Zeitstempel und ein Logout-Signal übertragen, niemals Tokens.
- Neuer zentraler Logout (`src/lib/session/logout-service.ts`) für manuelle und automatische Abmeldung inkl. Bereinigung lokaler Sitzungsreste; Backend-Fehler verhindern die lokale Abmeldung nicht.
- Servicemenü: neue Einträge **Abmelden** und **Automatische Abmeldung…**; Anmeldeseite zeigt den Grund „Inaktivität" mit dem wirksamen Minutenwert.
- Neue Systemeinstellung `app_settings.idle_timeout_minutes` (1–480 Minuten); Änderung nur mit Berechtigung `users.manage`, serverseitig per Datenbank-Regel erzwungen und im Prüfprotokoll erfasst.
- Neue Umgebungsvariable `VITE_IDLE_TIMEOUT_MINUTES` als Fallback; ungültige Werte werden verworfen, eine Deaktivierung ist nicht möglich.
- Dokumentation: neues Handbuchkapitel „Automatische Abmeldung bei Inaktivität", `docs/SESSION-TIMEOUT.md`, ADR-0020.

## 1.44.3 - 2026-08-01

- **Vollständiger PDF-Druck des technischen Prüfberichts**: Der Bericht wird beim Drucken über ein Portal in ein eigenes Root (`#technical-report-print-root`) direkt am `body` gerendert (`ComplianceReportPrint.tsx`) und ist damit vom Dialog-Layout (fixed/overflow) entkoppelt. Enthalten sind alle 11 Abschnitte inkl. sämtlicher Findings und Maßnahmenliste.
- Druck-Trigger in `TechnicalReportDialog.tsx` gehärtet: `cancelled`-Guard gegen React StrictMode (kein doppeltes `window.print()`), zwei `requestAnimationFrame` vor dem Druck, `afterprint`-Listener plus 1500-ms-Fallback für zuverlässiges Aufräumen.
- Print-Stylesheet: Body-Klasse `printing-compliance` blendet die App-Shell aus, statt den Portal-Container über `:not(:has())` mit zu verstecken (Ursache des leeren Ausdrucks).
- Tech-Debt-Detektor `console-usage` nutzt jetzt dieselbe Zeilen-Regex wie das CI-Gate (`CONSOLE_LINE_RE`) und das Schema-Vokabular `Informational`/`Niedrig` — keine Schema-Fehler und keine Fundstellen mehr aus Dokumentationstexten.
- Neues Script `bun run typecheck` (`tsc --noEmit`) für die finale Qualitätsprüfung.
- Handbuch-Kapitel „Technischer Prüfbericht" um den Druckablauf ergänzt; `docs/PRINT-VERIFICATION.md` dokumentiert Architektur und Verifikation.

## 1.44.2 - 2026-07-31

- **Logger-Bereinigung abgeschlossen**: `config/secretManager.mjs` nutzt den Backend-Logger; `bun run lint:no-console` läuft ohne Verstöße (6 dokumentierte Ausnahmen).
- Redaction erweitert (`src/lib/logger.ts`, `backend/services/logger.mjs`): `Server=`, `ConnectionString=`, `Authorization:`, `SharedKey`.
- `scripts/console-policy.mjs` als gemeinsame Richtlinie für CI-Gate und Tech-Debt-Detektor.

## 1.44.1 - 2026-07-30

- Abschluss Sprint 05: `ExportDialog.tsx` von 602 auf 308 Zeilen reduziert (`src/components/export/`, `useExportDialog.ts`).
- Compliance-Ansicht in Teilkomponenten unter `src/components/compliance/` zerlegt.

## 1.44.0 - 2026-07-30

- Sprint 05 – Architektur-Refactoring: `dashboard.tsx` von 3281 auf 978 Zeilen reduziert.
- Neue Module unter `src/components/dashboard/` (constants, keys, formatters, domain, primitives, views/, dialogs/, header/).
- Header zerlegt in `GlobalSearch`, `HelpMenu` und `ServiceMenu` (State jeweils lokal gekapselt).
- `ExportDialog.tsx` von 807 auf 602 Zeilen reduziert; Optionen, Dateinamens-Logik und Vorschau-Panels in `src/components/export/`.
- Keine funktionalen Änderungen — alle 318 Tests unverändert grün.

## 1.43.0 - 2026-07-29

- **Technischer Prüfbericht 2.0 (Sprint 04, Teil 1)**: Schema `2.0.0` mit `id` (UUID pro Lauf), monotoner `version`, `parentReportId`, `integrity.value` (SHA-256 über kanonisch serialisierte Feld-Whitelist) und `releaseStage.{proposed,effective,overridden}`. Kanonische Serialisierung in `scripts/technical-report/canonical.mjs` — Hash ist deterministisch, Zeitstempel/Report-ID/UI-Zustand fließen nicht ein.
- **Unveränderbare Historie**: Jeder Lauf schreibt einen read-only-Snapshot unter `test-report/history/<utc>-<id>.json` und einen Append-only-Index `test-report/history/index.json`. Freigegebene Berichte werden zusätzlich unter `history/released/` gespiegelt (`scripts/technical-report/history.mjs`).
- **Freigabelogik**: `scripts/technical-report/release-gate.mjs` schlägt automatisch `development` → `internal-test` → `pilot` → `production` vor. Manuelle Abweichung via `scripts/technical-report/override.mjs --stage=… --reason=… --ticket=…` mit JSONL-Audit-Log.
- **Erweiterter Vergleich**: `diff` liefert jetzt zusätzlich `severityChanged`, `gateChanged`, `statusChanged` und hervorgehobene `securityRegressions` (neue/wieder aufgetretene sec:-Findings).
- **Deklarative Prüfbereiche**: `sections` (auth, rls, rbac, apiSecurity, operations, tests, backup, dockerPortability, azureReadiness, docs) — Bereiche ohne Scanner werden über `scripts/technical-report/manual-sections.json` versioniert.
- **Finding-Schema erweitert**: `classification` (confirmed/false-positive/accepted-debt/fixed/not-applicable), `gateRelevant`, `rootCause`, `adrRef`, `owner`, `dueDate`, `commitRef` sind jetzt Bestandteil des Modells.
- **UI**: `ComplianceSummary` zeigt Reportversion, effektive Freigabestufe, Integritäts-Hash-Präfix und ein Warn-Panel bei Sicherheitsregressionen oder Freigabe-Override.
- **CLI-Verifikation**: `node scripts/technical-report/verify.mjs` rechnet den Hash nach und liefert Exit 1 bei Mismatch.
- **Tests**: `src/__tests__/technical-report/report-2.test.ts` (11 Tests) deckt Hash-Determinismus, Sortierstabilität, Feld-Ausschluss, Freigabestufen-Vorschlag und Override-Logik ab.
- **Doku**: neue `docs/technical-report-2.md` (Datenmodell, Hash, Historie, Freigabe, Overrides).
- **Refactoring dashboard.tsx / ExportDialog.tsx (Sprint 04, Teil 2)**: nicht in diesem Sprint umgesetzt — siehe Abschlussbericht und ADR-0019 (Akzeptanz bleibt bis 2026-12-31 gültig).

## 1.42.2 - 2026-07-28

- **Login-Regression behoben (Sprint 03B)**: `_authenticated/route.tsx` warf `TypeError: Cannot convert object to primitive value`, weil `location.search` von TanStack als **Objekt** geliefert wird und das Template-Literal `` `${path}${search}` `` scheiterte. Folge: `/dashboard` und jede geschützte Route zeigten die generische Fehlerseite statt einer Weiterleitung nach `/auth`. Neue Hilfsfunktion `buildSafeInternalTarget` serialisiert das Search-Objekt über `URLSearchParams`, hält den Open-Redirect-Schutz (`//`, `/\\`) aktiv und fällt bei leerem Pfad auf `/` zurück.
- **`isRedirect`-Fix**: Der `catch`-Block prüfte per Property `.isRedirect` — das ist keine TanStack-API. Umgestellt auf die exportierte `isRedirect(e)`-Funktion, damit legitime Redirects nicht in den generischen Fallback-Redirect kollabieren.
- **Statusprüfung robuster**: Ein Fehler in `rpc("is_account_active")` (Netzwerk, temporäre RLS-Regression) beendet nicht mehr die gültige Session — die Statusprüfung wird verschoben, der Nutzer bleibt eingeloggt.
- **Regressionstest**: `src/__tests__/routes/authenticated-guard.test.ts` reproduziert den Object-Search-Fall, den Open-Redirect-Schutz und exotische Werte im Search-Objekt (6 Fälle).
- **Playwright-Nachweis (Preview)**: `/dashboard` ohne Session → `302`-artige Client-Redirect nach `/auth?redirect=%2Fdashboard`, keine Konsolen-Errors mehr.

## 1.42.1 - 2026-07-27

- **Auth-Hardening (Open-Redirect-Schutz)**: `_authenticated/route.tsx` sanitisiert `location.href` zu einem sicheren internen Pfad, bevor er als `redirect`-Search-Param an `/auth` weitergereicht wird; Login-Seite verwendet ebenfalls `safeRedirect`. Zusätzlich lehnt der Guard `//`-, `\`- und `javascript:`-Targets ab.
- **SEC-HIGH-LOG-001 behoben**: `src/lib/logger.ts` und `backend/services/logger.mjs` erweitern die Redaction um Wert-Regexes für `AccountKey=`, `SharedAccessSignature=`, `Password=`, `postgres://user:pass@`, `Bearer <token>` sowie `sb_secret_`/`sb_publishable_`-Werte; Schlüsselliste um `connectionString`, `conn`, `dsn`, `sasUrl`, `sasToken` ergänzt.
- **Regressionstests**: Neue Fälle in `src/__tests__/lib/logger.test.ts` (`should_maskConnectionStringsInAnyField`, `should_maskByKeyForConnectionStringField`, `should_leaveHarmlessStringsUnchanged`) verifizieren die neuen Muster; Suite läuft mit 301 Tests grün.
- **Zyklische Abhängigkeit aufgelöst**: Neuer Typ-Split `src/lib/logger.types.ts`; `logger.ts` und `logger.indexeddb.ts` teilen keine bidirektionalen Imports mehr. Cyclic-Detector ignoriert außerdem Self-Loops (Re-Exports).
- **API-Discovery-Präzision**: `scripts/tech-debt/detectors/endpoint-guards.mjs` erkennt jetzt `export const endpointMeta = { public: true, … }`; `src/routes/api/public/auth-config.ts` deklariert diese Metadaten und liefert einheitliche Fehler-Antworten mit `X-Correlation-Id` (Finding td-correlation-err-shape behoben).
- **Compliance-Report neu erstellt**: `test-report/technical-test-report.md`/`.json` regeneriert; 0 offene Critical-, 3 offene High-Findings (Oversize/Dashboard-Refactor als Tech-Debt eingestuft — kein Sicherheitsrisiko).

## 1.42.0 - 2026-07-26

- **Compliance-Dashboard fertiggestellt** (`TechnicalReportDialog`): Management-Summary mit Severity-Kacheln, farbigem Statusband und Quellen-Chips; Trennung technisch vs. organisatorisch vs. akzeptiert über Tabs.
- **Filter & Suche**: Volltextsuche plus Auswahllisten für Severity, Bereich, Kategorie, Status, Bucket und Aufwand mit Reset-Button.
- **Drill-Down pro Finding**: aufklappbare Detailansicht mit vollständiger Beschreibung, Empfehlung, Komponenten-Chips, Evidence-Kopie und Metadaten-Grid.
- **Historie & Diff**: Vergleichs­sektion mit Deltas gegenüber `technical-test-report.prev.json` und klappbaren ID-Listen pro Diff-Bucket.
- **Druckansicht**: „Drucken / PDF"-Button aktiviert `@media print`-Regeln, die ausschließlich den Report-Dialog rendern (Body-Klasse `printing-compliance`).
- **Responsive**: Bereichstabelle als Karten unterhalb `sm`, Filterleiste bricht sauber um, Dialog auf Tablet auf `min(96vw, 56rem)` verbreitert; alle Farben ausschließlich über Design-Tokens (`destructive`, `warning`, `success`, `muted`, `accent`).
- **Modul-Split**: neue Präsentationskomponenten unter `src/components/compliance/` (`ComplianceSummary`, `ComplianceAreaTable`, `ComplianceFilters`, `ComplianceFindingList`, `ComplianceDiff`, `ComplianceHistory`, `types`) — reine UI, keine Fachlogik.

## 1.41.4 - 2026-07-25

- **Auth-Config Runtime-Fallback**: Neuer öffentlicher Endpoint `GET /api/public/auth-config` liefert `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` aus der Server-Runtime. Der Browser-Client bootstrappt darüber, wenn der Publish-Build ohne `VITE_SUPABASE_*` gebaut wurde — behebt die Meldung „Die Anmeldung ist noch nicht konfiguriert" endgültig, unabhängig vom Vite-Inlining.
- **Bootstrap in Auth-Flows**: `index.tsx`, `auth.tsx` und `_authenticated/route.tsx` warten vor der ersten Session-Prüfung auf `loadAuthConfig()`. `safe-client.ts` cacht Fehlerzustände nicht mehr, damit der Runtime-Fallback nach dem Nachladen sofort greift.

## 1.41.3 - 2026-07-24

- **Start-/Health-Reparatur**: `/api/status` hängt nicht mehr an optionaler Azure-Live-Konfiguration. Fehlende Azure-ENV wird secret-frei im Status gemeldet, blockiert aber Anmeldung und App-Start nicht.
- **Critical-Findings aktualisiert**: `/api/sync` trennt Authentifizierung, Berechtigungsprüfung und Payload-Validierung strikt. Anonyme Aufrufe werden vor jeder Sync-Logik mit 401 abgewiesen; Permission-Check läuft über die Datenbankfunktion `has_permission`.
- **Security-/API-Suite nachgezogen**: API Discovery, Smoke-/Functional-Coverage und UI-Tamper-E2E spiegeln die Session-basierte Authentifizierung statt der historischen localStorage-/X-Sync-Token-Grenzen.

## 1.41.2 - 2026-07-23

- **Publish-Build neu erzeugt**: Re-Publish mit im Runner vorhandenen `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` und `VITE_SUPABASE_PROJECT_ID`, damit Vite die Werte statisch in das Client-Bundle inlined. Behebt die Meldung „Die Anmeldung ist noch nicht konfiguriert" auf der veröffentlichten App. Keine Code-Änderung.

## 1.41.0 - 2026-07-20

- **Race-safe Bootstrap**: `handle_new_user()` nimmt `pg_advisory_xact_lock('sysadmin_bootstrap')` vor der Rollenzuweisung — parallele Erstregistrierungen erzeugen genau einen Systemadministrator, alle weiteren `viewer`.
- **DB-Lockout für letzten Sysadmin**: Neue Trigger `trg_protect_last_sysadmin_roles` (auf `user_roles` BEFORE UPDATE/DELETE) und `trg_protect_last_sysadmin_profile` (auf `profiles` BEFORE UPDATE OF status). Herabstufen, Löschen oder Deaktivieren des letzten aktiven Systemadministrators schlägt mit `last_sysadmin_locked` fehl — greift auch bei direktem API-/SQL-Zugriff und ersetzt den bisherigen reinen Client-Guard.
- **Statusprüfung serverseitig**: Neue Funktion `public.is_account_active(uuid)` (SECURITY DEFINER, GRANT nur `authenticated`). `_authenticated`-Gate ruft die RPC nach `getUser()` und meldet inaktive Konten mit `signOut()` + Redirect `/auth?reason=account_inactive` ab.
- **Rollenaudit**: Trigger `trg_audit_user_roles` schreibt jede INSERT/UPDATE/DELETE-Aktion auf `user_roles` in `audit_log` (nur IDs, keine PII); Bootstrap protokolliert `auth.bootstrap`.
- **Auth-Konfiguration**: `Confirm email = on`, `HIBP = on`, `Anonymous signups = off`, `Signups = enabled`.
- **`/auth`-UX**: Signup unterscheidet „Konto existiert bereits" (`identities.length === 0`), „direkt angemeldet" (Session vorhanden) und „E-Mail bestätigen". Neuer `?reason=`-Parameter mit lesbaren Hinweisen (`account_inactive|account_locked|account_archived|unavailable`).
- **Manueller Deploy-Schritt (nicht automatisierbar)**: In Cloud → Users → URL-Konfiguration die erlaubten Redirect-URLs pflegen (mind. `https://sysingdashboard.lovable.app/**` und aktuelle Preview). Dokumentiert in `docs/DEPLOYMENT.md`.

## 1.40.1 - 2026-07-19

- **Startfehler nach Auth-Umstellung behoben**: Landing (`/`) und Auth (`/auth`) starten jetzt in jeder ENV-Situation ohne leeren Bildschirm. Root Cause war ein stale Preview-Build ohne `VITE_SUPABASE_*`-Werte plus fehlende Fehlerabsicherung in der Landing-Page — `checked` blieb bei einem `getSession()`-Reject dauerhaft `false` und der Anmelde-Button war deaktiviert.
- **Neu**: `src/integrations/supabase/config.ts` (`getAuthConfigurationStatus`, `AuthConfigurationError`) — wurf-freie, secret-freie Statusermittlung, weist `sb_secret_*` im Client hart ab.
- **Neu**: `src/integrations/supabase/safe-client.ts` (`trySupabase`) — Fassade um den generierten Proxy-Client; fängt Init-Fehler ab, statt die App-Boundary auszulösen.
- **Landing-Zustandsmaschine** (`checking | authenticated | anonymous | config-error | connection-error`) mit Retry und aktiv bleibendem Anmelde-Button in Anonymous-/Connection-Zuständen.
- **Auth-Seite** fängt alle Auth-Aufrufe (`getSession`, `onAuthStateChange`, Login/Signup/Reset) mit try/catch + Toast ab; sperrt Formulare bei Konfig-Fehler.
- **`_authenticated/route.tsx`** kapselt `getUser()` und leitet bei Netzwerk-/Config-Fehler kontrolliert nach `/auth`, statt zu loopen.
- **`.env.example`** dokumentiert die Supabase-/Cloud-Variablen inklusive Warnung gegen `sb_secret_*` im Client.
- **Tests**: `supabase-config.test.ts` deckt alle vier Statusfälle und die Secret-Key-Ablehnung ab.

## 1.40.0 - 2026-07-18

- **UserManagementDialog gegen Supabase verdrahtet**: Profile, Rollen und Status werden jetzt aus `public.profiles` und `public.user_roles` gelesen bzw. geschrieben (neuer `src/lib/users-supabase-service.ts`). Rollenwechsel via Dropdown ist SysAdmin-only (RLS `user_roles_sysadmin_*`), Statuswechsel (aktiv/archiviert) für Admins. Tab „Profil wechseln" entfällt — mit echter Auth ist Wechsel = Abmelden. Neuanlage/Löschen wurden bewusst entfernt: Registrierung läuft über die Anmeldeseite, Löschen (Auth Admin API) wird eigenständig behandelt.
- **Client-Lockout-Guard** in `setUserRole` verhindert Herabstufung des letzten aktiven Systemadministrators. Ersetzt keinen DB-Constraint — als Sicherheits-Kandidat für Folge-Review vermerkt.
- **Handbuch-Kapitel „Security-Findings akzeptieren (accepted:true)"**: dokumentiert Voraussetzungen, Prozedur, Beispiel-Begründung und Ticket-Format (`SEC-<AREA>-<NNNN>`) für die Pflege von `scripts/security/static-findings.json`. Verlinkt aus „Sicherheits- und RBAC-Tests".

## 1.39.0 - 2026-07-17

- **SEC-CRIT-001 & SEC-CRIT-002 behoben (Lovable-Cloud-Auth aktiv)**: Echte E-Mail/Passwort-Authentifizierung via Lovable Cloud. Neue Tabellen `public.profiles`, `public.user_roles`, `public.audit_log`, DB-Funktionen `has_role`, `has_any_role`, `has_permission` (spiegeln RBAC-Matrix) und Signup-Trigger, der ersten registrierten Nutzer automatisch zum `systemadministrator` macht.
- **Neue Routen**: `/` = öffentliche Landing-Page mit Anmelde-CTA, `/auth` (Login/Signup/Reset), `/reset-password`. Dashboard verschoben nach `/_authenticated/dashboard` mit `ssr:false`-Gate (`beforeLoad` → `supabase.auth.getUser()`, sonst Redirect nach `/auth?redirect=…`).
- **Backend-Härtung**: `/api/sync` verlangt `Authorization: Bearer <supabase-jwt>` UND prüft serverseitig `has_permission(user, 'azure.import' | 'azure.export')`. Der frühere `X-Sync-Token`-Pfad entfällt (schließt SEC-HIGH-AZURE-001 mit).
- **Session-basierte Identität**: `useCurrentUser` liest ausschließlich aus Supabase-Session + `public.profiles`/`user_roles`. `localStorage`-Manipulation (`northbit-active-user`) hat keine Wirkung mehr — Finding im Security-Report auf `accepted:true` gesetzt (Historie bleibt erhalten).
- **Tests**: `manipulation.test.tsx` invertiert (grüner Test = Bug gefixt); `api-direct-call.spec.ts` bleibt als Regressionsschutz; `static-findings.json` dokumentiert Nachweis und Verweise.

- **CI-Integration und Quality Gates (Prompt 2A.10, ADR-0018)**: `.github/workflows/ci.yml` in 14 geordnete Stufen aufgeteilt (Setup → Static → Unit → Backend → API → Security → IO → Backup → Build → E2E → A11y → Debt → Report). `needs:`-Kette stoppt Folgejobs bei frühem Fehler; Concurrency-Cancel für PRs; Bun- und Playwright-Browser-Cache pro Job.
- **Zentraler Quality-Gate**: neues Skript `scripts/ci/quality-gate.mjs` (Script `bun run ci:gate`) liest ausschließlich `test-report/technical-test-report.json` → neues Feld `blockers[]`. Blocker-Definition ist damit einmal in `scripts/technical-report/build.mjs` gepflegt (Single Source of Truth).
- **Harte Blocker** exakt gemäß Prompt: fehlgeschlagener Build, TypeScript-Fehler, Critical Finding (jede Kategorie), High Security Finding, Datenintegritätsfehler, offener privilegierter Endpoint, Secret Leak, fehlgeschlagener RBAC-Lockout-Test, fehlgeschlagener Backup-/Restore-Kerntest, fehlender Pflichtbereich (Security/Backup/Docs).
- **Warn-Only**: Accessibility, Technical Debt und Performance-Delta blockieren nicht (Jobs mit `continue-on-error`).
- **Technischer Prüfbericht** um Kapitel 9 „Quality-Gate-Blocker" erweitert; Schema-Version 1.1.0.
- **Tests**: `src/__tests__/ci/quality-gate.test.ts` (8 Fälle, deckt alle Blocker-Kategorien + Grün-Pfad + Fehlformate ab); neues Script `test:ci-gate`.
- **Handbuch**: neues Kapitel „CI-Pipeline und Quality Gates" (`DOCUMENTATION_VERSION` → 1.17.0).

## 1.37.0 - 2026-07-15

- **Zentraler technischer Prüfbericht (Prompt 2A.8, ADR-0017)**: neuer Aggregator `scripts/technical-report/build.mjs` fasst Security-, API-, Backup-Integritäts-, Tech-Debt-, Ops- und Docs-Berichte zu `test-report/technical-test-report.{json,md}` zusammen. Einheitliches Finding-Schema mit ID-Namespace (`sec:`, `api:`, `backup:`, `td:`, `ops:`, `docs:`, `man:`), Vergleich zum Vorbericht (`.prev.json`), sortierte Maßnahmenliste (14 Buckets), Freigabeempfehlung (6 Stufen), Soft-Gate analog ADR-0013/0016.
- **UI**: neuer `TechnicalReportDialog.tsx` im Servicemenü unter „Systemstatus". Lädt den Bericht per `?raw`-Import (kein localStorage als Primärquelle, kein Runtime-Fetch), zeigt Prüfidentität, Ampel-Gesamtstatus, Bereichstabelle, Diff-Summary und filterbare Finding-Liste (Severity/Bereich).
- **Manuelle Findings**: `scripts/technical-report/manual-findings.json` (versioniert, `source=manual` — sichtbar vom Aggregator-Namespace `auto` unterschieden).
- **Neue npm-Scripts**: `report:technical`, `report:technical:ci`.
- **CI**: neuer Step „Technical report" schreibt `test-report/technical-test-report.{json,md}` in das bestehende `test-report`-Artefakt.
- **Handbuch**: Kapitel „Technischer Prüfbericht" (`DOCUMENTATION_VERSION` → 1.16.0).

## 1.36.0 - 2026-07-14

- **Performance-, Build- und Betriebsprüfung (Prompt 2A.7, ADR-0016)**: neue Scripts unter `scripts/ops/` (`build-checks.mjs`, `bundle-report.mjs`, `ops-checks.mjs`, `report.mjs`) mit konsolidiertem `test-report/ops-report.{json,md}` und Baseline-Datei `test-report/ops-baseline.json`. Baselines statt harter Grenzwerte, Warnschwelle bei Delta > 20 %.
- **E2E-Suiten** für Startzeit (`e2e/perf/startup.spec.ts`), Dialog-Loop-Stabilität (`e2e/stability/dialog-loop.spec.ts`) und Health/Payload/Fehlerhygiene (`e2e/ops/health.spec.ts`). Rohwerte in `test-report/perf-raw.json`, `stability-raw.json`, `ops-checks.json`.
- **Kompatibilitäts-Matrix opt-in**: `playwright.config.ts` schaltet Firefox (`RUN_FIREFOX=1`), WebKit (`RUN_WEBKIT=1`) und Mobile-Chrome (`RUN_MOBILE=1`) hinzu — Chromium bleibt Default.
- **Bundle-Analyse erweitert**: Trend-Vergleich, Heavy-Lib-Heuristik im Initial-Bundle, Duplikat-Erkennung via `bun pm ls`.
- **Sicherheits-Härtung `/api/status`**: `azure.missingEnv` liefert in PROD nur noch `missingEnvCount`; ENV-Namen bleiben DEV-only. Namen sind ein Infrastruktur-Fingerabdruck.
- **Neue npm-Scripts**: `test:ops`, `ops:build`, `ops:bundle`, `ops:checks`, `ops:e2e`, `ops:report`.
- **Handbuch**: Kapitel „Performance-, Build- und Betriebsprüfung" (`DOCUMENTATION_VERSION` → 1.15.0).

## 1.35.0 - 2026-07-13

- **Backup-, Restore-, Import- und Export-Test-Suite (Prompt 2A.6, ADR-0015)**: neue Vitest-Suiten unter `src/__tests__/backup/` (create, integrity, restore) und `src/__tests__/io/` (import.suite, export.suite) mit deterministischen Fixtures (`src/__tests__/fixtures/backup.ts`) für gültige, beschädigte, unvollständige und version-inkompatible Backups.
- **`restoreFromZip()` in `src/lib/backup-service.ts`** (additiv): transaktionale Wiederherstellung mit Modi `empty`/`overwrite`/`merge`, Pre-Snapshot-Rollback bei Fehlern, Actor-/Herkunftsfeldern und Restore-Protokoll (`backup:restoreLog`, max. 100 Einträge). Weist beschädigte ZIPs, falsche Projektnamen, inkompatible MAJOR-Versionen und sensible Feldnamen ab, ohne einen Teilzustand zu hinterlassen.
- **Integritätsbericht**: `scripts/backup-integrity/report.mjs` aggregiert die Vitest-JSON-Ausgabe nach Kategorien (backup/restore/import/export), erzeugt `test-report/backup-integrity-report.{json,md}` mit Schweregrad-Empfehlungen und dokumentiert bekannte Grenzen (keine Prüfsumme, PDF nur strukturell, RBAC clientseitig).
- **Neue npm-Scripts**: `test:backup:integrity` (Suite + Report).

## 1.34.1 - 2026-07-13

- **API Discovery — `endpointMeta`-Selbstdeklaration**: Routen können jetzt per `export const endpointMeta = { public: true, reason: "…" } as const;` explizit ihre Klassifizierung setzen (Felder: `public`, `authRequired`, `permission`, `classification`, `reason`). `endpointMeta` gewinnt vor Contract-Registry und Heuristik. `/api/status` nutzt dies als erste Route — das Medium-Finding `unclassified-endpoint` entfällt dort.
- **Neues Finding** `public-without-reason` (LOW): Wenn `endpointMeta.public = true` gesetzt ist, aber `reason` fehlt, wird die stille Ausnahme sichtbar gemacht.
- **Discovery Self-Tests** erweitert (10/10 grün): Extraktion von `endpointMeta`, Vorrang von `meta.classification`, Unterdrückung des Unclassified-Findings, Erzeugung des Public-without-reason-Findings.
- **ADR-0014 Amendment**: dokumentiert die additive Aufnahme des Konventions-Meta-Export (ehemals verworfene Option C) als opt-in ergänzend zur Regex-Heuristik.
- **Handbuch** Kapitel „API Discovery" um Abschnitt „Endpoint-Selbstdeklaration (`endpointMeta`)" ergänzt.

- **API Discovery Framework (ADR-0014)**: neues Framework unter `scripts/api-discovery/` erkennt aktive Server-Routen (`src/routes/api/**`) automatisch per statischer Analyse und schreibt das deterministische Inventar nach `test-report/api-inventory.json`. Archivierte Verzeichnisse (`archive/**`) und Tests werden strikt ausgeschlossen; Imports aus `archive/**` in aktiven Routen erzeugen ein Critical-Finding.
- **Discovery-Analyzer** erkennen HTTP-Methoden, `withCorrelation`-Wrapper, Zod-Validierung, Auth-Guards (`checkAuth`, `X-Sync-Token`, `requireSupabaseAuth`), Permissions, Logger-Nutzung und destruktive Wirkung. Endpoints werden als `public | authenticated | privileged | unclassified` klassifiziert.
- **API Smoke-Suite** (`src/__tests__/api/smoke/smoke.test.ts`): iteriert das Inventar, prüft Handler-Existenz, korrekte 4xx-Antwort auf ungültige Methode/JSON, secret-freie Responses (JWT/SAS/Connection-String/Stacktrace), Correlation-ID-Header. Rohdaten → `api-smoke-raw.json`, aggregiert → `api-smoke-report.json`.
- **API Functional-Coverage** (`src/__tests__/api/functional/functional.test.ts`) dokumentiert je Endpoint fachlichen Zweck, positive/negative Fälle, Auth/Scope/Validation/Idempotency/Audit und explizite Gaps. `complete | partial | missing | blocked | not-applicable`; `skipped/not-implemented/not-configured` werden **niemals** als `passed` gewertet.
- **Discovery Self-Tests** (`src/__tests__/api-discovery/discovery.test.ts`) mit synthetischen Fixtures für neu/entfernt/archiviert/dynamischer Parameter, deterministische Sortierung und Finding-Kategorien.
- **CI**: neuer Job-Block `API discovery` (Inventar → Smoke → Functional → Report → soft Gate) direkt hinter den Contract-Tests. Artefakte `api-inventory.json`, `api-smoke-report.json`, `api-functional-report.json`, `api-findings.md` werden über den bestehenden `test-report`-Upload mitgeschickt.
- **Handbuch**: neues Kapitel „API Discovery und Testabdeckung" (Kategorie Service) inkl. Bedeutung der Klassifizierungen, Aufbau der drei Artefakte, Unterschied Smoke vs. Functional, Umgang mit archivierten Routen und CI-Gate-Verhalten. `DOCUMENTATION_VERSION` auf **1.13.0** angehoben.
- **docs/API.md** ergänzt um Discovery-Hinweis: manuelle Endpoint-Tabelle bleibt, verweist aber jetzt auf das automatisch erzeugte Inventar als Wahrheitsquelle.
- **ADR-0014** dokumentiert die Entscheidung für regex-basierte statische Analyse gegenüber Konventions-Meta-Export.

## 1.33.0 - 2026-07-13

- **Sicherheits-, RBAC- und Auth-Test-Suite (ADR-0013)**: neue Vitest-Suite unter `src/__tests__/security/` (rbac-v1, rbac-v2, manipulation, logging, source-scan) und E2E-Specs unter `e2e/specs/security/` (ui-gate-tamper, api-direct-call). Prüft FE↔BE-Parität der RBAC-Matrix, Sysadmin/Admin-Lockout, verbotene Berechtigungen, Scope-Kanonisierung und -Inklusion, abgelaufene/revokierte Assignments, Zod-Reject bei Import-Injection, Logger-Redaction (Frontend + Backend) und statische Quellcode-Scans (direkte `role===`-Vergleiche außerhalb `src/lib/rbac`, Auth-Token-Persistenz in localStorage).
- **Ehrliches Findings-Gate statt grüner Platzhalter**: `scripts/security/static-findings.json` listet Design- und Infrastruktur-Lücken, die strukturell nicht via Test grün werden können (Backend hat keine RBAC-Middleware, Rolle nur in localStorage, kein produktiver Auth-Provider, Connection-Strings entgehen der Logger-Redaction). `scripts/security/release-rules.mjs` codiert Severity→Release-Wirkung; `scripts/security/security-report.mjs` erzeugt `test-report/security-report.{md,json}` und `security:gate` failed CI bei offenen Critical-Findings.
- **CI**: neuer Job-Step `Security suite` + `Security report` (Artefakt) + `Security release gate`. Report läuft `if: always()`, Gate blockiert nur bei tatsächlichen Blockern.
- **Handbuch-Kapitel** „Sicherheits- und RBAC-Tests" (Kategorie Service) inkl. Abdeckung, Grenzen, Release-Regeln und expliziter Nicht-Zertifizierungsklausel. `DOCUMENTATION_VERSION` auf **1.12.0** angehoben.
- **ADR-0013** dokumentiert die Entscheidung, Lücken als strukturierte Findings mit Release-Gate zu führen, statt sie durch Skip-Tests oder Platzhalter-Assertions zu verstecken.
- **Backend-Typings**: `backend/services/rbac.d.mts` schließt die letzte Lücke für strikt getypte Tests gegen die Backend-Rechte-Matrix.

## 1.32.0 - 2026-07-13

- **Zentrale Correlation-ID** für alle aktiven API-Routen (`/api/status`, `/api/sync`). Neuer Wrapper `withCorrelation` in `src/lib/correlation-context.server.ts` nutzt `AsyncLocalStorage`, um pro Request eine ID durch den gesamten Server-Baum zu propagieren; Utilities (`generateCorrelationId`, `isValidCorrelationId`, `acceptOrGenerateCorrelationId`) in `src/lib/correlation.ts`. Format: UUID v4 (default) oder eingehende Client-ID, sofern sie `^[A-Za-z0-9._-]{8,64}$` erfüllt — sonst wird sie verworfen und eine neue erzeugt.
- **Response-Header `X-Correlation-Id`** wird auf jeder Antwort gesetzt (auch bei Fehlern) und kann vom Handler nicht überschrieben werden. Strukturierte Fehler-Response (`{ ok:false, code, message, correlationId, timestamp }`) via `jsonErrorWithCorrelation` — kein Stack, keine Provider-Details.
- **Backend-Logger** (`backend/services/logger.mjs`) reichert jeden Eintrag additiv um `correlationId`, `route`, `method` und `durationMs` an, sofern ein Request-Kontext aktiv ist. Bestehende `logger.info/warn/error`-Aufrufe funktionieren unverändert.
- **Frontend**: `useSystemStatusHealth` liest den Header und speichert die letzte Referenz-ID. `SystemStatusDialog` zeigt sie sichtbar an, inkl. Copy-Button und Anzeige im Fehlerfall. `LogViewerDialog`-Suche findet Einträge auch nach `correlationId`.
- **Tests**: neue Suite `src/__tests__/api/correlation.test.ts` (Utils, Wrapper, Header-Handling, parallele Requests, Fehler-Shape, Logger-Enrichment) und E2E `e2e/specs/correlation.spec.ts` gegen den Dev-Server. Contract-Schemas (`endpoints.ts`) erwarten das neue Feld.
- **Tech-Debt-Detektor** `correlation-id.mjs`: markiert neue TSS-Routes ohne `withCorrelation`, unstrukturierte Fehlerantworten und ungeprüften Rohzugriff auf den Client-Header.
- **Systemstatus**-Abschnitt „Sicherheit" ergänzt um `correlationId.middlewareActive` / Anzahl unterstützter Routen. Handbuch-Kapitel „Correlation-ID & Nachverfolgung" hinzugefügt, `DOCUMENTATION_VERSION` auf **1.11.0**.

## 1.31.0 - 2026-07-13

- **UI- und End-to-End-Test-Suite (ADR-0012)**: Playwright-Suite unter `e2e/specs/` mit sieben Bereichen — Navigation, Dashboard, Servicemenü, Fehlerzustände, Responsive, Accessibility (axe-core WCAG 2.1 A/AA), RBAC (datengetriebene Rollen-Matrix über alle 7 Rollen + Backend-Denial gegen direkte HTTP-Requests). Läuft gegen den lokalen Dev-Server, Chromium-only.
- **Rollen-Fixture** (`e2e/fixtures/roles.ts`) seedet Benutzer und aktive Rolle vor jedem Test in `localStorage`; Storage wird nach jedem Test gelöscht (Test-Isolation). Für Accessibility gibt es einen `@axe-core/playwright`-Wrapper (`e2e/fixtures/axe.ts`).
- **Reports** unter `e2e/reports/`: `ui-matrix.md` (UI-Funktion ↔ Testfall, manuell gepflegt), `untested.md` (bewusste Lücken), `test-report.md` (auto-generiert via `scripts/generate-e2e-report.mjs` aus dem Playwright-JSON). Alle drei plus HTML-Report werden in CI als Artefakte hochgeladen.
- **CI**: neuer Playwright-Browser-Cache (`actions/cache@v4` auf `~/.cache/ms-playwright`) senkt die Job-Laufzeit; neuer Report-Step läuft `if: always()`. Neue Scripts `test:e2e:ui` (lokal headed) und `test:e2e:report`.
- **Handbuch-Kapitel** „UI- und End-to-End-Tests" (Kategorie Service) inkl. Ausführung, Reports, Werkzeug-Entscheidung und Grenzen (Rollen-Sichtbarkeit ist kein Sicherheitsnachweis). Verlinkt in „test-instance", „api-endpoint-tests", „barrierefreiheit", „system-status". `DOCUMENTATION_VERSION` auf **1.10.0** angehoben.
- **ADR-0012** dokumentiert die Entscheidungen Dev-Server statt Wrangler-Preview, Chromium-only, client-seitiges Rollen-Seeding und die daraus folgenden Grenzen.

## 1.30.0 - 2026-07-13

- **API- und Endpoint-Test-Suite (ADR-0011)**: Contract-first Registry unter `src/__tests__/api/registry/` — jede Server-Route ist ein `EndpointContract` mit Pfad, Methoden, Auth-Flag, Zod-Schemas und `loadRoute()`. Der generische Runner `src/__tests__/api/runner.test.ts` iteriert die Registry und erzeugt pro aktivem Endpoint dieselben Kategorien: Grundfunktion (Methoden, Content-Type, Statuscode, Response-Schema), Payload-Varianten (ungültiges JSON, leerer Body, 1 MB Oversize, unerwartete Felder, Injection-nahe Eingaben), Security-Scan (JWT/Bearer/Connection-String/SAS/Stacktrace im Body, sensitive Header, Auth-Negativfall), Stabilität (10 parallele Requests) und Nachvollziehbarkeit (strukturierter Fehler). Nicht-unterstützte HTTP-Methoden werden hart geprüft (Handler darf nicht existieren).
- **Endpoint-Matrix** wird bei jedem Runner-Lauf als `test-report/api-matrix.{md,json}` erzeugt und in CI als Artefakt hochgeladen. Enthält Endpoint, Methode, Auth, Permission, Scope, Request-/Response-Schema, Case-Zähler, Status und offene Risiken.
- **Vorbereitete Registry-Einträge** für spätere Routen (`/api/azure/*`, `/api/rbac/assignments`) mit Status `planned` — Runner überspringt sie via `test.todo`, bleibt aber in der Matrix sichtbar als bekannte Lücke.
- **Playwright-Smoke `e2e/api-smoke.spec.ts`**: echter HTTP-Round-Trip für die Fälle, die der Handler-direct-Runner nicht sieht (Middleware, Framework-Header).
- **Legacy-Tests entfernt**: `src/__tests__/api/status.route.test.ts` und `sync.route.test.ts` werden vollständig vom Runner abgedeckt.
- Handbuch-Kapitel „API- und Endpoint-Tests" (Kategorie Service) inkl. Testumfang, Ausführung, Fehlerinterpretation, Sicherheitsgrenzen und bekannten Einschränkungen; verlinkt im Hilfe-Quick-Menü. ADR-0011 dokumentiert die Registry-Entscheidung. `DOCUMENTATION_VERSION` auf 1.9.0 angehoben.

## 1.29.0 - 2026-07-13

- **Technical-Debt-Scanner (ADR-0010)**: Hybrider Ansatz aus acht automatisierten Detektoren (`scripts/tech-debt/detectors/`: `cyclic-deps`, `layer-violations`, `oversize-modules`, `endpoint-guards`, `orphan-modules`, `doc-drift`, `coverage-gaps`, `console-usage`) und einem kuratierten Manual-Katalog (`tech-debt/findings.json`). Gemeinsames Schema mit ID, Titel, Kategorie, Location, Beschreibung, Ursache, Auswirkung, Severity, Wahrscheinlichkeit, Empfehlung, Aufwand, Status, `firstDetected`, `lastChecked`, Version und Quelle.
- **Aggregator** (`scripts/tech-debt/run.mjs`) validiert beide Quellen, mergt, priorisiert nach Prompt-Ranking (Security → Datenverlust → offener privilegierter Endpoint → RBAC → Backup → funktional → Stabilität → Architektur → Performance → Doku → Kosmetik) und produziert `test-report/tech-debt.{json,md}`, `tech-debt-summary.md`, `tech-debt-actions.md` sowie `tech-debt-diff.json` gegen den vorherigen Lauf.
- **CI-Gate**: Nur Critical-Funde brechen die Pipeline (Exit 2); alles darüber ist Trend-Metrik. Actions-Cache persistiert `tech-debt.prev.json` pro Branch für echten Diff.
- **Alter `scripts/check-tech-debt.mjs` entfernt** (LOC/TODO-Zähler passte nicht ins Schema).
- Handbuch-Kapitel „Technical-Debt-Analyse" (Kategorie Service) inkl. Grenzen und bewusst nicht automatisierten Prüfpunkten; verlinkt im Hilfe-Quick-Menü.

## 1.28.0 - 2026-07-13

- **Zentrale Testinstanz eingeführt (ADR-0009)**: 15 klar getrennte Testmodi (Unit, Komponenten, Frontend-/Backend-Integration, API, I/O, Backup, Azure-Mock, A11y, Security/RBAC, Performance/Bundle, Docs, Technical Debt, UI-E2E, Regression, Full) über Vitest-Pfad-Filter + Playwright + MSW. Isolation via `src/__tests__/env/test-instance.ts` (Fake Timer, seeded PRNG, Storage-Präfix `test:`, IndexedDB `sysingdashboard-test`, Vitest-Guard). Fixtures für Projects/WorkPackages/Assignments/Azure-Responses. Additive Namespace-Hooks in `store/dashboard-persistence.ts` und `logger.indexeddb.ts` (`VITE_TEST_STORAGE_PREFIX`, `VITE_TEST_IDB_NAME`); Produktions-Default unverändert. Azure-Live-Aufrufe hart geblockt (nur mit `AZURE_TEST_LIVE=1`).
- **Neue Scripts**: `test:{unit,components,integration,backend,api,io,backup,azure,a11y,security,e2e,perf,docs,debt,regression,full,report}`. Aggregierter Prüfbericht unter `test-report/summary.{json,md}` via `scripts/generate-test-report.mjs`.
- **CI erweitert**: Docs-Check, Tech-Debt-Report, Playwright-Chromium, Bundle-Report und Prüfbericht mit Artefakt-Upload (`coverage/`, `test-report/`, `playwright-report/`).
- **Handbuch-Kapitel „Testinstanz und Qualitätssicherung"** (Kategorie Service), verlinkt im Hilfe-Quick-Menü. ADR-0009 dokumentiert die Architekturentscheidung.

## 1.27.2 - 2026-07-13

- **Legacy-Standalone-Backend archiviert**: `backend/server.mjs` und `backend/routes/` (bis v1.16.0 lokaler Node-HTTP-Server) nach `archive/legacy-standalone-backend/` verschoben. Keine Runtime-Änderung — die produktiven TanStack-Server-Routes (`src/routes/api/status.ts`, `src/routes/api/sync.ts`) importieren weiterhin die framework-freien Services aus `backend/services/`. Doku (`docs/API.md`, `docs/ARCHITECTURE.md`, Handbuch-Kapitel „Sync-Architektur" und „ENV-Validierung") und CI-Guard `scripts/check-no-console.mjs` entsprechend bereinigt.

## 1.27.1 - 2026-07-13

- **ADR-0008 — RBAC v2 Assignment-Architektur**: Design-Dokument für die produktive Nutzung der v2-Typen. Definiert Domänenmodell (Principal, ScopeRef, Lifecycle, Audit), Datenfluss (Store ↔ Repository ↔ ScopeResolver), Repository-Port (`AssignmentRepository` mit Local- und Remote-Adapter), `AssignmentService` samt Invarianten (Lockout-Schutz, Scope-Validierung, Duplikat-Prevention) und einen fünfphasigen Migrationspfad (M1 Typen → M5 Backend-Mirror). Bestehende v2-Typen bleiben unverändert; keine Code- oder UI-Änderung in dieser Version.

## 1.27.0 - 2026-07-12

- **Forensischer Actor-Kontext**: `UserManagementService.createUser/updateUser/deleteUser/setUserStatus/setUserRole` akzeptieren jetzt einen optionalen `ActorContext` (`actorId`, `actorRole`, `reason`). Audit-Log-Einträge enthalten damit sowohl Ziel- als auch Ausführer-Id. Fehlt der Actor, loggt der Service bewusst auf `warn`, damit der Log Viewer forensische Lücken sichtbar macht. `UserManagementDialog` reicht den aktiven Benutzer automatisch als Actor durch.
- **RBAC v2 – Datenmodell vorbereitet** (additiv, kein Breaking Change): Neue Typen für `ResourceType`, hierarchische `ResourceScope`, `PermissionV2` (`resource:action`), `PermissionGroup` und `RoleAssignment` in `src/lib/rbac/types.ts`. Scope-Utilities (`parseScope`, `scopeIncludes`, `narrowestScope`) und `evaluateAccess()` mit v1-Fallback in `src/lib/rbac/{scope,access,permission-groups}.ts`. Dokumentiert in ADR-0007 und `docs/RBAC-MATRIX.md`.

## 1.26.1 - 2026-07-11

- **Einheitliches Logging in Servicefunktionen**: Alle verbliebenen `console.*`-Aufrufe in `ExportDialog`, `SaveTargetDialog`, `AzureDataDialog` sowie `backend/server.mjs` durch den zentralen Logger ersetzt. Neue strukturierte `info/warn/error`-Meldungen mit `module`/`action`-Kontext in `json-export-service`, `json-import-service`, `export-download-service`, `azure/azure-service`, `azure/azure-history-store`, `user-management`. Aufrufe im Log Viewer sichtbar, Secret-Redaction weiter aktiv.
- **RBAC-Audit-Trail**: Erfolgreiche und blockierte Rollen-/Statuswechsel sowie SysAdmin/Admin-Lockouts werden mit Code (`SYSADMIN_LOCKOUT`, `ADMIN_LOCKOUT`) und Ziel-`userId` protokolliert.
- **Erweiterter No-Console-Guard**: `scripts/check-no-console.mjs` deckt jetzt zusätzlich `json-export-service`, `export-download-service`, `user-management`, `ExportDialog`, `SaveTargetDialog`, `components/azure/`, `backend/routes` und `backend/server.mjs` ab.

## 1.26.0 - 2026-07-10

- **Log Viewer im Servicemenü**: Neuer Menüpunkt „Log Viewer…" macht die bestehende Logger-Infrastruktur sichtbar (`src/components/LogViewerDialog.tsx`). Führt In-Memory-Ringpuffer und persistierten IndexedDB-Sink (`dashboard-logs`) zusammen, deduziert pro `ts|level|message` und sortiert absteigend.
- **Read-only Reader**: Neue `src/lib/logger.indexeddb-reader.ts` (`readAllLogs`, `clearAllLogs`) — bewusst getrennt vom Write-Sink (`logger.indexeddb.ts`), damit der Logger-Hot-Path unverändert bleibt. Kein Schema-Change, kein neuer Store.
- **Filter & Detail**: Level-Checkboxen, Zeitraum-Preset (15 min / 1 h / 24 h / 7 d / alle), Quellen-Multi-Select aus `context.{label,module,operation,component}`, Volltextsuche mit `useDeferredValue`, Detail-Sheet mit vollständigem JSON-Kontext, optionalem Stacktrace, „Als JSON kopieren", JSON-Export der gefilterten Einträge, Auto-Refresh (5 s).
- **Grenzen dokumentiert**: Anzeige-Limit 1000 Zeilen (konsistent mit ADR-0006 „No Virtual Scrolling"), Secrets bereits im Logger maskiert (keine doppelte Verarbeitung). Neues Handbuch-Kapitel `log-viewer` (Kategorie „Service"), verweist auf `fehlerbehandlung-logging`.
- Kritisches Feedback zur ursprünglichen Vorlage: bewusst **kein** neuer Log-Endpoint / kein Server-Upload (widerspräche ADR-0005), **kein** RBAC-Gate (Logs sind lokal im Browser, kein Fremd-Datenzugriff), **kein** eigener Download-Center-Eintrag (Logs sind Debug-Artefakt, kein Report).

## 1.25.0 - 2026-07-09

- **Performance / Lazy-Loading**: Alle 11 schweren Dashboard-Dialoge (`ExportDialog`, `LocalArchiveDialog`, `PerformanceReport`, `WorkingTimeModelsDialog`, `UserManagementDialog`, `UserManualDialog`, `BackupDialog`, `SystemStatusDialog`, `DownloadCenterDialog`, `ImportExportDialog`, `AzureDataDialog`) via `React.lazy` + `Suspense` ausgelagert und gegen ihren jeweiligen `open`-State gegated — schwergewichtige Chunks (`jspdf`, `jspdf-autotable`, `recharts`) verlassen den Initial-Bundle und werden erst beim ersten Öffnen des jeweiligen Dialogs geladen.
- **Bundle-Analyse**: Neues opt-in-Script `bun run analyze` (nutzt `rollup-plugin-visualizer`, nur DevDep) erzeugt `dist/stats.html`. Standard-Build unverändert, kein Overhead.
- **Hydration-Fix**: `useCurrentUser`/`useUsers` starten SSR- und Client-seitig identisch mit `null`/`[]` und lösen `localStorage` erst in `useEffect` auf — beseitigt den Hydration-Mismatch beim User-Titel im Header (Runtime-Error „System-Administrator" vs. „Senior Systems Engineer"), der bislang zu einem clientseitigen Neu-Render des kompletten Header-Subtrees führte.
- **Neues ADR-0006** „Kein Virtual Scrolling (bis Messnachweis)": begründet, warum `@tanstack/react-virtual` bewusst **nicht** eingeführt wurde — heutige Listen sind <100 Zeilen; Reopen-Trigger dokumentiert.
- Kritisches Feedback zur ursprünglichen Vorlage: `vite-plugin-visualizer` existiert nicht (heißt `rollup-plugin-visualizer`); Vorschlag `memo((prev, next) => prev.task.id === next.task.id)` **fehlerhaft** (Updates am selben Task würden nie neu rendern) — deshalb keine spekulative Memoisierung; Referenz-Stabilität liefert bereits der Pub-Sub-Store (ADR-0004). Kein Lighthouse-Gate in CI (Overkill/flaky), konsistent mit v1.23.0.

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
