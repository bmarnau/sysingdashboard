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

Am 24.08.2026 erzeugte ein ausdrücklich als Plan-/Analyseauftrag ohne Code-/GitHub-Änderung gestarteter Lovable-Lauf dennoch direkte Änderungen auf dem ungeschützten GitHub-Branch `main`:

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

## Offener Governance-Befund

Issue #53 bleibt offen: Der GitHub-Branch `main` ist auch nach Recovery #66 noch nicht technisch durch Branch Protection / Rulesets geschützt.

Nachgewiesener Ist-Stand nach Recovery #66:

- `protected: false`,
- `protection.enabled: false`,
- Required Status Checks nicht erzwungen.

Verbindliche Zielchecks:

- `14 · Technical Report & Quality Gate`,
- `Secrets, Headers, Azure-Strings`.

Bis zur technischen Aktivierung gilt:

- keine direkten regulären Tool-/Bot-Writes auf `main`,
- Änderungen über eindeutig benannten Branch + Pull Request,
- Merge erst nach vollständigen grünen Security-/CI-Gates,
- Merge mit Expected-Head-SHA-Schutz,
- Force Push und Branch-Löschung sollen durch die künftige GitHub-Regel verhindert werden.

### Lovable-Sonderregel bis Branch Protection aktiv ist

Der reproduzierte Planmodus-Vorfall verschärft die Übergangsregel:

- **keine Nachrichten an den Lovable-Main-Agenten — auch nicht für Plan-/Analyseaufträge**,
- Lovable nur auf einer nachweislich isolierten Project Variant / Nicht-main-Arbeitsfläche mit explizitem freigegebenem `base_sha`,
- ein Variant = ein Auftrag = ein Scope,
- wenn die Lovable-Oberfläche keine isolierte Arbeitsfläche eindeutig bestätigt, wird kein Prompt ausgeführt,
- ChatGPT koordiniert Scope, GitHub-Diff, Security/CI und Abnahme; kopierfertige Lovable-Prompts können nach verifizierter Isolation manuell übergeben werden,
- Zusatzbefunde werden nur vorgeschlagen, nicht ungefragt umgesetzt,
- Auth/RBAC/RLS/Supabase/Migrationen/Seeds und `src/integrations/supabase/*` nur bei ausdrücklichem Scope.

Der fehlende technische Branch-Schutz ist ein Governance-/Releasefinding und **kein Rückfall des fachlichen MVP-Status**.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **Post-MVP / BSF-Ausbau** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben dabei verbindliche Abnahmekriterien.
