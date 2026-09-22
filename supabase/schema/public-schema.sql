


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'systemadministrator',
    'administrator',
    'teamlead',
    'projectmanager',
    'engineer',
    'customer',
    'viewer',
    'kiosk'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive',
    'locked',
    'archived'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_app_settings_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'app_settings.' || lower(TG_OP),
    NEW.key,
    auth.uid(),
    jsonb_build_object('new_value', NEW.value)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_app_settings_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_user_roles_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  actor uuid;
BEGIN
  actor := auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.insert', NEW.user_id::text, actor,
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.update', NEW.user_id::text, actor,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (action, target, actor_id, payload)
    VALUES ('user_roles.delete', OLD.user_id::text, actor,
            jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_user_roles_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."avkk_audit_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  rec jsonb;
  subject text;
BEGIN
  rec := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  subject := COALESCE(rec->>'avkk_subject_id', rec->>'id');

  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'avkk.' || TG_TABLE_NAME || '.' || lower(TG_OP),
    subject,
    auth.uid(),
    jsonb_build_object('row_id', rec->>'id')
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


ALTER FUNCTION "public"."avkk_audit_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."avkk_can_write"("_subject" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.avkk_subject s
     WHERE s.id = _subject
       AND public.has_permission(auth.uid(), 'avkk.edit')
       AND (
         (s.systemhouse_id IS NULL AND s.customer_id IS NULL)
         OR (
           s.systemhouse_id IS NOT NULL
           AND s.customer_id IS NOT NULL
           AND public.has_active_systemhouse_membership(auth.uid(), s.systemhouse_id)
           AND public.has_customer_access(
             auth.uid(), s.systemhouse_id, s.customer_id, 'write'
           )
         )
       )
       AND (
         NOT public.has_role(auth.uid(), 'engineer'::public.app_role)
         OR s.created_by = auth.uid()
         OR EXISTS (
           SELECT 1
             FROM public.avkk_responsibility r
            WHERE r.avkk_subject_id = s.id
              AND r.person_id = auth.uid()
              AND r.valid_to IS NULL
         )
       )
  );
$$;


ALTER FUNCTION "public"."avkk_can_write"("_subject" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."avkk_people_directory"() RETURNS TABLE("id" "uuid", "display_name" "text", "role" "public"."app_role", "status" "public"."user_status")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    p.id,
    COALESCE(
      NULLIF(BTRIM(p.first_name || ' ' || p.last_name), ''),
      NULLIF(BTRIM(p.display_name), ''),
      'Unbenannt'
    ) AS display_name,
    ur.role,
    p.status
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT r.role
    FROM public.user_roles r
    WHERE r.user_id = p.id
    ORDER BY r.granted_at DESC
    LIMIT 1
  ) ur ON true
  WHERE auth.uid() IS NOT NULL
    AND public.has_permission(auth.uid(), 'avkk.view')
    AND (
      (
        public.has_permission(auth.uid(), 'avkk.responsibility.assign')
        AND p.status = 'active'::public.user_status
      )
      OR EXISTS (
        SELECT 1
        FROM public.avkk_responsibility ar
        WHERE ar.person_id = p.id
          AND ar.valid_to IS NULL
      )
    )
  ORDER BY display_name, p.id;
$$;


ALTER FUNCTION "public"."avkk_people_directory"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."avkk_people_directory"() IS 'Minimaler AVKK-Personenvertrag: bestehende Verantwortliche fuer avkk.view; aktive Delegationsempfaenger zusaetzlich fuer avkk.responsibility.assign; bevorzugte Darstellung Vorname Nachname.';



CREATE OR REPLACE FUNCTION "public"."bsf02c_projection_identity_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.systemhouse_id IS DISTINCT FROM OLD.systemhouse_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.published_by IS DISTINCT FROM OLD.published_by THEN
    RAISE EXCEPTION 'bsf02c_identity_immutable: systemhouse_id, customer_id, source_id and published_by cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf02c_projection_identity_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb" DEFAULT '[]'::"jsonb", "p_work_packages" "jsonb" DEFAULT '[]'::"jsonb", "p_activities" "jsonb" DEFAULT '[]'::"jsonb", "p_observed_project_source_ids" "text"[] DEFAULT '{}'::"text"[], "p_observed_work_package_source_ids" "text"[] DEFAULT '{}'::"text"[], "p_observed_activity_source_ids" "text"[] DEFAULT '{}'::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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
  v_cat_observed boolean;
  v_cat_key text;
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

  -- 3) Scope- und Rechtepruefung (RLS bleibt zusaetzlich aktiv)
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

    -- Praesenz des JSON-Schluessels = beobachtet; JSON null ist explizit "keine Kategorie".
    v_cat_observed := (v_item ? 'category_key');
    v_cat_key := CASE WHEN v_cat_observed THEN v_item->>'category_key' ELSE NULL END;

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
        title, legacy_client, status, priority, category_key, category_observed,
        published_by, published_at, source_revision, source_hash, is_active, withdrawn_at
      ) VALUES (
        p_systemhouse_id, p_customer_id, v_source_id, v_parent_ref, v_parent_source, v_parent_status,
        COALESCE(v_item->>'title', ''), COALESCE(v_item->>'legacy_client', ''),
        COALESCE(v_item->>'status', ''), COALESCE(v_item->>'priority', ''),
        v_cat_key, COALESCE(v_cat_observed, false),
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
             category_key = CASE
               WHEN v_cat_observed THEN v_cat_key
               ELSE public.shared_work_package_projection.category_key
             END,
             category_observed = CASE
               WHEN v_cat_observed THEN true
               ELSE public.shared_work_package_projection.category_observed
             END,
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


ALTER FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb", "p_work_packages" "jsonb", "p_activities" "jsonb", "p_observed_project_source_ids" "text"[], "p_observed_work_package_source_ids" "text"[], "p_observed_activity_source_ids" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb", "p_work_packages" "jsonb", "p_activities" "jsonb", "p_observed_project_source_ids" "text"[], "p_observed_work_package_source_ids" "text"[], "p_observed_activity_source_ids" "text"[]) IS 'BSF-02C/03A: atomarer Shared-Projection-Snapshot-Publish im User-JWT; SECURITY INVOKER, RLS bleibt aktiv, Kategorie rueckwaertskompatibel beobachtet.';



CREATE OR REPLACE FUNCTION "public"."bsf03b_billable_override_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'performance_statement.billable_override.' || lower(TG_OP),
    NEW.id::text,
    auth.uid(),
    jsonb_build_object(
      'systemhouse_id', NEW.systemhouse_id,
      'customer_id', NEW.customer_id,
      'activity_source_id', NEW.activity_source_id,
      'source_revision', NEW.source_revision,
      'source_hash', NEW.source_hash,
      'source_billable', NEW.source_billable,
      'effective_billable', NEW.effective_billable
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf03b_billable_override_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf03b_billable_override_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.systemhouse_id IS DISTINCT FROM OLD.systemhouse_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.activity_source_id IS DISTINCT FROM OLD.activity_source_id
     OR NEW.source_revision IS DISTINCT FROM OLD.source_revision
     OR NEW.source_hash IS DISTINCT FROM OLD.source_hash
     OR NEW.source_billable IS DISTINCT FROM OLD.source_billable THEN
    RAISE EXCEPTION 'bsf03b_override_identity_immutable'
      USING ERRCODE = '42501';
  END IF;
  NEW.changed_by := auth.uid();
  NEW.changed_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf03b_billable_override_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf03b_process_statement_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor        uuid := auth.uid();
  v_prev         public.customer_performance_statement%ROWTYPE;
  v_series       uuid;
  v_version      integer;
  v_new_id       uuid := gen_random_uuid();
  v_fingerprint  text;
  v_items        integer;
  v_cust_name    text;
  v_hash         text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'bsf03b_denied: no authenticated actor' USING ERRCODE = '42501';
  END IF;
  IF NEW.requested_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'bsf03b_denied: requested_by must be the acting user' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_account_active(v_actor) THEN
    RAISE EXCEPTION 'bsf03b_denied: account not active' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, 'performance.statement.manage') THEN
    RAISE EXCEPTION 'bsf03b_denied: performance.statement.manage required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_active_systemhouse_membership(v_actor, NEW.systemhouse_id) THEN
    RAISE EXCEPTION 'bsf03b_denied: no active systemhouse membership' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_customer_access(v_actor, NEW.systemhouse_id, NEW.customer_id, 'read') THEN
    RAISE EXCEPTION 'bsf03b_denied: no customer access' USING ERRCODE = '42501';
  END IF;

  SELECT c.name INTO v_cust_name
  FROM public.customer c
  WHERE c.id = NEW.customer_id
    AND c.systemhouse_id = NEW.systemhouse_id
    AND c.status = 'active';
  IF v_cust_name IS NULL THEN
    RAISE EXCEPTION 'bsf03b_denied: customer does not belong to systemhouse' USING ERRCODE = '42501';
  END IF;

  IF NEW.period_end < NEW.period_start
     OR (NEW.period_end - NEW.period_start) > 365 THEN
    RAISE EXCEPTION 'bsf03b_invalid: period must be valid and at most 366 days'
      USING ERRCODE = '22023';
  END IF;

  -- BEFORE INSERT precedes the PK check. For an existing idempotency key,
  -- do not execute finalization again; let the PK emit deterministic 23505.
  IF EXISTS (
    SELECT 1
    FROM public.customer_performance_statement_request r
    WHERE r.id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.action = 'finalize' THEN
    IF NEW.replaces_statement_id IS NOT NULL THEN
      RAISE EXCEPTION 'bsf03b_invalid: finalize must not reference a predecessor'
        USING ERRCODE = '22023';
    END IF;
    v_series := gen_random_uuid();
    v_version := 1;
  ELSE
    IF NEW.replaces_statement_id IS NULL THEN
      RAISE EXCEPTION 'bsf03b_invalid: replace requires replaces_statement_id'
        USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_prev
    FROM public.customer_performance_statement s
    WHERE s.id = NEW.replaces_statement_id
    FOR UPDATE;
    IF NOT FOUND
       OR v_prev.systemhouse_id <> NEW.systemhouse_id
       OR v_prev.customer_id   <> NEW.customer_id
       OR v_prev.period_start  <> NEW.period_start
       OR v_prev.period_end    <> NEW.period_end
       OR v_prev.status        <> 'finalized' THEN
      RAISE EXCEPTION 'bsf03b_denied: predecessor not replaceable in this scope/period'
        USING ERRCODE = '42501';
    END IF;
    v_series := v_prev.series_id;
    v_version := v_prev.version + 1;
  END IF;

  -- Reviewmenge: aktive Quellzeilen im Scope/Zeitraum, Legacy 'abgerechnet'
  -- ausgeschlossen, ohne Claim eines anderen aktiven Statements.
  CREATE TEMP TABLE bsf03b_review ON COMMIT DROP AS
  SELECT a.source_id, a.source_revision, a.source_hash, a.published_at,
         a.activity_date, a.title, a.duration_hours, a.billable, a.billing_status,
         a.engineer_id, a.work_package_source_id, a.work_package_ref,
         COALESCE(o.effective_billable, a.billable) AS effective_billable
  FROM public.shared_activity_projection a
  LEFT JOIN public.customer_activity_billable_override o
    ON o.systemhouse_id = a.systemhouse_id
   AND o.customer_id = a.customer_id
   AND o.activity_source_id = a.source_id
   AND o.source_revision = a.source_revision
   AND o.source_hash = a.source_hash
  WHERE a.systemhouse_id = NEW.systemhouse_id
    AND a.customer_id = NEW.customer_id
    AND a.is_active
    AND a.activity_date BETWEEN NEW.period_start AND NEW.period_end
    AND a.billing_status <> 'abgerechnet'
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_performance_activity_claim c
      WHERE c.systemhouse_id = a.systemhouse_id
        AND c.customer_id = a.customer_id
        AND c.activity_source_id = a.source_id
        AND (NEW.replaces_statement_id IS NULL
             OR c.statement_id <> NEW.replaces_statement_id)
    );

  -- Fail-closed: jede reviewfaehige Zeile, die ein fremdes aktives Statement
  -- beansprucht, bricht den Vorgang ab (keine stille Teilfinalisierung).
  IF EXISTS (
    SELECT 1
    FROM public.shared_activity_projection a
    JOIN public.customer_performance_activity_claim c
      ON c.systemhouse_id = a.systemhouse_id
     AND c.customer_id = a.customer_id
     AND c.activity_source_id = a.source_id
    WHERE a.systemhouse_id = NEW.systemhouse_id
      AND a.customer_id = NEW.customer_id
      AND a.is_active
      AND a.activity_date BETWEEN NEW.period_start AND NEW.period_end
      AND a.billing_status <> 'abgerechnet'
      AND (NEW.replaces_statement_id IS NULL
           OR c.statement_id <> NEW.replaces_statement_id)
  ) THEN
    RAISE EXCEPTION 'bsf03b_conflict: activity already claimed by another statement'
      USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_items FROM bsf03b_review;
  IF v_items < 1 THEN
    RAISE EXCEPTION 'bsf03b_invalid: review set is empty' USING ERRCODE = '22023';
  END IF;

  SELECT encode(pg_catalog.sha256(convert_to(
           COALESCE(string_agg(line, E'\n' ORDER BY src), ''), 'UTF8')), 'hex')
    INTO v_fingerprint
  FROM (
    SELECT r.source_id AS src,
           r.source_id || '|' || r.source_revision::text || '|' || r.source_hash || '|'
             || to_char(r.activity_date, 'YYYY-MM-DD') || '|'
             || trim(to_char(r.duration_hours, 'FM9999999990.00')) || '|'
             || r.billing_status || '|'
             || CASE WHEN r.effective_billable THEN 'true' ELSE 'false' END AS line
    FROM bsf03b_review r
  ) x;

  IF v_fingerprint IS DISTINCT FROM NEW.expected_review_fingerprint THEN
    RAISE EXCEPTION 'bsf03b_conflict: stale review fingerprint' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.customer_performance_statement (
    id, series_id, version, systemhouse_id, customer_id, customer_name_snapshot,
    period_start, period_end, status, finalized_by, finalized_at,
    review_fingerprint, replaces_statement_id
  ) VALUES (
    v_new_id, v_series, v_version, NEW.systemhouse_id, NEW.customer_id, v_cust_name,
    NEW.period_start, NEW.period_end, 'finalized', v_actor, now(),
    v_fingerprint, NEW.replaces_statement_id
  );

  INSERT INTO public.customer_performance_statement_item (
    statement_id, "position", activity_source_id, source_revision, source_hash,
    source_published_at, source_engineer_id,
    activity_date, title_snapshot, duration_hours, source_billable, effective_billable,
    billing_status_snapshot, work_package_source_id,
    work_package_title_snapshot, project_source_id, project_name_snapshot,
    category_key_snapshot, category_label_snapshot
  )
  SELECT v_new_id,
         row_number() OVER (ORDER BY r.source_id),
         r.source_id, r.source_revision, r.source_hash, r.published_at, r.engineer_id,
         r.activity_date, r.title, r.duration_hours, r.billable, r.effective_billable,
         r.billing_status, r.work_package_source_id,
         COALESCE(w.title, ''), p.source_id, COALESCE(p.name, ''),
         CASE WHEN w.category_observed THEN w.category_key ELSE NULL END,
         COALESCE(rv.label, '')
  FROM bsf03b_review r
  LEFT JOIN public.shared_work_package_projection w
    ON w.id = r.work_package_ref
   AND w.systemhouse_id = NEW.systemhouse_id
   AND w.customer_id = NEW.customer_id
  LEFT JOIN public.shared_project_projection p
    ON p.id = w.project_ref
   AND p.systemhouse_id = NEW.systemhouse_id
   AND p.customer_id = NEW.customer_id
  LEFT JOIN public.reference_catalog rc ON rc.key = 'workpackage.category'
  LEFT JOIN public.reference_value rv
    ON rv.catalog_id = rc.id
   AND rv.systemhouse_id = NEW.systemhouse_id
   AND rv.key = w.category_key
   AND rv.is_active
   AND (rv.valid_from IS NULL OR rv.valid_from <= now())
   AND (rv.valid_to IS NULL OR rv.valid_to > now())
   AND w.category_observed
   AND w.category_key IS NOT NULL;

  -- Claims: beim Ersatz wird der aktive Satz exakt neu aufgebaut.
  -- Weggefallene/inaktive Activities duerfen nicht am supersedierten
  -- Vorgaenger geclaimt bleiben; verbleibende Claims werden atomar auf v2
  -- umgehaengt. Der Unique-Key verhindert Doppelnutzung.
  IF NEW.replaces_statement_id IS NOT NULL THEN
    DELETE FROM public.customer_performance_activity_claim c
     WHERE c.statement_id = NEW.replaces_statement_id
       AND c.systemhouse_id = NEW.systemhouse_id
       AND c.customer_id = NEW.customer_id
       AND NOT EXISTS (
         SELECT 1 FROM bsf03b_review r WHERE r.source_id = c.activity_source_id
       );

    UPDATE public.customer_performance_activity_claim c
       SET statement_id = v_new_id, claimed_at = now()
     WHERE c.statement_id = NEW.replaces_statement_id
       AND c.systemhouse_id = NEW.systemhouse_id
       AND c.customer_id = NEW.customer_id
       AND EXISTS (SELECT 1 FROM bsf03b_review r WHERE r.source_id = c.activity_source_id);
  END IF;

  INSERT INTO public.customer_performance_activity_claim
    (systemhouse_id, customer_id, activity_source_id, statement_id)
  SELECT NEW.systemhouse_id, NEW.customer_id, r.source_id, v_new_id
  FROM bsf03b_review r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.customer_performance_activity_claim c
    WHERE c.systemhouse_id = NEW.systemhouse_id
      AND c.customer_id = NEW.customer_id
      AND c.activity_source_id = r.source_id
  );

  SELECT encode(pg_catalog.sha256(convert_to(
           COALESCE(string_agg(line, E'\n' ORDER BY pos), ''), 'UTF8')), 'hex')
    INTO v_hash
  FROM (
    SELECT i."position" AS pos,
           i."position"::text || '|' || i.activity_source_id || '|'
             || i.source_revision::text || '|' || i.source_hash || '|'
             || to_char(i.source_published_at, 'YYYY-MM-DD"T"HH24:MI:SS.USOF') || '|'
             || COALESCE(i.source_engineer_id::text, '') || '|'
             || to_char(i.activity_date, 'YYYY-MM-DD') || '|'
             || trim(to_char(i.duration_hours, 'FM9999999990.00')) || '|'
             || CASE WHEN i.effective_billable THEN 'true' ELSE 'false' END AS line
    FROM public.customer_performance_statement_item i
    WHERE i.statement_id = v_new_id
  ) y;

  UPDATE public.customer_performance_statement s
     SET snapshot_hash = v_hash,
         source_oldest_published_at = agg.oldest_published,
         source_latest_published_at = agg.latest_published,
         item_count = agg.cnt,
         billable_item_count = agg.bcnt,
         billable_hours = agg.bh,
         non_billable_hours = agg.nbh
    FROM (
      SELECT min(i.source_published_at) AS oldest_published,
             max(i.source_published_at) AS latest_published,
             count(*)::int AS cnt,
             count(*) FILTER (WHERE i.effective_billable)::int AS bcnt,
             COALESCE(sum(i.duration_hours) FILTER (WHERE i.effective_billable), 0) AS bh,
             COALESCE(sum(i.duration_hours) FILTER (WHERE NOT i.effective_billable), 0) AS nbh
      FROM public.customer_performance_statement_item i
      WHERE i.statement_id = v_new_id
    ) agg
   WHERE s.id = v_new_id;

  IF NEW.replaces_statement_id IS NOT NULL THEN
    UPDATE public.customer_performance_statement
       SET status = 'superseded',
           superseded_by_statement_id = v_new_id
     WHERE id = NEW.replaces_statement_id;
  END IF;

  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'performance_statement.' || NEW.action,
    v_new_id::text,
    v_actor,
    jsonb_build_object(
      'systemhouse_id', NEW.systemhouse_id,
      'customer_id', NEW.customer_id,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'series_id', v_series,
      'version', v_version,
      'replaces_statement_id', NEW.replaces_statement_id,
      'request_id', NEW.id,
      'snapshot_hash', v_hash,
      'review_fingerprint', v_fingerprint
    )
  );

  DROP TABLE bsf03b_review;
  NEW.result_statement_id := v_new_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf03b_process_statement_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf03e_avkk_responsibility_candidates"("_subject" "uuid") RETURNS TABLE("user_id" "uuid", "display_name" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT *
    FROM private.bsf03e_avkk_responsibility_candidates(_subject);
$$;


ALTER FUNCTION "public"."bsf03e_avkk_responsibility_candidates"("_subject" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf03e_avkk_responsibility_target_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_systemhouse uuid;
  target_customer uuid;
BEGIN
  SELECT s.systemhouse_id, s.customer_id
    INTO target_systemhouse, target_customer
    FROM public.avkk_subject s
   WHERE s.id = NEW.avkk_subject_id;

  -- Legacy-Verhalten bleibt fuer ungescopte AVKK-Saetze bestehen.
  IF target_systemhouse IS NULL OR target_customer IS NULL THEN
    RETURN NEW;
  END IF;

  -- Historisches Beenden einer Zuordnung darf nicht daran scheitern, dass eine
  -- fruehere Zielperson inzwischen deaktiviert wurde.
  IF NEW.valid_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = NEW.person_id
       AND p.status = 'active'::public.user_status
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = NEW.person_id
       AND ur.role IN (
         'systemadministrator'::public.app_role,
         'administrator'::public.app_role,
         'teamlead'::public.app_role,
         'projectmanager'::public.app_role,
         'engineer'::public.app_role
       )
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = NEW.person_id
       AND ur.role IN (
         'viewer'::public.app_role,
         'customer'::public.app_role,
         'kiosk'::public.app_role
       )
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.systemhouse_membership m
     WHERE m.user_id = NEW.person_id
       AND m.systemhouse_id = target_systemhouse
       AND m.status = 'active'
       AND (m.valid_from IS NULL OR m.valid_from <= now())
       AND (m.valid_to IS NULL OR m.valid_to > now())
  ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_target_invalid'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf03e_avkk_responsibility_target_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bsf03e_avkk_subject_scope_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Legacy bleibt erlaubt, darf aber nicht aus einem bereits gescopten Subject
  -- durch Rueckwaertsmutation entstehen.
  IF NEW.systemhouse_id IS NULL AND NEW.customer_id IS NULL THEN
    IF TG_OP = 'UPDATE'
       AND (OLD.systemhouse_id IS NOT NULL OR OLD.customer_id IS NOT NULL) THEN
      RAISE EXCEPTION 'bsf03e_scope_immutable'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.systemhouse_id IS NOT NULL
     AND (
       NEW.systemhouse_id IS DISTINCT FROM OLD.systemhouse_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.subject_type IS DISTINCT FROM OLD.subject_type
       OR NEW.subject_id IS DISTINCT FROM OLD.subject_id
     ) THEN
    RAISE EXCEPTION 'bsf03e_scope_immutable'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.subject_type = 'project' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.shared_project_projection p
      WHERE p.systemhouse_id = NEW.systemhouse_id
        AND p.customer_id = NEW.customer_id
        AND p.source_id = NEW.subject_id
        AND p.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_scope_projection_mismatch'
        USING ERRCODE = '23503';
    END IF;
  ELSIF NEW.subject_type = 'workpackage' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.shared_work_package_projection w
      WHERE w.systemhouse_id = NEW.systemhouse_id
        AND w.customer_id = NEW.customer_id
        AND w.source_id = NEW.subject_id
        AND w.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_scope_projection_mismatch'
        USING ERRCODE = '23503';
    END IF;
  ELSE
    RAISE EXCEPTION 'bsf03e_scope_subject_type_invalid'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bsf03e_avkk_subject_scope_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT _user_id IS NOT NULL
     AND _systemhouse_id IS NOT NULL
     AND public.has_active_systemhouse_membership(_user_id, _systemhouse_id)
     AND public.has_permission(_user_id, 'customer.responsibility.manage');
$$;


ALTER FUNCTION "public"."can_manage_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_responsibility_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'customer_responsibility.' || lower(TG_OP),
    NEW.id::text,
    auth.uid(),
    jsonb_build_object(
      'systemhouse_id', NEW.systemhouse_id,
      'customer_id', NEW.customer_id,
      'user_id', NEW.user_id,
      'status', NEW.status,
      'valid_to', NEW.valid_to
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."customer_responsibility_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_responsibility_identity_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.systemhouse_id IS DISTINCT FROM OLD.systemhouse_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'customer_responsibility_identity_immutable: systemhouse_id, customer_id and user_id cannot be changed';
  END IF;
  IF OLD.status = 'ended' THEN
    RAISE EXCEPTION 'customer_responsibility_history_immutable: ended responsibility cannot be modified';
  END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."customer_responsibility_identity_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_responsibility_management_candidates"("_systemhouse_id" "uuid") RETURNS TABLE("user_id" "uuid", "display_name" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT * FROM private.customer_responsibility_management_candidates(_systemhouse_id);
$$;


ALTER FUNCTION "public"."customer_responsibility_management_candidates"("_systemhouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_responsibility_management_overview"("_systemhouse_id" "uuid") RETURNS TABLE("customer_id" "uuid", "customer_name" "text", "customer_status" "text", "responsibility_id" "uuid", "responsible_user_id" "uuid", "responsible_display_name" "text", "responsible_since" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT * FROM private.customer_responsibility_management_overview(_systemhouse_id);
$$;


ALTER FUNCTION "public"."customer_responsibility_management_overview"("_systemhouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_responsibility_target_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Nur fuer eine (weiterhin) AKTIVE Verantwortung wird die Zielperson geprueft.
  -- active -> ended: Autorisierung des Managers (RLS) + Identity-Guard genuegen.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- 1) Zielperson existiert und ist aktiv.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = NEW.user_id
       AND p.status = 'active'::public.user_status
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target user missing or not active'
      USING ERRCODE = '42501';
  END IF;

  -- 2) Mindestens eine zulaessige interne Rolle.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = NEW.user_id
       AND ur.role IN (
         'systemadministrator'::public.app_role,
         'administrator'::public.app_role,
         'teamlead'::public.app_role,
         'projectmanager'::public.app_role,
         'engineer'::public.app_role
       )
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target has no eligible internal role'
      USING ERRCODE = '42501';
  END IF;

  -- 3) viewer / customer sind niemals zulaessige Traeger.
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = NEW.user_id
       AND ur.role IN ('viewer'::public.app_role, 'customer'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: viewer/customer cannot hold responsibility'
      USING ERRCODE = '42501';
  END IF;

  -- 4) Aktuell aktive Membership im selben Systemhouse.
  IF NOT EXISTS (
    SELECT 1 FROM public.systemhouse_membership m
     WHERE m.user_id = NEW.user_id
       AND m.systemhouse_id = NEW.systemhouse_id
       AND m.status = 'active'
       AND (m.valid_from IS NULL OR m.valid_from <= now())
       AND (m.valid_to IS NULL OR m.valid_to > now())
  ) THEN
    RAISE EXCEPTION 'customer_responsibility_target_invalid: target has no active membership in systemhouse'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."customer_responsibility_target_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  current_id uuid;
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, _customer_id);

  SELECT cr.id
    INTO current_id
    FROM public.customer_responsibility cr
   WHERE cr.systemhouse_id = _systemhouse_id
     AND cr.customer_id = _customer_id
     AND cr.status = 'active'
     AND cr.valid_to IS NULL
   FOR UPDATE;

  IF current_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.customer_responsibility
     SET status = 'ended', valid_to = clock_timestamp()
   WHERE id = current_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."end_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_kiosk_role_exclusive"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_conflict boolean;
BEGIN
  -- Zwei parallele Rollenschreibvorgaenge duerfen den sichtbarkeitsbasierten
  -- Konflikttest nicht gleichzeitig passieren. Der transaktionsgebundene,
  -- benutzerspezifische Advisory Lock wird beim COMMIT/ROLLBACK freigegeben.
  PERFORM pg_advisory_xact_lock(
    hashtext('kiosk_role_exclusive'),
    hashtext(NEW.user_id::text)
  );

  IF NEW.role = 'kiosk'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND ur.id IS DISTINCT FROM NEW.id
    ) INTO v_conflict;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND ur.role = 'kiosk'::public.app_role
        AND ur.id IS DISTINCT FROM NEW.id
    ) INTO v_conflict;
  END IF;

  IF v_conflict THEN
    RAISE EXCEPTION 'KIOSK_ROLE_MUST_BE_EXCLUSIVE';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_kiosk_role_exclusive"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_first BOOLEAN;
  assigned_role public.app_role;
  first_name TEXT;
  last_name TEXT;
  display_name TEXT;
BEGIN
  first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last_name  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(TRIM(first_name || ' ' || last_name), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, first_name, last_name, display_name, email)
  VALUES (NEW.id, first_name, last_name, display_name, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Serialisiert konkurrierende Erstregistrierungen: genau ein Sysadmin.
  PERFORM pg_advisory_xact_lock(hashtext('sysadmin_bootstrap'));

  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'systemadministrator'::public.app_role
  ) INTO is_first;

  assigned_role := CASE WHEN is_first
                        THEN 'systemadministrator'::public.app_role
                        ELSE 'viewer'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.id, assigned_role, NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (action, target, actor_id, actor_role, payload)
  VALUES (
    'auth.bootstrap',
    NEW.id::text,
    NEW.id,
    assigned_role,
    jsonb_build_object('assigned_role', assigned_role, 'was_first', is_first)
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_systemhouse_membership"("_user_id" "uuid", "_systemhouse_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT _user_id IS NOT NULL
     AND _systemhouse_id IS NOT NULL
     AND public.is_account_active(_user_id)
     AND EXISTS (
       SELECT 1
       FROM public.systemhouse_membership m
       WHERE m.user_id = _user_id
         AND m.systemhouse_id = _systemhouse_id
         AND m.status = 'active'
         AND (m.valid_from IS NULL OR m.valid_from <= now())
         AND (m.valid_to IS NULL OR m.valid_to > now())
     );
$$;


ALTER FUNCTION "public"."has_active_systemhouse_membership"("_user_id" "uuid", "_systemhouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("_user_id" "uuid", "_roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;


ALTER FUNCTION "public"."has_any_role"("_user_id" "uuid", "_roles" "public"."app_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_customer_access"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid", "_required_level" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT _user_id IS NOT NULL
     AND _systemhouse_id IS NOT NULL
     AND _customer_id IS NOT NULL
     AND _required_level IN ('read','write')
     AND public.has_active_systemhouse_membership(_user_id, _systemhouse_id)
     AND EXISTS (
       SELECT 1
       FROM public.customer_access ca
       WHERE ca.user_id = _user_id
         AND ca.systemhouse_id = _systemhouse_id
         AND ca.customer_id = _customer_id
         AND ca.status = 'active'
         AND (ca.valid_from IS NULL OR ca.valid_from <= now())
         AND (ca.valid_to IS NULL OR ca.valid_to > now())
         AND (
           ca.access_level = _required_level
           OR (ca.access_level = 'write' AND _required_level = 'read')
         )
     );
$$;


ALTER FUNCTION "public"."has_customer_access"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid", "_required_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_responsibility cr
    WHERE cr.user_id = _user_id
      AND cr.systemhouse_id = _systemhouse_id
      AND cr.customer_id = _customer_id
      AND cr.status = 'active'
      AND cr.valid_to IS NULL
      AND (cr.valid_from IS NULL OR cr.valid_from <= now())
  );
$$;


ALTER FUNCTION "public"."has_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("_user_id" "uuid", "_perm" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        (ur.role = 'systemadministrator' AND _perm <> 'kiosk.view') OR
        (ur.role = 'administrator' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit',
          'azure.connection.test','azure.export','azure.import',
          'backup.restore','users.manage','auditlog.view',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view','referencedata.manage',
          'customer.responsibility.manage','project.controlling.view'
        )) OR
        (ur.role = 'teamlead' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view',
          'customer.responsibility.manage','project.controlling.view',
          'performance.statement.manage'
        )) OR
        (ur.role = 'projectmanager' AND _perm IN (
          'dashboard.view','documentation.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view',
          'project.controlling.view'
        )) OR
        (ur.role = 'engineer' AND _perm IN (
          'dashboard.view','documentation.view','workpackage.edit','activity.edit',
          'avkk.view','avkk.edit','referencedata.view'
        )) OR
        (ur.role = 'customer' AND _perm IN (
          'dashboard.view','documentation.view','referencedata.view'
        )) OR
        (ur.role = 'viewer' AND _perm IN (
          'dashboard.view','documentation.view','avkk.view','referencedata.view'
        )) OR
        (ur.role = 'kiosk' AND _perm = 'kiosk.view')
      )
  );
$$;


ALTER FUNCTION "public"."has_permission"("_user_id" "uuid", "_perm" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_active"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = _user_id),
    false
  );
$$;


ALTER FUNCTION "public"."is_account_active"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_eligible_responsibility_holder"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT _user_id IS NOT NULL
     AND public.is_account_active(_user_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role IN (
           'systemadministrator'::public.app_role,
           'administrator'::public.app_role,
           'teamlead'::public.app_role,
           'projectmanager'::public.app_role,
           'engineer'::public.app_role
         )
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role IN ('viewer'::public.app_role, 'customer'::public.app_role)
     );
$$;


ALTER FUNCTION "public"."is_eligible_responsibility_holder"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_my_customer"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_account_active(_user_id)
     AND public.has_permission(_user_id, 'dashboard.view')
     AND public.has_active_systemhouse_membership(_user_id, _systemhouse_id)
     AND public.has_customer_access(_user_id, _systemhouse_id, _customer_id, 'read')
     AND public.has_customer_responsibility(_user_id, _systemhouse_id, _customer_id);
$$;


ALTER FUNCTION "public"."is_my_customer"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_last_sysadmin_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  active_sysadmins_after INT;
  is_sysadmin BOOLEAN;
BEGIN
  IF NEW.status = 'active' OR OLD.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = OLD.id AND role = 'systemadministrator'::public.app_role
  ) INTO is_sysadmin;

  IF NOT is_sysadmin THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_sysadmins_after
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'systemadministrator'::public.app_role
    AND p.status = 'active'
    AND ur.user_id <> OLD.id;

  IF active_sysadmins_after < 1 THEN
    RAISE EXCEPTION 'last_sysadmin_locked: cannot deactivate the last active systemadministrator';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_last_sysadmin_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_last_sysadmin_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  active_sysadmins_after INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'systemadministrator'::public.app_role THEN
      RETURN OLD;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role <> 'systemadministrator'::public.app_role
       OR NEW.role = 'systemadministrator'::public.app_role THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT count(*) INTO active_sysadmins_after
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'systemadministrator'::public.app_role
    AND p.status = 'active'
    AND ur.user_id <> OLD.user_id;

  IF active_sysadmins_after < 1 THEN
    RAISE EXCEPTION 'last_sysadmin_locked: cannot remove or demote the last active systemadministrator';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


ALTER FUNCTION "public"."protect_last_sysadmin_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reference_value_track_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.reference_value_history(
    value_id,catalog_id,systemhouse_id,operation,snapshot,changed_by
  ) VALUES(
    NEW.id,NEW.catalog_id,NEW.systemhouse_id,lower(TG_OP),
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    auth.uid()
  );

  UPDATE public.reference_catalog SET version=version+1 WHERE id=NEW.catalog_id;

  INSERT INTO public.audit_log(action,target,actor_id,payload)
  VALUES(
    'reference_value.'||lower(TG_OP),NEW.id::text,auth.uid(),
    jsonb_build_object(
      'catalog_id',NEW.catalog_id,
      'systemhouse_id',NEW.systemhouse_id,
      'key',NEW.key,
      'is_active',NEW.is_active
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reference_value_track_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reference_value_validate_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_catalog_key text;
  v_scope_type text;
BEGIN
  SELECT c.key,c.scope_type INTO v_catalog_key,v_scope_type
  FROM public.reference_catalog c WHERE c.id=NEW.catalog_id;

  IF v_scope_type IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='reference catalog does not exist';
  END IF;
  IF v_scope_type='global' AND NEW.systemhouse_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='global reference values must not have systemhouse_id';
  END IF;
  IF v_scope_type='systemhouse' AND NEW.systemhouse_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='systemhouse reference values require systemhouse_id';
  END IF;

  IF TG_OP='UPDATE' THEN
    IF OLD.catalog_id IS DISTINCT FROM NEW.catalog_id THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='reference value catalog_id is immutable';
    END IF;
    IF OLD.systemhouse_id IS DISTINCT FROM NEW.systemhouse_id THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='reference value systemhouse_id is immutable';
    END IF;
    IF v_catalog_key='workpackage.category' AND OLD.key IS DISTINCT FROM NEW.key THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='workpackage category key is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reference_value_validate_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid", "_target_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  current_id uuid;
  current_user_id uuid;
  new_id uuid;
  ts timestamptz := clock_timestamp();
BEGIN
  PERFORM private.assert_customer_responsibility_management_scope(_systemhouse_id, _customer_id);

  SELECT cr.id, cr.user_id
    INTO current_id, current_user_id
    FROM public.customer_responsibility cr
   WHERE cr.systemhouse_id = _systemhouse_id
     AND cr.customer_id = _customer_id
     AND cr.status = 'active'
     AND cr.valid_to IS NULL
   FOR UPDATE;

  IF current_id IS NOT NULL AND current_user_id = _target_user_id THEN
    RETURN current_id;
  END IF;

  IF current_id IS NOT NULL THEN
    UPDATE public.customer_responsibility
       SET status = 'ended', valid_to = ts
     WHERE id = current_id;
  END IF;

  INSERT INTO public.customer_responsibility (
    systemhouse_id, customer_id, user_id, status, valid_from, created_by, updated_by
  ) VALUES (
    _systemhouse_id, _customer_id, _target_user_id, 'active', ts, auth.uid(), auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."set_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid", "_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_role" "public"."app_role",
    "action" "text" NOT NULL,
    "target" "text",
    "correlation_id" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb"
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avkk_competence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "avkk_subject_id" "uuid" NOT NULL,
    "dimension_value_id" "uuid" NOT NULL,
    "dimension_key_snapshot" "text" NOT NULL,
    "dimension_label_snapshot" "text" NOT NULL,
    "rating_value_id" "uuid" NOT NULL,
    "rating_key_snapshot" "text" NOT NULL,
    "rating_label_snapshot" "text" NOT NULL,
    "support_needed" boolean DEFAULT false NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "superseded_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."avkk_competence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avkk_consequence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "avkk_subject_id" "uuid" NOT NULL,
    "area_value_id" "uuid" NOT NULL,
    "area_key_snapshot" "text" NOT NULL,
    "area_label_snapshot" "text" NOT NULL,
    "severity_value_id" "uuid" NOT NULL,
    "severity_key_snapshot" "text" NOT NULL,
    "severity_label_snapshot" "text" NOT NULL,
    "schedule_impact_value_id" "uuid" NOT NULL,
    "schedule_impact_key_snapshot" "text" NOT NULL,
    "schedule_impact_label_snapshot" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "superseded_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."avkk_consequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avkk_responsibility" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "avkk_subject_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "role_value_id" "uuid" NOT NULL,
    "role_key_snapshot" "text" NOT NULL,
    "role_label_snapshot" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."avkk_responsibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avkk_responsibility_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "responsibility_id" "uuid" NOT NULL,
    "type_value_id" "uuid" NOT NULL,
    "type_key_snapshot" "text" NOT NULL,
    "type_label_snapshot" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."avkk_responsibility_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avkk_subject" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_type" "text" NOT NULL,
    "subject_id" "text" NOT NULL,
    "subject_title_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "systemhouse_id" "uuid",
    "customer_id" "uuid",
    CONSTRAINT "avkk_subject_scope_pair_check" CHECK (((("systemhouse_id" IS NULL) AND ("customer_id" IS NULL)) OR (("systemhouse_id" IS NOT NULL) AND ("customer_id" IS NOT NULL)))),
    CONSTRAINT "avkk_subject_scoped_type_check" CHECK ((("systemhouse_id" IS NULL) OR ("subject_type" = ANY (ARRAY['project'::"text", 'workpackage'::"text"])))),
    CONSTRAINT "avkk_subject_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"]))),
    CONSTRAINT "avkk_subject_subject_type_check" CHECK (("subject_type" = ANY (ARRAY['project'::"text", 'workpackage'::"text", 'activity'::"text", 'measure'::"text"])))
);


ALTER TABLE "public"."avkk_subject" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."customer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "access_level" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_access_level_check" CHECK (("access_level" = ANY (ARRAY['read'::"text", 'write'::"text"]))),
    CONSTRAINT "customer_access_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "customer_access_window_check" CHECK ((("valid_to" IS NULL) OR ("valid_from" IS NULL) OR ("valid_to" > "valid_from")))
);


ALTER TABLE "public"."customer_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_activity_billable_override" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "activity_source_id" "text" NOT NULL,
    "source_revision" integer NOT NULL,
    "source_hash" "text" NOT NULL,
    "source_billable" boolean NOT NULL,
    "effective_billable" boolean NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "changed_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_activity_billable_override" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_performance_activity_claim" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "activity_source_id" "text" NOT NULL,
    "statement_id" "uuid" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_performance_activity_claim" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_performance_statement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "series_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "customer_name_snapshot" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" NOT NULL,
    "finalized_by" "uuid" NOT NULL,
    "finalized_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_oldest_published_at" timestamp with time zone,
    "source_latest_published_at" timestamp with time zone,
    "review_fingerprint" "text" NOT NULL,
    "snapshot_hash" "text" DEFAULT "repeat"('0'::"text", 64) NOT NULL,
    "item_count" integer DEFAULT 0 NOT NULL,
    "billable_item_count" integer DEFAULT 0 NOT NULL,
    "billable_hours" numeric(12,2) DEFAULT 0 NOT NULL,
    "non_billable_hours" numeric(12,2) DEFAULT 0 NOT NULL,
    "replaces_statement_id" "uuid",
    "superseded_by_statement_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_performance_statement_counts_ck" CHECK ((("item_count" >= 0) AND ("billable_item_count" >= 0) AND ("billable_item_count" <= "item_count"))),
    CONSTRAINT "customer_performance_statement_hours_ck" CHECK ((("billable_hours" >= (0)::numeric) AND ("non_billable_hours" >= (0)::numeric))),
    CONSTRAINT "customer_performance_statement_period_ck" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "customer_performance_statement_review_fingerprint_check" CHECK (("review_fingerprint" ~ '^[0-9a-f]{64}$'::"text")),
    CONSTRAINT "customer_performance_statement_snapshot_hash_check" CHECK (("snapshot_hash" ~ '^[0-9a-f]{64}$'::"text")),
    CONSTRAINT "customer_performance_statement_status_check" CHECK (("status" = ANY (ARRAY['finalized'::"text", 'superseded'::"text"]))),
    CONSTRAINT "customer_performance_statement_status_link_ck" CHECK (((("status" = 'finalized'::"text") AND ("superseded_by_statement_id" IS NULL)) OR (("status" = 'superseded'::"text") AND ("superseded_by_statement_id" IS NOT NULL)))),
    CONSTRAINT "customer_performance_statement_version_check" CHECK (("version" >= 1))
);


ALTER TABLE "public"."customer_performance_statement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_performance_statement_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "activity_source_id" "text" NOT NULL,
    "source_revision" integer NOT NULL,
    "source_hash" "text" NOT NULL,
    "source_published_at" timestamp with time zone NOT NULL,
    "source_engineer_id" "uuid",
    "activity_date" "date" NOT NULL,
    "title_snapshot" "text" NOT NULL,
    "duration_hours" numeric(12,2) NOT NULL,
    "source_billable" boolean NOT NULL,
    "effective_billable" boolean NOT NULL,
    "billing_status_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "work_package_source_id" "text",
    "work_package_title_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "project_source_id" "text",
    "project_name_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "category_key_snapshot" "text",
    "category_label_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_performance_statement_item_duration_hours_check" CHECK (("duration_hours" >= (0)::numeric)),
    CONSTRAINT "customer_performance_statement_item_position_check" CHECK (("position" >= 1))
);


ALTER TABLE "public"."customer_performance_statement_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_performance_statement_request" (
    "id" "uuid" NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "action" "text" NOT NULL,
    "replaces_statement_id" "uuid",
    "expected_review_fingerprint" "text" NOT NULL,
    "requested_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "result_statement_id" "uuid",
    CONSTRAINT "customer_performance_statemen_expected_review_fingerprint_check" CHECK (("expected_review_fingerprint" ~ '^[0-9a-f]{64}$'::"text")),
    CONSTRAINT "customer_performance_statement_request_action_check" CHECK (("action" = ANY (ARRAY['finalize'::"text", 'replace'::"text"]))),
    CONSTRAINT "customer_performance_statement_request_action_ck" CHECK (((("action" = 'finalize'::"text") AND ("replaces_statement_id" IS NULL)) OR (("action" = 'replace'::"text") AND ("replaces_statement_id" IS NOT NULL)))),
    CONSTRAINT "customer_performance_statement_request_period_ck" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."customer_performance_statement_request" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_responsibility" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_responsibility_lifecycle_chk" CHECK (((("status" = 'active'::"text") AND ("valid_to" IS NULL)) OR (("status" = 'ended'::"text") AND ("valid_to" IS NOT NULL)))),
    CONSTRAINT "customer_responsibility_period_chk" CHECK ((("valid_to" IS NULL) OR ("valid_to" > "valid_from"))),
    CONSTRAINT "customer_responsibility_status_chk" CHECK (("status" = ANY (ARRAY['active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."customer_responsibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "profile_image" "text",
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "mfa_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reference_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "domain" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "is_hierarchical" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_type" "text" DEFAULT 'global'::"text" NOT NULL,
    CONSTRAINT "reference_catalog_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['global'::"text", 'systemhouse'::"text"])))
);


ALTER TABLE "public"."reference_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reference_value" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "catalog_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "parent_value_id" "uuid",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "systemhouse_id" "uuid"
);


ALTER TABLE "public"."reference_value" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reference_value_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value_id" "uuid" NOT NULL,
    "catalog_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "systemhouse_id" "uuid",
    CONSTRAINT "reference_value_history_operation_check" CHECK (("operation" = ANY (ARRAY['insert'::"text", 'update'::"text"])))
);


ALTER TABLE "public"."reference_value_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_activity_projection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "source_id" "text" NOT NULL,
    "work_package_ref" "uuid",
    "work_package_source_id" "text",
    "parent_link_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "engineer_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "legacy_client" "text" DEFAULT ''::"text" NOT NULL,
    "activity_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "duration_hours" numeric(10,2) DEFAULT 0 NOT NULL,
    "billable" boolean DEFAULT false NOT NULL,
    "billing_status" "text" DEFAULT ''::"text" NOT NULL,
    "published_by" "uuid" NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_revision" integer DEFAULT 1 NOT NULL,
    "source_hash" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shared_activity_projection_duration_check" CHECK (("duration_hours" >= (0)::numeric)),
    CONSTRAINT "shared_activity_projection_parent_consistency_check" CHECK (((("parent_link_status" = 'linked'::"text") AND ("work_package_ref" IS NOT NULL)) OR (("parent_link_status" = 'none'::"text") AND ("work_package_ref" IS NULL)))),
    CONSTRAINT "shared_activity_projection_parent_status_check" CHECK (("parent_link_status" = ANY (ARRAY['none'::"text", 'linked'::"text"]))),
    CONSTRAINT "shared_activity_projection_source_id_not_empty" CHECK (("btrim"("source_id") <> ''::"text")),
    CONSTRAINT "shared_activity_projection_withdraw_check" CHECK ((("is_active" AND ("withdrawn_at" IS NULL)) OR ((NOT "is_active") AND ("withdrawn_at" IS NOT NULL))))
);


ALTER TABLE "public"."shared_activity_projection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_project_projection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "source_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "legacy_client" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT ''::"text" NOT NULL,
    "published_by" "uuid" NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_revision" integer DEFAULT 1 NOT NULL,
    "source_hash" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shared_project_projection_source_id_not_empty" CHECK (("btrim"("source_id") <> ''::"text")),
    CONSTRAINT "shared_project_projection_withdraw_check" CHECK ((("is_active" AND ("withdrawn_at" IS NULL)) OR ((NOT "is_active") AND ("withdrawn_at" IS NOT NULL))))
);


ALTER TABLE "public"."shared_project_projection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_work_package_projection" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "source_id" "text" NOT NULL,
    "project_ref" "uuid",
    "project_source_id" "text",
    "parent_link_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "legacy_client" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT ''::"text" NOT NULL,
    "priority" "text" DEFAULT ''::"text" NOT NULL,
    "published_by" "uuid" NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_revision" integer DEFAULT 1 NOT NULL,
    "source_hash" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_key" "text",
    "category_observed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "shared_work_package_projection_parent_consistency_check" CHECK (((("parent_link_status" = 'linked'::"text") AND ("project_ref" IS NOT NULL)) OR (("parent_link_status" = 'none'::"text") AND ("project_ref" IS NULL)))),
    CONSTRAINT "shared_work_package_projection_parent_status_check" CHECK (("parent_link_status" = ANY (ARRAY['none'::"text", 'linked'::"text"]))),
    CONSTRAINT "shared_work_package_projection_source_id_not_empty" CHECK (("btrim"("source_id") <> ''::"text")),
    CONSTRAINT "shared_work_package_projection_withdraw_check" CHECK ((("is_active" AND ("withdrawn_at" IS NULL)) OR ((NOT "is_active") AND ("withdrawn_at" IS NOT NULL))))
);


ALTER TABLE "public"."shared_work_package_projection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."systemhouse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "systemhouse_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."systemhouse" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."systemhouse_membership" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "systemhouse_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "systemhouse_membership_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "systemhouse_membership_window_check" CHECK ((("valid_to" IS NULL) OR ("valid_from" IS NULL) OR ("valid_to" > "valid_from")))
);


ALTER TABLE "public"."systemhouse_membership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avkk_responsibility_type"
    ADD CONSTRAINT "avkk_responsibility_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avkk_responsibility_type"
    ADD CONSTRAINT "avkk_responsibility_type_responsibility_id_type_value_id_key" UNIQUE ("responsibility_id", "type_value_id");



ALTER TABLE ONLY "public"."avkk_subject"
    ADD CONSTRAINT "avkk_subject_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_access"
    ADD CONSTRAINT "customer_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_access"
    ADD CONSTRAINT "customer_access_unique" UNIQUE ("systemhouse_id", "customer_id", "user_id");



ALTER TABLE ONLY "public"."customer_activity_billable_override"
    ADD CONSTRAINT "customer_activity_billable_override_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_activity_billable_override"
    ADD CONSTRAINT "customer_activity_billable_override_unique" UNIQUE ("systemhouse_id", "customer_id", "activity_source_id", "source_revision");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_id_systemhouse_unique" UNIQUE ("id", "systemhouse_id");



ALTER TABLE ONLY "public"."customer_performance_activity_claim"
    ADD CONSTRAINT "customer_performance_activity_claim_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_performance_activity_claim"
    ADD CONSTRAINT "customer_performance_activity_claim_unique" UNIQUE ("systemhouse_id", "customer_id", "activity_source_id");



ALTER TABLE ONLY "public"."customer_performance_statement_item"
    ADD CONSTRAINT "customer_performance_statement_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_performance_statement_item"
    ADD CONSTRAINT "customer_performance_statement_item_position_uq" UNIQUE ("statement_id", "position");



ALTER TABLE ONLY "public"."customer_performance_statement_item"
    ADD CONSTRAINT "customer_performance_statement_item_source_uq" UNIQUE ("statement_id", "activity_source_id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_request_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_scope_uq" UNIQUE ("id", "systemhouse_id", "customer_id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_series_version_uq" UNIQUE ("series_id", "version");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_responsibility"
    ADD CONSTRAINT "customer_responsibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reference_catalog"
    ADD CONSTRAINT "reference_catalog_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."reference_catalog"
    ADD CONSTRAINT "reference_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reference_value_history"
    ADD CONSTRAINT "reference_value_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_identity_unique" UNIQUE ("systemhouse_id", "customer_id", "source_id");



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_scope_unique" UNIQUE ("id", "systemhouse_id", "customer_id");



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_source_collision_unique" UNIQUE ("systemhouse_id", "source_id");



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_identity_unique" UNIQUE ("systemhouse_id", "customer_id", "source_id");



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_scope_unique" UNIQUE ("id", "systemhouse_id", "customer_id");



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_source_collision_unique" UNIQUE ("systemhouse_id", "source_id");



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_identity_unique" UNIQUE ("systemhouse_id", "customer_id", "source_id");



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_scope_unique" UNIQUE ("id", "systemhouse_id", "customer_id");



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_source_collision_unique" UNIQUE ("systemhouse_id", "source_id");



ALTER TABLE ONLY "public"."systemhouse_membership"
    ADD CONSTRAINT "systemhouse_membership_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."systemhouse_membership"
    ADD CONSTRAINT "systemhouse_membership_unique" UNIQUE ("systemhouse_id", "user_id");



ALTER TABLE ONLY "public"."systemhouse"
    ADD CONSTRAINT "systemhouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "avkk_competence_subject_idx" ON "public"."avkk_competence" USING "btree" ("avkk_subject_id", "superseded_at");



CREATE INDEX "avkk_consequence_subject_idx" ON "public"."avkk_consequence" USING "btree" ("avkk_subject_id", "superseded_at");



CREATE INDEX "avkk_responsibility_person_idx" ON "public"."avkk_responsibility" USING "btree" ("person_id");



CREATE INDEX "avkk_responsibility_subject_idx" ON "public"."avkk_responsibility" USING "btree" ("avkk_subject_id");



CREATE UNIQUE INDEX "avkk_subject_legacy_identity_unique" ON "public"."avkk_subject" USING "btree" ("subject_type", "subject_id") WHERE (("systemhouse_id" IS NULL) AND ("customer_id" IS NULL));



CREATE INDEX "avkk_subject_scope_idx" ON "public"."avkk_subject" USING "btree" ("systemhouse_id", "customer_id", "subject_type") WHERE (("systemhouse_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE UNIQUE INDEX "avkk_subject_scoped_identity_unique" ON "public"."avkk_subject" USING "btree" ("systemhouse_id", "subject_type", "subject_id") WHERE (("systemhouse_id" IS NOT NULL) AND ("customer_id" IS NOT NULL));



CREATE INDEX "customer_access_scope_idx" ON "public"."customer_access" USING "btree" ("systemhouse_id", "customer_id");



CREATE INDEX "customer_access_user_idx" ON "public"."customer_access" USING "btree" ("user_id");



CREATE INDEX "customer_activity_billable_override_scope_idx" ON "public"."customer_activity_billable_override" USING "btree" ("systemhouse_id", "customer_id", "activity_source_id");



CREATE INDEX "customer_performance_activity_claim_statement_idx" ON "public"."customer_performance_activity_claim" USING "btree" ("statement_id");



CREATE INDEX "customer_performance_statement_item_statement_idx" ON "public"."customer_performance_statement_item" USING "btree" ("statement_id");



CREATE INDEX "customer_performance_statement_scope_idx" ON "public"."customer_performance_statement" USING "btree" ("systemhouse_id", "customer_id", "period_start", "period_end");



CREATE UNIQUE INDEX "customer_responsibility_one_active_uidx" ON "public"."customer_responsibility" USING "btree" ("systemhouse_id", "customer_id") WHERE (("status" = 'active'::"text") AND ("valid_to" IS NULL));



CREATE INDEX "customer_responsibility_user_idx" ON "public"."customer_responsibility" USING "btree" ("user_id", "systemhouse_id", "customer_id");



CREATE INDEX "customer_systemhouse_idx" ON "public"."customer" USING "btree" ("systemhouse_id");



CREATE INDEX "reference_value_catalog_idx" ON "public"."reference_value" USING "btree" ("catalog_id", "sort_order");



CREATE UNIQUE INDEX "reference_value_global_key_unique" ON "public"."reference_value" USING "btree" ("catalog_id", "key") WHERE ("systemhouse_id" IS NULL);



CREATE INDEX "reference_value_history_systemhouse_idx" ON "public"."reference_value_history" USING "btree" ("systemhouse_id", "changed_at" DESC) WHERE ("systemhouse_id" IS NOT NULL);



CREATE INDEX "reference_value_history_value_idx" ON "public"."reference_value_history" USING "btree" ("value_id", "changed_at" DESC);



CREATE INDEX "reference_value_systemhouse_idx" ON "public"."reference_value" USING "btree" ("systemhouse_id", "catalog_id", "sort_order") WHERE ("systemhouse_id" IS NOT NULL);



CREATE UNIQUE INDEX "reference_value_systemhouse_key_unique" ON "public"."reference_value" USING "btree" ("catalog_id", "systemhouse_id", "key") WHERE ("systemhouse_id" IS NOT NULL);



CREATE INDEX "shared_activity_projection_engineer_idx" ON "public"."shared_activity_projection" USING "btree" ("engineer_id");



CREATE INDEX "shared_activity_projection_scope_idx" ON "public"."shared_activity_projection" USING "btree" ("systemhouse_id", "customer_id") WHERE "is_active";



CREATE INDEX "shared_project_projection_scope_idx" ON "public"."shared_project_projection" USING "btree" ("systemhouse_id", "customer_id") WHERE "is_active";



CREATE INDEX "shared_work_package_projection_active_category_idx" ON "public"."shared_work_package_projection" USING "btree" ("systemhouse_id", "customer_id", "category_key") WHERE "is_active";



CREATE INDEX "shared_work_package_projection_scope_idx" ON "public"."shared_work_package_projection" USING "btree" ("systemhouse_id", "customer_id") WHERE "is_active";



CREATE INDEX "systemhouse_membership_user_idx" ON "public"."systemhouse_membership" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "app_settings_audit" AFTER INSERT OR UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."audit_app_settings_change"();



CREATE OR REPLACE TRIGGER "app_settings_set_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "avkk_competence_audit" AFTER INSERT OR UPDATE ON "public"."avkk_competence" FOR EACH ROW EXECUTE FUNCTION "public"."avkk_audit_change"();



CREATE OR REPLACE TRIGGER "avkk_competence_set_updated_at" BEFORE UPDATE ON "public"."avkk_competence" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "avkk_consequence_audit" AFTER INSERT OR UPDATE ON "public"."avkk_consequence" FOR EACH ROW EXECUTE FUNCTION "public"."avkk_audit_change"();



CREATE OR REPLACE TRIGGER "avkk_consequence_set_updated_at" BEFORE UPDATE ON "public"."avkk_consequence" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "avkk_responsibility_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."avkk_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."avkk_audit_change"();



CREATE OR REPLACE TRIGGER "avkk_responsibility_set_updated_at" BEFORE UPDATE ON "public"."avkk_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "avkk_responsibility_type_audit" AFTER INSERT OR DELETE ON "public"."avkk_responsibility_type" FOR EACH ROW EXECUTE FUNCTION "public"."avkk_audit_change"();



CREATE OR REPLACE TRIGGER "avkk_subject_audit" AFTER INSERT OR UPDATE ON "public"."avkk_subject" FOR EACH ROW EXECUTE FUNCTION "public"."avkk_audit_change"();



CREATE OR REPLACE TRIGGER "avkk_subject_set_updated_at" BEFORE UPDATE ON "public"."avkk_subject" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "bsf03e_avkk_responsibility_target_guard" BEFORE INSERT OR UPDATE OF "avkk_subject_id", "person_id", "valid_to" ON "public"."avkk_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."bsf03e_avkk_responsibility_target_guard"();



CREATE OR REPLACE TRIGGER "bsf03e_avkk_subject_scope_guard" BEFORE INSERT OR UPDATE OF "systemhouse_id", "customer_id", "subject_type", "subject_id" ON "public"."avkk_subject" FOR EACH ROW EXECUTE FUNCTION "public"."bsf03e_avkk_subject_scope_guard"();



CREATE OR REPLACE TRIGGER "customer_access_set_updated_at" BEFORE UPDATE ON "public"."customer_access" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "customer_activity_billable_override_audit" AFTER INSERT OR UPDATE ON "public"."customer_activity_billable_override" FOR EACH ROW EXECUTE FUNCTION "public"."bsf03b_billable_override_audit"();



CREATE OR REPLACE TRIGGER "customer_activity_billable_override_guard" BEFORE UPDATE ON "public"."customer_activity_billable_override" FOR EACH ROW EXECUTE FUNCTION "public"."bsf03b_billable_override_guard"();



CREATE OR REPLACE TRIGGER "customer_activity_billable_override_set_updated_at" BEFORE UPDATE ON "public"."customer_activity_billable_override" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "customer_performance_statement_request_process" BEFORE INSERT ON "public"."customer_performance_statement_request" FOR EACH ROW EXECUTE FUNCTION "public"."bsf03b_process_statement_request"();



CREATE OR REPLACE TRIGGER "customer_responsibility_audit" AFTER INSERT OR UPDATE ON "public"."customer_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."customer_responsibility_audit"();



CREATE OR REPLACE TRIGGER "customer_responsibility_identity_guard" BEFORE UPDATE ON "public"."customer_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."customer_responsibility_identity_guard"();



CREATE OR REPLACE TRIGGER "customer_responsibility_set_updated_at" BEFORE UPDATE ON "public"."customer_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "customer_responsibility_target_guard" BEFORE INSERT OR UPDATE ON "public"."customer_responsibility" FOR EACH ROW EXECUTE FUNCTION "public"."customer_responsibility_target_guard"();



CREATE OR REPLACE TRIGGER "customer_set_updated_at" BEFORE UPDATE ON "public"."customer" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reference_catalog_set_updated_at" BEFORE UPDATE ON "public"."reference_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reference_value_set_updated_at" BEFORE UPDATE ON "public"."reference_value" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reference_value_track" AFTER INSERT OR UPDATE ON "public"."reference_value" FOR EACH ROW EXECUTE FUNCTION "public"."reference_value_track_change"();



CREATE OR REPLACE TRIGGER "reference_value_validate_scope" BEFORE INSERT OR UPDATE ON "public"."reference_value" FOR EACH ROW EXECUTE FUNCTION "public"."reference_value_validate_scope"();



CREATE OR REPLACE TRIGGER "shared_activity_projection_identity_guard" BEFORE UPDATE ON "public"."shared_activity_projection" FOR EACH ROW EXECUTE FUNCTION "public"."bsf02c_projection_identity_guard"();



CREATE OR REPLACE TRIGGER "shared_activity_projection_set_updated_at" BEFORE UPDATE ON "public"."shared_activity_projection" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "shared_project_projection_identity_guard" BEFORE UPDATE ON "public"."shared_project_projection" FOR EACH ROW EXECUTE FUNCTION "public"."bsf02c_projection_identity_guard"();



CREATE OR REPLACE TRIGGER "shared_project_projection_set_updated_at" BEFORE UPDATE ON "public"."shared_project_projection" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "shared_work_package_projection_identity_guard" BEFORE UPDATE ON "public"."shared_work_package_projection" FOR EACH ROW EXECUTE FUNCTION "public"."bsf02c_projection_identity_guard"();



CREATE OR REPLACE TRIGGER "shared_work_package_projection_set_updated_at" BEFORE UPDATE ON "public"."shared_work_package_projection" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "systemhouse_membership_set_updated_at" BEFORE UPDATE ON "public"."systemhouse_membership" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "systemhouse_set_updated_at" BEFORE UPDATE ON "public"."systemhouse" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_audit_user_roles" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_user_roles_change"();



CREATE OR REPLACE TRIGGER "trg_enforce_kiosk_role_exclusive" BEFORE INSERT OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_kiosk_role_exclusive"();



CREATE OR REPLACE TRIGGER "trg_protect_last_sysadmin_profile" BEFORE UPDATE OF "status" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_last_sysadmin_profile"();



CREATE OR REPLACE TRIGGER "trg_protect_last_sysadmin_roles" BEFORE DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_last_sysadmin_roles"();



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_avkk_subject_id_fkey" FOREIGN KEY ("avkk_subject_id") REFERENCES "public"."avkk_subject"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_dimension_value_id_fkey" FOREIGN KEY ("dimension_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_rating_value_id_fkey" FOREIGN KEY ("rating_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_competence"
    ADD CONSTRAINT "avkk_competence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_area_value_id_fkey" FOREIGN KEY ("area_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_avkk_subject_id_fkey" FOREIGN KEY ("avkk_subject_id") REFERENCES "public"."avkk_subject"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_schedule_impact_value_id_fkey" FOREIGN KEY ("schedule_impact_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_severity_value_id_fkey" FOREIGN KEY ("severity_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_consequence"
    ADD CONSTRAINT "avkk_consequence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_avkk_subject_id_fkey" FOREIGN KEY ("avkk_subject_id") REFERENCES "public"."avkk_subject"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_role_value_id_fkey" FOREIGN KEY ("role_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_responsibility_type"
    ADD CONSTRAINT "avkk_responsibility_type_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_responsibility_type"
    ADD CONSTRAINT "avkk_responsibility_type_responsibility_id_fkey" FOREIGN KEY ("responsibility_id") REFERENCES "public"."avkk_responsibility"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avkk_responsibility_type"
    ADD CONSTRAINT "avkk_responsibility_type_type_value_id_fkey" FOREIGN KEY ("type_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_responsibility"
    ADD CONSTRAINT "avkk_responsibility_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_subject"
    ADD CONSTRAINT "avkk_subject_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avkk_subject"
    ADD CONSTRAINT "avkk_subject_customer_scope_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."avkk_subject"
    ADD CONSTRAINT "avkk_subject_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_access"
    ADD CONSTRAINT "customer_access_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_access"
    ADD CONSTRAINT "customer_access_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_activity_billable_override"
    ADD CONSTRAINT "customer_activity_billable_override_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_activity_billable_override"
    ADD CONSTRAINT "customer_activity_billable_override_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_activity_billable_override"
    ADD CONSTRAINT "customer_activity_billable_override_systemhouse_id_fkey" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id");



ALTER TABLE ONLY "public"."customer_performance_activity_claim"
    ADD CONSTRAINT "customer_performance_activity_claim_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_performance_activity_claim"
    ADD CONSTRAINT "customer_performance_activity_claim_statement_fk" FOREIGN KEY ("statement_id", "systemhouse_id", "customer_id") REFERENCES "public"."customer_performance_statement"("id", "systemhouse_id", "customer_id");



ALTER TABLE ONLY "public"."customer_performance_activity_claim"
    ADD CONSTRAINT "customer_performance_activity_claim_systemhouse_id_fkey" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_performance_statement_item"
    ADD CONSTRAINT "customer_performance_statement_item_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."customer_performance_statement"("id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_replaces_statement_id_fkey" FOREIGN KEY ("replaces_statement_id") REFERENCES "public"."customer_performance_statement"("id");



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_reque_replaces_statement_id_fkey" FOREIGN KEY ("replaces_statement_id") REFERENCES "public"."customer_performance_statement"("id");



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_request_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_request_result_statement_id_fkey" FOREIGN KEY ("result_statement_id") REFERENCES "public"."customer_performance_statement"("id");



ALTER TABLE ONLY "public"."customer_performance_statement_request"
    ADD CONSTRAINT "customer_performance_statement_request_systemhouse_id_fkey" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_superseded_by_statement_id_fkey" FOREIGN KEY ("superseded_by_statement_id") REFERENCES "public"."customer_performance_statement"("id");



ALTER TABLE ONLY "public"."customer_performance_statement"
    ADD CONSTRAINT "customer_performance_statement_systemhouse_id_fkey" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id");



ALTER TABLE ONLY "public"."customer_responsibility"
    ADD CONSTRAINT "customer_responsibility_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id");



ALTER TABLE ONLY "public"."customer_responsibility"
    ADD CONSTRAINT "customer_responsibility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_systemhouse_fk" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."reference_catalog"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_parent_value_id_fkey" FOREIGN KEY ("parent_value_id") REFERENCES "public"."reference_value"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_systemhouse_fk" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reference_value"
    ADD CONSTRAINT "reference_value_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_parent_fk" FOREIGN KEY ("work_package_ref", "systemhouse_id", "customer_id") REFERENCES "public"."shared_work_package_projection"("id", "systemhouse_id", "customer_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_activity_projection"
    ADD CONSTRAINT "shared_activity_projection_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_project_projection"
    ADD CONSTRAINT "shared_project_projection_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_customer_fk" FOREIGN KEY ("customer_id", "systemhouse_id") REFERENCES "public"."customer"("id", "systemhouse_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_parent_fk" FOREIGN KEY ("project_ref", "systemhouse_id", "customer_id") REFERENCES "public"."shared_project_projection"("id", "systemhouse_id", "customer_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shared_work_package_projection"
    ADD CONSTRAINT "shared_work_package_projection_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."systemhouse_membership"
    ADD CONSTRAINT "systemhouse_membership_systemhouse_fk" FOREIGN KEY ("systemhouse_id") REFERENCES "public"."systemhouse"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."systemhouse_membership"
    ADD CONSTRAINT "systemhouse_membership_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_settings_admin_insert" ON "public"."app_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_permission"("auth"."uid"(), 'users.manage'::"text"));



CREATE POLICY "app_settings_admin_update" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING ("public"."has_permission"("auth"."uid"(), 'users.manage'::"text")) WITH CHECK ("public"."has_permission"("auth"."uid"(), 'users.manage'::"text"));



CREATE POLICY "app_settings_read_admin" ON "public"."app_settings" FOR SELECT TO "authenticated" USING ("public"."has_permission"("auth"."uid"(), 'users.manage'::"text"));



CREATE POLICY "app_settings_read_public_keys" ON "public"."app_settings" FOR SELECT TO "authenticated" USING (("key" = ANY (ARRAY['idle_timeout_minutes'::"text", 'avkk.risk_threshold'::"text"])));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_admins_read" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."has_any_role"("auth"."uid"(), ARRAY['systemadministrator'::"public"."app_role", 'administrator'::"public"."app_role"]));



CREATE POLICY "audit_log_block_client_insert" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (false);



ALTER TABLE "public"."avkk_competence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avkk_competence_insert" ON "public"."avkk_competence" FOR INSERT TO "authenticated" WITH CHECK (("public"."avkk_can_write"("avkk_subject_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "avkk_competence_read" ON "public"."avkk_competence" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.view'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE ("s"."id" = "avkk_competence"."avkk_subject_id")))));



CREATE POLICY "avkk_competence_update" ON "public"."avkk_competence" FOR UPDATE TO "authenticated" USING ("public"."avkk_can_write"("avkk_subject_id")) WITH CHECK ("public"."avkk_can_write"("avkk_subject_id"));



ALTER TABLE "public"."avkk_consequence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avkk_consequence_insert" ON "public"."avkk_consequence" FOR INSERT TO "authenticated" WITH CHECK (("public"."avkk_can_write"("avkk_subject_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "avkk_consequence_read" ON "public"."avkk_consequence" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.view'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE ("s"."id" = "avkk_consequence"."avkk_subject_id")))));



CREATE POLICY "avkk_consequence_update" ON "public"."avkk_consequence" FOR UPDATE TO "authenticated" USING ("public"."avkk_can_write"("avkk_subject_id")) WITH CHECK ("public"."avkk_can_write"("avkk_subject_id"));



ALTER TABLE "public"."avkk_responsibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avkk_responsibility_delete" ON "public"."avkk_responsibility" FOR DELETE TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE (("s"."id" = "avkk_responsibility"."avkk_subject_id") AND ("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL))))));



CREATE POLICY "avkk_responsibility_insert" ON "public"."avkk_responsibility" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND ("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE (("s"."id" = "avkk_responsibility"."avkk_subject_id") AND ((("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "s"."systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "s"."systemhouse_id", "s"."customer_id", 'write'::"text"))))))));



CREATE POLICY "avkk_responsibility_read" ON "public"."avkk_responsibility" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.view'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE ("s"."id" = "avkk_responsibility"."avkk_subject_id")))));



ALTER TABLE "public"."avkk_responsibility_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avkk_responsibility_type_delete" ON "public"."avkk_responsibility_type" FOR DELETE TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."avkk_responsibility" "r"
     JOIN "public"."avkk_subject" "s" ON (("s"."id" = "r"."avkk_subject_id")))
  WHERE (("r"."id" = "avkk_responsibility_type"."responsibility_id") AND ("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL))))));



CREATE POLICY "avkk_responsibility_type_insert" ON "public"."avkk_responsibility_type" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."avkk_responsibility" "r"
     JOIN "public"."avkk_subject" "s" ON (("s"."id" = "r"."avkk_subject_id")))
  WHERE (("r"."id" = "avkk_responsibility_type"."responsibility_id") AND ((("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "s"."systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "s"."systemhouse_id", "s"."customer_id", 'write'::"text"))))))));



CREATE POLICY "avkk_responsibility_type_read" ON "public"."avkk_responsibility_type" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.view'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_responsibility" "r"
  WHERE ("r"."id" = "avkk_responsibility_type"."responsibility_id")))));



CREATE POLICY "avkk_responsibility_update" ON "public"."avkk_responsibility" FOR UPDATE TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE (("s"."id" = "avkk_responsibility"."avkk_subject_id") AND ((("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "s"."systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "s"."systemhouse_id", "s"."customer_id", 'write'::"text")))))))) WITH CHECK (("public"."has_permission"("auth"."uid"(), 'avkk.responsibility.assign'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."avkk_subject" "s"
  WHERE (("s"."id" = "avkk_responsibility"."avkk_subject_id") AND ((("s"."systemhouse_id" IS NULL) AND ("s"."customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "s"."systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "s"."systemhouse_id", "s"."customer_id", 'write'::"text"))))))));



ALTER TABLE "public"."avkk_subject" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "avkk_subject_insert" ON "public"."avkk_subject" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_permission"("auth"."uid"(), 'avkk.edit'::"text") AND ("created_by" = "auth"."uid"()) AND ((("systemhouse_id" IS NULL) AND ("customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text")))));



CREATE POLICY "avkk_subject_read" ON "public"."avkk_subject" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'avkk.view'::"text") AND ((("systemhouse_id" IS NULL) AND ("customer_id" IS NULL)) OR ("public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text")))));



CREATE POLICY "avkk_subject_update" ON "public"."avkk_subject" FOR UPDATE TO "authenticated" USING ("public"."avkk_can_write"("id")) WITH CHECK ("public"."avkk_can_write"("id"));



ALTER TABLE "public"."customer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_access_select_own" ON "public"."customer_access" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."customer_activity_billable_override" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_activity_billable_override_insert" ON "public"."customer_activity_billable_override" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND ("changed_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."shared_activity_projection" "a"
  WHERE (("a"."systemhouse_id" = "customer_activity_billable_override"."systemhouse_id") AND ("a"."customer_id" = "customer_activity_billable_override"."customer_id") AND ("a"."source_id" = "customer_activity_billable_override"."activity_source_id") AND ("a"."source_revision" = "customer_activity_billable_override"."source_revision") AND ("a"."source_hash" = "customer_activity_billable_override"."source_hash") AND ("a"."billable" = "customer_activity_billable_override"."source_billable") AND "a"."is_active")))));



CREATE POLICY "customer_activity_billable_override_read" ON "public"."customer_activity_billable_override" FOR SELECT TO "authenticated" USING (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text")));



CREATE POLICY "customer_activity_billable_override_update" ON "public"."customer_activity_billable_override" FOR UPDATE TO "authenticated" USING (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text"))) WITH CHECK (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND ("changed_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."shared_activity_projection" "a"
  WHERE (("a"."systemhouse_id" = "customer_activity_billable_override"."systemhouse_id") AND ("a"."customer_id" = "customer_activity_billable_override"."customer_id") AND ("a"."source_id" = "customer_activity_billable_override"."activity_source_id") AND ("a"."source_revision" = "customer_activity_billable_override"."source_revision") AND ("a"."source_hash" = "customer_activity_billable_override"."source_hash") AND ("a"."billable" = "customer_activity_billable_override"."source_billable") AND "a"."is_active")))));



ALTER TABLE "public"."customer_performance_activity_claim" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_performance_activity_claim_read" ON "public"."customer_performance_activity_claim" FOR SELECT TO "authenticated" USING (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text")));



ALTER TABLE "public"."customer_performance_statement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_performance_statement_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_performance_statement_item_read" ON "public"."customer_performance_statement_item" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_performance_statement" "s"
  WHERE (("s"."id" = "customer_performance_statement_item"."statement_id") AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "s"."systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "s"."systemhouse_id", "s"."customer_id", 'read'::"text")))));



CREATE POLICY "customer_performance_statement_read" ON "public"."customer_performance_statement" FOR SELECT TO "authenticated" USING (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text")));



ALTER TABLE "public"."customer_performance_statement_request" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_performance_statement_request_insert" ON "public"."customer_performance_statement_request" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND ("requested_by" = "auth"."uid"())));



CREATE POLICY "customer_performance_statement_request_read" ON "public"."customer_performance_statement_request" FOR SELECT TO "authenticated" USING (("public"."is_account_active"("auth"."uid"()) AND "public"."has_permission"("auth"."uid"(), 'performance.statement.manage'::"text") AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text")));



ALTER TABLE "public"."customer_responsibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_select_scoped" ON "public"."customer" FOR SELECT TO "authenticated" USING ("public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "id", 'read'::"text"));



CREATE POLICY "managers create scoped responsibility" ON "public"."customer_responsibility" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_manage_customer_responsibility"("auth"."uid"(), "systemhouse_id") AND ("status" = 'active'::"text") AND ("valid_to" IS NULL)));



CREATE POLICY "managers read scoped responsibility" ON "public"."customer_responsibility" FOR SELECT TO "authenticated" USING ("public"."can_manage_customer_responsibility"("auth"."uid"(), "systemhouse_id"));



CREATE POLICY "managers update scoped responsibility" ON "public"."customer_responsibility" FOR UPDATE TO "authenticated" USING ("public"."can_manage_customer_responsibility"("auth"."uid"(), "systemhouse_id")) WITH CHECK ("public"."can_manage_customer_responsibility"("auth"."uid"(), "systemhouse_id"));



CREATE POLICY "membership_select_own" ON "public"."systemhouse_membership" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "own responsibility readable" ON "public"."customer_responsibility" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admins_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_any_role"("auth"."uid"(), ARRAY['systemadministrator'::"public"."app_role", 'administrator'::"public"."app_role"]));



CREATE POLICY "profiles_admins_update_all" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"("auth"."uid"(), ARRAY['systemadministrator'::"public"."app_role", 'administrator'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"("auth"."uid"(), ARRAY['systemadministrator'::"public"."app_role", 'administrator'::"public"."app_role"]));



CREATE POLICY "profiles_block_client_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "profiles_self_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."reference_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reference_catalog_insert" ON "public"."reference_catalog" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text"));



CREATE POLICY "reference_catalog_read" ON "public"."reference_catalog" FOR SELECT TO "authenticated" USING ("public"."has_permission"("auth"."uid"(), 'referencedata.view'::"text"));



CREATE POLICY "reference_catalog_update" ON "public"."reference_catalog" FOR UPDATE TO "authenticated" USING ("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text")) WITH CHECK ("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text"));



ALTER TABLE "public"."reference_value" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reference_value_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reference_value_history_block_insert" ON "public"."reference_value_history" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "reference_value_history_read" ON "public"."reference_value_history" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text") AND (("systemhouse_id" IS NULL) OR "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id"))));



CREATE POLICY "reference_value_insert" ON "public"."reference_value" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text") AND (("systemhouse_id" IS NULL) OR "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id"))));



CREATE POLICY "reference_value_read" ON "public"."reference_value" FOR SELECT TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'referencedata.view'::"text") AND (("systemhouse_id" IS NULL) OR "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id"))));



CREATE POLICY "reference_value_update" ON "public"."reference_value" FOR UPDATE TO "authenticated" USING (("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text") AND (("systemhouse_id" IS NULL) OR "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id")))) WITH CHECK (("public"."has_permission"("auth"."uid"(), 'referencedata.manage'::"text") AND (("systemhouse_id" IS NULL) OR "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id"))));



ALTER TABLE "public"."shared_activity_projection" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_activity_projection_insert" ON "public"."shared_activity_projection" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND ("engineer_id" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'activity.edit'::"text")));



CREATE POLICY "shared_activity_projection_read" ON "public"."shared_activity_projection" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND "public"."has_permission"("auth"."uid"(), 'dashboard.view'::"text")));



CREATE POLICY "shared_activity_projection_update" ON "public"."shared_activity_projection" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND ("engineer_id" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'activity.edit'::"text"))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND ("engineer_id" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'activity.edit'::"text")));



ALTER TABLE "public"."shared_project_projection" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_project_projection_insert" ON "public"."shared_project_projection" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text")));



CREATE POLICY "shared_project_projection_read" ON "public"."shared_project_projection" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND "public"."has_permission"("auth"."uid"(), 'dashboard.view'::"text")));



CREATE POLICY "shared_project_projection_update" ON "public"."shared_project_projection" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text"))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text")));



ALTER TABLE "public"."shared_work_package_projection" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_work_package_projection_insert" ON "public"."shared_work_package_projection" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text")));



CREATE POLICY "shared_work_package_projection_read" ON "public"."shared_work_package_projection" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'read'::"text") AND "public"."has_permission"("auth"."uid"(), 'dashboard.view'::"text")));



CREATE POLICY "shared_work_package_projection_update" ON "public"."shared_work_package_projection" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text"))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("published_by" = "auth"."uid"()) AND "public"."is_account_active"("auth"."uid"()) AND "public"."has_active_systemhouse_membership"("auth"."uid"(), "systemhouse_id") AND "public"."has_customer_access"("auth"."uid"(), "systemhouse_id", "customer_id", 'write'::"text") AND "public"."has_permission"("auth"."uid"(), 'project.edit'::"text")));



ALTER TABLE "public"."systemhouse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."systemhouse_membership" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "systemhouse_select_member" ON "public"."systemhouse" FOR SELECT TO "authenticated" USING ("public"."has_active_systemhouse_membership"("auth"."uid"(), "id"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_read_admins" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_any_role"("auth"."uid"(), ARRAY['systemadministrator'::"public"."app_role", 'administrator'::"public"."app_role"]));



CREATE POLICY "user_roles_read_own" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_roles_sysadmin_delete" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'systemadministrator'::"public"."app_role"));



CREATE POLICY "user_roles_sysadmin_insert" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'systemadministrator'::"public"."app_role"));



CREATE POLICY "user_roles_sysadmin_update" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'systemadministrator'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'systemadministrator'::"public"."app_role"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_app_settings_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_app_settings_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_user_roles_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_user_roles_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."avkk_audit_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."avkk_audit_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."avkk_can_write"("_subject" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."avkk_can_write"("_subject" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avkk_can_write"("_subject" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."avkk_people_directory"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."avkk_people_directory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."avkk_people_directory"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bsf02c_projection_identity_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."bsf02c_projection_identity_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bsf02c_projection_identity_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb", "p_work_packages" "jsonb", "p_activities" "jsonb", "p_observed_project_source_ids" "text"[], "p_observed_work_package_source_ids" "text"[], "p_observed_activity_source_ids" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb", "p_work_packages" "jsonb", "p_activities" "jsonb", "p_observed_project_source_ids" "text"[], "p_observed_work_package_source_ids" "text"[], "p_observed_activity_source_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bsf02c_publish_shared_projection_snapshot"("p_systemhouse_id" "uuid", "p_customer_id" "uuid", "p_mode" "text", "p_snapshot_complete" boolean, "p_projects" "jsonb", "p_work_packages" "jsonb", "p_activities" "jsonb", "p_observed_project_source_ids" "text"[], "p_observed_work_package_source_ids" "text"[], "p_observed_activity_source_ids" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03b_billable_override_audit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03b_billable_override_audit"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03b_billable_override_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03b_billable_override_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03b_process_statement_request"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03b_process_statement_request"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03e_avkk_responsibility_candidates"("_subject" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03e_avkk_responsibility_candidates"("_subject" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bsf03e_avkk_responsibility_candidates"("_subject" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03e_avkk_responsibility_target_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03e_avkk_responsibility_target_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bsf03e_avkk_subject_scope_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bsf03e_avkk_subject_scope_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_responsibility_audit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_responsibility_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_responsibility_identity_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."customer_responsibility_identity_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_responsibility_identity_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_responsibility_management_candidates"("_systemhouse_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_responsibility_management_candidates"("_systemhouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_responsibility_management_candidates"("_systemhouse_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_responsibility_management_overview"("_systemhouse_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_responsibility_management_overview"("_systemhouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_responsibility_management_overview"("_systemhouse_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_responsibility_target_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_responsibility_target_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."end_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."end_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_kiosk_role_exclusive"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_kiosk_role_exclusive"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_active_systemhouse_membership"("_user_id" "uuid", "_systemhouse_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_active_systemhouse_membership"("_user_id" "uuid", "_systemhouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_systemhouse_membership"("_user_id" "uuid", "_systemhouse_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_any_role"("_user_id" "uuid", "_roles" "public"."app_role"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_any_role"("_user_id" "uuid", "_roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("_user_id" "uuid", "_roles" "public"."app_role"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_customer_access"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid", "_required_level" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_customer_access"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid", "_required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_customer_access"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid", "_required_level" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_customer_responsibility"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_perm" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_perm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_perm" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_account_active"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_account_active"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_active"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_eligible_responsibility_holder"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_eligible_responsibility_holder"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_eligible_responsibility_holder"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_my_customer"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_my_customer"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_my_customer"("_user_id" "uuid", "_systemhouse_id" "uuid", "_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_last_sysadmin_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_last_sysadmin_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_last_sysadmin_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_last_sysadmin_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reference_value_track_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reference_value_track_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reference_value_validate_scope"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reference_value_validate_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reference_value_validate_scope"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid", "_target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid", "_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_customer_responsibility"("_systemhouse_id" "uuid", "_customer_id" "uuid", "_target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."avkk_competence" TO "anon";
GRANT ALL ON TABLE "public"."avkk_competence" TO "authenticated";
GRANT ALL ON TABLE "public"."avkk_competence" TO "service_role";



GRANT ALL ON TABLE "public"."avkk_consequence" TO "anon";
GRANT ALL ON TABLE "public"."avkk_consequence" TO "authenticated";
GRANT ALL ON TABLE "public"."avkk_consequence" TO "service_role";



GRANT ALL ON TABLE "public"."avkk_responsibility" TO "anon";
GRANT ALL ON TABLE "public"."avkk_responsibility" TO "authenticated";
GRANT ALL ON TABLE "public"."avkk_responsibility" TO "service_role";



GRANT ALL ON TABLE "public"."avkk_responsibility_type" TO "anon";
GRANT ALL ON TABLE "public"."avkk_responsibility_type" TO "authenticated";
GRANT ALL ON TABLE "public"."avkk_responsibility_type" TO "service_role";



GRANT ALL ON TABLE "public"."avkk_subject" TO "anon";
GRANT ALL ON TABLE "public"."avkk_subject" TO "authenticated";
GRANT ALL ON TABLE "public"."avkk_subject" TO "service_role";



GRANT ALL ON TABLE "public"."customer" TO "service_role";
GRANT SELECT ON TABLE "public"."customer" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_access" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_access" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_activity_billable_override" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."customer_activity_billable_override" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_performance_activity_claim" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_performance_activity_claim" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_performance_statement" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_performance_statement" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_performance_statement_item" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_performance_statement_item" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_performance_statement_request" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."customer_performance_statement_request" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_responsibility" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."customer_responsibility" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reference_catalog" TO "service_role";
GRANT SELECT ON TABLE "public"."reference_catalog" TO "authenticated";



GRANT ALL ON TABLE "public"."reference_value" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."reference_value" TO "authenticated";



GRANT ALL ON TABLE "public"."reference_value_history" TO "service_role";
GRANT SELECT ON TABLE "public"."reference_value_history" TO "authenticated";



GRANT ALL ON TABLE "public"."shared_activity_projection" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."shared_activity_projection" TO "authenticated";



GRANT ALL ON TABLE "public"."shared_project_projection" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."shared_project_projection" TO "authenticated";



GRANT ALL ON TABLE "public"."shared_work_package_projection" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."shared_work_package_projection" TO "authenticated";



GRANT ALL ON TABLE "public"."systemhouse" TO "service_role";
GRANT SELECT ON TABLE "public"."systemhouse" TO "authenticated";



GRANT ALL ON TABLE "public"."systemhouse_membership" TO "service_role";
GRANT SELECT ON TABLE "public"."systemhouse_membership" TO "authenticated";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







