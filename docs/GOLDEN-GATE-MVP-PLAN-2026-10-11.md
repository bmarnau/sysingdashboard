# Sysing Dashboard — Golden-Gate-MVP-Plan

Stand: 2026-10-11  
Status: **operative Zielplanung bis zum Golden Gate**  
Tracking-Issue: `#175`  
Repository: `bmarnau/sysingdashboard`

## 1. Ziel

Bis zum Golden Gate wird das Sysing Dashboard als **voll funktionsfähige, stabile, sichere und ausbaufähige interne MVP-Anwendung** fertiggestellt.

Das Golden Gate bewertet zuerst die Qualität und Vollständigkeit des Produkts selbst. Es setzt **keine Docker-/Containerplattform und keine produktive automatische externe Schnittstelle** voraus.

Die komplette App muss mit kontrollierten synthetischen Demo-/Golden-Daten reproduzierbar demonstrierbar und testbar sein.

## 2. Verbindlicher Scope bis zum Golden Gate

Bis zum Golden Gate gehören zum Pflichtumfang:

- Supabase als führender MVP-Daten- und Auth-Provider,
- Authentifizierung, RBAC, RLS, Customer Scope und Audit,
- Customer → Project → WorkPackage → Activity,
- Zeit-/Leistungsfluss einschließlich BSF-03B,
- AVKK, Responsibility, Vertretung und Arbeitspaketsicht,
- Managementcockpit 2,
- Management-Kiosk,
- Kunden-PDF und internes Reporting,
- manuelle Import-/Exportpfade,
- Backup/Restore-Nachweis,
- vollständig synthetische Demo-/Golden-Daten,
- reproduzierbare Golden Expected Results,
- Benutzerhandbuch, Hilfe, Systemstatus und technischer Prüfbericht,
- vollständige CI-, Security-, E2E-, Accessibility- und Quality-Gates.

## 3. Bewusst nicht Bestandteil vor dem Golden Gate

Die folgenden Themen werden **hinter das Golden Gate** verschoben:

- Docker / Containerisierung / On-Premises-Nachweis (`BSF-06 / #121`),
- Microsoft Graph,
- produktive Microsoft Entra ID-Anbindung,
- produktive SharePoint-/Exchange-/PRTG-Anbindungen,
- automatische externe Synchronisationen, Polling und Webhooks,
- Azure-SQL-/Azure-Storage-Migration,
- MCP, NAVIS und Agenten,
- autonome KI-Aktionen,
- externe Producer als Runtime-Abhängigkeit.

Providerneutrale Interfaces und Adaptergrenzen bleiben vor dem Golden Gate Pflicht, damit diese Erweiterungen später ohne Umbau der Fachlogik ergänzt werden können.

## 4. Arbeitsregel je Golden-Gate-Phase

`Analysieren → Vertrag/RED → minimal umsetzen → testen → Security/Scope prüfen → UI/Browser prüfen → dokumentieren → Exact-Head-Gate → Abschluss`

Kein fachlicher Expected Result wird nur deshalb geändert, weil Produktionscode einen Test nicht erfüllt.

## 4a. Verbindliche Querschnittsstandards – gelten für **jede** GG-Phase

Dokumentation, Wartung und Governance sind Bestandteil der Umsetzung und **keine nachgelagerte Aufräumarbeit**.

### AQGS / Quality Gates

Für das Sysing Dashboard gilt das Profil `security-data` aus `quality-gates.yaml`.

Verbindlich je betroffenem Candidate:

- **G0 Source Integrity:** Repository, Branch/Release-Kontext und Exact Commit SHA eindeutig.
- **G1 Static Quality:** Prettier, Lint, TypeScript, No-Console und Docs-Checks.
- **G2 Unit/Component/Backend:** neue Regeln testgetrieben absichern; bestehende Regression grün.
- **G3 Security Baseline:** Security-Workflow und Security-Checks grün.
- **G4 Production Build:** produktionsnaher Build grün.
- **G5 Data/Schema Integrity:** Schema-/Type-Drift und DB-Verträge grün, sofern betroffen.
- **G6 Auth/RBAC/RLS:** serverseitige Berechtigungs- und Negativtests grün.
- **G7 API/Integration Contracts:** API-Discover/Smoke/Functional grün, sofern betroffen.
- **G8 Import/Export/Data Portability:** manuelle Import-/Export-Verträge regressionssicher.
- **G9 Backup/Restore/Rollback:** Backup-, Restore- und Rollback-Verträge grün.
- **G10 Runtime/E2E:** relevante Nutzerpfade browserseitig geprüft.
- **G11 UI/A11y:** Accessibility und Responsive-Verhalten geprüft.
- **G12 Documentation/Project State:** Doku und Projektmanifest synchron.
- **G13 Technical Debt/Portability:** keine unkontrollierte Provider-/Layer-Kopplung.
- **G14 Evidence/Release Gate:** technischer Prüfbericht + Quality Gate auf Exact Head.
- **G15 Operations/Resilience:** bei betriebsrelevantem Scope zusätzlich ausführen; Docker selbst bleibt bis nach GG-09 außerhalb des Pflichtscopes.

`no_silent_skip = true` und `default_evidence_reuse = false` bleiben verbindlich. Ein neuer Commit – auch ein reiner Maintenance-/Doku-Commit – erzeugt einen **neuen Exact Head** und erfordert die für diesen Head vorgesehenen Gates erneut.

### Definition of Done je Phase

Eine GG-Phase ist erst DONE, wenn – soweit betroffen – belegt sind:

- Akzeptanzkriterien erfüllt,
- Tests mit konkreter Anzahl grün,
- Typecheck grün,
- Lint + `lint:no-console` grün,
- Production Build grün,
- `bun run docs:check` grün,
- `bun run project-status:check` grün,
- RBAC-/RLS-/Security-Nachweise grün,
- Schema-/Golden-/Import-/Backup-Gates grün, soweit betroffen,
- E2E-/Responsive-/A11y-Nachweis bei UI-Scope,
- technischer Prüfbericht neu erzeugt,
- Quality Gate grün,
- verbleibende Risiken/Findings dokumentiert,
- schriftliches Go/No-Go für die Folgephase.

### Pflicht-Dokumentationsflächen

Bei jeder fachlich oder technisch betroffenen Phase werden die relevanten Flächen synchron gehalten:

- `CHANGELOG.md` und SemVer bei produkt-/releasewirksamen Sprintabschlüssen,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`,
- `docs/PROJECT-STATUS.yaml`,
- `docs/BSF-CURRENT-PRIORITIES.md`,
- `roadmap.md`,
- `docs/SPRINT-PLAN-MVP-BSF.md`, wenn Reihenfolge/Status betroffen ist,
- technische Fach-/Architekturdokumentation,
- ADR bei Architekturentscheidungen,
- RBAC-/Security-/Data-Schema-/API-Dokumentation, soweit betroffen,
- kontextsensitive Hilfe / Benutzerhandbuch bei UI-/Bedienänderungen,
- `SYSING-001`, sobald dessen vereinbarte BSF-Fortschreibung betroffen ist,
- technischer Prüfbericht,
- Closure-/Verification-Nachweis,
- GitHub Issue/PR-Status und Abnahmekriterien.

Historische, datierte Closure-Dokumente werden nicht nachträglich umgeschrieben; aktuelle Statusquellen werden synchronisiert.

### Maintenance-Standard

Maintenance-Arbeit ist ein regulärer Qualitätsbestandteil. In jeder Phase wird mindestens geprüft:

- Doku-/Statusdrift,
- offene/stale Issues und PRs,
- Versions-/Changelog-/Tag-Konsistenz,
- Dependency-/Lockfile-Drift,
- Schema-/Generated-Type-Drift,
- tote/überholte Planverweise,
- Help-/Handbuch-Synchronität,
- Golden-Dataset-Version/Expected-Result-Konsistenz,
- Systemstatus-Evidenz gemäß AQGS: kein grüner Status ohne aktuelle belastbare Evidenz,
- technische Schulden/akzeptierte Findings mit Ticket, Begründung und Verfallsdatum.

Maintenance-Fixes dürfen keine fachlichen Expected Results oder Security-Assertions abschwächen.

### Git-Hygiene

Vor Merge/Freigabe:

- sauberer Worktree/definierter Candidate,
- nachvollziehbarer Branch/PR,
- **signierte/verifizierbare Commits gemäß Projektstandard**,
- keine produktiven Secrets,
- `git diff --check` ohne Befund,
- keine unbeabsichtigten Binär-/Generated-/Lockfile-Änderungen,
- Exact-Head-CI und Security auf dem finalen Candidate,
- kein Merge bei ungeklärtem Signatur- oder Evidence-Gap.

Planungs-/Governance-Commits erzeugen keine künstliche Produktversion. Ein produktwirksamer Sprintabschluss folgt der projektspezifischen SemVer-/CHANGELOG-Regel.

### Golden-/Demo-Governance

- Golden Fixtures sind ausschließlich synthetisch.
- Expected Results werden unabhängig vom Produktionscode festgelegt.
- Kein automatisches „Update expected“ zur Reparatur roter Tests.
- Jede fachliche Golden-Änderung benötigt Begründung und kontrollierte Dataset-Versionierung.
- Demo- und Golden-Daten dürfen keine produktiven Kunden-/Personen-/Secret-Daten enthalten.
- Provider-/Runtime-Grenzen und `UNKNOWN/PARTIAL/UNAVAILABLE/DENIED` werden ehrlich sichtbar gemacht.

## 5. Operative Reihenfolge bis zum Golden Gate

### GG-01 — BSF-03E abschließen

Status: **AKTUELL / Abschluss blockiert nur durch Signatur-Gate**

Tracking: `#63`, Draft-PR `#171`.

Pflicht:

1. fünf PR-Commits lokal signiert restacken,
2. Tree-Inhalt gegenüber dem abgenommenen Kandidaten unverändert halten,
3. Exact-Head CI + Security erneut PASS,
4. PR #171 mergen,
5. P5-Gesamtregression,
6. technischer Prüfbericht, Hilfe, Status, Changelog und Abschlussnachweis synchronisieren,
7. #63 schließen.

`P4 Bulk` bleibt optional und ist kein Golden-Gate-Pflichtumfang, solange kein fachlicher Blocker daraus entsteht.

### GG-02 — BSF-07 Managementcockpit 2

Tracking: `#140`, P0 `#174`.

Umsetzung P0–P5:

- capability-basierte Teilbereiche statt impliziter Rechteausweitung,
- fünf Sichten: Systemingenieur, Kundenverantwortlicher, Projektmanager, Teamlead, Administration/Führung,
- vorhandene AVKK-, Controlling-, Customer-Responsibility- und P3b-Verträge komponieren,
- keine zweite KPI-/Responsibility-Logik,
- Datenzustände `AVAILABLE`, `EMPTY`, `PARTIAL`, `UNKNOWN`, `UNAVAILABLE`, `DENIED`,
- `UNASSIGNED` und `NO_DUE_DATE` bleiben fachliche Zustände,
- keine Personenrankings/-scores,
- Drill-down Kunde → Projekt → AP → Ursache/AVKK,
- Golden Expected Results ergänzen.

Der vorhandene Lovable-Prototyp ist Designreferenz, nicht Source of Truth für Fachlogik.

### GG-03 — BSF-KIOSK-03 Management-Kiosk

Tracking: `#137`.

Pflicht:

- read-only Präsentation der in BSF-07 freigegebenen Managementsemantik,
- kein zweites Fachmodell und keine eigene Berechtigungslogik,
- Demo-/Golden-Provider vollständig nutzbar,
- Großbild-/Kiosk-Layout und Datenminimierung,
- keine externe Unternehmensschnittstelle erforderlich,
- reproduzierbare Browser-/Kiosk-Abnahme.

### GG-04 — BSF-03C Kunden-PDF / Kundenpaket

Tracking: `#98`.

Bis Golden Gate vollständig umsetzen:

- Sysingdashboard-Kunden-PDF,
- Kunde, Zeitraum und Datenstand,
- Projekte und Arbeitspakete,
- freigegebene Leistungen/Stunden,
- offene Arbeit und Termine,
- Datenqualität und Aussagegrenzen,
- Provenance und Datenminimierung,
- reproduzierbarer Snapshot,
- Golden-/Rendering-Abnahme.

Nicht vor Golden Gate:

- keine Runtime-Kopplung an die Reportfamilie,
- kein automatisches gemeinsames Kundenpaket aus externen Systemen.

### GG-05 — BSF-05A-light: Canonical Demo-/Import-Vertrag

Tracking: `#138`.

Bis Golden Gate bewusst auf manuelle interne Datenwege begrenzt:

- providerneutrales Canonical Import Model,
- synthetische Beispieldaten,
- manueller Dateiimport,
- Preview und Validierung,
- Provenance/Freshness/Unknown-Semantik,
- stabile Identity-/Matching-Regeln,
- deterministischer Demo-Reset,
- Export-/Import-Roundtrip.

Kein Graph, kein SharePoint-Automatikpfad, kein API-Polling, kein Webhook und kein Agent.

### GG-06 — BSF-09 Reporting 2 / Golden Reporting

BSF-09 wird vor das Golden Gate gezogen.

Pflicht:

- nutzbare interne Management-/Kundenreports,
- PDF/JSON/CSV regressionssicher,
- Reporting Expected Results im Golden Dataset,
- Datenstand und Provenance,
- Missing/Unknown korrekt,
- vollständig aus internen MVP-/Demo-Daten erzeugbar.

### GG-07 — Produkt- und Dokumentations-Hardening

Der bisherige DOC-01/02/03-Block wird als Golden-Gate-Hardening gebündelt.

Pflicht:

- Benutzerhandbuch/Hilfe vollständig aktuell,
- rollen- und routenspezifische Hilfe,
- belastbarer Systemstatus: Version, Datum, Git-/Build-Stand, Backend-/Datenstatus,
- technischer Prüfbericht aktuell zu Auth, RBAC, RLS, Supabase, DB, Security, Tests, Backup/Restore und Providergrenzen,
- AQGS-Nachweise,
- Changelog/SemVer/Tags konsistent,
- Dokumentationsdrifts wie `#173` schließen.

### GG-08 — Demo-/Golden-Baseline finalisieren

Pflicht:

- vollständig synthetische und versionierte Daten,
- feste Referenzzeit und stabile IDs,
- Customer, Project, WorkPackage, Activity,
- AVKK und Responsibility,
- Controlling und Leistungsnachweis,
- Managementcockpit und Kiosk,
- Kunden-PDF/Reporting,
- Negativfälle: Cross-Customer, Cross-Systemhouse, DENIED, UNKNOWN, PARTIAL, UNAVAILABLE, UNASSIGNED, NO_DUE_DATE,
- Expected Results unabhängig von Produktionscode,
- kompletter E2E-Demopfad ohne echte Unternehmensdaten.

### GG-09 — FINAL GOLDEN GATE

Golden Gate ist nur PASS, wenn alle vier Gate-Gruppen erfüllt sind:

#### Funktion

- Kernworkflow Customer → Project → WorkPackage → Activity vollständig nutzbar,
- Zeit/Leistung und Leistungsnachweis nutzbar,
- AVKK/Responsibility/Vertretung nutzbar,
- Managementcockpit nutzbar,
- Management-Kiosk nutzbar,
- Kunden-PDF/Reporting nutzbar,
- manueller Import/Export nutzbar,
- Backup/Restore geprüft.

#### Auth / Security

- Auth/MFA gemäß MVP-Vertrag,
- RBAC-Matrix vollständig,
- RLS/Customer Scope vollständig,
- IDOR/BOLA/Cross-Scope negativ getestet,
- keine Service Role im Browser-Normalpfad,
- keine CRITICAL/HIGH Security Findings,
- Supabase Advisor geprüft,
- keine Secrets in Code/Doku/Prompts.

#### Qualität

- vollständige CI PASS,
- Security PASS,
- Unit/Integration/E2E PASS,
- Browser-/Responsive-Matrix PASS,
- Accessibility PASS,
- Production Build PASS,
- Schema Drift PASS,
- Backup/Restore PASS,
- Technical Debt / Quality Gate PASS,
- technischer Prüfbericht aktuell.

#### Demo / Golden

- Golden Dataset Validator PASS,
- alle Golden Expected Results PASS,
- kompletter E2E-Demopfad reproduzierbar,
- keine externe Schnittstelle für die Demo erforderlich,
- Microsoft Graph ist für das Golden Gate nicht erforderlich.

## 6. Promptplanung ab 2026-10-11

### Zählregel

Ein **Arbeitsprompt** ist ein klar abgegrenzter Arbeitsauftrag mit eigenem Ziel, Scope, Tests und Abschlussstatus. Reine Statusabfragen oder automatische CI-Reruns ohne neuen Arbeitsauftrag zählen nicht.

Ein **Lovable-Prompt** ist die Teilmenge der Arbeitsprompts, die gezielt für UI/Preview, Browserabnahme oder plattformspezifische Prüfung an Lovable geht.

Dokumentation, Maintenance, Git-Hygiene und Closure sind **in den Gesamt-Arbeitsprompts jeder Phase bereits enthalten**. Sie werden nicht ans Ende verschoben.

Die Zahlen sind Planungsbereiche, kein Verbrauchsziel. Weniger Prompts sind ausdrücklich erwünscht, wenn dasselbe Gate belastbar mit einem kleineren Arbeitslauf erreicht wird.

<!-- prettier-ignore -->
| Phase | Kurzinhalt | Geplante Arbeitsprompts gesamt | davon Lovable | Doku/Maintenance im Budget |
|---|---|---:|---:|---|
| GG-01 | BSF-03E Abschluss | 3–5 | 0 | Signatur, P5, Status-/Closure-Sync |
| GG-02 | BSF-07 Managementcockpit 2 | 8–12 | 2–4 | Vertrag, Security, Golden, Help, Closure |
| GG-03 | Management-Kiosk | 6–9 | 2–3 | Kiosk-Doku, Datenminimierung, Status, Closure |
| GG-04 | Kunden-PDF | 6–9 | 1–2 | Reportvertrag, Rendering-Nachweis, Handbuch |
| GG-05 | Canonical Demo-/Import-Vertrag | 5–8 | 0–1 | Importvertrag, Beispiele, Provenance, Doku |
| GG-06 | Reporting 2 | 5–8 | 1–2 | Reportingvertrag, Expected Results, Doku |
| GG-07 | Produkt-/Doku-Hardening | 4–6 | 0–1 | Schwerpunkt Doku-/Maintenance-/Governance-Sync |
| GG-08 | Demo-/Golden-Baseline | 5–8 | 1–2 | Golden-Versionierung, E2E-Demo, Closure |
| GG-09 | Final Golden Gate | 3–5 | 1 | Final-Audit, Prüfbericht, Status, Go/No-Go |

**Gesamtplanung bis Golden Gate: ca. 45–70 Arbeitsprompts.**  
Davon voraussichtlich **8–16 Lovable-Prompts**.

Diese Schätzung enthält die verbindlichen Dokumentations-, Maintenance-, Security-, Git- und Abschlussarbeiten. Es gibt **keinen separaten „später machen wir die Doku“-Block**.

Wenn GitHub CI, Codex oder lokale Tests einen Nachweis besser und reproduzierbarer liefern, wird Lovable dafür nicht eingesetzt.

## 7. Themen nach dem Golden Gate

Nach erfolgreichem GG-09 folgt eine neue Planungsbaseline:

1. BSF-04 zentrale/synchronisierte Datenstrategie, soweit dann noch erforderlich,
2. BSF-04A Vorlagen / wiederkehrende AP und Tätigkeiten,
3. BSF-06 Docker / Betreiberhoheit / Installierbarkeit,
4. Integration Readiness,
5. Microsoft Entra ID,
6. Microsoft Graph,
7. SharePoint / Exchange / PRTG,
8. Azure SQL / Azure Storage,
9. MCP / Agenten / NAVIS,
10. weitere Automatisierung.

## 8. Golden-Gate-Grundsatz

**Das Golden Gate bewertet ein vollständiges, stabiles, sicheres und reproduzierbares Produkt mit Demodaten – nicht die Anzahl bereits angeschlossener externer Systeme.**

Externe Automation folgt erst, wenn die interne Fachsemantik über Golden Dataset, Expected Results, Security- und E2E-Gates stabil bewiesen ist.

## 9. Traceability

- Golden-Gate-Tracking: `#175`
- aktueller Abschluss-Sprint: `#63` / PR `#171`
- Managementcockpit: `#140` / P0 `#174`
- Management-Kiosk: `#137`
- Kunden-PDF: `#98`
- Canonical Import: `#138`
- Dokumentationsdrift Golden 1.1.0: `#173`
- Docker/Post-Golden-Gate: `#121`

Dieses Dokument ist nach Merge die operative Planungsbaseline für den Weg bis zum Golden Gate. Historische Planungs- und Closure-Dokumente bleiben als Evidenz unverändert.
