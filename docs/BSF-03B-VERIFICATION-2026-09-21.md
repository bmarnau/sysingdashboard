# BSF-03B — Verifikationsnachweis 2026-09-21

Stand: 2026-09-21  
Status: DB-VERTRAG LIVE / SECURITY BASELINE_ONLY / REGRESSION BLOCKED  
Issue: #107  
PR: #149

## Zweck

Dieser Nachweis trennt den bereits bestätigten BSF-03B-Live-Datenbankzustand von dem noch offenen vollständigen Regressionslauf für BSF-02C, BSF-03A und BSF-03B.

## Bestätigter Live-Zustand

- Migration `20260921095742_bsf03b_performance_statement` ist in der produktiven Sysingdashboard-Supabase-Migrationshistorie aufgezeichnet.
- Alle fünf BSF-03B-Tabellen haben RLS aktiviert.
- `customer_activity_billable_override`: 3 Policies; `authenticated` besitzt SELECT/INSERT/UPDATE.
- `customer_performance_statement_request`: 2 Policies; `authenticated` besitzt SELECT/INSERT.
- Statement, Item und Claim: jeweils 1 Policy; `authenticated` besitzt ausschließlich SELECT.
- Kein `anon`, kein `PUBLIC`, kein DELETE auf den fünf BSF-03B-Tabellen.
- `public.bsf03b_billable_override_audit()`: SECURITY DEFINER, `search_path=''`, kein EXECUTE für authenticated/anon/PUBLIC.
- `public.bsf03b_process_statement_request()`: SECURITY DEFINER, `search_path=''`, kein EXECUTE für authenticated/anon/PUBLIC.
- `public.has_permission` bleibt SECURITY INVOKER.
- Offizieller Supabase Security Advisor: BASELINE_ONLY. Ausschließlich die bekannten AVKK-Warnungen für `public.avkk_can_write(uuid)` und `public.avkk_people_directory()`; keine neuen BSF-03B-Findings.
- Synthetische Residuen: keine.

## Bereits bestätigter BSF-03B-Vertrag

Der frühere kontrollierte Live-Lauf hat T01–T30 für BSF-03B erfolgreich ausgeführt. Diese Evidenz bleibt gültig und wird nicht durch den unten beschriebenen Workspace-Blocker aufgehoben.

## Aktuell blockierter Regressionslauf

Der erneute kombinierte Regressionslauf BSF-02C/BSF-03A/BSF-03B ist in der aktuell verfügbaren Umgebung nicht reproduzierbar.

Technische Ursachen:

- verfügbare DB-Rolle: `sandbox_exec`,
- `SET LOCAL ROLE authenticated` ist nicht erlaubt,
- kein `USAGE` auf Schema `auth`,
- `public.has_permission(...)` ist für `sandbox_exec` nicht ausführbar,
- der Workspace ist nicht auf dem PR-Head mit der BSF-03B-Migration und SQL-Suite ausgecheckt.

Eine Nachbildung ohne Rollenwechsel würde die Deny/Allow-, RLS- und Direct-DML-Assertions abschwächen und wird deshalb ausdrücklich nicht verwendet.

## Erforderliche Abschlussumgebung

Der offene Regressionslauf muss unverändert in einer Owner-fähigen PostgreSQL-17-/Supabase-Testumgebung erfolgen, zum Beispiel über die bestehende CI oder einen lokalen `supabase db reset`-fähigen Checkout des PR-Heads.

Erst danach darf die kombinierte Regression BSF-02C/03A/03B als PASS markiert werden.

## Änderungen durch diesen Prüfpunkt

- DB-Schema geändert: NEIN
- persistente Daten geändert: NEIN
- Deploy/Publish: NEIN
- Security-Assertions abgeschwächt: NEIN
