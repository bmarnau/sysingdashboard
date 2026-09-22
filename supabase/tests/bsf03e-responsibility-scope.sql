-- BSF-03E P0 — AVKK Responsibility Scope Hardening (T01-T12)
-- Issue #63 / TDD RED contract.
--
-- Ziel:
--   Mandantenscharfer AVKK-Scope fuer Project/WorkPackage-Verantwortungen.
--   Bestehende Legacy-Subjects ohne belastbaren Scope bleiben fail-closed.
--
-- Ausfuehrung:
--   psql "<test-db-connection>" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/bsf03e-responsibility-scope.sql
--
-- Voraussetzungen:
--   Privilegierter Testkontext mit INSERT in auth.users sowie SET ROLE authenticated.
--   Ausschliesslich disposable/local/staging Datenbank.
--
-- Erwartung auf Vor-P0-Basis:
--   RED bereits bei T01/T02, weil avkk_subject noch keine systemhouse_id/customer_id besitzt.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL %', label;
  END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE got_state text; got_message text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_state = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    RAISE NOTICE 'PASS % (% / %)', label, got_state, got_message;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL % statement unexpectedly succeeded', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.act_reset()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;

-- ---------------------------------------------------------------------
-- Strukturvertrag
-- ---------------------------------------------------------------------

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='avkk_subject'
       AND column_name='systemhouse_id' AND data_type='uuid'
  ),
  'T01 avkk_subject.systemhouse_id exists'
);

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='avkk_subject'
       AND column_name='customer_id' AND data_type='uuid'
  ),
  'T02 avkk_subject.customer_id exists'
);

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1
      FROM pg_indexes
     WHERE schemaname='public' AND tablename='avkk_subject'
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%systemhouse_id%'
       AND indexdef ILIKE '%subject_type%'
       AND indexdef ILIKE '%subject_id%'
  ),
  'T03 scoped subject identity is unique'
);

SELECT pg_temp.assert(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.avkk_subject'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.avkk_responsibility'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.avkk_responsibility_type'::regclass),
  'T04 RLS enabled on AVKK responsibility tables'
);

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='avkk_subject' AND cmd='SELECT'
       AND coalesce(qual,'') ILIKE '%systemhouse%'
       AND coalesce(qual,'') ILIKE '%customer%'
  ),
  'T05 avkk_subject read policy is resource-scoped'
);

SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='avkk_responsibility'
       AND cmd IN ('INSERT','UPDATE','ALL')
       AND (
         coalesce(qual,'') ILIKE '%systemhouse%'
         OR coalesce(with_check,'') ILIKE '%systemhouse%'
       )
       AND (
         coalesce(qual,'') ILIKE '%customer%'
         OR coalesce(with_check,'') ILIKE '%customer%'
       )
  ),
  'T06 responsibility write policy is resource-scoped'
);

-- Legacy darf nicht durch freie Client-Werte "geheilt" werden.
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid=t.tgfoid
     WHERE t.tgrelid='public.avkk_subject'::regclass
       AND NOT t.tgisinternal
       AND pg_get_functiondef(p.oid) ILIKE '%subject_title_snapshot%'
       AND pg_get_functiondef(p.oid) ILIKE '%customer_id%'
  ),
  'T07 no title/name based automatic legacy mapping'
);

-- Scope-Felder duerfen nach Setzen nicht clientseitig umgehbar verschoben werden.
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid=t.tgfoid
     WHERE t.tgrelid='public.avkk_subject'::regclass
       AND NOT t.tgisinternal
       AND pg_get_functiondef(p.oid) ILIKE '%systemhouse_id%'
       AND pg_get_functiondef(p.oid) ILIKE '%customer_id%'
       AND pg_get_functiondef(p.oid) ILIKE '%IS DISTINCT FROM%'
  )
  OR EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='avkk_subject' AND cmd='UPDATE'
       AND coalesce(with_check,'') ILIKE '%systemhouse%'
       AND coalesce(with_check,'') ILIKE '%customer%'
  ),
  'T08 scoped identity cannot be reassigned by direct update'
);

-- ---------------------------------------------------------------------
-- Laufzeit-/Negativvertrag
-- Die konkrete Fixture wird in P0 mit der Migration vervollstaendigt.
-- Diese Assertions halten bereits fest, welche Semantik zwingend ist.
-- ---------------------------------------------------------------------

SELECT pg_temp.assert(
  NOT has_table_privilege('anon','public.avkk_subject','SELECT')
  OR (SELECT relrowsecurity FROM pg_class WHERE oid='public.avkk_subject'::regclass),
  'T09 anon has no unguarded AVKK read'
);

SELECT pg_temp.assert(
  NOT has_table_privilege('anon','public.avkk_responsibility','INSERT')
  AND NOT has_table_privilege('anon','public.avkk_responsibility','UPDATE')
  AND NOT has_table_privilege('anon','public.avkk_responsibility','DELETE'),
  'T10 anon has no AVKK responsibility DML'
);

-- Direkte authenticated-DML darf auch nach P0 keine pauschale permission-only
-- Regel besitzen, die Customer/Systemhouse-Scope ignoriert.
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='avkk_responsibility'
       AND cmd IN ('INSERT','UPDATE','ALL')
       AND (
         coalesce(qual,'') ~ 'avkk\.responsibility\.assign'
         OR coalesce(with_check,'') ~ 'avkk\.responsibility\.assign'
       )
       AND coalesce(qual,'') NOT ILIKE '%systemhouse%'
       AND coalesce(with_check,'') NOT ILIKE '%systemhouse%'
       AND coalesce(qual,'') NOT ILIKE '%customer%'
       AND coalesce(with_check,'') NOT ILIKE '%customer%'
  ),
  'T11 no flat permission-only responsibility write policy'
);

SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='avkk_subject' AND cmd='SELECT'
       AND coalesce(qual,'') ~ 'avkk\.view'
       AND coalesce(qual,'') NOT ILIKE '%systemhouse%'
       AND coalesce(qual,'') NOT ILIKE '%customer%'
  ),
  'T12 no flat permission-only subject read policy'
);

ROLLBACK;
