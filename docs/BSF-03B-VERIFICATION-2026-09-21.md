# BSF-03B — Verifikationsnachweis 2026-09-21

Stand: 2026-09-21  
Status: FINAL VERIFIED / FULL CI PASS / SECURITY BASELINE_ONLY  
Issue: #107  
PR: #149

## Zweck

Dieser Nachweis bündelt den bestätigten BSF-03B-Live-Datenbankzustand, den
Owner-fähigen Exact-Head-Regressionslauf sowie den offiziellen
Supabase-Security-Advisor. Die eingeschränkte Lovable-`sandbox_exec`-Rolle wird
als Umgebungsgrenze dokumentiert, nicht als offener Produktblocker.

## Bestätigter Live-Zustand

- Migration `20260921095742_bsf03b_performance_statement` ist in der produktiven
  Sysingdashboard-Supabase-Migrationshistorie aufgezeichnet.
- Alle fünf BSF-03B-Tabellen haben RLS aktiviert.
- `customer_activity_billable_override`: 3 Policies; `authenticated` besitzt
  SELECT/INSERT/UPDATE.
- `customer_performance_statement_request`: 2 Policies; `authenticated` besitzt
  SELECT/INSERT.
- Statement, Item und Claim: jeweils 1 Policy; `authenticated` besitzt
  ausschließlich SELECT.
- Kein `anon`, kein `PUBLIC`, kein DELETE auf den fünf BSF-03B-Tabellen.
- `public.bsf03b_billable_override_audit()`: SECURITY DEFINER,
  `search_path=''`, kein EXECUTE für authenticated/anon/PUBLIC.
- `public.bsf03b_process_statement_request()`: SECURITY DEFINER,
  `search_path=''`, kein EXECUTE für authenticated/anon/PUBLIC.
- `public.has_permission` bleibt SECURITY INVOKER.
- Synthetische Residuen im produktiven Zielkontext: keine.

## Exact-Head Regression

Funktionaler Abschlusskandidat:

`ffbf3641c2187a738b853fb050aa4e5f1b6541a0`

GitHub Actions:

- Security #1247: **PASS**
- CI #1252: **PASS**
- Unit & Components: **147/147 Testdateien**, **1009 PASS**, **4 TODO**
- Database Schema Drift: **PASS**
- Technical Report & Quality Gate: **PASS**

Owner-fähiger lokaler Supabase/PostgreSQL-17-Lauf innerhalb CI #1252:

- BSF-02C: **T01–T30 PASS**, synthetische Daten zurückgerollt.
- BSF-03A: **T01–T20 PASS** einschließlich Atomic-Rollback- und
  SECURITY-INVOKER-Vertrag.
- BSF-03B: **T01–T30 PASS** einschließlich RLS/ACL, Rollenmatrix,
  Override-Audit, revisionsgebundenem Override, direktem DML-Deny,
  Trigger-EXECUTE-Deny, stale Fingerprint, Finalize, Provenienz/Freshness,
  billable/non-billable Summen, Snapshot-Hash, Duplicate-Claim-Schutz,
  Idempotenz, Replacement, Claim-Freigabe weggefallener Activities,
  Unveränderlichkeit des alten Snapshots und Null-Residuen.
- `DATABASE_SCHEMA_DRIFT: NONE`
- `DATABASE_TYPES_DRIFT: NONE`

Damit ist der kombinierte Regressionspunkt **PASS**.

## Lovable-Sandbox-Grenze

Die produktive Lovable-Code-Sandbox arbeitet mit der eingeschränkten DB-Rolle
`sandbox_exec`. Sie darf insbesondere nicht:

- `SET LOCAL ROLE authenticated`,
- das `auth`-Schema für Fixtures verwenden,
- `public.has_permission(...)` direkt ausführen.

Darum kann sie die Owner-Level-SQL-Suiten nicht identisch wiederholen. Eine
abgeschwächte Ersatzprüfung wurde bewusst nicht verwendet. Diese Umgebungsgrenze ändert den PASS-Nachweis aus CI #1252 nicht.

## Security Advisor

Offizieller Supabase Security Advisor über den kontrollierten Lovable-Supabase-Pfad:

- Ergebnis: **BASELINE_ONLY**
- 0 ERROR
- 0 CRITICAL
- keine neuen BSF-03B-WARNs
- bekannte Baseline:
  - `public.avkk_can_write(uuid)`
  - `public.avkk_people_directory()`
  - jeweils WARN `0029_authenticated_security_definer_function_executable`

Die beiden neuen BSF-03B-SECURITY-DEFINER-Funktionen sind für
`authenticated`/`anon`/PUBLIC nicht direkt ausführbar und erzeugen kein neues
0029-Finding.

## Auswirkungen dieses Prüfpunktes

- zusätzliche DB-Schemaänderung durch Verifikation: **NEIN**
- persistente Testdatenänderung: **NEIN**
- Security-Assertions abgeschwächt: **NEIN**
- Deploy/Publish durch Verifikation: **NEIN**
- vollständige Repo-Gates: **PASS**
- Lovable Exact-Head Visual Preview: **NOT EVIDENCED** wegen fehlender identitätsgebundener Head-Bindung; siehe Closure
- Abschlussnachweis: `docs/BSF-03B-CLOSURE-2026-09-21.md`
- nächster Sprint: **BSF-03E / #63**

## Vollständige Repo-Abnahme

CI #1252 bestätigt zusätzlich zum DB-Vertrag: Golden Dataset Required Gate,
Backend, API, RBAC/Security, Import/Export, Backup/Restore, Production Build,
Playwright E2E einschließlich BSF-03B-/Scope-Security-Specs, Accessibility,
Technical Debt sowie Technical Report & Quality Gate jeweils PASS.

Damit ist der frühere Tasks-1–4-Nachweis zum vollständigen BSF-03B-Sprintnachweis
fortgeschrieben.
