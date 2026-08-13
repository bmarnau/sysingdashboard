# MVP-Abnahmebericht — Sysing Dashboard

- **Sprint**: 09B (Abschluss)
- **Release Candidate**: v1.58.0
- **Berichtsdatum**: 2026-08-13
- **Umgebung der Prüfung**: Entwicklungs-/Preview-Instanz mit Lovable Cloud (Supabase) als Datenplattform
- **Prüfberichtsstand**: technischer Prüfbericht v11, Schema 2.0.0
- **Demo-Datensatz**: lokaler Bestand 1.0.0, AVKK-Abnahmefälle 1.1.0
- **Freigabeentscheidung**: **GO WITH FINDINGS**

## 1. Release-Candidate-Definition

Der Release Candidate ist der Stand v1.58.0 mit:

- CHANGELOG-Kopf `1.58.0 - 2026-08-13` als Versionsquelle,
- `docs/PROJECT-STATUS.yaml` mit `versions.dashboard = 1.58.0` und
  `releaseManagement.currentRelease = 1.58.0`,
- vollständigem ADR-Bestand ADR-0001 bis ADR-0028 in einem Verzeichnis,
- Produktübersicht `SYSING-001` in Version 0.2.0,
- reproduzierbarem Systemhaus-Demo-Datensatz für Schulung und Abnahme.

Nicht Teil des Release Candidate: Excel-Export, produktive Erhebung der
Kontextindikatoren, Microsoft-365-/Azure-Produktivanbindung, KI- und
Agentenfunktionen.

## 2. Qualitätstore (frisch ausgeführt)

| Tor                   | Kommando                       | Ergebnis                                                        |
| --------------------- | ------------------------------ | --------------------------------------------------------------- |
| Typprüfung            | `tsgo --noEmit`                | bestanden, 0 Fehler                                             |
| Automatisierte Tests  | `bun run test`                 | bestanden, 56 Dateien, 479 Tests grün, 4 todo                   |
| Lint                  | `bun run lint`                 | 0 Fehler, 17 Warnungen (Befund F-03)                            |
| Doku-Synchronität     | `bun run docs:check`           | bestanden, 76 CHANGELOG-Einträge, 24 Komponenten                |
| Projektmanifest       | `bun run project-status:check` | bestanden                                                       |
| RBAC-Invarianten      | `bun run rbac:check`           | bestanden                                                       |
| Logger-Disziplin      | `bun run lint:no-console`      | bestanden                                                       |
| Sicherheits-Scan      | `bun run security:check`       | bestanden, CRITICAL 0 / HIGH 0 / MEDIUM 0                       |
| Technische Schulden   | `bun run test:debt`            | 59 Befunde: 0 critical, 2 high, 6 medium, 44 low, 7 info; 0 neu |
| Betriebskennzahlen    | `bun run ops:report`           | bestanden, 0 Warnungen                                          |
| Produktionsbuild      | `bun run build`                | bestanden                                                       |
| Zentraler Prüfbericht | `bun run report:technical`     | `passed-with-findings`, 59 offene Befunde, 0 critical, 1 high   |

Quellenstatus im Prüfbericht v11: security `passed-with-findings`, api
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

| Nr.  | Schwere | Befund                                                                           | Wirkung                                                 | Umgang                          |
| ---- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| F-01 | high    | Zyklische Abhängigkeit (2 Kanten, `td-cycle-4f7048fd`)                           | Wartbarkeit, kein Funktionsfehler                       | Sprint 10, kein Freigabeblocker |
| F-02 | medium  | Drei Module über Größenschwelle (1075 / 745 / 731 Zeilen)                        | Wartbarkeit                                             | Refactoringplan ADR-0019        |
| F-03 | medium  | 17 Lint-Warnungen, darunter fehlende `useMemo`-Abhängigkeit in `dashboard.tsx`   | mögliches Aktualisierungsverhalten in Randfällen        | Sprint 10, beobachtet           |
| F-04 | medium  | Ein API-Endpoint ohne Zod-Eingabevalidierung, UI-Direktzugriff auf Azure-Interna | Schichtentrennung, Robustheit                           | Sprint 10                       |
| F-05 | medium  | Excel-Ausgabe fehlt                                                              | MVP-Pflichtformate PDF/Druck/Word/JSON/CSV sind erfüllt | bewusst Post-MVP                |
| F-06 | medium  | E2E-Suite ist bewusst nur Smoke (`td-manual-playwright-smoke-only`)              | begrenzte Oberflächenabdeckung                          | akzeptiert, ADR-0012            |
| F-07 | medium  | Keine Claims-Whitelist im Logger (`SEC-MED-CLAIMS-001`)                          | Protokollinhalt                                         | Sprint 10                       |
| F-08 | low     | AVKK-Restore schreibt nicht automatisch in die Cloud zurück                      | manueller Wiederherstellungsschritt                     | bekannte Grenze, ADR-0026       |
| F-09 | low     | Eigener PDF-Pfad für den Leistungsnachweis neben der Reporting-Schicht           | doppelte Ausgabelogik                                   | Zusammenführung Sprint 10       |
| F-10 | low     | Kontextindikatoren fachlich beschrieben, nicht produktiv erhoben                 | Führungssicht ohne Kontextdaten                         | Post-MVP                        |

Keine offenen Befunde der Stufe critical. SEC-CRIT-001 und SEC-CRIT-002 sind
durch die Einführung datenbankgestützter Identität und RBAC behoben und im
Prüfbericht als erledigt geführt.

## 6. ADR-Durchsicht

- Bestand vollständig: ADR-0001 bis ADR-0028, alle im Status `Accepted`.
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
`docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.0.md`,
`docs/DEMO-DATA.md`, `docs/AVKK-MANUAL-ACCEPTANCE.md`,
`docs/AVKK-MANAGEMENT-MANUAL-ACCEPTANCE.md`, `docs/PRINT-VERIFICATION.md`,
`docs/ADR/README.md`, `CHANGELOG.md`, `docs/PROJECT-STATUS.yaml`.

## 9. Kennzahlen des Abnahmelaufs

| Feld                              | Wert                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Getestete Version                 | v1.58.0                                                                                                 |
| Testdatum                         | 2026-08-13                                                                                              |
| Testumgebung                      | Entwicklungs-/Preview-Instanz, Lovable Cloud (Supabase), Produktionsbuild geprüft                       |
| Version Demo-Datensatz            | lokal 2.0.0 · AVKK-Fälle 1.1.0                                                                          |
| Getestete Rollen                  | Systemadministrator, App-Entwickler, Geschäftsführer, Projektmanager, Systemingenieur, Viewer, Customer |
| Automatisierte Tests              | 479 grün (56 Dateien, 4 todo)                                                                           |
| E2E-/UI-Tests                     | 32 Playwright-Tests in 11 Spezifikationen (Smoke-Umfang, ADR-0012)                                      |
| UI-Teststatus                     | bestanden (Navigation, Dialoge, Responsive, Fehlerzustände, A11y)                                       |
| Auth-/Sessionstatus               | bestanden (Route-Guard, Idle-Logout, Session-Wiederherstellung)                                         |
| AVKK-Teststatus                   | bestanden (Service, Aggregation, Management, Backup-Nutzdaten)                                          |
| Kontextindikatorstatus            | fachlich beschrieben, nicht produktiv erhoben (F-10)                                                    |
| PDF-/Druckstatus                  | bestanden (`docs/PRINT-VERIFICATION.md`)                                                                |
| Exportstatus                      | PDF, Druck, Word, JSON, CSV bestanden · Excel offen (F-05)                                              |
| Backup-/Restorestatus             | bestanden, Manifest 2.0 mit SHA-256 · AVKK-Rückschreiben manuell (F-08)                                 |
| RBAC-/RLS-Status                  | bestanden (`rbac:check`, Security-Suite, RLS-Policies aktiv)                                            |
| ADR-Review-Status                 | abgeschlossen, ADR-0001 bis ADR-0028 accepted, keine offene Entscheidung                                |
| SYSING-001                        | Version 0.2.0, synchron zum Release Candidate, PDF-Fassung geprüft                                      |
| Bekannte Einschränkungen          | F-05, F-06, F-08, F-09, F-10                                                                            |
| Findings nach Schweregrad (offen) | critical 0 · high 1 · medium 7 · low 44 · info 7                                                        |
| Freigabeentscheidung              | GO WITH FINDINGS                                                                                        |

## 10. Empfehlungen für Sprint 10

1. Zyklische Abhängigkeit und Lint-Warnungen auflösen (F-01, F-03).
2. Zod-Validierung für den verbleibenden Endpoint, Azure-Zugriff hinter den Service legen (F-04).
3. Claims-Whitelist im Logger ergänzen (F-07).
4. Leistungsnachweis-PDF in die zentrale Reporting-Schicht überführen (F-09).
5. Excel-Ausgabe als erstes Post-MVP-Format umsetzen (F-05).
