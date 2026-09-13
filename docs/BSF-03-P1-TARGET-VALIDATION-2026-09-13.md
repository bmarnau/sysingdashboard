# BSF-03 P1 — Customer Responsibility: RLS Target Validation repariert

Stand: 2026-09-13\
Issue: #105 (BSF-03), Folgeauftrag P1\
Grundlage: `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md`, Migrationen `20260908032151`, `20260908032209`, `20260909030855`

## Befund (Root Cause)

Die INSERT-/UPDATE-Policies auf `public.customer_responsibility` prüften die **Zielperson**
über die SECURITY-INVOKER-Helper `is_eligible_responsibility_holder(user_id)` und
`has_active_systemhouse_membership(user_id, systemhouse_id)`. Diese lesen
`profiles`, `user_roles` und `systemhouse_membership`, die für normale Benutzer bewusst
nur Self-Select erlauben. Ein Teamlead mit `customer.responsibility.manage` konnte damit
fremde Zielpersonen nicht validieren: jede Zuweisung an eine andere Person scheiterte mit
`42501`, auch im eigenen Systemhaus-Scope. Die Produktberechtigung war also **zu eng**,
nicht zu weit; Sicherheitsmodell und Migrationshistorie waren konsistent.

## Umsetzung (minimal, additiv)

Migration `supabase/migrations/20260913033000_bsf03_p1_customer_responsibility_target_guard.sql`:

- `public.customer_responsibility_target_guard()` — BEFORE INSERT/UPDATE-Trigger,
  `SECURITY DEFINER`, `search_path = ''`, vollständig schemaqualifiziert,
  `EXECUTE` für `PUBLIC`/`anon`/`authenticated` entzogen (Vorbild:
  `customer_responsibility_audit()`; ein eigenes internes Schema existiert im Projekt nicht).
  Prüft nur bei `status = 'active'`: aktives Profil, zulässige interne Rolle,
  kein `viewer`/`customer`, aktive Membership im selben Systemhouse. Es entsteht keine
  Lesesicht auf fremde Profile/Rollen/Memberships — Ergebnis ist nur „ok“ oder Exception.
- INSERT-/UPDATE-Policies enthalten nur noch die Autorisierung des **handelnden** Benutzers
  (`can_manage_customer_responsibility(auth.uid(), systemhouse_id)`, `status='active'`,
  `valid_to IS NULL` beim Insert). Manager-Scope, Self-Select und Identity-/History-Guard sind
  unverändert.
- Lifecycle: `active -> ended` bleibt möglich, auch wenn die Zielperson inzwischen inaktiv ist
  oder ihre Membership verloren hat (T9/T10). Reaktivierung beendeter Zeilen bleibt gesperrt.

Grants/Tabellenrechte unverändert: `authenticated` = SELECT/INSERT/UPDATE, kein DELETE/ALL,
keine `anon`-/PUBLIC-Rechte.

## Testnachweis (real, äußeres BEGIN/ROLLBACK, Residuen 0)

Artefakt: `supabase/tests/bsf-03-customer-responsibility-rls.sql`

- R00a–R00e PASS
- R01–R18 PASS (R16 zusätzlich als R16b im privilegierten Harness isoliert: `23505`)
- T0–T12 PASS (Trigger nicht exponiert; Teamlead vergibt an fremden Engineer; viewer/customer/
  inaktiv/ohne Membership/Cross-Systemhouse/ohne Permission DENY; Beenden nach
  Deaktivierung bzw. Membership-Verlust; Identität unveränderlich; Neuvergabe nach Historie)

Harness-Korrekturen (keine Produktlogik): `now()` ist innerhalb einer Transaktion konstant,
daher Fixture-`valid_from = now() - interval '1 day'` und `valid_to = clock_timestamp()`
beim Beenden; die Membership von `U_INACTIVE` wird erst nach Anlage der Verantwortung
deaktiviert, weil der Target-Guard Neuanlagen ohne aktive Membership verhindert.

Null-Residuen nach Lauf: keine `bsf03-*@example.invalid`-Identitäten, keine BSF03-UUIDs in
Systemhouse/Customer/Membership/Access/Responsibility, keine `BSF03-R14`-Projektion.

## Security Advisor / Regression

- Advisor: ausschließlich SEC-01-Baseline (`avkk_can_write`, `avkk_people_directory`);
  kein neues Finding zu BSF-03 oder BSF-02C.
- `bsf02c_publish_shared_projection_snapshot` weiterhin `SECURITY INVOKER`
  (`prosecdef=false`); Shared-Projection-Tabellen, RLS und Grants unverändert.
- `src/integrations/supabase/types.ts` enthält `customer_responsibility` unverändert.

## Hinweis Werkzeug-Nebenwirkung

Das Lovable-Migrationswerkzeug hat die Migration zusätzlich als Drizzle-Artefakt
(`drizzle/`, `drizzle.config.ts`, `drizzle-kit`/`drizzle-orm`/`postgres` in `package.json`)
angelegt und dabei ein `drizzle`-Schema mit Journaltabelle in der Datenbank erzeugt. Die
Repository-Artefakte und Dependency-Änderungen wurden im selben Lauf zurückgenommen; die
Migration liegt in Projektkonvention unter `supabase/migrations/` und ist in
`supabase_migrations.schema_migrations` registriert. Das leere `drizzle`-Schema verbleibt
als bekannter, nicht sicherheitsrelevanter Rest (Entfernung nur per gesonderter Freigabe).
