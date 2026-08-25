# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-08-25

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

Für den laufenden BSF-Ausbau gelten zusätzlich:

1. `docs/BSF-CURRENT-PRIORITIES.md` — operative Reihenfolge und Lovable-Einsatz,
2. `docs/SPRINT-PLAN-MVP-BSF.md` — operative Sprintfolge,
3. `docs/BSF-01-ARCHITECTURE-BASELINE.md` — Architektur-Baseline,
4. `docs/ADR/0029-systemhouse-customer-scope.md` — kanonischer Systemhaus-/Customer-Scope,
5. `docs/BSF-CONCEPT-REGISTER.md` — gesicherte fachliche Entscheidungen,
6. `docs/BSF-02B-IMPLEMENTATION.md` — umgesetzte Systemhouse-Membership-/Customer-Access-Grenze (Issue #86, ADR-0031).

Historische Dokumente wie `docs/ROLE-ACCEPTANCE-09C.md`, `docs/MVP-ACCEPTANCE-REPORT.md`, `docs/MVP-CLOSURE-STATUS-2026-08-21.md` und ältere `.lovable/plan/*` werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und sind durch die oben genannten Abschlussnachweise fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Version: `1.59.6`
- Produktiver MVP-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch reale Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und Microsoft Entra ID: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen MVP
- Lovable: veröffentlichte Referenzumgebung und gezieltes Implementierungs-/Preview-Werkzeug, keine fachlich unersetzbare Laufzeitlogik und keine Merge-/Release-Instanz
- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben als getrennte Verantwortungsbereiche zu behandeln
- Docker-/Container-Portabilität sowie Azure-/Entra-Migrationsfähigkeit bleiben verbindliche Architekturziele für den weiteren Ausbau
- MVP bleibt **100 % / BASELINE READY**; der aktive Entwicklungshorizont ist jetzt **BSF — Betriebsfähiges Systemhaus-Fundament**.

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

## Branch Protection aktiv — Issue #53 abgeschlossen

Issue #53 ist seit 25.08.2026 **CLOSED / COMPLETED**. GitHub schützt den Default-Branch `main` jetzt technisch mit dem Repository-Ruleset `main-release-governance`.

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

Damit ist die frühere organisatorische PR-/CI-Regel nun durch GitHub selbst technisch erzwungen. Die klassische Branch-Protection-Unterstruktur kann dabei weiterhin `protection.enabled: false` melden; maßgeblich für den aktuellen Schutz sind `protected: true` und das aktive Ruleset.

### Lovable-Arbeitsregel unter aktivem Branch-Schutz

Branch Protection ist eine letzte technische Sicherheitsgrenze und ersetzt nicht den kontrollierten Entwicklungsprozess.

- GitHub bleibt Source of Truth.
- Änderungen werden weiterhin über benannte Branches bzw. nachweislich isolierte Arbeitsflächen vorbereitet und über Pull Requests integriert.
- Lovable wird bevorzugt auf einer **nachweislich isolierten Project Variant / Nicht-main-Arbeitsfläche** mit festem freigegebenem `base_sha` eingesetzt.
- Der Lovable-Main-Agent ist **nicht die reguläre Implementierungsarbeitsfläche**; der Planmodus-Vorfall bleibt Referenz dafür, dass ein als Analyse deklarierter Lauf Schreibwirkung haben kann.
- Ein Variant = ein Auftrag = ein Scope.
- ChatGPT koordiniert Scope, GitHub-Diff, Security/CI und Abnahme; kopierfertige Lovable-Prompts können nach verifizierter Isolation manuell übergeben werden.
- Zusatzbefunde werden nur vorgeschlagen, nicht ungefragt umgesetzt.
- Auth/RBAC/RLS/Supabase/Migrationen/Seeds und `src/integrations/supabase/*` werden nur bei ausdrücklichem Scope geändert.
- Merge erfolgt erst nach den durch das Ruleset erzwungenen Required Checks; Expected-Head-SHA bleibt zusätzliches Integritätssignal, soweit das Merge-Werkzeug dies unterstützt.

Der frühere Governance-Befund ist damit geschlossen und **kein Rückfall des fachlichen MVP-Status**.

## BSF aktiv — BSF-01 Planungs-/Architekturbaseline

Mit Abschluss des MVP ist BSF der aktive Entwicklungshorizont. Die operative Reihenfolge ist in `docs/BSF-CURRENT-PRIORITIES.md` festgeschrieben.

BSF-01 legt ohne Produktcode die verbindliche Architekturgrundlage für Kundenmodell, Kundenverantwortung und Leistungssichten fest:

- kanonische Kundenidentität: `(systemhouseId, customerId)`,
- `systemhouseId` ist providerneutral und nicht gleich Microsoft Entra Tenant ID,
- ältere `tenant`-Terminologie aus ADR-0007/0008 bleibt historische Pre-BSF-Evidenz,
- neue BSF-Scopes verwenden fachlich Systemhaus-Semantik,
- Kundenverantwortung ist Scope/Beziehung, keine globale Rolle,
- Projektmanager-Leistungssicht ist read-only,
- Teamlead-Leistungsnachweis besitzt einen getrennten Write-/Finalisierungs-/Audit-Scope,
- weil Projekte, Arbeitspakete und Tätigkeiten im MVP user-scoped lokal liegen, muss BSF-02 neben der Customer-Entität die **minimal notwendige gemeinsame/synchronisierte Daten-/Read-Basis** für echte Kunden- und Leistungssichten schaffen,
- der vollständige Datenhaltungsumbau bleibt BSF-04.

Maßgebliche Nachweise:

- `docs/ADR/0029-systemhouse-customer-scope.md`,
- `docs/BSF-01-ARCHITECTURE-BASELINE.md`,
- aktualisiertes `docs/BSF-CONCEPT-REGISTER.md`,
- aktualisiertes `docs/ENTWICKLUNGSTAGEBUCH.md`.

Lovable-Einsatz in BSF-01: **0 Credits**. Architektur-, Datenmodell- und Sicherheitsgrenzen werden nicht an Lovable delegiert.

Nach vollständiger Security-/CI-Abnahme und Merge des BSF-01-PRs gilt BSF-01 als **DONE**. Unmittelbar nächster Punkt ist **BSF-02 — Kundenmodell + minimale gemeinsame Daten-/Read-Basis**, mit geplantem Lovable-Einsatz **0–1 Credit** für gezielte UI-/Kundenkontext-Visualisierung nach festgelegter Architektur.

## Dokumentationszustand

- `docs/ENTWICKLUNGSTAGEBUCH.md` ist auf MVP-Baseline, Branch Protection und BSF-01 fortgeschrieben.
- `SYSING-001` existiert bereits als Living Document `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md` mit gemeinsamer Markdown-Quelle für PDF/Word.
- SYSING-001 wird in BSF-DOC-02 kontrolliert aktualisiert und TDF-konform abgenommen; es wird keine zweite Dokumentquelle erzeugt.
- BSF-DOC-03 macht die freigegebene SYSING-001-Fassung read-only aus dem Board erreichbar.
- Kontext-sensitive Hilfe und Benutzerhandbuch werden ab BSF als Teil der Definition of Done jedes betroffenen Fachsprints synchron gehalten; BSF-DOC-01 bleibt zusätzlicher Konsolidierungsblock.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **Post-MVP / BSF-Ausbau** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben dabei verbindliche Abnahmekriterien.
