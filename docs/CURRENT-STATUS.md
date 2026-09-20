# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-09-19

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
3. Issue #136 und PR #147 — BSF-KIOSK-02 FINAL DONE, Merge noch ausstehend,
4. `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` — laufender KIOSK-02-Abschlussnachweis,
5. `docs/BSF-03A-CLOSURE-2026-09-14.md` — abgeschlossener BSF-03A-Nachweis,
6. `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` — abgeschlossener KIOSK-01-Nachweis,
7. `docs/SPRINT-PLAN-MVP-BSF.md` — operative Sprintfolge,
8. `docs/BSF-01-ARCHITECTURE-BASELINE.md` — Architektur-Baseline,
9. `docs/ADR/0029-systemhouse-customer-scope.md` — kanonischer Systemhaus-/Customer-Scope,
10. `docs/BSF-CONCEPT-REGISTER.md` — gesicherte fachliche Entscheidungen,
11. `docs/BSF-02B-IMPLEMENTATION.md` — umgesetzte Systemhouse-Membership-/Customer-Access-Grenze,
12. `docs/BSF-03-CLOSURE-2026-09-13.md` — Abschluss Kundenverantwortung/Kundensicht,
13. `docs/BSF-03D-CLOSURE-2026-09-13.md` — Abschluss Arbeitspaket-Kategorien,
14. `docs/CODEX-GIT-CI-RULE.md` — projektweite Minimal-Fix-, Eskalations- und Git-/CI-Werkzeugregel.

Historische Dokumente werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und werden durch die oben genannten laufenden Quellen fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Version: `1.65.0` (BSF-KIOSK-02 Feature-/Release-Kandidat; `main` steht auf 1.64.0)
- Produktiver MVP-/BSF-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und Microsoft Entra ID: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen BSF-Schritts
- Lovable: veröffentlichte Referenzumgebung und gezieltes Implementierungs-/Preview-Werkzeug, keine fachlich unersetzbare Laufzeitlogik und keine Merge-/Release-Instanz
- Lokale Toolchain: optional; Bun/Node können bei vorhandenem Repository-Checkout genutzt werden, ein lokaler Clone ist keine allgemeine Projektvoraussetzung
- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben getrennte Verantwortungsbereiche
- Docker-/Container-Portabilität sowie Azure-/Entra-Migrationsfähigkeit bleiben verbindliche Architekturziele
- MVP bleibt **100 % / BASELINE READY**; der aktive Entwicklungshorizont ist **BSF — Betriebsfähiges Systemhaus-Fundament**.

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

BSF-KIOSK-02 gilt damit als **FINAL DONE**. PR #147 wird nach grünem Dokumentations-Head merge-ready gestellt. Merge und Deploy erfolgen weiterhin nicht ohne separate Freigabe. Abschlussnachweis: `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md`.

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

`BSF-03D DONE → KIOSK-01 DONE → BSF-03A EXACT-HEAD GREEN / LOVABLE PREVIEW OFFEN → KIOSK-02 → BSF-03B → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`

Die kanonische Kundenidentität bleibt `(systemhouseId, customerId)`; `systemhouseId` ist providerneutral und nicht gleich Microsoft Entra Tenant ID. Kundenverantwortung bleibt Scope/Beziehung, keine globale Rolle. Der vollständige Datenhaltungsumbau bleibt BSF-04.

## Dokumentationszustand

- `docs/ENTWICKLUNGSTAGEBUCH.md` ist bis zum BSF-03A-Dokumentations-/Handbuch-Audit vom 2026-09-18 fortgeschrieben.
- `docs/PROJECT-STATUS.yaml`, `docs/BSF-CURRENT-PRIORITIES.md`, `roadmap.md` und dieses Dokument bilden gemeinsam den aktuellen BSF-03A-Finalverifikationsstand ab.
- `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` dokumentiert den abgeschlossenen KIOSK-01-Sprint; PR #141 ist auf `main`.
- `docs/BSF-03A-CLOSURE-2026-09-14.md` dokumentiert den vollständig abgenommenen und gemergten BSF-03A-Sprint; `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` ist der laufende KIOSK-02-Abnahmenachweis.
- Benutzerhandbuch und kontextsensitive Hilfe stehen auf Version **1.23.0**; Projektcontrolling, KIOSK-02 Hybrid-/Quellenstatus, aktuelle RBAC-/Kiosk-Rechte, Kundenverantwortung und der heutige Supabase-MVP-Betriebsmodus sind synchronisiert.
- `SYSING-001` existiert als Living Document `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md` mit gemeinsamer Markdown-Quelle für PDF/Word.
- SYSING-001 wird in BSF-DOC-02 kontrolliert aktualisiert und TDF-konform abgenommen; es wird keine zweite Dokumentquelle erzeugt.
- BSF-DOC-03 macht die freigegebene SYSING-001-Fassung read-only aus dem Board erreichbar.
- Kontext-sensitive Hilfe und Benutzerhandbuch bleiben Teil der Definition of Done jedes betroffenen Fachsprints; BSF-DOC-01 bleibt zusätzlicher Konsolidierungsblock.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **BSF-Ausbau nach den priorisierten Kernfunktionen** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben verbindliche Abnahmekriterien.
