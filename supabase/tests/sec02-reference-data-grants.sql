-- =====================================================================
-- SEC-02 — Reproduzierbares DB/Grant-Testartefakt (Issue #91)
-- Prüfgegenstand: Table Privileges (GRANT/REVOKE) auf
--                 public.reference_catalog
--                 public.reference_value
--                 public.reference_value_history
-- Basis-Migration:
--   supabase/migrations/20260827035555_a6c7f5a6-417b-400e-a233-ae53a8ddc06d.sql
--
-- WARNUNG / EINSATZKONTEXT
--   NICHT ungeprüft gegen Produktion ausführen.
--   Ausschließlich für eine disposable/local/staging Testdatenbank oder
--   einen ausdrücklich freigegebenen Testkontext bestimmt.
--
-- VORAUSSETZUNGEN
--   1. Privilegierter DB-Testkontext (Owner/Superuser-äquivalent, z. B.
--      `postgres` via lokalem psql). Benötigt: INSERT in auth.users,
--      SET ROLE auf `anon`/`authenticated`, Setzen von
--      `request.jwt.claims`. Ein reiner PostgREST-/Anwendungszugang oder
--      der eingeschränkte `sandbox_exec`-Rollenkontext genügt NICHT.
--   2. Die SEC-02-Migration ist bereits angewendet.
--   3. Nur synthetische Testidentitäten (@example.invalid).
--
-- AUSFÜHRUNG
--   psql "<test-db-connection>" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/sec02-reference-data-grants.sql
--
-- SEMANTIK
--   Alles läuft in EINER Transaktion und endet mit ROLLBACK; es bleiben
--   weder Testdaten noch Hilfsobjekte zurück.
--   Fail-fast: jede unerwartete Beobachtung erzeugt RAISE EXCEPTION.
--   Ein Testlauf kann daher nicht fälschlich PASS melden.
--
-- TESTMATRIX T01–T24
--   T01 Katalog-ACL reference_catalog: authenticated = nur SELECT
--   T02 Katalog-ACL reference_value: authenticated = SELECT/INSERT/UPDATE
--   T03 Katalog-ACL reference_value_history: authenticated = nur SELECT
--   T04 anon DENY SELECT reference_catalog
--   T05 anon DENY SELECT reference_value
--   T06 anon DENY SELECT reference_value_history
--   T07 authenticated ohne referencedata.view: SELECT liefert 0 Zeilen (RLS)
--   T08 authenticated mit referencedata.view: SELECT reference_catalog PASS
--   T09 authenticated mit referencedata.view: SELECT reference_value PASS
--   T10 keine Table Grants für PUBLIC auf allen drei Tabellen
--   T11 keine Table Grants für anon auf allen drei Tabellen
--   T12 referencedata.view ohne manage: INSERT reference_value DENY (RLS)
--   T13 referencedata.view ohne manage: UPDATE reference_value DENY (RLS)
--   T14 service_role-ACL unverändert (arwdDxtm)
--   T15 RLS auf allen drei Tabellen aktiviert
--   T16 keine DELETE-Policy auf den drei Tabellen
--   T17 Trigger-Inventar unverändert (updated_at + reference_value_track)
--   T18 referencedata.manage: INSERT reference_value PASS
--   T19 referencedata.manage: UPDATE reference_value PASS
--   T20 Deactivate = UPDATE (is_active=false, validTo) PASS, kein DELETE
--   T21 History-Trigger schreibt reference_value_history; Catalog-Version
--       wird erhöht
--   T22 reference_catalog INSERT/UPDATE für Browser-Client DENY
--       (Grant-Ebene, unabhängig von RLS)
--   T23 authenticated DELETE auf allen drei Tabellen DENY (Grant-Ebene)
--   T24 authenticated TRUNCATE auf allen drei Tabellen DENY
--
--   Zusätzlich (AVKK-Regressionsbezug): Der AVKK-Lesepfad nutzt
--   ausschließlich SELECT auf reference_catalog/reference_value mit
--   referencedata.view; dieser Vertrag ist durch T08/T09 abgedeckt.
--   Der HTTP-/PostgREST-Pfad (Browser-Client, JWT-Ausstellung, UI) ist in
--   portablem SQL NICHT beweisbar und bleibt ein separates
--   Integrations-/E2E-Gate.
--
-- SYNTHETISCHE IDs
--   Benutzer  44444444-4444-4444-8444-00000000000N
--   Katalog   55555555-5555-4555-8555-000000000001
-- =====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------
-- Seed (privilegierter Kontext)
-- ---------------------------------------------------------------------

INSERT INTO auth.users (id, email, aud, role, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT u.id,
       'sec02+' || u.tag || '@example.invalid',
       'authenticated', 'authenticated', now(), now(),
       '{}'::jsonb,
       jsonb_build_object('first_name', 'SEC02', 'last_name', u.tag)
FROM (VALUES
  ('44444444-4444-4444-8444-000000000001'::uuid, 'norole'),
  ('44444444-4444-4444-8444-000000000002'::uuid, 'viewer'),
  ('44444444-4444-4444-8444-000000000003'::uuid, 'manager')
) AS u(id, tag);

INSERT INTO public.profiles (id, first_name, last_name, display_name, email, status)
SELECT u.id, 'SEC02', 'Test', 'SEC02 Test',
       'sec02+' || replace(u.id::text, '-', '') || '@example.invalid',
       'active'::public.user_status
FROM auth.users u
WHERE u.id::text LIKE '44444444-4444-4444-8444-%'
ON CONFLICT (id) DO UPDATE
  SET status = 'active'::public.user_status;

-- Hinweis: der Trigger auth.on_auth_user_created vergibt beim Seed automatisch
-- die Rolle 'viewer'. Fuer den Fall "keine Reference-Data-Permission" muessen
-- diese automatisch vergebenen Rollen wieder entfernt werden.
DELETE FROM public.user_roles
 WHERE user_id = '44444444-4444-4444-8444-000000000001';

-- viewer: referencedata.view (kein manage); administrator: manage
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('44444444-4444-4444-8444-000000000002', 'viewer'::public.app_role),
  ('44444444-4444-4444-8444-000000000003', 'administrator'::public.app_role)
ON CONFLICT DO NOTHING;

-- Synthetischer Katalog + Wert (kein Bezug zu Fachdaten)
INSERT INTO public.reference_catalog (id, key, name, description, domain,
                                      is_system, is_hierarchical, version)
VALUES ('55555555-5555-4555-8555-000000000001', 'sec02.test',
        'SEC-02 Testkatalog', '', 'sec02', false, false, 1);

INSERT INTO public.reference_value (id, catalog_id, key, label, description,
                                    sort_order, is_active, is_default)
VALUES ('55555555-5555-4555-8555-000000000010',
        '55555555-5555-4555-8555-000000000001',
        'seed', 'Seedwert', '', 10, true, false);

-- Seed-Nebenwirkung des History-Triggers neutralisieren, damit T21
-- ausschließlich die Wirkung des Testlaufs misst.
DELETE FROM public.reference_value_history
 WHERE catalog_id = '55555555-5555-4555-8555-000000000001';
UPDATE public.reference_catalog SET version = 1
 WHERE id = '55555555-5555-4555-8555-000000000001';

-- ---------------------------------------------------------------------
-- T01–T03, T10, T11, T14 — statische ACL-Verträge
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  c record;
  acl aclitem[];
  txt text;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('T01', 'reference_catalog',       'authenticated=r/'),
      ('T02', 'reference_value',         'authenticated=arw/'),
      ('T03', 'reference_value_history', 'authenticated=r/')
    ) AS v(tid, tbl, expected)
  LOOP
    SELECT relacl INTO acl FROM pg_class
     WHERE relname = c.tbl AND relnamespace = 'public'::regnamespace;
    txt := array_to_string(acl::text[], ',');

    IF position(c.expected IN txt) = 0 THEN
      RAISE EXCEPTION 'FAIL %: erwarteter Grant "%" fehlt in ACL von % (%)',
        c.tid, c.expected, c.tbl, txt;
    END IF;

    -- T11: keine anon-Grants
    IF txt LIKE '%anon=%' THEN
      RAISE EXCEPTION 'FAIL T11: anon besitzt Table Grants auf % (%)', c.tbl, txt;
    END IF;

    -- T10: keine PUBLIC-Grants (aclitem mit leerem Grantee, z. B. "=r/")
    IF txt LIKE '%,=%' OR txt LIKE '{=%' OR left(txt, 1) = '=' THEN
      RAISE EXCEPTION 'FAIL T10: PUBLIC besitzt Table Grants auf % (%)', c.tbl, txt;
    END IF;

    -- T14: service_role unverändert
    IF position('service_role=arwdDxtm/' IN txt) = 0 THEN
      RAISE EXCEPTION 'FAIL T14: service_role-ACL auf % verändert (%)', c.tbl, txt;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- T15 — RLS aktiviert / T16 — keine DELETE-Policy
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt FROM pg_class
   WHERE relnamespace = 'public'::regnamespace
     AND relname IN ('reference_catalog','reference_value','reference_value_history')
     AND relrowsecurity;
  IF v_cnt <> 3 THEN
    RAISE EXCEPTION 'FAIL T15: RLS nicht auf allen drei Tabellen aktiv (%)', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('reference_catalog','reference_value','reference_value_history')
     AND cmd IN ('DELETE','ALL');
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL T16: unerwartete DELETE-/ALL-Policy vorhanden (%)', v_cnt;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T17 — Trigger-Inventar unverändert
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(e.name, ', ') INTO v_missing
  FROM (VALUES
    ('reference_catalog_set_updated_at'),
    ('reference_value_set_updated_at'),
    ('reference_value_track')
  ) AS e(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE NOT t.tgisinternal AND t.tgname = e.name
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL T17: Trigger fehlen: %', v_missing;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T04–T06 — anon besitzt keinerlei Leserecht
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  t text;
  tid text;
  denied boolean;
BEGIN
  FOR tid, t IN
    SELECT * FROM (VALUES
      ('T04','reference_catalog'),
      ('T05','reference_value'),
      ('T06','reference_value_history')
    ) AS v(a, b)
  LOOP
    denied := false;
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE format('SELECT count(*) FROM public.%I', t);
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      denied := true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL %: anon konnte public.% lesen', tid, t;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- T07 — authenticated ohne referencedata.view sieht keine Zeilen
-- T08/T09 — referencedata.view liest Katalog und Werte
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_cat int;
  v_val int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-000000000001","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cat FROM public.reference_catalog;
  SELECT count(*) INTO v_val FROM public.reference_value;
  RESET ROLE;
  IF v_cat <> 0 OR v_val <> 0 THEN
    RAISE EXCEPTION 'FAIL T07: Benutzer ohne referencedata.view sah % Kataloge / % Werte',
      v_cat, v_val;
  END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cat FROM public.reference_catalog
   WHERE id = '55555555-5555-4555-8555-000000000001';
  SELECT count(*) INTO v_val FROM public.reference_value
   WHERE catalog_id = '55555555-5555-4555-8555-000000000001';
  RESET ROLE;
  IF v_cat <> 1 THEN RAISE EXCEPTION 'FAIL T08: Katalog nicht lesbar (%)', v_cat; END IF;
  IF v_val <> 1 THEN RAISE EXCEPTION 'FAIL T09: Werte nicht lesbar (%)', v_val; END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T12/T13 — referencedata.view ohne manage darf nicht schreiben
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  denied boolean;
  v_cnt int;
BEGIN
  denied := false;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"44444444-4444-4444-8444-000000000002","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.reference_value (catalog_id, key, label, description,
                                        sort_order, is_active, is_default)
    VALUES ('55555555-5555-4555-8555-000000000001', 'viewer-insert',
            'Unerlaubt', '', 99, true, false);
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'FAIL T12: Benutzer ohne referencedata.manage konnte INSERT ausfuehren';
  END IF;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-000000000002","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.reference_value SET label = 'tampered'
   WHERE id = '55555555-5555-4555-8555-000000000010';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RESET ROLE;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'FAIL T13: Benutzer ohne referencedata.manage konnte % Zeilen aendern', v_cnt;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T18/T19/T20/T21 — Pflegepfad mit referencedata.manage
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  v_cnt int;
  v_hist int;
  v_version int;
  v_active boolean;
  v_valid_to timestamptz;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-000000000003","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  -- T18 INSERT
  INSERT INTO public.reference_value (id, catalog_id, key, label, description,
                                      sort_order, is_active, is_default)
  VALUES ('55555555-5555-4555-8555-000000000011',
          '55555555-5555-4555-8555-000000000001',
          'managed', 'Gepflegt', '', 20, true, false);

  -- T19 UPDATE
  UPDATE public.reference_value SET label = 'Gepflegt v2'
   WHERE id = '55555555-5555-4555-8555-000000000011';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'FAIL T19: UPDATE mit referencedata.manage aenderte % Zeilen', v_cnt;
  END IF;

  -- T20 Deactivate = UPDATE, kein DELETE
  UPDATE public.reference_value
     SET is_active = false, valid_to = now()
   WHERE id = '55555555-5555-4555-8555-000000000011';
  RESET ROLE;

  SELECT is_active, valid_to INTO v_active, v_valid_to
    FROM public.reference_value
   WHERE id = '55555555-5555-4555-8555-000000000011';
  IF v_active IS DISTINCT FROM false OR v_valid_to IS NULL THEN
    RAISE EXCEPTION 'FAIL T20: Deaktivierung nicht als UPDATE wirksam (active=%, valid_to=%)',
      v_active, v_valid_to;
  END IF;

  -- T21 History + Catalog-Version
  SELECT count(*) INTO v_hist FROM public.reference_value_history
   WHERE catalog_id = '55555555-5555-4555-8555-000000000001';
  IF v_hist < 3 THEN
    RAISE EXCEPTION 'FAIL T21: History unvollstaendig (% Eintraege, erwartet >= 3)', v_hist;
  END IF;

  SELECT version INTO v_version FROM public.reference_catalog
   WHERE id = '55555555-5555-4555-8555-000000000001';
  IF v_version < 4 THEN
    RAISE EXCEPTION 'FAIL T21: Catalog-Version nicht erhoeht (%)', v_version;
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T22 — reference_catalog INSERT/UPDATE für Browser-Client DENY
--       (Grant-Ebene, greift vor jeder Policy)
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  denied boolean;
BEGIN
  denied := false;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"44444444-4444-4444-8444-000000000003","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.reference_catalog (key, name, description, domain,
                                          is_system, is_hierarchical, version)
    VALUES ('sec02.forbidden', 'Unerlaubt', '', 'sec02', false, false, 1);
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'FAIL T22: authenticated konnte reference_catalog INSERT ausfuehren';
  END IF;

  denied := false;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"44444444-4444-4444-8444-000000000003","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;
    UPDATE public.reference_catalog SET name = 'tampered'
     WHERE id = '55555555-5555-4555-8555-000000000001';
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'FAIL T22: authenticated konnte reference_catalog UPDATE ausfuehren';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- T23 — DELETE DENY / T24 — TRUNCATE DENY (jeweils Grant-Ebene)
-- ---------------------------------------------------------------------
DO $do$
DECLARE
  t text;
  denied boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['reference_catalog','reference_value','reference_value_history']
  LOOP
    denied := false;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        '{"sub":"44444444-4444-4444-8444-000000000003","role":"authenticated"}', true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('DELETE FROM public.%I', t);
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      denied := true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL T23: authenticated konnte DELETE auf public.% ausfuehren', t;
    END IF;

    denied := false;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        '{"sub":"44444444-4444-4444-8444-000000000003","role":"authenticated"}', true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('TRUNCATE TABLE public.%I', t);
      RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      denied := true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL T24: authenticated konnte TRUNCATE auf public.% ausfuehren', t;
    END IF;
  END LOOP;
END
$do$;

-- ---------------------------------------------------------------------
-- Abschluss: keine Testdaten hinterlassen
-- ---------------------------------------------------------------------
ROLLBACK;