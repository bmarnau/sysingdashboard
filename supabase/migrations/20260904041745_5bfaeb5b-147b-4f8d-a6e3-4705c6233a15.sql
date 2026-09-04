-- BSF-02C Phase B2 — Transaktionale Shared-Projection-Publish-RPC (Issue #88, ADR-0032)
-- Additiv: keine Tabellen-, Grant- oder RLS-Änderung an bestehenden Objekten.

CREATE OR REPLACE FUNCTION public.bsf02c_publish_shared_projection_snapshot(
  p_systemhouse_id uuid,
  p_customer_id uuid,
  p_mode text,
  p_snapshot_complete boolean,
  p_projects jsonb DEFAULT '[]'::jsonb,
  p_work_packages jsonb DEFAULT '[]'::jsonb,
  p_activities jsonb DEFAULT '[]'::jsonb,
  p_observed_project_source_ids text[] DEFAULT '{}'::text[],
  p_observed_work_package_source_ids text[] DEFAULT '{}'::text[],
  p_observed_activity_source_ids text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_item jsonb;
  v_source_id text;
  v_hash text;
  v_parent_status text;
  v_parent_source text;
  v_parent_ref uuid;
  v_engineer uuid;
  v_existing_rev integer;
  v_existing_hash text;
  v_existing_publisher uuid;
  v_obs_projects text[] := COALESCE(p_observed_project_source_ids, '{}'::text[]);
  v_obs_wps text[] := COALESCE(p_observed_work_package_source_ids, '{}'::text[]);
  v_obs_acts text[] := COALESCE(p_observed_activity_source_ids, '{}'::text[]);
  v_projects jsonb := COALESCE(p_projects, '[]'::jsonb);
  v_wps jsonb := COALESCE(p_work_packages, '[]'::jsonb);
  v_acts jsonb := COALESCE(p_activities, '[]'::jsonb);
  v_c_projects integer := 0;
  v_c_wps integer := 0;
  v_c_acts integer := 0;
  v_w_projects integer := 0;
  v_w_wps integer := 0;
  v_w_acts integer := 0;
  v_tmp integer;
BEGIN
  -- 1) Aktor / Session
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'bsf02c_publish_denied: no authenticated actor' USING ERRCODE = '42501';
  END IF;

  -- 2) Eingabevalidierung (fail closed)
  IF p_systemhouse_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'bsf02c_publish_invalid: systemhouse_id and customer_id are required' USING ERRCODE = '22023';
  END IF;

  IF p_mode IS NULL OR p_mode NOT IN ('structure', 'activities') THEN
    RAISE EXCEPTION 'bsf02c_publish_invalid: mode must be structure or activities' USING ERRCODE = '22023';
  END IF;

  IF p_snapshot_complete IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'bsf02c_publish_invalid: snapshot_complete must be true' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_projects) <> 'array'
     OR jsonb_typeof(v_wps) <> 'array'
     OR jsonb_typeof(v_acts) <> 'array' THEN
    RAISE EXCEPTION 'bsf02c_publish_invalid: payload collections must be json arrays' USING ERRCODE = '22023';
  END IF;

  -- 3) Scope- und Rechteprüfung (RLS bleibt zusätzlich aktiv)
  IF NOT public.is_account_active(v_actor) THEN
    RAISE EXCEPTION 'bsf02c_publish_denied: account not active' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_active_systemhouse_membership(v_actor, p_systemhouse_id) THEN
    RAISE EXCEPTION 'bsf02c_publish_denied: no active systemhouse membership' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_customer_access(v_actor, p_systemhouse_id, p_customer_id, 'write') THEN
    RAISE EXCEPTION 'bsf02c_publish_denied: no customer write access' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission(v_actor, 'dashboard.view') THEN
    RAISE EXCEPTION 'bsf02c_publish_denied: dashboard.view required' USING ERRCODE = '42501';
  END IF;

  IF p_mode = 'structure' THEN
    IF NOT public.has_permission(v_actor, 'project.edit') THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: project.edit required' USING ERRCODE = '42501';
    END IF;
    IF jsonb_array_length(v_acts) > 0 AND NOT public.has_permission(v_actor, 'activity.edit') THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: activity.edit required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT public.has_permission(v_actor, 'activity.edit') THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: activity.edit required' USING ERRCODE = '42501';
    END IF;
    IF jsonb_array_length(v_projects) > 0 OR jsonb_array_length(v_wps) > 0 THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: activities mode must not contain structure payload' USING ERRCODE = '42501';
    END IF;
    IF array_length(v_obs_projects, 1) IS NOT NULL OR array_length(v_obs_wps, 1) IS NOT NULL THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: activities mode must not reconcile structure sources' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 4) Projects
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_projects) LOOP
    v_source_id := NULLIF(btrim(COALESCE(v_item->>'source_id', '')), '');
    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'bsf02c_publish_invalid: project source_id required' USING ERRCODE = '22023';
    END IF;
    v_hash := COALESCE(v_item->>'source_hash', '');

    SELECT source_revision, source_hash, published_by
      INTO v_existing_rev, v_existing_hash, v_existing_publisher
      FROM public.shared_project_projection
     WHERE systemhouse_id = p_systemhouse_id
       AND customer_id = p_customer_id
       AND source_id = v_source_id;

    IF NOT FOUND THEN
      INSERT INTO public.shared_project_projection (
        systemhouse_id, customer_id, source_id, name, legacy_client, status,
        published_by, published_at, source_revision, source_hash, is_active, withdrawn_at
      ) VALUES (
        p_systemhouse_id, p_customer_id, v_source_id,
        COALESCE(v_item->>'name', ''), COALESCE(v_item->>'legacy_client', ''), COALESCE(v_item->>'status', ''),
        v_actor, now(), 1, v_hash, true, NULL
      );
    ELSE
      IF v_existing_publisher IS DISTINCT FROM v_actor THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: project source_id owned by another publisher' USING ERRCODE = '42501';
      END IF;
      UPDATE public.shared_project_projection
         SET name = COALESCE(v_item->>'name', ''),
             legacy_client = COALESCE(v_item->>'legacy_client', ''),
             status = COALESCE(v_item->>'status', ''),
             published_at = now(),
             source_revision = v_existing_rev + CASE WHEN v_existing_hash IS DISTINCT FROM v_hash THEN 1 ELSE 0 END,
             source_hash = v_hash,
             is_active = true,
             withdrawn_at = NULL
       WHERE systemhouse_id = p_systemhouse_id
         AND customer_id = p_customer_id
         AND source_id = v_source_id;
      GET DIAGNOSTICS v_tmp = ROW_COUNT;
      IF v_tmp <> 1 THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: project update rejected' USING ERRCODE = '42501';
      END IF;
    END IF;
    v_c_projects := v_c_projects + 1;
  END LOOP;

  -- 5) WorkPackages
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_wps) LOOP
    v_source_id := NULLIF(btrim(COALESCE(v_item->>'source_id', '')), '');
    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'bsf02c_publish_invalid: work package source_id required' USING ERRCODE = '22023';
    END IF;
    v_hash := COALESCE(v_item->>'source_hash', '');
    v_parent_status := COALESCE(v_item->>'parent_link_status', 'none');
    v_parent_source := NULLIF(btrim(COALESCE(v_item->>'project_source_id', '')), '');
    v_parent_ref := NULL;

    IF v_parent_status = 'linked' THEN
      IF v_parent_source IS NULL THEN
        RAISE EXCEPTION 'bsf02c_publish_invalid: linked work package requires project_source_id' USING ERRCODE = '22023';
      END IF;
      SELECT id INTO v_parent_ref
        FROM public.shared_project_projection
       WHERE systemhouse_id = p_systemhouse_id
         AND customer_id = p_customer_id
         AND source_id = v_parent_source
         AND is_active;
      IF v_parent_ref IS NULL THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: parent project not resolvable in scope' USING ERRCODE = '42501';
      END IF;
    ELSIF v_parent_status = 'none' THEN
      v_parent_source := NULL;
    ELSE
      RAISE EXCEPTION 'bsf02c_publish_invalid: parent_link_status must be none or linked' USING ERRCODE = '22023';
    END IF;

    SELECT source_revision, source_hash, published_by
      INTO v_existing_rev, v_existing_hash, v_existing_publisher
      FROM public.shared_work_package_projection
     WHERE systemhouse_id = p_systemhouse_id
       AND customer_id = p_customer_id
       AND source_id = v_source_id;

    IF NOT FOUND THEN
      INSERT INTO public.shared_work_package_projection (
        systemhouse_id, customer_id, source_id, project_ref, project_source_id, parent_link_status,
        title, legacy_client, status, priority,
        published_by, published_at, source_revision, source_hash, is_active, withdrawn_at
      ) VALUES (
        p_systemhouse_id, p_customer_id, v_source_id, v_parent_ref, v_parent_source, v_parent_status,
        COALESCE(v_item->>'title', ''), COALESCE(v_item->>'legacy_client', ''),
        COALESCE(v_item->>'status', ''), COALESCE(v_item->>'priority', ''),
        v_actor, now(), 1, v_hash, true, NULL
      );
    ELSE
      IF v_existing_publisher IS DISTINCT FROM v_actor THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: work package source_id owned by another publisher' USING ERRCODE = '42501';
      END IF;
      UPDATE public.shared_work_package_projection
         SET project_ref = v_parent_ref,
             project_source_id = v_parent_source,
             parent_link_status = v_parent_status,
             title = COALESCE(v_item->>'title', ''),
             legacy_client = COALESCE(v_item->>'legacy_client', ''),
             status = COALESCE(v_item->>'status', ''),
             priority = COALESCE(v_item->>'priority', ''),
             published_at = now(),
             source_revision = v_existing_rev + CASE WHEN v_existing_hash IS DISTINCT FROM v_hash THEN 1 ELSE 0 END,
             source_hash = v_hash,
             is_active = true,
             withdrawn_at = NULL
       WHERE systemhouse_id = p_systemhouse_id
         AND customer_id = p_customer_id
         AND source_id = v_source_id;
      GET DIAGNOSTICS v_tmp = ROW_COUNT;
      IF v_tmp <> 1 THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: work package update rejected' USING ERRCODE = '42501';
      END IF;
    END IF;
    v_c_wps := v_c_wps + 1;
  END LOOP;

  -- 6) Activities (immer nur eigene)
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_acts) LOOP
    v_source_id := NULLIF(btrim(COALESCE(v_item->>'source_id', '')), '');
    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'bsf02c_publish_invalid: activity source_id required' USING ERRCODE = '22023';
    END IF;
    v_hash := COALESCE(v_item->>'source_hash', '');
    v_engineer := NULLIF(btrim(COALESCE(v_item->>'engineer_id', '')), '')::uuid;
    IF v_engineer IS NOT NULL AND v_engineer <> v_actor THEN
      RAISE EXCEPTION 'bsf02c_publish_denied: activity engineer_id must match the acting user' USING ERRCODE = '42501';
    END IF;
    v_parent_status := COALESCE(v_item->>'parent_link_status', 'none');
    v_parent_source := NULLIF(btrim(COALESCE(v_item->>'work_package_source_id', '')), '');
    v_parent_ref := NULL;

    IF v_parent_status = 'linked' THEN
      IF v_parent_source IS NULL THEN
        RAISE EXCEPTION 'bsf02c_publish_invalid: linked activity requires work_package_source_id' USING ERRCODE = '22023';
      END IF;
      SELECT id INTO v_parent_ref
        FROM public.shared_work_package_projection
       WHERE systemhouse_id = p_systemhouse_id
         AND customer_id = p_customer_id
         AND source_id = v_parent_source
         AND is_active;
      IF v_parent_ref IS NULL THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: parent work package not resolvable in scope' USING ERRCODE = '42501';
      END IF;
    ELSIF v_parent_status = 'none' THEN
      v_parent_source := NULL;
    ELSE
      RAISE EXCEPTION 'bsf02c_publish_invalid: parent_link_status must be none or linked' USING ERRCODE = '22023';
    END IF;

    SELECT source_revision, source_hash, published_by
      INTO v_existing_rev, v_existing_hash, v_existing_publisher
      FROM public.shared_activity_projection
     WHERE systemhouse_id = p_systemhouse_id
       AND customer_id = p_customer_id
       AND source_id = v_source_id;

    IF NOT FOUND THEN
      INSERT INTO public.shared_activity_projection (
        systemhouse_id, customer_id, source_id, work_package_ref, work_package_source_id, parent_link_status,
        engineer_id, title, legacy_client, activity_date, duration_hours, billable, billing_status,
        published_by, published_at, source_revision, source_hash, is_active, withdrawn_at
      ) VALUES (
        p_systemhouse_id, p_customer_id, v_source_id, v_parent_ref, v_parent_source, v_parent_status,
        v_actor,
        COALESCE(v_item->>'title', ''), COALESCE(v_item->>'legacy_client', ''),
        COALESCE((v_item->>'activity_date')::date, current_date),
        COALESCE((v_item->>'duration_hours')::numeric, 0),
        COALESCE((v_item->>'billable')::boolean, false),
        COALESCE(v_item->>'billing_status', ''),
        v_actor, now(), 1, v_hash, true, NULL
      );
    ELSE
      IF v_existing_publisher IS DISTINCT FROM v_actor THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: activity source_id owned by another publisher' USING ERRCODE = '42501';
      END IF;
      UPDATE public.shared_activity_projection
         SET work_package_ref = v_parent_ref,
             work_package_source_id = v_parent_source,
             parent_link_status = v_parent_status,
             title = COALESCE(v_item->>'title', ''),
             legacy_client = COALESCE(v_item->>'legacy_client', ''),
             activity_date = COALESCE((v_item->>'activity_date')::date, current_date),
             duration_hours = COALESCE((v_item->>'duration_hours')::numeric, 0),
             billable = COALESCE((v_item->>'billable')::boolean, false),
             billing_status = COALESCE(v_item->>'billing_status', ''),
             published_at = now(),
             source_revision = v_existing_rev + CASE WHEN v_existing_hash IS DISTINCT FROM v_hash THEN 1 ELSE 0 END,
             source_hash = v_hash,
             is_active = true,
             withdrawn_at = NULL
       WHERE systemhouse_id = p_systemhouse_id
         AND customer_id = p_customer_id
         AND source_id = v_source_id
         AND engineer_id = v_actor;
      GET DIAGNOSTICS v_tmp = ROW_COUNT;
      IF v_tmp <> 1 THEN
        RAISE EXCEPTION 'bsf02c_publish_denied: activity update rejected' USING ERRCODE = '42501';
      END IF;
    END IF;
    v_c_acts := v_c_acts + 1;
  END LOOP;

  -- 7) Reconciliation (Soft Withdraw, nur publisher-eigene aktive Zeilen)
  UPDATE public.shared_activity_projection
     SET is_active = false, withdrawn_at = now()
   WHERE systemhouse_id = p_systemhouse_id
     AND customer_id = p_customer_id
     AND published_by = v_actor
     AND engineer_id = v_actor
     AND is_active
     AND NOT (source_id = ANY (v_obs_acts));
  GET DIAGNOSTICS v_w_acts = ROW_COUNT;

  IF p_mode = 'structure' THEN
    UPDATE public.shared_work_package_projection
       SET is_active = false, withdrawn_at = now()
     WHERE systemhouse_id = p_systemhouse_id
       AND customer_id = p_customer_id
       AND published_by = v_actor
       AND is_active
       AND NOT (source_id = ANY (v_obs_wps));
    GET DIAGNOSTICS v_w_wps = ROW_COUNT;

    UPDATE public.shared_project_projection
       SET is_active = false, withdrawn_at = now()
     WHERE systemhouse_id = p_systemhouse_id
       AND customer_id = p_customer_id
       AND published_by = v_actor
       AND is_active
       AND NOT (source_id = ANY (v_obs_projects));
    GET DIAGNOSTICS v_w_projects = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'mode', p_mode,
    'systemhouse_id', p_systemhouse_id,
    'customer_id', p_customer_id,
    'published_by', v_actor,
    'projects_published', v_c_projects,
    'work_packages_published', v_c_wps,
    'activities_published', v_c_acts,
    'projects_withdrawn', v_w_projects,
    'work_packages_withdrawn', v_w_wps,
    'activities_withdrawn', v_w_acts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bsf02c_publish_shared_projection_snapshot(
  uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bsf02c_publish_shared_projection_snapshot(
  uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.bsf02c_publish_shared_projection_snapshot(
  uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[]
) TO authenticated;

COMMENT ON FUNCTION public.bsf02c_publish_shared_projection_snapshot(
  uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[]
) IS 'BSF-02C Phase B2: atomarer Publish eines vollstaendigen Shared-Projection-Snapshots im User-JWT (SECURITY INVOKER, RLS bleibt aktiv).';