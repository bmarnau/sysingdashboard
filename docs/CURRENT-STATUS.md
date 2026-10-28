# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-10-28

## Aktueller Wiederanlaufpunkt (Golden Gate, 2026-10-28)

Das Golden Gate steht in der Testphase mit Demodaten (Bernd, Petra, Alex, Alexa).
Maßgeblich sind `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml` (Plan, Pakete, Risiken),
`docs/GOLDEN-GATE-TESTPROTOKOLL-2026-10-25.md` (T1–T9, Mängel M1–M4) und
`docs/MERGE-CHECKLISTE-GOLDEN-GATE.md` (Reihenfolge der Merges und Tests nach dem Publish).
`main` zuletzt geprüft auf `13c7ddc` (nach PR #232). **Publish bleibt No-Go**, bis das Lovable-Team die Auth-Broker-
Abweichung und die Publish-Quelle klärt (R-07, `docs/LOVABLE-PUBLISH-PRUEFUNG.md`).
Kunde B: Verantwortliche per Datenauftrag gesetzt (2026-10-25, 17:49) und in der App bestätigt (Test T10, 2026-10-26). L0c ist abgeschlossen.
Verbleibend bis zum Publish: Lovable-Antwort zu R-07, Sichtprüfung von TD-01 in der App, Test N1 bis N5 auf der veröffentlichten App. Git aufgeräumt (82 Remote-Branches, 0 gemergt, Auto-Delete aktiv): `docs/GIT-AUFRAEUMEN.md` Abschnitt 6.
Offen: Draft-PR #222 (QS-06, `billing.view`) bleibt bis nach dem Golden Gate ungemergt; PR #155 und Draft-PR #124 unverändert. Konzept L2-Cockpit: `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` (gemergt mit PR #223).
Wartebedingung: inhaltliche Antwort eines Lovable-Mitarbeiters (Eingangsbestätigung des KI-Agenten liegt seit 2026-10-26 vor, Frist 24 Stunden an Werktagen). Der Branch
`lovable-sync-1792847779` ist das Lovable-Backup mit Auth-Broker und wird nicht gemergt.
Nächste Schritte (Stand 2026-10-28): (1) Sichtprüfung TD-01 erfolgt am 2026-10-28 (Verteilung entspricht dem Soll); Befund TB-7 (Angebotsunterstützung ohne Verantwortlichen) zu klären. (2) Antwort des Lovable-Teams zu R-07 auswerten (seit 2026-10-27 überfällig; Nachfass am 2026-10-28 versendet und mit dem offenen Ticket zusammengeführt, keine inhaltliche Antwort; bei Ausbleiben bis 2026-10-29 abends Eskalation im Ticket); Publish bleibt bis dahin No-Go. (3) Nach Klärung: Publish, Test N1 bis N5, Tag v1.69.0. (4) QS-06 (Draft-PR #222) vor BSF-06. (5) L2: Merge-Reihenfolge der Drafts #226, #231, #233, #234 mit Integrationsabnahme (P3 enthält P2b nicht; lokale Integrationsprobe 2026-10-28 ohne Code-Konflikte, 88 Tests grün), dann P4 und Hilfe (L2-12). Meilensteine und Schätzung: ADR-0038 (angenommen 2026-10-28) und `roadmap_schaetzung` im Tracker; bis Golden Gate 9 Pakete, 26 bis 43 Arbeitstage (bei 1 bis 2 Tagen pro Woche grob 2 bis 6 Monate), bis BSF unbestimmt; MVP formal abgeschlossen (PR #60).
Entschieden 2026-10-26: TD-01 Stufe b läuft relativ zu heute (Stufe 0 ausgeführt, Schreibauftrag in `docs/DATENAUFTRAG-TD01-AUFFRISCHUNG.md` vorbereitet und lokal getestet, Freigabe 1 erteilt 2026-10-26 20:36; der Versuch am 2026-10-27 scheiterte am Zugriff von Work, nichts geschrieben; ausgeführt am 2026-10-28 mit Stichtag 2026-10-28 in der SQL-Konsole des Lovable-Projekts, Postflight 7 von 7 gleich Soll, Rückbau nicht ausgelöst; Sichtprüfung in der App steht aus). L2-Cockpit freigegeben, P1 als Draft-PR #226 und P2 (Server-Lesepfad) als Draft-PR #231, der AVKK-Server-Lesepfad (P2b) als Draft-PR #233 und die Route (P3) als Draft-PR #234 (alle nicht gemergt, CI grün); offen sind die Integrationsabnahme beider Zweige und die Rollenabnahme (P4). ADG-PR #15 gemergt.
Vorbereitet: Datenauftrag Kunde B, Stufe 0 (read-only), `docs/DATENAUFTRAG-KUNDE-B-VERANTWORTLICHE.md`;
nächster Schritt dort ist die Ausführung des Berichts durch den Nutzer in Lovable/Work.
Nach dem Golden Gate: QS-04 (Auth-Mail), QS-06 (Abrechnungsdaten nach Rolle,
`docs/QS-06-VIEWER-ABRECHNUNG.md`), danach BSF-06 (Docker). Konzepte: `docs/PW-01-PASSWORT-AENDERN.md`,
`docs/TD-01-STUFE-B-KONZEPT.md`.

## Vorheriger Wiederanlaufpunkt (BSF-03E, 2026-10-15)

**BSF-03E ist nach P5-Gesamtabnahme abgeschlossen; nächster geplanter
Fachsprint ist BSF-07.** GitHub-Stand:
`main@008c798af1c6901c23526eaab1cf1b8e0242676a` nach dem signierten Squash-Merge
von PR #185.

Die AP-Arbeitssicht auf `/verantwortungen` verwendet dieselbe serverseitig
autorisierte AP-Menge für alle drei Gruppierungen. Ein unabhängiger Review
entdeckte und schloss vor Merge zusätzlich den Same-Account-Revalidierungsfall,
ohne die unmittelbare Invalidation bei Konto- oder Berechtigungswechseln
abzuschwächen.

GG-01 ist abgeschlossen: Die drei BSF-03E-Migrationen wurden 3/3 atomar auf die Lovable-verwaltete Supabase-Datenbank angewendet; History, RLS/Policies, Funktionen, Trigger, Indizes und Berechtigungen sind im Postflight bestätigt. Nachweis: `docs/BSF-03E-DATABASE-SYNC-2026-10-14.md`.

Exact-Head-CI #1403, Security #1401 sowie Post-Merge-CI #1404 und Security #1402
sind vollständig PASS. Der frische read-only Lovable-Check bestätigt weiterhin
Migration History, RLS, Policies, Funktionen, Trigger, Index und Due-Projektion.
Abschlussnachweis: `docs/BSF-03E-CLOSURE-2026-10-15.md`. Es erfolgte kein Release
und kein Deployment. Die nachfolgenden datierten Abschnitte dokumentieren
frühere Evidenzstände.

## Zweck

Dieses Dokument benennt die aktuell maßgeblichen Status- und Abnahmequellen. Ältere Sprint-, Planungs- und Release-Candidate-Dokumente bleiben als historische Evidenz erhalten, sind aber für Aussagen zum aktuellen BSF-Stand nachrangig.

## Aktuelle Referenzen

Für den F-11-/MVP-Abschluss gelten weiterhin in dieser Reihenfolge:

1. `docs/F11-MVP-CONSOLIDATION-2026-08-24.md`
2. `docs/ROLE-ACCEPTANCE-09C-FINAL-2026-08-24.md`
3. `docs/MVP-CLOSURE-STATUS-2026-08-24.md`
4. `docs/MVP-ACCEPTANCE-REPORT-FINAL-2026-08-24.md`
5. die mit PR #39 nach `main` übernommene F-11-Runtime-Evidenz
6. der laufaktuelle technische Prüfbericht aus dem jeweils letzten vollständig grünen CI-Lauf

Für den laufenden BSF-Ausbau gelten zusätzlich:

1. `docs/BSF-CURRENT-PRIORITIES.md` — operative Reihenfolge und aktueller Wiederanlaufpunkt,
2. `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md` — verbindliche interne Kiosk-first-Reihenfolge,
3. `docs/BSF-03B-CLOSURE-2026-09-21.md` — Abschluss BSF-03B „Teamlead-Leistungsnachweis V1“,
4. `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` — abgeschlossener KIOSK-02-Nachweis,
5. `docs/BSF-03A-CLOSURE-2026-09-14.md` — abgeschlossener BSF-03A-Nachweis,
6. `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` — abgeschlossener KIOSK-01-Nachweis,
7. `docs/BSF-03E-CLOSURE-2026-10-15.md` — P5-Gesamtabnahme und Abschluss,
8. `docs/BSF-03E-DATABASE-SYNC-2026-10-14.md` — abgeschlossener GG-01-Datenbanknachweis,
9. `docs/SPRINT-PLAN-MVP-BSF.md` — operative Sprintfolge,
10. `docs/BSF-01-ARCHITECTURE-BASELINE.md` — Architektur-Baseline,
11. `docs/ADR/0029-systemhouse-customer-scope.md` — kanonischer Systemhaus-/Customer-Scope,
12. `docs/BSF-CONCEPT-REGISTER.md` — gesicherte fachliche Entscheidungen,
13. `docs/BSF-02B-IMPLEMENTATION.md` — umgesetzte Systemhouse-Membership-/Customer-Access-Grenze,
14. `docs/BSF-03-CLOSURE-2026-09-13.md` — Abschluss Kundenverantwortung/Kundensicht,
15. `docs/BSF-03D-CLOSURE-2026-09-13.md` — Abschluss Arbeitspaket-Kategorien,
16. `docs/BSF-03B-VERIFICATION-2026-09-21.md` — DB-/Security-/Regressionsnachweis für BSF-03B,
17. `docs/CODEX-GIT-CI-RULE.md` — projektweite Minimal-Fix-, Eskalations- und Git-/CI-Werkzeugregel.

Historische Dokumente werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und werden durch die oben genannten laufenden Quellen fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Kandidat: `1.69.0`; BSF-03E ist integriert und P5-abgenommen. Der veröffentlichte GitHub-Release bleibt bis zur separaten Release-Veröffentlichung `v1.65.0`.
- Produktiver MVP-/BSF-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und Microsoft Entra ID: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen BSF-Schritts
- Lovable: veröffentlichte Referenzumgebung und gezieltes Implementierungs-/Preview-Werkzeug, keine fachlich unersetzbare Laufzeitlogik und keine Merge-/Release-Instanz
- Lokale Toolchain: optional; Bun/Node können bei vorhandenem Repository-Checkout genutzt werden, ein lokaler Clone ist keine allgemeine Projektvoraussetzung
- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben getrennte Verantwortungsbereiche
- Docker-/Container-Portabilität sowie Azure-/Entra-Migrationsfähigkeit bleiben verbindliche Architekturziele
- MVP bleibt **100 % / BASELINE READY**; der aktive Entwicklungshorizont ist **BSF — Betriebsfähiges Systemhaus-Fundament**.

## Aktueller Arbeitsstand 22.09.2026

- BSF-KIOSK-02 / PR #147 ist nach vollständiger Abnahme auf `main` gemergt; Release `v1.65.0` ist veröffentlicht.
- BSF-03B / Issue #107 ist **FINAL DONE und gemergt**. PR #149 wurde als GitHub-signierter Squash-Commit `12b37be8ce8e5e8e3668d6622ace13872a7f3c48` nach `main` integriert. Der zuvor vollständig grüne Exact-Head und der Merge-Commit besitzen denselben Git-Tree `25ae707e08726f6d357c940a983afc14552d5b03`.
- Der erste Post-Merge-CI am 22.09. deckte einen **kalendertagsabhängigen E2E-Harness-Escape** auf: die BSF-03B-Fixtures endeten fest am 21.09., während der Produktdefault korrekt „aktueller Monat bis heute“ verwendete. Dadurch wurden am 22.09. korrekt erzeugte Fixture-Snapshots beim Test-Refresh aus der Historie gefiltert. PR #152 korrigierte ausschließlich die Test-Referenzzeit; Produktlogik, Assertions, Expected Results, DB, RBAC und RLS blieben unverändert. Der Fix ist als GitHub-signierter Commit `1ca8f0937a7217de74050061ae39c9c3f028784c` auf `main`; der PR-Gate-Lauf bestätigte **110/110 Playwright PASS**.
- **BSF-03E / #63 ist abgeschlossen.** P0–P3b sind integriert, P5 ist belegt; P4-Bulk bleibt bewusst optional und nicht freigegeben. Nächster geplanter Fachsprint ist **BSF-07 / #140**.
- Patch 1.65.1 ergänzt die sichtbare Versions-/Datumsangabe sowie den AQGS-evidenzkalibrierten Systemstatus und ist vollständig abgenommen. Der korrigierte read-only Lovable-Exact-Head-Retest bestätigt Fresh-Refresh, Fail-closed-Verhalten, beide Zielauflösungen und Tree-Integrität; der frühere Fresh-Refresh-FAIL war ein Harness-False-Negative. Commitbezogene CI-/Security-Aussagen werden weiterhin ausschließlich aus den jeweiligen GitHub-Actions-Runs abgeleitet.

## Aktueller BSF-Stand

### BSF-02 / BSF-02C — DONE

Die minimale gemeinsame Mehrbenutzer-Daten-/Read-Basis einschließlich Shared Projection, transaktionaler Publish-RPC und Runtime-Publish-/Read-Pfad ist abgeschlossen. T01–T30 und T31–T51 einschließlich Atomic Rollback, Security Advisor sowie vollständige CI-/Security-/E2E-/Accessibility-/Technical-Debt-/Quality-Gates sind PASS.

### BSF-03 — DONE / Issue #105

BSF-03 „Kundenverantwortung und Kundensicht“ ist mit P1–P5 fachlich abgeschlossen. P1/P2 lieferten das Datenbank-/Security-Fundament, P3/P4 die persönliche fail-closed Sicht **Meine Kunden** und das read-only Kundendetail, P5 ergänzt die getrennte Managementsicht **Kundenverantwortung**.

Verbindlicher Endzustand:

- Responsibility ist Beziehung/Scope und keine globale Rolle,
- Responsibility allein erzeugt weder `customer_access` noch Schreibrechte,
- `Meine Kunden` bleibt die Schnittmenge aus aktiver Membership, eigener aktiver Responsibility, Customer Access >= read und `dashboard.view`,
- `Kundenverantwortung` ist getrennt und nur mit `customer.responsibility.manage` nutzbar,
- Systemadministrator, Administrator und Teamlead verwalten Responsibility im eigenen Systemhaus auch ohne eigenen operativen Customer Access,
- Kandidaten werden nur als ID + Anzeigename geliefert; die Self-only-RLS wurde nicht verbreitert,
- Wechsel erfolgt atomar und historisiert,
- Cross-Systemhouse, IDOR/BOLA, Viewer/Customer-Ziele und manipulierte Browserrollen bleiben DENY.

P5-Evidenz: Migration `20260913150000_bsf03_p5_responsibility_management`, SQL-Vertrag R19–R31, Live-Read-only-Prüfung von Funktionsmodus/Grants/RLS sowie 90 Unit-/Component-Testdateien mit 704 PASS / 4 TODO auf dem geprüften Funktions-Head. Abschlussnachweis: `docs/BSF-03-CLOSURE-2026-09-13.md`.

### BSF-03D — DONE / Issue #103

Arbeitspaket-Kategorien sind mit Version 1.62.0 als systemhausweit editierbarer Katalog `workpackage.category` umgesetzt: Scope `systemhouse`, keine Seed-Werte, Key unveränderlich, deaktivieren statt löschen, `WorkPackage.categoryKey?: string | null` mit Default „keine Kategorie“, Tags unabhängig und keine Ableitung von billable/priority/status. JSON-Schema 1.2.0 bleibt für Import/Export/Backup/Restore rückwärtskompatibel.

Abschlussnachweis:

- Live-SQL-Artefakt `supabase/tests/bsf03d-workpackage-category.sql`: **T01–T16 16/16 PASS** mit Rollback,
- Live-Schema-Vertrag PASS,
- Security Advisor ohne neues BSF-03D-Finding gegenüber SEC-01,
- vollständiger Gate-Lauf einschließlich Typecheck, Lint, Prettier, Unit/Component, A11y, Security, Technical Debt, Docs, Projektstatus, Build, E2E und Quality Gate PASS,
- PR/Merge nach `main` abgeschlossen; Issue #103 geschlossen,
- Nachweise: `docs/BSF-03D-VERIFICATION-2026-09-13.md` und `docs/BSF-03D-CLOSURE-2026-09-13.md`.

### BSF-KIOSK-01 — DONE / Issue #135

Der Info-Kiosk-Demo-Pilot wurde mit PR #141 am 2026-09-17 nach `main` integriert. Merge-Commit: `91adefa97054aa3cbc6ad03e4cb2a58b868e4e75`. Post-Merge Security #849 und CI #855 sind PASS. Der Kiosk bleibt read-only, nutzt in KIOSK-01 ausschließlich synthetische Demo-Daten und besitzt keine produktive Graph-/SharePoint-/Exchange-/PRTG-/MCP-/Agenten-Anbindung. Abschlussnachweis: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`.

### BSF-03A — DONE / Issue #106

BSF-03A ist am 19.09.2026 nach vollständiger Finalabnahme mit PR #144 nach `main` integriert worden. Merge-Commit: `b9aef5aa9b3174f2abd022e11d492190102933a4`.

Finaler Kandidaten-Head `763cf874b9f5bb8fadbd2875d7e11f0bd7165361`:

- Security #989: **PASS**,
- CI #995: **PASS**,
- Quality Gate: **PASS / 0 Blocker**,
- Golden Dataset V1: **PASS**,
- targeted Vitest: **11 Dateien / 66 Tests PASS**,
- Project-Controlling E2E und Scope-Security E2E: **PASS**,
- isolierter Lovable-Exact-Tree-Nachweis: **TREE_MATCH JA**,
- 1920×1080 und 1366×768: **PASS**,
- Filterhierarchie, KPI/Trend/Drill-down, Read-only UI, Runtime Console und Network/ServerFn: **PASS**.

Die produktive Lovable-Codebasis war wegen historischer Drift nicht Prüfobjekt; die Abnahme erfolgte gegen einen frischen temporären Checkout des exakten GitHub-Kandidaten. Keine versionierte Datei und keine DB-/Auth-/RBAC-/RLS-/Providerlogik wurde durch die Finalabnahme verändert. Abschlussnachweis: `docs/BSF-03A-CLOSURE-2026-09-14.md`.

### BSF-KIOSK-02 — FINAL DONE / READY FOR MERGE / Issue #136

KIOSK-02 bindet den bestehenden Info-Kiosk an den serverseitig abgesicherten BSF-03A-Read-/Controlling-Vertrag an. Der Demo-Pfad bleibt unverändert erhalten; im expliziten internen Modus entsteht eine **Hybrid-Sicht**:

- INTERN: Projekte, Arbeitspakete und Tätigkeiten,
- DEMO: Verfügbarkeit, Infrastruktur und Support,
- bei internem Fehler: **NICHT VERFÜGBAR**, kein stiller Demo-Fallback.

Der technische Kiosk-Account bleibt ausschließlich auf `kiosk.view` begrenzt. Interne Leistungsdaten erfordern serverseitig `project.controlling.view` sowie die bestehenden Membership-, Customer-Access- und RLS-Grenzen. Es wurde keine neue Permission, Tabelle, Migration oder Kiosk-spezifische Aggregationslogik eingeführt.

Finaler Lovable-Funktionskandidat:

`528b5bc8373a51b7c3e946241b07467bd3245dd9`

Nachweise:

- Git tree EXPECTED = ACTUAL = `ab0a5655485c50f9b7be5f3c8fa0a36166aeb949`,
- Tree Match: **JA**,
- targeted Vitest: **11 Dateien / 69 Tests PASS**,
- Golden Dataset V1: **PASS**,
- Kiosk Demo/Internal/Security E2E: **PASS**, zusammen **9/9**,
- 1920×1080 und 1366×768: **PASS**,
- exakt **3× INTERN** und **3× DEMO**,
- Zeitraum und echte Source-Freshness sichtbar,
- Datenminimierung, Read-only UI, Runtime Console und Network: **PASS**,
- Fail-closed / kein Demo-Fallback: **PASS**,
- `client.ts` Drift: **NEIN**,
- `previewAuthStorage.ts` im Kandidaten: **NEIN**,
- Migration oder DB-/Auth-/RBAC-/RLS-Änderung: **NEIN**,
- versionierte Dateien im Prüfobjekt verändert: **NEIN**.

Der vorherige GitHub-Code-/Dokumentationskandidat war bereits mit Security #1092 und CI #1098 vollständig grün. Die abschließenden Statusdokumente laufen vor Merge erneut durch die normalen Required Checks.

BSF-KIOSK-02 gilt damit als **FINAL DONE**. PR #147 ist auf `main` gemergt; Release `v1.65.0` ist veröffentlicht. Abschlussnachweis: `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md`.

### BSF-03B — FINAL DONE / Issue #107

Der Teamlead-Leistungsnachweis V1 ist abgeschlossen. Er trennt die operative Shared Activity vom revisionsgebundenen Billable-Review, finalisiert atomar in unveränderbare Snapshots, verhindert Doppelverwendung über Claims und unterstützt Replacement-Versionen sowie PDF/CSV/JSON aus dem finalen Snapshot.

Abschlussnachweise:

- Permission `performance.statement.manage`: Teamlead regulär, Systemadministrator Break-glass; übrige Fachrollen DENY,
- Migration `20260921095742_bsf03b_performance_statement` live,
- RLS auf allen fünf BSF-03B-Tabellen; kein anon/PUBLIC-DML,
- interne SECURITY-DEFINER-Funktionen mit `search_path=""` und ohne direktes authenticated/anon/PUBLIC-EXECUTE,
- Security #1247 PASS,
- CI #1252 PASS einschließlich Golden Dataset, vollständiger BSF-02C/03A/03B-Regression, E2E, A11y, Backup/Restore und Quality Gate,
- offizieller Supabase Security Advisor BASELINE_ONLY, keine neuen BSF-03B-Findings,
- Lovable Exact-Head Visual Preview: NOT EVIDENCED wegen fehlender identitätsgebundener GitHub-Head-Bindung; nicht als PASS umgedeutet,
- Abschluss: `docs/BSF-03B-CLOSURE-2026-09-21.md`.

PR #149 ist nach vollständiger Exact-Head-Abnahme nach `main` gemergt. Der nachgelagerte E2E-Harness-Escape und seine rein testseitige Korrektur sind in Issue #107 und PR #152 dokumentiert.

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

`Role Preview` ist für den MVP **N/A — kein Produktbestandteil**. Es wird kein künstliches Impersonation-/Preview-Feature nur zur Erfüllung eines historischen Prüfpunkts gebaut.

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

### PR #65 — laufenden Status korrigiert

- ausschließlich `docs/CURRENT-STATUS.md` auf den wirksamen MVP-/Post-MVP-Stand fortgeschrieben,
- historische Abschlussdokumente bewusst unverändert gelassen,
- Security #404: PASS,
- CI #413: PASS einschließlich Docs-Sync, E2E, Technical Report und Quality Gate,
- Merge-Commit: `ea28740cca3512bc5ca21e874e83985312de85d9`,
- Issue #64 als `completed` geschlossen.

### Lovable-Governance-Vorfall und Recovery PR #66

Am 24.08.2026 erzeugte ein ausdrücklich als Plan-/Analyseauftrag ohne Code-/GitHub-Änderung gestarteter Lovable-Lauf dennoch direkte Änderungen auf dem damals ungeschützten GitHub-Branch `main`:

- Commit `2f6ea1050ba5bc27938a793c970ae729df05641f` änderte unbeauftragt `src/integrations/supabase/client.ts` und fügte `src/integrations/supabase/previewAuthStorage.ts` hinzu,
- Commit `0e561578beae51c4850ecffeeed337af22233c23` fügte `.lovable/plan.md` hinzu,
- Merge `f60b7ed06efac220cb5ca6899c4eedea74ee2a55` gelangte ohne PR-/CI-Pfad direkt auf `main`.

Der Drift wurde bewusst nicht per Direkt-Revert korrigiert. Recovery erfolgte über Branch + PR #66:

- Recovery-Head `4ccedb3531edeb4fda8a4c62e48f86f741494dae`,
- die drei unbeauftragten Dateiveränderungen vollständig entfernt bzw. zurückgesetzt,
- Vergleich gegen den zuvor vollständig abgenommenen Stand `ea28740cca3512bc5ca21e874e83985312de85d9`: **keine Dateiabweichung**,
- Security #407: PASS,
- CI #416: PASS,
- Static / Unit & Components / Backend / API / RBAC & Security / Import/Export / Backup/Restore / Production Build / Playwright E2E / Accessibility / Technical Debt: PASS,
- `14 · Technical Report & Quality Gate`: PASS,
- Merge mit Expected-Head-SHA.

Recovery-Referenzstand nach PR #66:

`425fbed6cecbf5900a0eda17c735f90221d31d8d`

Der vollständige Dateibaum dieses Recovery-Referenzstands ist gegenüber `ea28740...` identisch. Nachfolgende reine Governance-/Dokumentationsänderungen ändern diese technische Recovery-Aussage nicht; für den jeweils aktuellen GitHub-HEAD ist `main` selbst die maßgebliche Quelle.

### PR #68 — Lovable-Governance dauerhaft dokumentiert

- `docs/CURRENT-STATUS.md` und `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md` auf den nach Recovery #66 geltenden sicheren Kooperationsmodus fortgeschrieben,
- Lovable-Planmodus-Vorfall als Governance-Evidenz verankert,
- isolierte Project Variant / Nicht-main-Arbeitsfläche als bevorzugter Lovable-Arbeitsmodus dokumentiert,
- Security #411: PASS,
- CI #420: PASS einschließlich Docs-Sync, E2E sowie `14 · Technical Report & Quality Gate`,
- Issue #67 als `completed` geschlossen.

### PR #70 — aktiven Branch-Schutz in laufender Governance festgeschrieben

- `docs/CURRENT-STATUS.md` und `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md` auf das aktive Ruleset fortgeschrieben,
- Security #413: PASS,
- CI #422: PASS einschließlich E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate`,
- Merge mit Expected-Head-SHA,
- Issue #69 als `completed` geschlossen.

### PR #74 — operative BSF-Prioritäten und Lovable-Einsatz

- neue tägliche Source of Truth `docs/BSF-CURRENT-PRIORITIES.md`,
- `docs/SPRINT-PLAN-MVP-BSF.md` auf den priorisierten Nutzwertpfad synchronisiert,
- Projektmanager-Leistungssicht als BSF-03A und Teamlead-Leistungsnachweis als BSF-03B vorgezogen,
- Dokumentationskonsolidierung sowie SYSING-001/TDF und Board-Zugriff als eigene DOC-Schritte verankert,
- Lovable-Einsatz je priorisiertem Punkt und 5-Credit-Tagesregel dokumentiert,
- Security #416: PASS,
- CI #425: PASS einschließlich Docs-Sync, E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate`,
- Issue #71 als `completed` geschlossen.

### PR #128 — BSF-03 P3/P4 „Meine Kunden“

- nach Synchronisierung mit aktuellem `main` vollständig gegatet und gemergt,
- Security #592: PASS,
- CI #599: PASS,
- 696 Tests PASS / 4 TODO,
- vollständige E2E-/Accessibility-/Technical-Debt-/Technical-Report-Gates PASS,
- Merge-Commit `a9f40cb56aed7bdfd7d0baef2d9023755923967c`,
- kein Deploy.

### PR #129 / #130 — Git-/CI-Governance

- #129 schreibt Codex als bevorzugtes Werkzeug für Git-/CI-Fehler fest,
- #130 ergänzt Verhältnismäßigkeit/Minimal-Fix, 15–20-Minuten-Eskalation, Umgebungsprüfung und Fallback-Regel,
- #130 Exact Head: Security #594 PASS, CI #601 PASS,
- keine Produkt-, DB-, RLS-, RBAC-, Auth- oder Runtime-Änderung.

## Branch Protection aktiv — Issue #53 abgeschlossen

Issue #53 ist seit 25.08.2026 **CLOSED / COMPLETED**. GitHub schützt den Default-Branch `main` technisch mit dem Repository-Ruleset `main-release-governance`.

Verifizierter Ruleset-Stand:

- Ruleset-ID: `21372842`,
- Enforcement: `active`,
- Target: `~DEFAULT_BRANCH` (`main`),
- GitHub Branch API: `protected: true`,
- Bypass-Liste: leer,
- `current_user_can_bypass: never`,
- Branch-Löschung blockiert (`deletion`),
- Force-/Non-Fast-Forward-Pushes blockiert (`non_fast_forward`),
- Pull Request vor Merge verpflichtend,
- Required approvals: `0`,
- Required Check: `14 · Technical Report & Quality Gate`,
- Required Check: `Secrets, Headers, Azure-Strings`,
- `strict_required_status_checks_policy: true` — der PR-Branch muss vor Merge mit dem aktuellen `main` abgeglichen sein.

Damit ist die organisatorische PR-/CI-Regel durch GitHub selbst technisch erzwungen. Die klassische Branch-Protection-Unterstruktur kann weiterhin `protection.enabled: false` melden; maßgeblich sind `protected: true` und das aktive Ruleset.

### Lovable-/Werkzeugregel unter aktivem Branch-Schutz

Branch Protection ist eine letzte technische Sicherheitsgrenze und ersetzt nicht den kontrollierten Entwicklungsprozess.

- GitHub bleibt Source of Truth.
- Änderungen werden über benannte Branches bzw. nachweislich isolierte Arbeitsflächen vorbereitet und über Pull Requests integriert.
- Lovable wird bevorzugt auf einer nachweislich isolierten Nicht-main-Arbeitsfläche eingesetzt.
- Ein Variant = ein Auftrag = ein Scope.
- ChatGPT koordiniert Scope, GitHub-Diff, Security/CI und Abnahme.
- Zusatzbefunde werden nur vorgeschlagen, nicht ungefragt umgesetzt.
- Auth/RBAC/RLS/Supabase/Migrationen/Seeds und `src/integrations/supabase/*` werden nur bei ausdrücklichem Scope geändert.
- Git-/CI-Fehler: Codex bevorzugt, sofern verfügbar; andernfalls kleinstmögliches geeignetes Fallback-Werkzeug.
- Klar lokalisierte mechanische Kleinfehler werden proportional behandelt; nach etwa 15–20 Minuten ohne Lösung wird Werkzeug/Umgebung/Root Cause/Scope neu bewertet.
- Merge erfolgt erst nach den durch das Ruleset erzwungenen Required Checks; Expected-Head-SHA bleibt zusätzliches Integritätssignal.

## BSF aktiv — aktueller roter Faden

Die operative Reihenfolge ist in `docs/BSF-CURRENT-PRIORITIES.md`, `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md` und `docs/SPRINT-PLAN-MVP-BSF.md` festgeschrieben:

`BSF-03D DONE → KIOSK-01 DONE → BSF-03A DONE → KIOSK-02 DONE → BSF-03B DONE → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`

Die kanonische Kundenidentität bleibt `(systemhouseId, customerId)`; `systemhouseId` ist providerneutral und nicht gleich Microsoft Entra Tenant ID. Kundenverantwortung bleibt Scope/Beziehung, keine globale Rolle. Der vollständige Datenhaltungsumbau bleibt BSF-04.

## Dokumentationszustand

- `docs/ENTWICKLUNGSTAGEBUCH.md` ist bis zum GG-01-Abschluss und P3b-Restack vom 2026-10-14 fortgeschrieben.
- `README.md`, `docs/PROJECT-STATUS.yaml`, `docs/BSF-CURRENT-PRIORITIES.md`, `docs/SPRINT-PLAN-MVP-BSF.md`, `roadmap.md` und dieses Dokument bilden gemeinsam den aktuellen BSF-03E-Kandidatenstand ab.
- `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` dokumentiert den abgeschlossenen KIOSK-01-Sprint; PR #141 ist auf `main`.
- `docs/BSF-03A-CLOSURE-2026-09-14.md` dokumentiert den vollständig abgenommenen und gemergten BSF-03A-Sprint; `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` ist der laufende KIOSK-02-Abnahmenachweis.
- Benutzerhandbuch und kontextsensitive Hilfe stehen auf Version **1.24.0**; P3a-Einzelaktionen, P3b-Arbeitssicht, Projektcontrolling, KIOSK-02 Hybrid-/Quellenstatus, aktuelle RBAC-/Kiosk-Rechte, Kundenverantwortung, der heutige Supabase-MVP-Betriebsmodus und die AQGS-konforme Systemstatus-Evidenzlogik sind synchronisiert.
- `SYSING-001` existiert als Living Document `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md` mit gemeinsamer Markdown-Quelle für PDF/Word.
- SYSING-001 wird in BSF-DOC-02 kontrolliert aktualisiert und TDF-konform abgenommen; es wird keine zweite Dokumentquelle erzeugt.
- BSF-DOC-03 macht die freigegebene SYSING-001-Fassung read-only aus dem Board erreichbar.
- Kontext-sensitive Hilfe und Benutzerhandbuch bleiben Teil der Definition of Done jedes betroffenen Fachsprints; BSF-DOC-01 bleibt zusätzlicher Konsolidierungsblock.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **BSF-Ausbau nach den priorisierten Kernfunktionen** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben verbindliche Abnahmekriterien.
