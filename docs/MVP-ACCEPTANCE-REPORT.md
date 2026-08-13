# MVP-Abnahmebericht — Sysing Dashboard

- **Sprint**: 09C (MVP Hardening, Abschluss)
- **Release Candidate**: v1.58.2
- **Berichtsdatum**: 2026-08-13
- **Umgebung der Prüfung**: Entwicklungs-/Preview-Instanz mit Lovable Cloud (Supabase) als Datenplattform
- **Prüfberichtsstand**: technischer Prüfbericht v13, Schema 2.0.0, Stage `production`
- **Demo-Datensatz**: lokaler Bestand 1.0.0, AVKK-Abnahmefälle 1.1.0
- **Freigabeentscheidung**: **GO WITH FINDINGS**

## 1. Release-Candidate-Definition

Der Release Candidate ist der Stand v1.58.2 mit:

- CHANGELOG-Kopf `1.58.2 - 2026-08-13` als Versionsquelle,
- `docs/PROJECT-STATUS.yaml` mit `versions.dashboard = 1.58.2` und
  `releaseManagement.currentRelease = 1.58.2`,
- vollständigem ADR-Bestand ADR-0001 bis ADR-0028 in einem Verzeichnis,
- Produktübersicht `SYSING-001` in Version 0.2.1 als Markdown-Quelle mit erzeugter Word- und PDF-Fassung,
- reproduzierbarem Systemhaus-Demo-Datensatz für Schulung und Abnahme.

Nicht Teil des Release Candidate: Excel-Export, produktive Erhebung der
Kontextindikatoren, Microsoft-365-/Azure-Produktivanbindung, KI- und
Agentenfunktionen.

## 2. Qualitätstore (frisch ausgeführt)

| Tor                   | Kommando                       | Ergebnis                                                        |
| --------------------- | ------------------------------ | --------------------------------------------------------------- |
| Typprüfung            | `tsgo --noEmit`                | bestanden, 0 Fehler                                             |
| Automatisierte Tests  | `bun run test`                 | bestanden, 56 Dateien, 481 Tests grün, 4 todo                   |
| Lint                  | `bunx eslint .`                | 0 Fehler, 17 Warnungen (Bestand, Befund F-03), 0 neue Verstöße  |
| Doku-Synchronität     | `bun run docs:check`           | bestanden, 76 CHANGELOG-Einträge, 24 Komponenten                |
| Projektmanifest       | `bun run project-status:check` | bestanden                                                       |
| RBAC-Invarianten      | `bun run rbac:check`           | bestanden                                                       |
| Logger-Disziplin      | `bun run lint:no-console`      | bestanden                                                       |
| Sicherheits-Scan      | `bun run security:gate`        | bestanden, critical 0 / high 0 / medium 1 / low 0, 8 akzeptiert |
| API-Discovery-Gate    | `bun run api:gate`             | bestanden, 3 Endpoints, 0 critical, 0 high                      |
| Formatierung          | `bunx prettier --check .`      | bestanden                                                       |
| Technische Schulden   | `bun run test:debt`            | 58 Befunde: 0 critical, 1 high, 6 medium, 44 low, 7 info; 0 neu |
| Betriebskennzahlen    | `bun run ops:report`           | bestanden, 0 Warnungen                                          |
| Produktionsbuild      | `bun run build`                | bestanden                                                       |
| Zentraler Prüfbericht | `bun run report:technical`     | `passed-with-findings`, 0 offene critical, 1 offener high       |

Quellenstatus im Prüfbericht v13: security `passed-with-findings`, api
`passed`, backup `passed`, techdebt `passed-with-findings`, ops `passed`,
docs `passed`, manual `passed-with-findings`.

## 3. Demo-Datensatz und Abnahmelagen

Der AVKK-Demo-Datensatz deckt in Version 1.1.0 acht Fälle ab. Die Abdeckung ist
maschinell abgesichert (`src/__tests__/lib/demo-data/avkk-dataset.test.ts`):

| Fall | Abgedeckte Lage                                    |
| ---- | -------------------------------------------------- |
| A    | unkritisch, im Plan                                |
| B    | gefährdet                                          |
| C    | kritisch                                           |
| D    | überfällig                                         |
| E    | Voraussetzungslücke (Material/Freigabe)            |
| F    | hohe Kundenkonsequenz                              |
| G    | hohe Terminwirkung                                 |
| H    | Wissens- und Informationslücke (neu in Sprint 09B) |

Weitere geprüfte Eigenschaften: eindeutige Fallkennungen, ausschließlich
`demo-`-präfigierte Bezüge, keine Felder mit Punktzahl-, Ranking- oder
Leistungssemantik (ADR-0027).

### Verbindliche Betriebsregel

**Demodaten dürfen nicht in eine Produktivinstanz eingespielt werden.** AVKK-Daten
werden historisiert und nicht gelöscht (ADR-0026); die Rücknahme legt Demofälle
nur still. Eine Instanz mit eingespielten Demodaten gilt ohne Neuaufbau nicht
mehr als saubere Produktivinstanz. Die Regel steht im Demo-Dialog als Warnung,
im Handbuchkapitel „Demo-Datensatz" und in `docs/DEMO-DATA.md`.

## 4. Funktionale Abnahme

| Bereich                            | Nachweis                                                             | Ergebnis     |
| ---------------------------------- | -------------------------------------------------------------------- | ------------ |
| Anmeldung, Sitzung, Idle-Logout    | `src/__tests__/routes/authenticated-guard.test.ts`, Sicherheitssuite | bestanden    |
| RBAC und Rollensichten             | `bun run rbac:check`, `src/__tests__/lib/rbac/*`, Security-Suite     | bestanden    |
| AVKK-Arbeitsplatz und Cockpit      | AVKK-Service- und Management-Tests, `docs/AVKK-MANUAL-ACCEPTANCE.md` | bestanden    |
| Reporting PDF/Druck/Word/JSON/CSV  | Report-Registry- und Renderer-Tests, `docs/PRINT-VERIFICATION.md`    | bestanden    |
| Backup, Restore, Integrität        | `bun run test:backup`, Manifest-2.0-Tests                            | bestanden    |
| Import/Export JSON                 | Import-/Export-Suite mit Vorschau, Rollback und Protokoll            | bestanden    |
| Downloadbereich, Aufbewahrung      | Download-Service-Tests                                               | bestanden    |
| Handbuch, Systemstatus, Log Viewer | `bun run docs:check`, Systemstatus-Prüfung, A11y-Smoke               | bestanden    |
| Excel-Export                       | nicht umgesetzt, dokumentiert als Post-MVP                           | offen (F-05) |

## 5. Befundmatrix

| Nr.  | Schwere | Befund                                                                                                                                               | Wirkung                                                 | Umgang                                                          |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| F-01 | low     | Zyklus-Detektor meldete den framework-erzeugten Ring `routeTree.gen.ts ↔ router.tsx`                                                                 | Fehlalarm, kein Funktionsfehler                         | behoben in v1.58.2: generierte Dateien vom Detektor ausgenommen |
| F-02 | high    | Drei Module über Größenschwelle (1075 / 745 / 731 Zeilen)                                                                                            | Wartbarkeit                                             | Refactoringplan ADR-0019                                        |
| F-03 | medium  | 17 Lint-Warnungen, darunter fehlende `useMemo`-Abhängigkeit in `dashboard.tsx`                                                                       | mögliches Aktualisierungsverhalten in Randfällen        | Sprint 10, beobachtet                                           |
| F-04 | medium  | UI greift direkt auf Azure-Interna zu (Schichtenverstoß)                                                                                             | Schichtentrennung                                       | Sprint 09C/10                                                   |
| F-11 | low     | Fachliche Abzeichnung der Rollenabnahme steht aus; Checkliste und automatisierte Nachweise liegen seit v1.58.2 vor (`docs/ROLE-ACCEPTANCE-09C.md`)   | Dokumentation der Oberflächenabnahme                    | herabgestuft in v1.58.2: Zugriffsgrenzen serverseitig belegt, offene Unterschrift MANUAL VERIFICATION REQUIRED |
| F-12 | low     | Word-Fassung von SYSING-001 fehlte                                                                                                                   | Dokumentverteilung                                      | behoben in v1.58.2: `scripts/docs/build-sysing-001.mjs` erzeugt Word und PDF aus einer Quelle, visuell geprüft (5 Seiten) |
| F-05 | medium  | Excel-Ausgabe fehlt                                                                                                                                  | MVP-Pflichtformate PDF/Druck/Word/JSON/CSV sind erfüllt | bewusst Post-MVP                                                |
| F-06 | medium  | E2E-Suite ist bewusst nur Smoke (`td-manual-playwright-smoke-only`)                                                                                  | begrenzte Oberflächenabdeckung                          | akzeptiert, ADR-0012                                            |
| F-07 | medium  | Keine Claims-Whitelist im Logger (`SEC-MED-CLAIMS-001`)                                                                                              | Protokollinhalt                                         | Sprint 10                                                       |
| F-08 | low     | AVKK-Restore schreibt nicht automatisch in die Cloud zurück                                                                                          | manueller Wiederherstellungsschritt                     | bekannte Grenze, ADR-0026                                       |
| F-09 | low     | Eigener PDF-Pfad für den Leistungsnachweis neben der Reporting-Schicht                                                                               | doppelte Ausgabelogik                                   | Zusammenführung Sprint 10                                       |
| F-10 | low     | Kontextindikatoren fachlich beschrieben, nicht produktiv erhoben                                                                                     | Führungssicht ohne Kontextdaten                         | Post-MVP                                                        |

Keine offenen Befunde der Stufe critical. SEC-CRIT-001 und SEC-CRIT-002 sind
durch die Einführung datenbankgestützter Identität und RBAC behoben und im
Prüfbericht als erledigt geführt. Der einzige offene High-Befund ist F-02
(Modulgröße `src/routes/_authenticated/dashboard.tsx`, 1075 Zeilen) — reine
Wartbarkeit, kein Funktions-, Sicherheits- oder Datenintegritätsrisiko,
Refactoringpfad in ADR-0019 festgehalten.

### Getrennter RBAC-/RLS-Nachweis

| Ebene                  | Nachweis                                                                                                                                                                                                               | Ergebnis |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RBAC (Anwendungsebene) | `bun run rbac:check`, `src/__tests__/lib/rbac/*`, `src/__tests__/security/*` — `avkk.view`, `avkk.edit`, `avkk.management.view`, Reporting, Export, Reference Data, Demo-Seed, administrative Funktionen, Role Preview | PASSED   |
| RLS (Datenbankebene)   | Policies je AVKK-/Reference-Data-Tabelle, `avkk_can_write`, `has_permission`, Grants je Rolle; Demo-Seed läuft ausschließlich über den Fachdienst unter RLS, ohne Service-Role-Key                                     | PASSED   |
| Role Preview           | verändert ausschließlich die Ansicht, keine Berechtigungen, keine Session, keine RLS-Wirkung (Tests in `src/__tests__/lib/rbac/access.test.ts`)                                                                        | PASSED   |

### Backup-/Restore-Entscheidung

Manifest 2.0 prüft SHA-256, Dateigröße, Dateityp, fehlende und verwaiste
Dateien, doppelte Schlüssel sowie Legacy-Formate; AVKK- und Reference-Data-
Nutzdaten werden transportiert und validiert. Das automatische Rückschreiben
der AVKK-Cloud-Daten fehlt bewusst (ADR-0026, Historisierung statt Löschung).

**Entscheidung: ACCEPTED FOR MVP.** Begründung: Es besteht kein Datenverlust —
die Daten sind im Backup enthalten, geprüft und wiederherstellbar; nur der
Rückschreibschritt ist manuell. Ein automatischer Rückschreibpfad ohne
Löschstrategie würde Historie überschreiben und wäre für den MVP das größere
Risiko.

### Cross-Format-Konsistenz

Stichprobe über die Demofälle C (kritisch) und G (hohe Terminwirkung): Titel,
Bezug, Verantwortung, Voraussetzungslage und Konsequenz stimmen zwischen
Fachdaten, UI-Arbeitsplatz, Managementsicht, JSON-Export, CSV-Export, PDF,
Word-Report und Backup-Nutzdaten überein; abweichend ist ausschließlich der
Detailgrad (CSV ohne Fließtextnotizen). Abgesichert über die Report- und
Backup-Nutzdatentests.

### Portabilität und Docker-Betrieb

Bewertung: **möglich.** Konfiguration läuft über Environment/Provider
(`config/env.mjs`, `config/secretManager.mjs`), Templates über den
`TemplateProvider`, Datenzugriff über Service-Schichten; es gibt keine
technisch unersetzbare Lovable-Cloud-Abhängigkeit und keine Windows-Pfade in
der Fachlogik. Eine spätere Entra-ID-/Azure-Erweiterung ist über die
Provider-Trennung vorgesehen, aber nicht implementiert (GEPLANT / POST-MVP).

### Security-Abschluss

`avkk_can_write` bleibt technisch unverändert: SECURITY DEFINER, boolescher
Rückgabewert, kein Datenleck, `search_path = public`, Grants unverändert.
ADR-0025 gilt weiter; die Warnung bleibt ein akzeptierter LOW-Befund. Neue
Security-Befunde: keine.

## 6. ADR-Durchsicht

- Bestand vollständig: ADR-0001 bis ADR-0028, alle im Status `Accepted`.
- Gesamtzahl 28 · accepted 28 · superseded 0 · deprecated 0 · offen 0 ·
  neu erforderlich 0.
- Fachlich nachgeprüft und weiterhin gültig: ADR-0003 (Local-First) im
  Verhältnis zu ADR-0024 (Supabase Reference Data) — Local-First gilt weiterhin
  für Arbeitsdaten, Reference Data und AVKK liegen bewusst in der Cloud;
  ADR-0025 (AVKK/RLS, polymorphe Referenzen), ADR-0022/0026 (Backup, Löschung),
  ADR-0027 (Management, Kontextindikatoren, Rankingverbot), ADR-0028
  (Reporting/TemplateProvider), ADR-0020 (Providerneutralität),
  ADR-0023 (Phasenmodell, Docker-/Azure-Migrationsfähigkeit).
- Kein ADR ist deprecated oder superseded; keine widersprüchlichen Entscheidungen.
- Die frühere Aufteilung auf `docs/ADR/` und `docs/adr/` wurde aufgelöst, weil
  zwei nur in der Groß-/Kleinschreibung unterschiedliche Verzeichnisse auf
  Windows-Arbeitsplätzen kollidieren. Alle Verweise wurden nachgezogen.

## 7. Freigabeentscheidung

**GO WITH FINDINGS.**

Begründung: Alle MVP-Pflichtfunktionen sind umgesetzt und nachgewiesen, alle
Qualitätstore laufen ohne Fehler, es existiert kein offener Befund der Stufe
critical und der einzige offene High-Befund betrifft die Wartbarkeit, nicht die
Funktion, Sicherheit oder Datenintegrität. Die offenen Befunde F-01 bis F-10
sind benannt, bewertet und einem Folgesprint oder einer bewussten Grenze
zugeordnet.

Auflagen für die Freigabe:

1. Keine Demodaten in Produktivinstanzen.
2. F-01, F-03, F-04 und F-07 werden in Sprint 10 bearbeitet.
3. Vor der ersten produktiven Nutzung wird ein Backup mit Manifest 2.0 erzeugt
   und die Wiederherstellung mindestens einmal geprüft.

## 8. Nachweise

`test-report/technical-test-report.json`, `test-report/tech-debt.json`,
`test-report/ops-report.md`, `security-report/findings.json`,
`docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md`,
`docs/DEMO-DATA.md`, `docs/AVKK-MANUAL-ACCEPTANCE.md`,
`docs/AVKK-MANAGEMENT-MANUAL-ACCEPTANCE.md`, `docs/PRINT-VERIFICATION.md`,
`docs/ROLE-ACCEPTANCE-09C.md`, `docs/ADR/README.md`, `CHANGELOG.md`,
`docs/PROJECT-STATUS.yaml`.

## 9. Kennzahlen des Abnahmelaufs

| Feld                              | Wert                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Getestete Version                 | v1.58.2                                                                                                     |
| Testdatum                         | 2026-08-13                                                                                                  |
| Testumgebung                      | Entwicklungs-/Preview-Instanz, Lovable Cloud (Supabase), Produktionsbuild geprüft                           |
| Version Demo-Datensatz            | lokal 2.0.0 · AVKK-Fälle 1.1.0                                                                              |
| Getestete Rollen                  | Systemadministrator, App-Entwickler, Geschäftsführer, Projektmanager, Systemingenieur, Viewer, Customer     |
| Automatisierte Tests              | 481 grün (56 Dateien, 4 todo)                                                                               |
| E2E-/UI-Tests                     | 32 Playwright-Tests in 11 Spezifikationen (Smoke-Umfang, ADR-0012)                                          |
| UI-Teststatus                     | automatisiert bestanden · Abnahmecheckliste `docs/ROLE-ACCEPTANCE-09C.md` bereitgestellt, Abzeichnung offen (F-11) |
| Auth-/Sessionstatus               | bestanden (Route-Guard, Idle-Logout, Session-Wiederherstellung)                                             |
| AVKK-Teststatus                   | bestanden (Service, Aggregation, Management, Backup-Nutzdaten)                                              |
| Kontextindikatorstatus            | fachlich beschrieben, nicht produktiv erhoben (F-10)                                                        |
| PDF-/Druckstatus                  | bestanden (`docs/PRINT-VERIFICATION.md`)                                                                    |
| Exportstatus                      | PDF, Druck, Word, JSON, CSV bestanden · Excel offen (F-05)                                                  |
| Backup-/Restorestatus             | bestanden, Manifest 2.0 mit SHA-256 · AVKK-Rückschreiben manuell (F-08)                                     |
| RBAC-/RLS-Status                  | bestanden (`rbac:check`, Security-Suite, RLS-Policies aktiv)                                                |
| ADR-Review-Status                 | abgeschlossen, ADR-0001 bis ADR-0028 accepted, keine offene Entscheidung                                    |
| SYSING-001                        | Version 0.2.1, eine Markdown-Quelle · Word- und PDF-Fassung erzeugt und visuell geprüft, 5 Seiten, PASSED  |
| Bekannte Einschränkungen          | F-05, F-06, F-08, F-09, F-10                                                                                |
| Findings nach Schweregrad (offen) | critical 0 · high 1 · medium 5 · low 45 · info 7 (Abnahmebefunde: 0 critical, 1 high, 5 medium, 6 low)      |
| Freigabeentscheidung              | GO WITH FINDINGS                                                                                            |

## 10. Ergebnis Sprint 09C und Empfehlungen für Sprint 10

In Sprint 09C geschlossen: F-12 (Word-Fassung erzeugt und geprüft) sowie die
technische Seite von F-11 (Checkliste mit automatisierten Nachweisen). F-02
bleibt bewusst als dokumentierte Schuld nach ADR-0019 bestehen.

Empfehlungen für Sprint 10:

1. Lint-Warnungen auflösen (F-03).
2. Azure-Zugriff hinter den Service legen (F-04).
3. Claims-Whitelist im Logger ergänzen (F-07).
4. Leistungsnachweis-PDF in die zentrale Reporting-Schicht überführen (F-09).
5. Excel-Ausgabe als erstes Post-MVP-Format umsetzen (F-05).
6. Abzeichnung der Rollenabnahme einholen (F-11, Abschnitt 3 der Checkliste).
