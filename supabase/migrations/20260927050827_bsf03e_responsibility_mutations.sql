-- BSF-03E P2 — atomic responsibility lifecycle
-- Issue #63
--
-- Public API stays SECURITY INVOKER. The actual transaction runs behind the
-- non-exposed private schema and reuses the P0 scope/candidate contract.
-- Scoped BSF-03E rows can no longer be mutated directly through Data API
-- table DML; legacy unscoped AVKK keeps its existing compatibility path.

-- ---------------------------------------------------------------------------
-- 1. Direct DML: scoped rows are lifecycle-RPC only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avkk_responsibility_insert
  ON public.avkk_responsibility;
CREATE POLICY avkk_responsibility_insert
  ON public.avkk_responsibility
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS avkk_responsibility_update
  ON public.avkk_responsibility;
CREATE POLICY avkk_responsibility_update
  ON public.avkk_responsibility
  FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS avkk_responsibility_type_insert
  ON public.avkk_responsibility_type;
CREATE POLICY avkk_responsibility_type_insert
  ON public.avkk_responsibility_type
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_responsibility r
        JOIN public.avkk_subject s
          ON s.id = r.avkk_subject_id
       WHERE r.id = responsibility_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  );

-- DELETE policies from P0 already restrict scoped rows to history via valid_to.

-- ---------------------------------------------------------------------------
-- 2. Private transaction: owner transfer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_transfer_owner(
  _responsibility_id uuid,
  _target_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  source_row public.avkk_responsibility%ROWTYPE;
  new_id uuid;
  active_owner_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_denied'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.*
    INTO source_row
    FROM public.avkk_responsibility r
    JOIN public.avkk_subject s
      ON s.id = r.avkk_subject_id
   WHERE r.id = _responsibility_id
     AND r.valid_to IS NULL
     AND r.role_key_snapshot = 'owner'
     AND s.systemhouse_id IS NOT NULL
     AND s.customer_id IS NOT NULL
     AND s.subject_type IN ('project','workpackage')
     AND s.status = 'active'
   FOR UPDATE OF r, s;

  IF source_row.id IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_invalid'
      USING ERRCODE = '22023';
  END IF;

  -- Reuses the P0 defense-in-depth scope, active projection and target rules.
  IF NOT EXISTS (
    SELECT 1
      FROM private.bsf03e_avkk_responsibility_candidates(
        source_row.avkk_subject_id
      ) c
     WHERE c.user_id = _target_user_id
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_denied'
      USING ERRCODE = '42501';
  END IF;

  IF source_row.person_id = _target_user_id THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_already_owner'
      USING ERRCODE = '23505';
  END IF;

  -- Serialize every active owner decision on the same subject.
  PERFORM 1
    FROM public.avkk_responsibility r
   WHERE r.avkk_subject_id = source_row.avkk_subject_id
     AND r.role_key_snapshot = 'owner'
     AND r.valid_to IS NULL
   FOR UPDATE;

  SELECT count(*)
    INTO active_owner_count
    FROM public.avkk_responsibility r
   WHERE r.avkk_subject_id = source_row.avkk_subject_id
     AND r.role_key_snapshot = 'owner'
     AND r.valid_to IS NULL;

  IF active_owner_count <> 1 THEN
    RAISE EXCEPTION 'bsf03e_responsibility_owner_conflict'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.avkk_responsibility
     SET valid_to = now(),
         updated_by = actor
   WHERE id = source_row.id;

  INSERT INTO public.avkk_responsibility (
    avkk_subject_id,
    person_id,
    role_value_id,
    role_key_snapshot,
    role_label_snapshot,
    note,
    valid_from,
    valid_to,
    created_by,
    updated_by
  )
  VALUES (
    source_row.avkk_subject_id,
    _target_user_id,
    source_row.role_value_id,
    source_row.role_key_snapshot,
    source_row.role_label_snapshot,
    source_row.note,
    now(),
    NULL,
    actor,
    actor
  )
  RETURNING id INTO new_id;

  INSERT INTO public.avkk_responsibility_type (
    responsibility_id,
    type_value_id,
    type_key_snapshot,
    type_label_snapshot,
    created_by
  )
  SELECT
    new_id,
    t.type_value_id,
    t.type_key_snapshot,
    t.type_label_snapshot,
    actor
  FROM public.avkk_responsibility_type t
  WHERE t.responsibility_id = source_row.id;

  RETURN new_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.bsf03e_transfer_owner(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_transfer_owner(uuid,uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Private transaction: add deputy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_add_deputy(
  _source_responsibility_id uuid,
  _target_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  source_row public.avkk_responsibility%ROWTYPE;
  deputy_role_id uuid;
  deputy_role_key text;
  deputy_role_label text;
  new_id uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_denied'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.*
    INTO source_row
    FROM public.avkk_responsibility r
    JOIN public.avkk_subject s
      ON s.id = r.avkk_subject_id
   WHERE r.id = _source_responsibility_id
     AND r.valid_to IS NULL
     AND r.role_key_snapshot = 'owner'
     AND s.systemhouse_id IS NOT NULL
     AND s.customer_id IS NOT NULL
     AND s.subject_type IN ('project','workpackage')
     AND s.status = 'active'
   FOR UPDATE OF r, s;

  IF source_row.id IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_invalid'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM private.bsf03e_avkk_responsibility_candidates(
        source_row.avkk_subject_id
      ) c
     WHERE c.user_id = _target_user_id
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_denied'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize duplicate/dual-role decisions for this subject.
  PERFORM 1
    FROM public.avkk_responsibility r
   WHERE r.avkk_subject_id = source_row.avkk_subject_id
     AND r.valid_to IS NULL
   FOR UPDATE;

  IF EXISTS (
    SELECT 1
      FROM public.avkk_responsibility r
     WHERE r.avkk_subject_id = source_row.avkk_subject_id
       AND r.person_id = _target_user_id
       AND r.valid_to IS NULL
       AND r.role_key_snapshot = 'deputy'
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_already_assigned'
      USING ERRCODE = '23505';
  END IF;

  SELECT rv.id, rv.key, rv.label
    INTO deputy_role_id, deputy_role_key, deputy_role_label
    FROM public.reference_value rv
    JOIN public.reference_catalog rc
      ON rc.id = rv.catalog_id
   WHERE rc.key = 'avkk.responsibility_role'
     AND rv.key = 'deputy'
     AND rv.is_active
   LIMIT 1;

  IF deputy_role_id IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_reference_missing'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.avkk_responsibility (
    avkk_subject_id,
    person_id,
    role_value_id,
    role_key_snapshot,
    role_label_snapshot,
    note,
    valid_from,
    valid_to,
    created_by,
    updated_by
  )
  VALUES (
    source_row.avkk_subject_id,
    _target_user_id,
    deputy_role_id,
    deputy_role_key,
    deputy_role_label,
    '',
    now(),
    NULL,
    actor,
    actor
  )
  RETURNING id INTO new_id;

  INSERT INTO public.avkk_responsibility_type (
    responsibility_id,
    type_value_id,
    type_key_snapshot,
    type_label_snapshot,
    created_by
  )
  SELECT
    new_id,
    t.type_value_id,
    t.type_key_snapshot,
    t.type_label_snapshot,
    actor
  FROM public.avkk_responsibility_type t
  WHERE t.responsibility_id = source_row.id;

  RETURN new_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.bsf03e_add_deputy(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_add_deputy(uuid,uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Private transaction: end an active responsibility
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_end_responsibility(
  _responsibility_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  source_row public.avkk_responsibility%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_denied'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.*
    INTO source_row
    FROM public.avkk_responsibility r
    JOIN public.avkk_subject s
      ON s.id = r.avkk_subject_id
   WHERE r.id = _responsibility_id
     AND r.valid_to IS NULL
     AND r.role_key_snapshot IN ('owner','deputy')
     AND s.systemhouse_id IS NOT NULL
     AND s.customer_id IS NOT NULL
     AND s.subject_type IN ('project','workpackage')
     AND s.status = 'active'
   FOR UPDATE OF r, s;

  IF source_row.id IS NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_mutation_invalid'
      USING ERRCODE = '22023';
  END IF;

  -- Calling the P0 candidate contract validates actor, scope and projection.
  PERFORM 1
    FROM private.bsf03e_avkk_responsibility_candidates(
      source_row.avkk_subject_id
    )
   LIMIT 1;

  UPDATE public.avkk_responsibility
     SET valid_to = now(),
         updated_by = actor
   WHERE id = source_row.id;

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.bsf03e_end_responsibility(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_end_responsibility(uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Public SECURITY-INVOKER API
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bsf03e_transfer_owner(
  _responsibility_id uuid,
  _target_user_id uuid
)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_transfer_owner(
    _responsibility_id,
    _target_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.bsf03e_add_deputy(
  _source_responsibility_id uuid,
  _target_user_id uuid
)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_add_deputy(
    _source_responsibility_id,
    _target_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.bsf03e_end_responsibility(
  _responsibility_id uuid
)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_end_responsibility(_responsibility_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.bsf03e_transfer_owner(uuid,uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bsf03e_add_deputy(uuid,uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bsf03e_end_responsibility(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bsf03e_transfer_owner(uuid,uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.bsf03e_add_deputy(uuid,uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.bsf03e_end_responsibility(uuid)
  TO authenticated;
