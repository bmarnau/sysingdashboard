-- DB-DRIFT-FK: Vertragstest fuer reference_value_history_systemhouse_fk
-- Nur gegen eine disposable/lokale Testdatenbank (CI). Endet mit ROLLBACK.
--   psql "<test-db>" -v ON_ERROR_STOP=1 -f supabase/tests/db-fk-reference-value-history-systemhouse.sql
BEGIN;

-- T01: Constraint vorhanden, Typ FOREIGN KEY, ON DELETE RESTRICT, validiert, richtiges Ziel
DO $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT (c.contype = 'f' AND c.confdeltype = 'r' AND c.convalidated
          AND c.confrelid = 'public.systemhouse'::regclass)
    INTO v_ok
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid = 'public.reference_value_history'::regclass
    AND c.conname = 'reference_value_history_systemhouse_fk';
  IF v_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'T01 FAIL: Constraint fehlt oder weicht ab (f, RESTRICT, validiert, systemhouse)';
  END IF;
  RAISE NOTICE 'T01 PASS';
END
$$;

-- T02: Der Constraint bezieht sich genau auf die Spalte systemhouse_id
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(a.attname, ',' ORDER BY a.attname) INTO v_cols
  FROM pg_catalog.pg_constraint c
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.reference_value_history'::regclass
    AND c.conname = 'reference_value_history_systemhouse_fk';
  IF v_cols IS DISTINCT FROM 'systemhouse_id' THEN
    RAISE EXCEPTION 'T02 FAIL: Spalten %', v_cols;
  END IF;
  RAISE NOTICE 'T02 PASS';
END
$$;

-- T03: Unbekanntes Systemhaus wird abgewiesen (23503); NULL bleibt erlaubt
DO $$
BEGIN
  BEGIN
    INSERT INTO public.reference_value_history (value_id, catalog_id, operation, snapshot, systemhouse_id)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'insert', '{}'::jsonb, gen_random_uuid());
    RAISE EXCEPTION 'T03 FAIL: Zeile mit unbekanntem Systemhaus wurde akzeptiert';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'T03 PASS (abgewiesen)';
  END;

  INSERT INTO public.reference_value_history (value_id, catalog_id, operation, snapshot, systemhouse_id)
  VALUES (gen_random_uuid(), gen_random_uuid(), 'insert', '{}'::jsonb, NULL);
  RAISE NOTICE 'T03b PASS (NULL erlaubt)';
END
$$;

ROLLBACK;
