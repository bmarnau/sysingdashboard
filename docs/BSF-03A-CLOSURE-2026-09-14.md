# BSF-03A — Abschluss- und Abnahmenachweis Projektcontrolling

Stand: 2026-09-18  
Status: **IMPLEMENTATION COMPLETE / EXACT-HEAD GATES PASS / LOVABLE EXACT-HEAD PREVIEW PENDING**  
Version: 1.64.0  
Issue: #106  
Pull Request: #144  
Branch: `feat/bsf-03a-project-controlling`

## 1. Ziel und Fachscope

BSF-03A liefert eine ausschließlich lesende Projektmanager-/Leistungssicht für berechtigte Leitungsrollen. Die Route `/projektcontrolling` zeigt für den zulässigen serverseitigen Scope:

- Zeitraum von/bis,
- Systemhaus,
- Kunde,
- Projekt,
- Arbeitspaket,
- AP-Kategorie,
- abrechenbar / nicht abrechenbar,
- reproduzierbare Stunden-/KPI-Summen,
- Tagestrend,
- Tätigkeits-Drill-down.

Nicht Bestandteil sind Teamlead-Finalisierung, Änderung von `billable`/`billingStatus`, Eurobeträge, Project-Responsibility-Neumodell, MCP/Graph/SharePoint/Agenten oder ein eigener Reporting-Datenpfad.

## 2. Architektur und Berechtigungsgrenze

Datenpfad:

```text
Projektcontrolling UI
  -> readProjectControllingFn
      -> project.controlling.view
      -> ProjectControllingService
          -> ProjectControllingRepository
              -> Supabase Adapter mit User-JWT
                  -> Systemhouse Membership + Customer Access + Shared-Projection-RLS
```

`project.controlling.view`:

- ALLOW: Systemadministrator, Administrator, Teamlead, Projektmanager,
- DENY: Engineer, Viewer, Customer, Kiosk.

Die Permission erweitert keinen Datenscope. Projekt-, Arbeitspaket- und Kategorie-IDs verengen ausschließlich einen bereits zulässigen Customer-Scope. Namen, Labels und `Project.lead` sind keine Autorisierungsidentitäten. Kein Service-Role-Normalpfad wurde eingeführt.

## 3. Datenbank-/Shared-Projection-Änderungen

Additiv umgesetzt:

- `shared_work_package_projection.category_key text NULL`,
- `shared_work_package_projection.category_observed boolean NOT NULL DEFAULT false`,
- Kategorie-/Scope-Index,
- `project.controlling.view` in der bestehenden Permission-Funktion,
- rückwärtskompatible Kategoriebehandlung im BSF-02C-Publish.

Semantik:

- `category_observed=false` -> Kategorie noch nicht mit neuem Vertrag publiziert,
- observed + `category_key=null` -> explizit keine Kategorie,
- bekannter aktiver Key -> aktuelles Label,
- bekannter inaktiver Key -> Label + inaktiv,
- unbekannter historischer Key -> sichtbar als unbekannte Kategorie, kein Silent Remap.

`public.bsf02c_publish_shared_projection_snapshot` bleibt **SECURITY INVOKER**.  
`public.has_permission(uuid,text)` bleibt **SECURITY INVOKER**.

## 4. Golden Dataset V1

Vertrag:

- `schemaVersion = sysing.golden.v1`,
- `datasetVersion = 1.0.0`,
- `referenceTime = 2026-09-14T00:00:00Z`,
- vollständig synthetisch.

Kernreferenz:

- 2 Kunden,
- 3 Projekte,
- 5 Arbeitspakete,
- 8 Tätigkeiten,
- 25.0 h gesamt,
- 20.0 h billable,
- 5.0 h non-billable,
- 80.0 % Billable-Quote.

Golden-Validator, Relationsintegrität und unabhängige Project-Controlling-Expected-Results sind PASS.

## 5. Fachlogik und Fail-closed-Verhalten

Nachgewiesen sind:

- kanonische ISO-Kalenderdaten und inklusive Zeitraumsemantik,
- maximal 366 Tage,
- identitätsbasierte abhängige Filter,
- deterministische Dezimalsummen,
- Tagestrend einschließlich Null-Tagen,
- maximal 5.000 gefilterte Activities; 5.001 werden fail-closed abgelehnt,
- keine Umdeutung von Legacy-/Unknown-Kategorien,
- serverseitige Prüfung von Konto, Permission, Membership, Customer Access sowie Projekt-/AP-/Kategorie-Scope,
- generische Ablehnung fremder/manipulierter Scopes ohne Existenzleck.

## 6. Exact-Head GitHub-Evidenz

Code-tragender Exact Head vor dieser Abschlussdokumentation:

`ffc28901c3017d9459c89a9fe68c030da0f07386`

GitHub Actions:

- Security #956 / Run `35314033958`: **PASS**,
- CI #962 / Run `35314033937`: **PASS**.

CI #962 im Detail:

- Static / Prettier / ESLint / TypeScript / RBAC / No-Console / Docs / Projektmanifest: **PASS**,
- Unit & Components: **131 Testdateien / 917 Tests PASS / 4 TODO**,
- Database Schema Drift: **PASS**,
- Backend: **PASS**,
- API: **PASS**,
- RBAC & Security: **PASS**,
- Import/Export: **PASS**,
- Backup/Restore: **PASS**,
- Production Build: **PASS**,
- Playwright E2E: **91/91 PASS**,
- Accessibility: **7/7 PASS**,
- Technical Debt: **PASS**,
- Technical Report v17: `passed-with-findings`,
- Quality Gate: **0 Blocker**.

DB-Gates im lokalen vollständigen Supabase-Rebuild:

- Kiosk-Regression: PASS,
- BSF-02C T01–T30: **PASS**,
- BSF-03A T01–T20d: **PASS**,
- `DATABASE_SCHEMA_DRIFT: NONE`,
- `DATABASE_TYPES_DRIFT: NONE`.

## 7. Security Advisor

Der offizielle Supabase Security Advisor wurde read-only im verifizierten Sysingdashboard-Datenbankkontext ausgeführt.

Ergebnis:

- ERROR: 0,
- CRITICAL: 0,
- WARN: 2,
- beide WARN exakt bekannte SEC-01-Baseline vom Typ `0029_authenticated_security_definer_function_executable`:
  - `public.avkk_can_write(_subject uuid)`,
  - `public.avkk_people_directory()`,
- neue BSF-03A-Findings: **keine**.

Zusätzlicher read-only Vertragscheck bestätigte `SECURITY INVOKER` für `has_permission` und den BSF-02C-Publish-RPC sowie die erwarteten Kategorie-Spalten und Permission-Matrix. Der allgemeine separate Supabase-Connector zeigte auf einen anderen Projektkontext und wurde deshalb nicht als Sysingdashboard-Nachweis oder für Writes verwendet.

## 8. E2E-/Accessibility-Korrektur

Der erste neue BSF-03A-E2E-Lauf deckte Fehler ausschließlich im Test-Harness auf: zu breite Text-Locators sowie eine unzureichende Interpretation der TanStack-ServerFn-Testgrenze. Die produktive Controlling-Fachlogik, DB-Verträge und Security-Grenzen waren dabei bereits grün.

Der Harness wurde an das im Repository bewährte ServerFn-Mocking angepasst und die Locators auf semantisch eindeutige Elemente verengt. Endzustand auf Exact Head: **91/91 E2E PASS**. Die Filterkaskade Systemhaus -> Kunde -> Projekt -> Arbeitspaket ist separat abgesichert; das Arbeitspaket wird erst im eindeutigen Projektkontext aktiviert.

## 9. Lovable L2/L3 — verbleibendes Verification Limit

Der vorgeschriebene L2-Precheck wurde analyse-only ausgeführt. Ergebnis: Der von Lovable erreichbare Projekt-/Git-Stand entsprach nicht dem aktuellen PR-Head. Deshalb wurden bewusst keine Lovable-Codeänderungen in PR #144 übernommen.

Ein späterer strikter Read-only-Recheck von Branch und Exact Head konnte wegen ausgeschöpfter Lovable-Credits nicht ausgeführt werden.

Damit bleibt offen:

- branch-genauen aktuellen PR-Head in Lovable erreichen,
- Filterdichte/KPI-Hierarchie/Tabellenlesbarkeit responsiv prüfen,
- aktuellen Preview ohne Runtime-/Console-Fehler bestätigen,
- `client.ts` und das Nichtvorhandensein eines `previewAuthStorage.ts` im erreichbaren Lovable-Stand gegen den GitHub-Vertrag bestätigen.

Dies ist ein **Preview-/Werkzeugnachweis**, keine offene DB-/RBAC-/RLS-/Fachlogik-Korrektur.

## 10. Dokumentation, Handbuch und Hilfe

Der Dokumentationsnachlauf am 2026-09-18 hat die betroffenen Benutzer- und Technikflächen gegen den implementierten BSF-03A-Vertrag geprüft.

Synchronisiert wurden:

- Benutzerhandbuch und kontextsensitive Hilfe mit eigenem Topic `project-controlling` für `/projektcontrolling`,
- rollenabhängige Sichtbarkeit für Systemadministrator, Administrator, Teamlead und Projektmanager,
- Filter-, Scope-, 366-Tage-, 5.000-Zeilen- und read-only-Grenzen,
- Handbuchversion 1.21.0,
- Routenhilfe: spezifischste Route gewinnt vor generischem `/`-Match,
- `ARCHITECTURE.md` auf das reale Local-First/Shared-Projection-Übergangsmodell,
- `DATA-SCHEMA.md` auf den aktuellen BSF-Systemhaus-/Customer-/Projection-Stand,
- `API.md` auf Supabase Auth und den vorhandenen öffentlichen `/api/public/auth-config`-Fallback,
- `roadmap.md`, Gesamtplan und Entwicklungstagebuch auf KIOSK-01 DONE / BSF-03A Finalverifikation / KIOSK-02 NEXT.

Historische datierte Nachweise werden nicht rückwirkend inhaltlich umgedeutet.

## 11. Abschlussstatus

| Nachweis                                      | Ergebnis                  |
| --------------------------------------------- | ------------------------- |
| Permission / RBAC                             | PASS                      |
| DB / Kategoriebrücke                          | PASS                      |
| SECURITY INVOKER                              | PASS                      |
| Golden Dataset V1                             | PASS                      |
| Fachaggregation / Filter / Trend / Drill-down | PASS                      |
| Scope / IDOR / BOLA                           | PASS                      |
| BSF-02C Regression                            | PASS                      |
| Unit / Components                             | PASS                      |
| E2E                                           | 91/91 PASS                |
| Accessibility                                 | 7/7 PASS                  |
| Security Advisor                              | PASS, nur SEC-01-Baseline |
| Schema-/Types-Drift                           | NONE                      |
| Technical Report / Quality Gate               | PASS / 0 Blocker          |
| Lovable Exact-Head Preview                    | **PENDING**               |
| Merge                                         | **NEIN**                  |
| Deploy                                        | **NEIN**                  |

BSF-03A ist technisch implementation-complete und auf dem code-tragenden Head vollständig gegatet. FINAL DONE wird erst nach dem branch-genauen Lovable-Preview-/Driftnachweis gesetzt. Nach formaler Abnahme folgt **BSF-KIOSK-02 / #136**.
