-- BSF-03D — systemhausbezogene Arbeitspaket-Kategorien
-- Issue #103 / TDD-Vertrag. BEGIN/ROLLBACK, fail-fast, nur synthetische Daten.
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', label; END IF;
  RAISE NOTICE 'PASS %', label;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_denied(stmt text, expected_state text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE got_state text; got_message text;
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_state = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    IF expected_state IS NULL OR got_state = expected_state THEN
      RAISE NOTICE 'PASS % (% / %)', label, got_state, got_message;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL % expected %, got % / %', label, expected_state, got_state, got_message;
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

-- RED-Gate: Vor BSF-03D fehlen diese Scope-Felder.
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reference_catalog' AND column_name='scope_type'
  ),
  'D01 reference_catalog.scope_type exists'
);
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reference_value' AND column_name='systemhouse_id'
  ),
  'D02 reference_value.systemhouse_id exists'
);
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reference_value_history' AND column_name='systemhouse_id'
  ),
  'D03 reference_value_history.systemhouse_id exists'
);

-- Katalogvertrag: vorhandene Kataloge bleiben global; neuer AP-Katalog ist systemhouse-scoped.
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM public.reference_catalog
    WHERE key <> 'workpackage.category' AND scope_type <> 'global'
  ),
  'D04 existing catalogs remain global'
);
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.reference_catalog
    WHERE key='workpackage.category' AND scope_type='systemhouse'
  ),
  'D05 workpackage.category catalog exists and is systemhouse scoped'
);

-- Synthetische Testwelt.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
SELECT id,
       '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', email, 'x', now(), now(), now(), '{}', '{}'
FROM (VALUES
  ('00000000-0000-0000-0000-00000000e301'::uuid,'bsf03d-admin-a@example.invalid'),
  ('00000000-0000-0000-0000-00000000e302'::uuid,'bsf03d-reader-a@example.invalid'),
  ('00000000-0000-0000-0000-00000000e303'::uuid,'bsf03d-admin-b@example.invalid'),
  ('00000000-0000-0000-0000-00000000e304'::uuid,'bsf03d-admin-nomembership@example.invalid')
) v(id,email);

DELETE FROM public.user_roles
 WHERE user_id BETWEEN '00000000-0000-0000-0000-00000000e301'::uuid
                   AND '00000000-0000-0000-0000-00000000e304'::uuid;
INSERT INTO public.user_roles(user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000e301','administrator'),
  ('00000000-0000-0000-0000-00000000e302','engineer'),
  ('00000000-0000-0000-0000-00000000e303','administrator'),
  ('00000000-0000-0000-0000-00000000e304','administrator');

UPDATE public.profiles
SET status='active'
WHERE id BETWEEN '00000000-0000-0000-0000-00000000e301'::uuid
             AND '00000000-0000-0000-0000-00000000e304'::uuid;

INSERT INTO public.systemhouse(id,name,status) VALUES
  ('00000000-0000-0000-0000-0000000ae301','BSF03D SH-A','active'),
  ('00000000-0000-0000-0000-0000000ae302','BSF03D SH-B','active');
INSERT INTO public.systemhouse_membership(systemhouse_id,user_id,status) VALUES
  ('00000000-0000-0000-0000-0000000ae301','00000000-0000-0000-0000-00000000e301','active'),
  ('00000000-0000-0000-0000-0000000ae301','00000000-0000-0000-0000-00000000e302','active'),
  ('00000000-0000-0000-0000-0000000ae302','00000000-0000-0000-0000-00000000e303','active');

-- IDs des vorhandenen systemhausbezogenen Katalogs merken.
SELECT set_config(
  'test.wp_catalog_id',
  (SELECT id::text FROM public.reference_catalog WHERE key='workpackage.category'),
  true
);

-- Seed als privilegierter Kontext; History-Trigger darf mitlaufen.
INSERT INTO public.reference_value(
  id,catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id
) VALUES
  ('00000000-0000-0000-0000-0000000ce301', current_setting('test.wp_catalog_id')::uuid,
   'incident','Störung','',10,true,false,'00000000-0000-0000-0000-0000000ae301'),
  ('00000000-0000-0000-0000-0000000ce302', current_setting('test.wp_catalog_id')::uuid,
   'maintenance','Wartung','',10,true,false,'00000000-0000-0000-0000-0000000ae302');

-- D06 globaler Katalogwert muss NULL-Scope tragen.
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1
    FROM public.reference_value v
    JOIN public.reference_catalog c ON c.id=v.catalog_id
    WHERE c.scope_type='global' AND v.systemhouse_id IS NOT NULL
  ),
  'D06 global values have no systemhouse_id'
);

-- D07/D08: Leser in SH-A sieht SH-A, nie SH-B.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e302');
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.reference_value
    WHERE id='00000000-0000-0000-0000-0000000ce301'
  ),
  'D07 own-systemhouse category readable'
);
SELECT pg_temp.assert(
  NOT EXISTS (
    SELECT 1 FROM public.reference_value
    WHERE id='00000000-0000-0000-0000-0000000ce302'
  ),
  'D08 cross-systemhouse category hidden'
);
SELECT pg_temp.act_reset();

-- D09: Admin + Manage + Membership darf eigenen Wert anlegen.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e301');
INSERT INTO public.reference_value(
  id,catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id,
  created_by,updated_by
) VALUES (
  '00000000-0000-0000-0000-0000000ce303', current_setting('test.wp_catalog_id')::uuid,
  'change','Änderung','',20,true,false,'00000000-0000-0000-0000-0000000ae301',
  '00000000-0000-0000-0000-00000000e301','00000000-0000-0000-0000-00000000e301'
);
SELECT pg_temp.assert(
  EXISTS (SELECT 1 FROM public.reference_value WHERE id='00000000-0000-0000-0000-0000000ce303'),
  'D09 manager with membership can insert own-systemhouse category'
);

-- D10: Cross-Systemhouse INSERT trotz manage DENY.
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.reference_value(
      catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id,created_by,updated_by
    ) VALUES (
      current_setting('test.wp_catalog_id')::uuid,'cross','Cross','',30,true,false,
      '00000000-0000-0000-0000-0000000ae302',
      '00000000-0000-0000-0000-00000000e301','00000000-0000-0000-0000-00000000e301'
    )$$,
  '42501','D10 cross-systemhouse insert denied'
);
SELECT pg_temp.act_reset();

-- D11: Admin ohne Membership darf keinen systemhausbezogenen Wert schreiben.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e304');
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.reference_value(
      catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id,created_by,updated_by
    ) VALUES (
      current_setting('test.wp_catalog_id')::uuid,'nomembership','No Membership','',40,true,false,
      '00000000-0000-0000-0000-0000000ae301',
      '00000000-0000-0000-0000-00000000e304','00000000-0000-0000-0000-00000000e304'
    )$$,
  '42501','D11 manage without membership denied'
);
SELECT pg_temp.act_reset();

-- D12: Leser ohne referencedata.manage darf nicht schreiben.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e302');
SELECT pg_temp.assert_denied(
  $$UPDATE public.reference_value
      SET label='Nicht erlaubt', updated_by='00000000-0000-0000-0000-00000000e302'
    WHERE id='00000000-0000-0000-0000-0000000ce301'$$,
  '42501','D12 reader update denied'
);
SELECT pg_temp.act_reset();

-- D13: DELETE bleibt auf Grant-Ebene verboten.
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000e301');
SELECT pg_temp.assert_denied(
  $$DELETE FROM public.reference_value WHERE id='00000000-0000-0000-0000-0000000ce301'$$,
  '42501','D13 hard delete denied'
);
SELECT pg_temp.act_reset();

-- D14: gleicher Key in zwei Systemhäusern ist zulässig, im selben nicht.
INSERT INTO public.reference_value(
  id,catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id
) VALUES (
  '00000000-0000-0000-0000-0000000ce304', current_setting('test.wp_catalog_id')::uuid,
  'incident','Incident B','',20,true,false,'00000000-0000-0000-0000-0000000ae302'
);
SELECT pg_temp.assert_denied(
  $$INSERT INTO public.reference_value(
      catalog_id,key,label,description,sort_order,is_active,is_default,systemhouse_id
    ) VALUES (
      current_setting('test.wp_catalog_id')::uuid,'incident','Duplicate A','',99,true,false,
      '00000000-0000-0000-0000-0000000ae301'
    )$$,
  '23505','D14 duplicate key in same systemhouse denied'
);

-- D15: Triggerhistorie übernimmt den Scope.
SELECT pg_temp.assert(
  EXISTS (
    SELECT 1 FROM public.reference_value_history
    WHERE value_id='00000000-0000-0000-0000-0000000ce303'
      AND systemhouse_id='00000000-0000-0000-0000-0000000ae301'
  ),
  'D15 history keeps systemhouse scope'
);

ROLLBACK;
