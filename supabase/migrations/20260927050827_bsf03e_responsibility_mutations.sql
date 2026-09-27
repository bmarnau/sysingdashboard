-- BSF-03E P2 - atomic responsibility lifecycle
-- Issue #63
-- Public RPCs stay SECURITY INVOKER. Hardened private implementations perform
-- the scoped lifecycle under validated caller identity and scope.
-- Direct authenticated DML remains available only for legacy unscoped AVKK.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. Direct scoped responsibility DML is no longer a lifecycle path.
--    Legacy AVKK stays compatible.
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
      JOIN public.avkk_subject s ON s.id = r.avkk_subject_id
      WHERE r.id = responsibility_id
        AND s.systemhouse_id IS NULL
        AND s.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS avkk_responsibility_type_delete
  ON public.avkk_responsibility_type;
CREATE POLICY avkk_responsibility_type_delete
  ON public.avkk_responsibility_type
  FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
      FROM public.avkk_responsibility r
      JOIN public.avkk_subject s ON s.id = r.avkk_subject_id
      WHERE r.id = responsibility_id
        AND s.systemhouse_id IS NULL
        AND s.customer_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Shared authorization helper.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_assert_mutation_scope(
  _subject uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_systemhouse uuid;
  v_customer uuid;
  v_subject_type text;
  v_source_id text;
BEGIN
  SELECT s.systemhouse_id, s.customer_id, s.subject_type, s.subject_id
    INTO v_systemhouse, v_customer, v_subject_type, v_source_id
  FROM public.avkk_subject s
  WHERE s.id = _subject
    AND s.systemhouse_id IS NOT NULL
    AND s.customer_id IS NOT NULL
    AND s.subject_type IN ('project','workpackage')
    AND s.status = 'active';

  IF v_systemhouse IS NULL
     OR v_customer IS NULL
     OR auth.uid() IS NULL
     OR NOT public.is_account_active(auth.uid())
     OR NOT public.has_permission(auth.uid(), 'avkk.responsibility.assign')
     OR NOT public.has_active_systemhouse_membership(auth.uid(), v_systemhouse)
     OR NOT public.has_customer_access(
       auth.uid(), v_systemhouse, v_customer, 'write'
     ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
      USING ERRCODE = '42501';
  END IF;

  IF v_subject_type = 'project' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.shared_project_projection p
      WHERE p.systemhouse_id = v_systemhouse
        AND p.customer_id = v_customer
        AND p.source_id = v_source_id
        AND p.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.shared_work_package_projection w
      WHERE w.systemhouse_id = v_systemhouse
        AND w.customer_id = v_customer
        AND w.source_id = v_source_id
        AND w.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
        USING ERRCODE = '42501';
    END IF;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION private.bsf03e_assert_mutation_scope(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_assert_mutation_scope(uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Owner transfer.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_transfer_owner(
  _responsibility uuid,
  _new_person uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_source public.avkk_responsibility%ROWTYPE;
  v_subject public.avkk_subject%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT r.*
    INTO v_source
  FROM public.avkk_responsibility r
  WHERE r.id = _responsibility
  FOR UPDATE;

  IF v_source.id IS NULL
     OR v_source.valid_to IS NOT NULL
     OR v_source.role_key_snapshot <> 'owner' THEN
    RAISE EXCEPTION 'bsf03e_owner_source_invalid'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.*
    INTO v_subject
  FROM public.avkk_subject s
  WHERE s.id = v_source.avkk_subject_id
  FOR UPDATE;

  PERFORM private.bsf03e_assert_mutation_scope(v_source.avkk_subject_id);

  IF EXISTS (
    SELECT 1
    FROM public.avkk_responsibility r
    WHERE r.avkk_subject_id = v_source.avkk_subject_id
      AND r.role_key_snapshot = 'owner'
      AND r.valid_to IS NULL
      AND r.id <> v_source.id
  ) THEN
    RAISE EXCEPTION 'bsf03e_owner_cardinality_invalid'
      USING ERRCODE = '23514';
  END IF;

  -- Validate the target through the same rule as table writes before touching
  -- the old owner, so an invalid target leaves the state unchanged.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _new_person
      AND p.status = 'active'::public.user_status
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.systemhouse_membership m
    WHERE m.user_id = _new_person
      AND m.systemhouse_id = v_subject.systemhouse_id
      AND m.status = 'active'
      AND (m.valid_from IS NULL OR m.valid_from <= now())
      AND (m.valid_to IS NULL OR m.valid_to > now())
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _new_person
      AND ur.role IN (
        'systemadministrator'::public.app_role,
        'administrator'::public.app_role,
        'teamlead'::public.app_role,
        'projectmanager'::public.app_role,
        'engineer'::public.app_role
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _new_person
      AND ur.role IN (
        'viewer'::public.app_role,
        'customer'::public.app_role,
        'kiosk'::public.app_role
      )
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.avkk_responsibility
     SET valid_to = now(),
         updated_by = auth.uid()
   WHERE id = v_source.id;

  INSERT INTO public.avkk_responsibility (
    avkk_subject_id,
    person_id,
    role_value_id,
    role_key_snapshot,
    role_label_snapshot,
    note,
    valid_from,
    created_by,
    updated_by
  ) VALUES (
    v_source.avkk_subject_id,
    _new_person,
    v_source.role_value_id,
    v_source.role_key_snapshot,
    v_source.role_label_snapshot,
    v_source.note,
    now(),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.avkk_responsibility_type (
    responsibility_id,
    type_value_id,
    type_key_snapshot,
    type_label_snapshot,
    created_by
  )
  SELECT
    v_new_id,
    t.type_value_id,
    t.type_key_snapshot,
    t.type_label_snapshot,
    auth.uid()
  FROM public.avkk_responsibility_type t
  WHERE t.responsibility_id = v_source.id;

  RETURN v_new_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.bsf03e_transfer_owner(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_transfer_owner(uuid,uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.bsf03e_transfer_owner(
  _responsibility uuid,
  _new_person uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_transfer_owner(_responsibility, _new_person);
$function$;

REVOKE ALL ON FUNCTION public.bsf03e_transfer_owner(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bsf03e_transfer_owner(uuid,uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Add deputy.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_add_deputy(
  _source_responsibility uuid,
  _new_person uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_source public.avkk_responsibility%ROWTYPE;
  v_subject public.avkk_subject%ROWTYPE;
  v_role public.reference_value%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT r.*
    INTO v_source
  FROM public.avkk_responsibility r
  WHERE r.id = _source_responsibility
  FOR UPDATE;

  IF v_source.id IS NULL
     OR v_source.valid_to IS NOT NULL
     OR v_source.role_key_snapshot <> 'owner' THEN
    RAISE EXCEPTION 'bsf03e_deputy_source_invalid'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.*
    INTO v_subject
  FROM public.avkk_subject s
  WHERE s.id = v_source.avkk_subject_id
  FOR UPDATE;

  PERFORM private.bsf03e_assert_mutation_scope(v_source.avkk_subject_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _new_person
      AND p.status = 'active'::public.user_status
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.systemhouse_membership m
    WHERE m.user_id = _new_person
      AND m.systemhouse_id = v_subject.systemhouse_id
      AND m.status = 'active'
      AND (m.valid_from IS NULL OR m.valid_from <= now())
      AND (m.valid_to IS NULL OR m.valid_to > now())
  )
  OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _new_person
      AND ur.role IN (
        'systemadministrator'::public.app_role,
        'administrator'::public.app_role,
        'teamlead'::public.app_role,
        'projectmanager'::public.app_role,
        'engineer'::public.app_role
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _new_person
      AND ur.role IN (
        'viewer'::public.app_role,
        'customer'::public.app_role,
        'kiosk'::public.app_role
      )
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.avkk_responsibility r
    WHERE r.avkk_subject_id = v_source.avkk_subject_id
      AND r.role_key_snapshot = 'deputy'
      AND r.person_id = _new_person
      AND r.valid_to IS NULL
  ) THEN
    RAISE EXCEPTION 'bsf03e_deputy_already_active'
      USING ERRCODE = '23505';
  END IF;

  SELECT rv.*
    INTO v_role
  FROM public.reference_value rv
  JOIN public.reference_catalog rc ON rc.id = rv.catalog_id
  WHERE rc.key = 'avkk.responsibility_role'
    AND rv.key = 'deputy'
    AND rv.is_active
  ORDER BY rv.created_at
  LIMIT 1;

  IF v_role.id IS NULL THEN
    RAISE EXCEPTION 'bsf03e_deputy_role_missing'
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
    created_by,
    updated_by
  ) VALUES (
    v_source.avkk_subject_id,
    _new_person,
    v_role.id,
    v_role.key,
    v_role.label,
    v_source.note,
    now(),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.avkk_responsibility_type (
    responsibility_id,
    type_value_id,
    type_key_snapshot,
    type_label_snapshot,
    created_by
  )
  SELECT
    v_new_id,
    t.type_value_id,
    t.type_key_snapshot,
    t.type_label_snapshot,
    auth.uid()
  FROM public.avkk_responsibility_type t
  WHERE t.responsibility_id = v_source.id;

  RETURN v_new_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.bsf03e_add_deputy(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_add_deputy(uuid,uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.bsf03e_add_deputy(
  _source_responsibility uuid,
  _new_person uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_add_deputy(_source_responsibility, _new_person);
$function$;

REVOKE ALL ON FUNCTION public.bsf03e_add_deputy(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bsf03e_add_deputy(uuid,uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. End deputy responsibility by historizing it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bsf03e_end_responsibility(
  _responsibility uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_source public.avkk_responsibility%ROWTYPE;
  v_subject public.avkk_subject%ROWTYPE;
BEGIN
  SELECT r.*
    INTO v_source
  FROM public.avkk_responsibility r
  WHERE r.id = _responsibility
  FOR UPDATE;

  IF v_source.id IS NULL OR v_source.valid_to IS NOT NULL THEN
    RAISE EXCEPTION 'bsf03e_responsibility_invalid'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.*
    INTO v_subject
  FROM public.avkk_subject s
  WHERE s.id = v_source.avkk_subject_id
  FOR UPDATE;

  PERFORM private.bsf03e_assert_mutation_scope(v_source.avkk_subject_id);

  IF v_source.role_key_snapshot = 'owner' THEN
    RAISE EXCEPTION 'bsf03e_owner_requires_transfer'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.avkk_responsibility
     SET valid_to = now(),
         updated_by = auth.uid()
   WHERE id = v_source.id;
END;
$function$;

REVOKE ALL ON FUNCTION private.bsf03e_end_responsibility(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bsf03e_end_responsibility(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.bsf03e_end_responsibility(
  _responsibility uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.bsf03e_end_responsibility(_responsibility);
$function$;

REVOKE ALL ON FUNCTION public.bsf03e_end_responsibility(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bsf03e_end_responsibility(uuid)
  TO authenticated;
