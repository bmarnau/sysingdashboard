# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-08-24

## Zweck

Dieses Dokument benennt die aktuell maßgeblichen Status- und Abnahmequellen. Ältere Sprint-, Planungs- und Release-Candidate-Dokumente bleiben als historische Evidenz erhalten, sind aber für Aussagen zum heutigen F-11-/MVP-Abnahmestand nachrangig.

## Aktuelle Referenzen

Für den F-11-/MVP-Abschluss gelten in dieser Reihenfolge:

1. `docs/F11-MVP-CONSOLIDATION-2026-08-24.md`
2. `docs/ROLE-ACCEPTANCE-09C-FINAL-2026-08-24.md`
3. `docs/MVP-CLOSURE-STATUS-2026-08-24.md`
4. `docs/MVP-ACCEPTANCE-REPORT-FINAL-2026-08-24.md`
5. die mit PR #39 nach `main` übernommene F-11-Runtime-Evidenz
6. der laufaktuelle technische Prüfbericht aus dem jeweils letzten vollständig grünen CI-Lauf

Historische Dokumente wie `docs/ROLE-ACCEPTANCE-09C.md`, `docs/MVP-ACCEPTANCE-REPORT.md`, `docs/MVP-CLOSURE-STATUS-2026-08-21.md` und `.lovable/plan/*` werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und sind durch die oben genannten Abschlussnachweise fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Version: `1.59.6`
- Produktiver MVP-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch reale Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und Microsoft Entra ID: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen MVP
- Lovable: veröffentlichte Referenzumgebung, keine fachlich unersetzbare Laufzeitlogik
- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben als getrennte Verantwortungsbereiche zu behandeln
- Docker-/Container-Portabilität sowie Azure-/Entra-Migrationsfähigkeit bleiben verbindliche Architekturziele für den weiteren Ausbau

## F-11

**Status: CLOSED / PASS**

Nachgewiesen sind unter anderem:

- reale Rollen- und Negativtests für Systemingenieur, Projektmanager, Teamleitung, Viewer und Administrator,
- Benutzerverwaltung und Namensdarstellung,
- Backup-Runtime einschließlich Integrität und Zeitstempellogik,
- Downloadbereich,
- Log Viewer,
- finale Administrator-Gesamtsicht,
- produktiver Systemstatus-Retest mit SYSSTAT-01 bis SYSSTAT-04 PASS,
- serverseitige Berechtigungsgrenzen und RLS-Negativpfade.

`Role Preview` ist für den aktuellen MVP **N/A — kein Produktbestandteil**. Es wird kein künstliches Impersonation-/Preview-Feature nur zur Erfüllung eines historischen Prüfpunkts gebaut.

## MVP-Abschluss und wirksame Baseline

Die fachliche F-11-Abzeichnung ist abgeschlossen. PR #60 wurde mit finalem Head `05c8f8261a865a3672d3b00adbb316641b889140` vollständig gegatet und anschließend mit Head-SHA-Schutz gemergt.

Finale Gate-Evidenz von PR #60:

- Security #398: PASS,
- CI #407: PASS,
- Prettier / ESLint / TypeScript / RBAC / Docs / Projektmanifest: PASS,
- Unit & Components / Backend / API / RBAC & Security: PASS,
- Import/Export / Backup/Restore / Production Build: PASS,
- Playwright E2E / Accessibility / Technical Debt: PASS,
- Technical Report / Quality Gate: PASS.

Damit gilt seit dem Merge von PR #60:

**MVP: 100 % / BASELINE READY — wirksame MVP-Baseline ist der Merge-Commit `03fe38692da598520b7f793efecc030952cadc39`.**

## Post-MVP-Fortschreibung

Seit der wirksamen MVP-Baseline wurden ausschließlich kontrollierte Nacharbeiten über Branch + Pull Request durchgeführt:

### PR #61 — E2E-Lückenmatrix

- gemergt,
- Security #400: PASS,
- CI #409: PASS einschließlich Technical Report und Quality Gate,
- Issue #36 als `completed` geschlossen,
- E2E-Dokumentation trennt synthetische Supabase-Sessions, Smoke-/Sichtbarkeitsanker und tiefe funktionale Abdeckung klarer.

### PR #62 — TanStack Validator-API

- gemergt,
- Security #402: PASS,
- CI #411: PASS einschließlich Technical Report und Quality Gate,
- fünf produktive `.inputValidator(...)`-Verwendungen semantisch neutral auf `.validator(...)` migriert,
- Regressionstest verhindert die erneute Verwendung der deprecated API,
- konkrete `inputValidator`-Warnung in Production Build und E2E von zuvor 10 Logeinträgen auf 0 reduziert,
- keine Änderung an Auth-, RBAC-, RLS- oder Datenbanksemantik,
- Issue #59 als `completed` geschlossen.

Aktueller `main` nach PR #62:

`f1f3d6ef81a99f04dfaa429897905c0a71fe9f93`

## Offener Governance-Befund

Issue #53 bleibt offen: Der GitHub-Branch `main` ist aktuell noch nicht technisch durch Branch Protection / Rulesets geschützt.

Nachgewiesener Ist-Stand:

- `protected: false`,
- `protection.enabled: false`,
- Required Status Checks nicht erzwungen.

Bis zur technischen Aktivierung gilt verbindlich:

- keine direkten regulären Tool-/Bot-Writes auf `main`,
- Änderungen über eindeutig benannten Branch + Pull Request,
- Merge erst nach vollständigen grünen Gates,
- Required-Zielchecks: `14 · Technical Report & Quality Gate` sowie `Secrets, Headers, Azure-Strings`,
- Merge mit Expected-Head-SHA-Schutz,
- Force Push und Branch-Löschung sollen durch die künftige GitHub-Regel verhindert werden.

Der fehlende technische Branch-Schutz ist ein Governance-/Releasefinding und **kein Rückfall des fachlichen MVP-Status**.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **Post-MVP / BSF-Ausbau** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben dabei verbindliche Abnahmekriterien.
