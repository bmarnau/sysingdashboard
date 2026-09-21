-- 20260921095742_bsf03b_performance_statement.sql
-- BSF-03B — Teamlead-Leistungsnachweis V1 (Issue #107). Forward-only.
-- Kein Rechnungsbezug: keine Preise, Saetze, Steuer, Rechnungsnummern.

-- ---------------------------------------------------------------------------
-- 1) Permission-Matrix: performance.statement.manage nur fuer teamlead.
--    has_permission bleibt SECURITY INVOKER / STABLE / search_path=public.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
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
$function$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Billing-Review-Overlay (revisionsgebunden, kein DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_activity_billable_override (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id     uuid NOT NULL REFERENCES public.systemhouse(id),
  customer_id        uuid NOT NULL,
  activity_source_id text NOT NULL,
  source_revision    integer NOT NULL,
  source_hash        text NOT NULL,
  source_billable    boolean NOT NULL,
  effective_billable boolean NOT NULL,
  note               text NOT NULL DEFAULT '',
  changed_by         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  changed_at         timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_activity_billable_override_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT customer_activity_billable_override_unique
    UNIQUE (systemhouse_id, customer_id, activity_source_id, source_revision)
);

REVOKE ALL ON public.customer_activity_billable_override FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_activity_billable_override TO authenticated;
GRANT ALL ON public.customer_activity_billable_override TO service_role;
ALTER TABLE public.customer_activity_billable_override ENABLE ROW LEVEL SECURITY;

CREATE INDEX customer_activity_billable_override_scope_idx
  ON public.customer_activity_billable_override (systemhouse_id, customer_id, activity_source_id);

CREATE TRIGGER customer_activity_billable_override_set_updated_at
  BEFORE UPDATE ON public.customer_activity_billable_override
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Override-Provenienz ist immutable; nur Review-Entscheidung/Notiz duerfen wechseln.
CREATE OR REPLACE FUNCTION public.bsf03b_billable_override_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.bsf03b_billable_override_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bsf03b_billable_override_guard() TO service_role;

CREATE TRIGGER customer_activity_billable_override_guard
  BEFORE UPDATE ON public.customer_activity_billable_override
  FOR EACH ROW EXECUTE FUNCTION public.bsf03b_billable_override_guard();

-- ---------------------------------------------------------------------------
-- 3) Snapshot-Header / Items / Claims
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_performance_statement (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id                   uuid NOT NULL,
  version                     integer NOT NULL CHECK (version >= 1),
  systemhouse_id              uuid NOT NULL REFERENCES public.systemhouse(id),
  customer_id                 uuid NOT NULL,
  customer_name_snapshot      text NOT NULL,
  period_start                date NOT NULL,
  period_end                  date NOT NULL,
  status                      text NOT NULL CHECK (status IN ('finalized','superseded')),
  finalized_by                uuid NOT NULL REFERENCES auth.users(id),
  finalized_at                timestamptz NOT NULL DEFAULT now(),
  review_fingerprint          text NOT NULL CHECK (review_fingerprint ~ '^[0-9a-f]{64}$'),
  snapshot_hash               text NOT NULL DEFAULT repeat('0',64)
                                CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  item_count                  integer NOT NULL DEFAULT 0,
  billable_item_count         integer NOT NULL DEFAULT 0,
  billable_hours              numeric(12,2) NOT NULL DEFAULT 0,
  non_billable_hours          numeric(12,2) NOT NULL DEFAULT 0,
  replaces_statement_id       uuid REFERENCES public.customer_performance_statement(id),
  superseded_by_statement_id  uuid REFERENCES public.customer_performance_statement(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_performance_statement_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT customer_performance_statement_period_ck CHECK (period_end >= period_start),
  CONSTRAINT customer_performance_statement_counts_ck
    CHECK (item_count >= 0 AND billable_item_count >= 0 AND billable_item_count <= item_count),
  CONSTRAINT customer_performance_statement_hours_ck
    CHECK (billable_hours >= 0 AND non_billable_hours >= 0),
  CONSTRAINT customer_performance_statement_status_link_ck CHECK (
    (status = 'finalized' AND superseded_by_statement_id IS NULL)
    OR (status = 'superseded' AND superseded_by_statement_id IS NOT NULL)
  ),
  CONSTRAINT customer_performance_statement_series_version_uq UNIQUE (series_id, version),
  CONSTRAINT customer_performance_statement_scope_uq UNIQUE (id, systemhouse_id, customer_id)
);

REVOKE ALL ON public.customer_performance_statement FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_performance_statement TO authenticated;
GRANT ALL ON public.customer_performance_statement TO service_role;
ALTER TABLE public.customer_performance_statement ENABLE ROW LEVEL SECURITY;

CREATE INDEX customer_performance_statement_scope_idx
  ON public.customer_performance_statement (systemhouse_id, customer_id, period_start, period_end);

CREATE TABLE public.customer_performance_statement_item (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id           uuid NOT NULL REFERENCES public.customer_performance_statement(id),
  "position"             integer NOT NULL CHECK ("position" >= 1),
  activity_source_id     text NOT NULL,
  source_revision        integer NOT NULL,
  source_hash            text NOT NULL,
  activity_date          date NOT NULL,
  title_snapshot         text NOT NULL,
  duration_hours         numeric(12,2) NOT NULL CHECK (duration_hours >= 0),
  source_billable        boolean NOT NULL,
  effective_billable     boolean NOT NULL,
  billing_status_snapshot text NOT NULL DEFAULT '',
  engineer_id            uuid,
  work_package_source_id text,
  work_package_title_snapshot text NOT NULL DEFAULT '',
  project_source_id      text,
  project_name_snapshot  text NOT NULL DEFAULT '',
  category_key_snapshot  text,
  category_label_snapshot text NOT NULL DEFAULT '',
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_performance_statement_item_position_uq
    UNIQUE (statement_id, "position"),
  CONSTRAINT customer_performance_statement_item_source_uq
    UNIQUE (statement_id, activity_source_id)
);

REVOKE ALL ON public.customer_performance_statement_item FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_performance_statement_item TO authenticated;
GRANT ALL ON public.customer_performance_statement_item TO service_role;
ALTER TABLE public.customer_performance_statement_item ENABLE ROW LEVEL SECURITY;

CREATE INDEX customer_performance_statement_item_statement_idx
  ON public.customer_performance_statement_item (statement_id);

CREATE TABLE public.customer_performance_activity_claim (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id     uuid NOT NULL REFERENCES public.systemhouse(id),
  customer_id        uuid NOT NULL,
  activity_source_id text NOT NULL,
  statement_id       uuid NOT NULL,
  claimed_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_performance_activity_claim_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT customer_performance_activity_claim_unique
    UNIQUE (systemhouse_id, customer_id, activity_source_id),
  CONSTRAINT customer_performance_activity_claim_statement_fk
    FOREIGN KEY (statement_id, systemhouse_id, customer_id)
    REFERENCES public.customer_performance_statement (id, systemhouse_id, customer_id)
);

REVOKE ALL ON public.customer_performance_activity_claim FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_performance_activity_claim TO authenticated;
GRANT ALL ON public.customer_performance_activity_claim TO service_role;
ALTER TABLE public.customer_performance_activity_claim ENABLE ROW LEVEL SECURITY;

CREATE INDEX customer_performance_activity_claim_statement_idx
  ON public.customer_performance_activity_claim (statement_id);

-- ---------------------------------------------------------------------------
-- 4) Request-Tabelle: id = Idempotency-Key, Einstiegspunkt fuer finalize/replace
-- ---------------------------------------------------------------------------
CREATE TABLE public.customer_performance_statement_request (
  id                         uuid PRIMARY KEY,
  systemhouse_id             uuid NOT NULL REFERENCES public.systemhouse(id),
  customer_id                uuid NOT NULL,
  period_start               date NOT NULL,
  period_end                 date NOT NULL,
  action                     text NOT NULL CHECK (action IN ('finalize','replace')),
  replaces_statement_id      uuid REFERENCES public.customer_performance_statement(id),
  expected_review_fingerprint text NOT NULL CHECK (expected_review_fingerprint ~ '^[0-9a-f]{64}$'),
  requested_by               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  requested_at               timestamptz NOT NULL DEFAULT now(),
  result_statement_id        uuid REFERENCES public.customer_performance_statement(id),
  CONSTRAINT customer_performance_statement_request_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT customer_performance_statement_request_period_ck CHECK (period_end >= period_start),
  CONSTRAINT customer_performance_statement_request_action_ck CHECK (
    (action = 'finalize' AND replaces_statement_id IS NULL)
    OR (action = 'replace' AND replaces_statement_id IS NOT NULL)
  )
);

REVOKE ALL ON public.customer_performance_statement_request FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.customer_performance_statement_request TO authenticated;
GRANT ALL ON public.customer_performance_statement_request TO service_role;
ALTER TABLE public.customer_performance_statement_request ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) RLS-Policies (Scope: aktiv + Permission + Membership + customer_access read)
-- ---------------------------------------------------------------------------
CREATE POLICY customer_activity_billable_override_read
  ON public.customer_activity_billable_override
  FOR SELECT TO authenticated
  USING (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  );

CREATE POLICY customer_activity_billable_override_insert
  ON public.customer_activity_billable_override
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
    AND changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shared_activity_projection a
      WHERE a.systemhouse_id = customer_activity_billable_override.systemhouse_id
        AND a.customer_id   = customer_activity_billable_override.customer_id
        AND a.source_id     = customer_activity_billable_override.activity_source_id
        AND a.source_revision = customer_activity_billable_override.source_revision
        AND a.source_hash     = customer_activity_billable_override.source_hash
        AND a.billable        = customer_activity_billable_override.source_billable
        AND a.is_active
    )
  );

CREATE POLICY customer_activity_billable_override_update
  ON public.customer_activity_billable_override
  FOR UPDATE TO authenticated
  USING (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  )
  WITH CHECK (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
    AND changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shared_activity_projection a
      WHERE a.systemhouse_id = customer_activity_billable_override.systemhouse_id
        AND a.customer_id   = customer_activity_billable_override.customer_id
        AND a.source_id     = customer_activity_billable_override.activity_source_id
        AND a.source_revision = customer_activity_billable_override.source_revision
        AND a.source_hash     = customer_activity_billable_override.source_hash
        AND a.billable        = customer_activity_billable_override.source_billable
        AND a.is_active
    )
  );

CREATE POLICY customer_performance_statement_request_read
  ON public.customer_performance_statement_request
  FOR SELECT TO authenticated
  USING (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  );

CREATE POLICY customer_performance_statement_request_insert
  ON public.customer_performance_statement_request
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
    AND requested_by = auth.uid()
  );

CREATE POLICY customer_performance_statement_read
  ON public.customer_performance_statement
  FOR SELECT TO authenticated
  USING (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  );

CREATE POLICY customer_performance_statement_item_read
  ON public.customer_performance_statement_item
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_performance_statement s
    WHERE s.id = customer_performance_statement_item.statement_id
      AND public.is_account_active(auth.uid())
      AND public.has_permission(auth.uid(), 'performance.statement.manage')
      AND public.has_active_systemhouse_membership(auth.uid(), s.systemhouse_id)
      AND public.has_customer_access(auth.uid(), s.systemhouse_id, s.customer_id, 'read')
  ));

CREATE POLICY customer_performance_activity_claim_read
  ON public.customer_performance_activity_claim
  FOR SELECT TO authenticated
  USING (
    public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'performance.statement.manage')
    AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  );

-- ---------------------------------------------------------------------------
-- 6) Override-Audittrigger (SECURITY DEFINER, search_path='', trigger-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bsf03b_billable_override_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.bsf03b_billable_override_audit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bsf03b_billable_override_audit() TO service_role;

CREATE TRIGGER customer_activity_billable_override_audit
  AFTER INSERT OR UPDATE ON public.customer_activity_billable_override
  FOR EACH ROW EXECUTE FUNCTION public.bsf03b_billable_override_audit();

-- ---------------------------------------------------------------------------
-- 7) Interne Verarbeitung: BEFORE INSERT auf der Request-Tabelle.
--    SECURITY DEFINER, search_path='', ausschliesslich Triggerbindung.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bsf03b_process_statement_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  SELECT a.source_id, a.source_revision, a.source_hash, a.activity_date,
         a.title, a.duration_hours, a.billable, a.billing_status, a.engineer_id,
         a.work_package_source_id, a.work_package_ref,
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
    activity_date, title_snapshot, duration_hours, source_billable, effective_billable,
    billing_status_snapshot, engineer_id, work_package_source_id,
    work_package_title_snapshot, project_source_id, project_name_snapshot,
    category_key_snapshot, category_label_snapshot
  )
  SELECT v_new_id,
         row_number() OVER (ORDER BY r.source_id),
         r.source_id, r.source_revision, r.source_hash, r.activity_date,
         r.title, r.duration_hours, r.billable, r.effective_billable,
         r.billing_status, r.engineer_id, r.work_package_source_id,
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

  -- Claims: bestehende Anspruchszeilen des Vorgaengers atomar umhaengen,
  -- fehlende neu anlegen. Unique-Key verhindert Doppelnutzung.
  IF NEW.replaces_statement_id IS NOT NULL THEN
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
             || to_char(i.activity_date, 'YYYY-MM-DD') || '|'
             || trim(to_char(i.duration_hours, 'FM9999999990.00')) || '|'
             || CASE WHEN i.effective_billable THEN 'true' ELSE 'false' END AS line
    FROM public.customer_performance_statement_item i
    WHERE i.statement_id = v_new_id
  ) y;

  UPDATE public.customer_performance_statement s
     SET snapshot_hash = v_hash,
         item_count = agg.cnt,
         billable_item_count = agg.bcnt,
         billable_hours = agg.bh,
         non_billable_hours = agg.nbh
    FROM (
      SELECT count(*)::int AS cnt,
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
$function$;

REVOKE ALL ON FUNCTION public.bsf03b_process_statement_request() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bsf03b_process_statement_request() TO service_role;

CREATE TRIGGER customer_performance_statement_request_process
  BEFORE INSERT ON public.customer_performance_statement_request
  FOR EACH ROW EXECUTE FUNCTION public.bsf03b_process_statement_request();