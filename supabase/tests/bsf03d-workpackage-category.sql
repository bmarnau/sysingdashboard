-- =====================================================================
-- BSF-03D — Reproduzierbares DB-Testartefakt (Issue #103)
-- Prüfgegenstand: systemhausbezogene Reference Data
--                 (Katalog `workpackage.category`), Scope-Trigger,
--                 scope-bewusste Unique-Indizes, RLS-Membership-Bindung.
-- Basis-Migration:
--   drizzle/migrations/0000_bsf03d_reference_data_systemhouse_scope.sql
--
-- WARNUNG / EINSATZKONTEXT
--   NICHT ungeprüft gegen Produktion ausführen. Nur für eine disposable/
--   local/staging Testdatenbank oder einen freigegebenen Testkontext.
--
-- VORAUSSETZUNGEN
--   1. Privilegierter DB-Testkontext (INSERT in auth.users, SET ROLE auf
--      anon/authenticated, request.jwt.claims setzbar).
--   2. SEC-02- und BSF-03D-Migration bereits angewendet.
--   3. Nur synthetische Testidentitäten (@example.invalid).
--
-- AUSFÜHRUNG
--   psql "<test-db-connection>" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/bsf03d-workpackage-category.sql
--
-- SEMANTIK
--   Eine Transaktion, endet mit ROLLBACK. Fail-fast per RAISE EXCEPTION.
--
-- TESTMATRIX T01–T16
--   T01 Katalog `workpackage.category` existiert, scope_type='systemhouse'
--   T02 Globale AVKK-Kataloge unverändert scope_type='global'
--   T03 Trigger: systemhouse-Katalog ohne systemhouse_id → 23514
--   T04 Trigger: globaler Katalog mit systemhouse_id → 23514
--   T05 Unique: gleicher Key im selben Systemhaus → 23505
--   T06 Unique: gleicher Key in anderem Systemhaus → erlaubt
--   T07 Trigger: Kategorie-Key ist unveränderlich → 23514
--   T08 Trigger: systemhouse_id ist unveränderlich → 23514
--   T09 anon: SELECT reference_value DENY (Grant-Ebene)
--   T10 Manager SH-A: sieht nur Werte von SH-A + globale (kein Cross-SH)
--   T11 Viewer SH-A: INSERT Kategorie DENY (RLS, kein manage)
--   T12 Manager SH-A: INSERT Kategorie in SH-B DENY (keine Membership)
--   T13 Manager SH-A: INSERT Kategorie in SH-A PASS
--   T14 Manager SH-A: Deaktivieren (UPDATE is_active=false) PASS, kein DELETE
--   T15 Manager SH-A: UPDATE auf Wert von SH-B wirkt auf 0 Zeilen
--   T16 History-Zeile trägt systemhouse_id; Manager SH-A sieht keine
--       History-Zeilen von SH-B
--
-- SYNTHETISCHE IDs
--   Systemhaus  aaaaaaa1-0000-4000-8000-00000000000N
--   Benutzer    bbbbbbb1-0000-4000-8000-00000000000N
--   Werte       ccccccc1-0000-4000-8000-00000000000N
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------
-- Seed (privilegierter Kontext)
-- ---------------------------------------------------------------------
INSERT INTO public.systemhouse (id, name, status) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', 'BSF03D SH-A', 'active'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 'BSF03D SH-B', 'active');

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id, 'bsf03d+' || u.tag || '@example.invalid',
       'authenticated', 'authenticated', now(), now(), '{}'::jsonb,
       jsonb_build_object('first_name', 'BSF03D', 'last_name', u.tag)
FROM (VALUES
  ('bbbbbbb1-0000-4000-8000-000000000001'::uuid, 'viewer-a'),
  ('bbbbbbb1-0000-4000-8000-000000000002'::uuid, 'manager-a'),
  ('bbbbbbb1-0000-4000-8000-000000000003'::uuid, 'manager-b')
) AS u(id, tag);

INSERT INTO public.profiles (id, first_name, last_name, display_name, email, status)
SELECT u.id, 'BSF03D', 'Test', 'BSF03D Test', u.email, 'active'::public.user_status
FROM auth.users u WHERE u.id::text LIKE 'bbbbbbb1-%'
ON CONFLICT (id) DO UPDATE SET status = 'active'::public.user_status;

DELETE FROM public.user_roles WHERE user_id::text LIKE 'bbbbbbb1-%';
INSERT INTO public.user_roles (user_id, role) VALUES
  ('bbbbbbb1-0000-4000-8000-000000000001', 'viewer'::public.app_role),
  ('bbbbbbb1-0000-4000-8000-000000000002', 'administrator'::public.app_role),
  ('bbbbbbb1-0000-4000-8000-000000000003', 'administrator'::public.app_role);

INSERT INTO public.systemhouse_membership (systemhouse_id, user_id, status) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', 'bbbbbbb1-0000-4000-8000-000000000001', 'active'),
  ('aaaaaaa1-0000-4000-8000-000000000001', 'bbbbbbb1-0000-4000-8000-000000000002', 'active'),
  ('aaaaaaa1-0000-4000-8000-000000000002', 'bbbbbbb1-0000-4000-8000-000000000003', 'active');

-- Seed-Wert in SH-B (privilegiert), um Cross-SH-Sichtbarkeit zu prüfen
INSERT INTO public.reference_value (id, catalog_id, key, label, systemhouse_id)
SELECT 'ccccccc1-0000-4000-8000-000000000002', c.id, 'shb_only', 'SH-B Kategorie',
       'aaaaaaa1-0000-4000-8000-000000000002'
FROM public.reference_catalog c WHERE c.key = 'workpackage.category';

-- ---------------------------------------------------------------------
-- T01/T02 — Katalog-Scope
-- ---------------------------------------------------------------------
DO $do$
DECLARE v_scope text; v_cnt int;
BEGIN
  SELECT scope_type INTO v_scope FROM public.reference_catalog WHERE key = 'workpackage.category';
  IF v_scope IS DISTINCT FROM 'systemhouse' THEN
    RAISE EXCEPTION 'FAIL T01: workpackage.category fehlt oder scope_type=% ', v_scope;
  END IF;
  SELECT count(*) INTO v_cnt FROM public.reference_catalog
   WHERE key LIKE 'avkk.%' AND scope_type <> 'global';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL T02: % AVKK-Kataloge nicht mehr global', v_cnt;
  END IF;
END $do$;

-- ---------------------------------------------------------------------
-- T03–T08 — Trigger + Unique (privilegierter Kontext, reine DB-Invarianten)
-- ---------------------------------------------------------------------
DO $do$
DECLARE v_cat uuid; v_global uuid; ok boolean;
BEGIN
  SELECT id INTO v_cat FROM public.reference_catalog WHERE key = 'workpackage.category';
  SELECT id INTO v_global FROM public.reference_catalog WHERE scope_type = 'global' LIMIT 1;

  ok := false;
  BEGIN
    INSERT INTO public.reference_value (catalog_id, key, label) VALUES (v_cat, 't03', 'T03');
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T03: systemhouse-Wert ohne systemhouse_id akzeptiert'; END IF;

  ok := false;
  BEGIN
    INSERT INTO public.reference_value (catalog_id, key, label, systemhouse_id)
    VALUES (v_global, 't04_' || gen_random_uuid()::text, 'T04', 'aaaaaaa1-0000-4000-8000-000000000001');
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T04: globaler Wert mit systemhouse_id akzeptiert'; END IF;

  INSERT INTO public.reference_value (id, catalog_id, key, label, systemhouse_id)
  VALUES ('ccccccc1-0000-4000-8000-000000000001', v_cat, 'dup', 'Dup A',
          'aaaaaaa1-0000-4000-8000-000000000001');
  ok := false;
  BEGIN
    INSERT INTO public.reference_value (catalog_id, key, label, systemhouse_id)
    VALUES (v_cat, 'dup', 'Dup A2', 'aaaaaaa1-0000-4000-8000-000000000001');
  EXCEPTION WHEN unique_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T05: doppelter Key im selben Systemhaus akzeptiert'; END IF;

  -- T06: gleicher Key in SH-B erlaubt
  INSERT INTO public.reference_value (catalog_id, key, label, systemhouse_id)
  VALUES (v_cat, 'dup', 'Dup B', 'aaaaaaa1-0000-4000-8000-000000000002');

  ok := false;
  BEGIN
    UPDATE public.reference_value SET key = 'renamed'
     WHERE id = 'ccccccc1-0000-4000-8000-000000000001';
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T07: Kategorie-Key war änderbar'; END IF;

  ok := false;
  BEGIN
    UPDATE public.reference_value SET systemhouse_id = 'aaaaaaa1-0000-4000-8000-000000000002'
     WHERE id = 'ccccccc1-0000-4000-8000-000000000001';
  EXCEPTION WHEN check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL T08: systemhouse_id war änderbar'; END IF;
END $do$;

-- ---------------------------------------------------------------------
-- T09 — anon DENY
-- ---------------------------------------------------------------------
DO $do$
DECLARE denied boolean := false; v_cnt int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    SELECT count(*) INTO v_cnt FROM public.reference_value;
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL T09: anon konnte reference_value lesen'; END IF;
END $do$;

-- ---------------------------------------------------------------------
-- T10 — Manager SH-A sieht kein SH-B
-- ---------------------------------------------------------------------
DO $do$
DECLARE v_cnt int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM public.reference_value
   WHERE systemhouse_id = 'aaaaaaa1-0000-4000-8000-000000000002';
  RESET ROLE;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL T10: Manager SH-A sieht % Werte von SH-B', v_cnt; END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM public.reference_value
   WHERE id = 'ccccccc1-0000-4000-8000-000000000001';
  RESET ROLE;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'FAIL T10: Manager SH-A sieht eigenen Wert nicht'; END IF;
END $do$;

-- ---------------------------------------------------------------------
-- T11/T12/T13 — INSERT-Pfad
-- ---------------------------------------------------------------------
DO $do$
DECLARE v_cat uuid; denied boolean;
BEGIN
  SELECT id INTO v_cat FROM public.reference_catalog WHERE key = 'workpackage.category';

  denied := false;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"bbbbbbb1-0000-4000-8000-000000000001","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.reference_value (catalog_id, key, label, systemhouse_id)
    VALUES (v_cat, 't11', 'T11', 'aaaaaaa1-0000-4000-8000-000000000001');
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN RESET ROLE; denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL T11: Viewer konnte Kategorie anlegen'; END IF;

  denied := false;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.reference_value (catalog_id, key, label, systemhouse_id)
    VALUES (v_cat, 't12', 'T12', 'aaaaaaa1-0000-4000-8000-000000000002');
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN RESET ROLE; denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL T12: Manager SH-A konnte in SH-B anlegen'; END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.reference_value (id, catalog_id, key, label, systemhouse_id)
  VALUES ('ccccccc1-0000-4000-8000-000000000003', v_cat, 't13', 'T13',
          'aaaaaaa1-0000-4000-8000-000000000001');
  RESET ROLE;
END $do$;

-- ---------------------------------------------------------------------
-- T14/T15/T16 — Deaktivieren, Cross-SH-Update, History-Scope
-- ---------------------------------------------------------------------
DO $do$
DECLARE v_cnt int; v_active boolean;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.reference_value SET is_active = false, valid_to = now()
   WHERE id = 'ccccccc1-0000-4000-8000-000000000003';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RESET ROLE;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'FAIL T14: Deaktivieren wirkte auf % Zeilen', v_cnt; END IF;
  SELECT is_active INTO v_active FROM public.reference_value
   WHERE id = 'ccccccc1-0000-4000-8000-000000000003';
  IF v_active THEN RAISE EXCEPTION 'FAIL T14: Wert nicht deaktiviert'; END IF;

  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'reference_value' AND cmd IN ('DELETE','ALL');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL T14: DELETE-Policy vorhanden'; END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.reference_value SET label = 'tampered'
   WHERE id = 'ccccccc1-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RESET ROLE;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL T15: Cross-SH-Update wirkte auf % Zeilen', v_cnt; END IF;

  SELECT count(*) INTO v_cnt FROM public.reference_value_history
   WHERE value_id = 'ccccccc1-0000-4000-8000-000000000003'
     AND systemhouse_id = 'aaaaaaa1-0000-4000-8000-000000000001';
  IF v_cnt < 1 THEN RAISE EXCEPTION 'FAIL T16: History ohne systemhouse_id'; END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbb1-0000-4000-8000-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM public.reference_value_history
   WHERE systemhouse_id = 'aaaaaaa1-0000-4000-8000-000000000002';
  RESET ROLE;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'FAIL T16: Manager SH-A sieht % History-Zeilen von SH-B', v_cnt; END IF;
END $do$;

DO $do$ BEGIN RAISE NOTICE 'BSF-03D T01–T16 PASS'; END $do$;

ROLLBACK;
