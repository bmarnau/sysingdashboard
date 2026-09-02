-- BSF-02C Phase A — Shared Projection DDL + Grants + RLS (Issue #88, ADR-0032)

-- 1) Identitäts-Guard (SECURITY INVOKER, kein RLS-Bypass)
CREATE OR REPLACE FUNCTION public.bsf02c_projection_identity_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- 2) Project projection
CREATE TABLE public.shared_project_projection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  legacy_client text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  published_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_at timestamptz NOT NULL DEFAULT now(),
  source_revision integer NOT NULL DEFAULT 1,
  source_hash text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_project_projection_source_id_not_empty CHECK (btrim(source_id) <> ''),
  CONSTRAINT shared_project_projection_withdraw_check
    CHECK ((is_active AND withdrawn_at IS NULL) OR (NOT is_active AND withdrawn_at IS NOT NULL)),
  CONSTRAINT shared_project_projection_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT shared_project_projection_identity_unique
    UNIQUE (systemhouse_id, customer_id, source_id),
  CONSTRAINT shared_project_projection_source_collision_unique
    UNIQUE (systemhouse_id, source_id),
  CONSTRAINT shared_project_projection_scope_unique
    UNIQUE (id, systemhouse_id, customer_id)
);

CREATE INDEX shared_project_projection_scope_idx
  ON public.shared_project_projection (systemhouse_id, customer_id) WHERE is_active;

-- 3) WorkPackage projection
CREATE TABLE public.shared_work_package_projection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  project_ref uuid,
  project_source_id text,
  parent_link_status text NOT NULL DEFAULT 'none',
  title text NOT NULL DEFAULT '',
  legacy_client text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT '',
  published_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_at timestamptz NOT NULL DEFAULT now(),
  source_revision integer NOT NULL DEFAULT 1,
  source_hash text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_work_package_projection_source_id_not_empty CHECK (btrim(source_id) <> ''),
  CONSTRAINT shared_work_package_projection_parent_status_check
    CHECK (parent_link_status IN ('none', 'linked')),
  CONSTRAINT shared_work_package_projection_parent_consistency_check
    CHECK ((parent_link_status = 'linked' AND project_ref IS NOT NULL)
        OR (parent_link_status = 'none' AND project_ref IS NULL)),
  CONSTRAINT shared_work_package_projection_withdraw_check
    CHECK ((is_active AND withdrawn_at IS NULL) OR (NOT is_active AND withdrawn_at IS NOT NULL)),
  CONSTRAINT shared_work_package_projection_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT shared_work_package_projection_parent_fk
    FOREIGN KEY (project_ref, systemhouse_id, customer_id)
    REFERENCES public.shared_project_projection(id, systemhouse_id, customer_id) ON DELETE RESTRICT,
  CONSTRAINT shared_work_package_projection_identity_unique
    UNIQUE (systemhouse_id, customer_id, source_id),
  CONSTRAINT shared_work_package_projection_source_collision_unique
    UNIQUE (systemhouse_id, source_id),
  CONSTRAINT shared_work_package_projection_scope_unique
    UNIQUE (id, systemhouse_id, customer_id)
);

CREATE INDEX shared_work_package_projection_scope_idx
  ON public.shared_work_package_projection (systemhouse_id, customer_id) WHERE is_active;

-- 4) Activity projection
CREATE TABLE public.shared_activity_projection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  work_package_ref uuid,
  work_package_source_id text,
  parent_link_status text NOT NULL DEFAULT 'none',
  engineer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL DEFAULT '',
  legacy_client text NOT NULL DEFAULT '',
  activity_date date NOT NULL DEFAULT current_date,
  duration_hours numeric(10,2) NOT NULL DEFAULT 0,
  billable boolean NOT NULL DEFAULT false,
  billing_status text NOT NULL DEFAULT '',
  published_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_at timestamptz NOT NULL DEFAULT now(),
  source_revision integer NOT NULL DEFAULT 1,
  source_hash text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_activity_projection_source_id_not_empty CHECK (btrim(source_id) <> ''),
  CONSTRAINT shared_activity_projection_parent_status_check
    CHECK (parent_link_status IN ('none', 'linked')),
  CONSTRAINT shared_activity_projection_parent_consistency_check
    CHECK ((parent_link_status = 'linked' AND work_package_ref IS NOT NULL)
        OR (parent_link_status = 'none' AND work_package_ref IS NULL)),
  CONSTRAINT shared_activity_projection_duration_check CHECK (duration_hours >= 0),
  CONSTRAINT shared_activity_projection_withdraw_check
    CHECK ((is_active AND withdrawn_at IS NULL) OR (NOT is_active AND withdrawn_at IS NOT NULL)),
  CONSTRAINT shared_activity_projection_customer_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id) ON DELETE RESTRICT,
  CONSTRAINT shared_activity_projection_parent_fk
    FOREIGN KEY (work_package_ref, systemhouse_id, customer_id)
    REFERENCES public.shared_work_package_projection(id, systemhouse_id, customer_id) ON DELETE RESTRICT,
  CONSTRAINT shared_activity_projection_identity_unique
    UNIQUE (systemhouse_id, customer_id, source_id),
  CONSTRAINT shared_activity_projection_source_collision_unique
    UNIQUE (systemhouse_id, source_id),
  CONSTRAINT shared_activity_projection_scope_unique
    UNIQUE (id, systemhouse_id, customer_id)
);

CREATE INDEX shared_activity_projection_scope_idx
  ON public.shared_activity_projection (systemhouse_id, customer_id) WHERE is_active;

CREATE INDEX shared_activity_projection_engineer_idx
  ON public.shared_activity_projection (engineer_id);

-- 5) Trigger (bestehender set_updated_at Helper + Identity Guard)
CREATE TRIGGER shared_project_projection_set_updated_at
  BEFORE UPDATE ON public.shared_project_projection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_project_projection_identity_guard
  BEFORE UPDATE ON public.shared_project_projection
  FOR EACH ROW EXECUTE FUNCTION public.bsf02c_projection_identity_guard();

CREATE TRIGGER shared_work_package_projection_set_updated_at
  BEFORE UPDATE ON public.shared_work_package_projection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_work_package_projection_identity_guard
  BEFORE UPDATE ON public.shared_work_package_projection
  FOR EACH ROW EXECUTE FUNCTION public.bsf02c_projection_identity_guard();

CREATE TRIGGER shared_activity_projection_set_updated_at
  BEFORE UPDATE ON public.shared_activity_projection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_activity_projection_identity_guard
  BEFORE UPDATE ON public.shared_activity_projection
  FOR EACH ROW EXECUTE FUNCTION public.bsf02c_projection_identity_guard();

-- 6) Grants (least privilege)
REVOKE ALL ON public.shared_project_projection FROM PUBLIC;
REVOKE ALL ON public.shared_work_package_projection FROM PUBLIC;
REVOKE ALL ON public.shared_activity_projection FROM PUBLIC;
REVOKE ALL ON public.shared_project_projection FROM anon;
REVOKE ALL ON public.shared_work_package_projection FROM anon;
REVOKE ALL ON public.shared_activity_projection FROM anon;
REVOKE ALL ON public.shared_project_projection FROM authenticated;
REVOKE ALL ON public.shared_work_package_projection FROM authenticated;
REVOKE ALL ON public.shared_activity_projection FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.shared_project_projection TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shared_work_package_projection TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shared_activity_projection TO authenticated;
GRANT ALL ON public.shared_project_projection TO service_role;
GRANT ALL ON public.shared_work_package_projection TO service_role;
GRANT ALL ON public.shared_activity_projection TO service_role;

-- 7) RLS
ALTER TABLE public.shared_project_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_work_package_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_activity_projection ENABLE ROW LEVEL SECURITY;

-- READ
CREATE POLICY "shared_project_projection_read"
ON public.shared_project_projection FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  AND public.has_permission(auth.uid(), 'dashboard.view')
);

CREATE POLICY "shared_work_package_projection_read"
ON public.shared_work_package_projection FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  AND public.has_permission(auth.uid(), 'dashboard.view')
);

CREATE POLICY "shared_activity_projection_read"
ON public.shared_activity_projection FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'read')
  AND public.has_permission(auth.uid(), 'dashboard.view')
);

-- WRITE: Project
CREATE POLICY "shared_project_projection_insert"
ON public.shared_project_projection FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
);

CREATE POLICY "shared_project_projection_update"
ON public.shared_project_projection FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
);

-- WRITE: WorkPackage (project.edit erforderlich; workpackage.edit allein reicht nicht)
CREATE POLICY "shared_work_package_projection_insert"
ON public.shared_work_package_projection FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
);

CREATE POLICY "shared_work_package_projection_update"
ON public.shared_work_package_projection FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'project.edit')
);

-- WRITE: Activity (nur eigene engineer_id)
CREATE POLICY "shared_activity_projection_insert"
ON public.shared_activity_projection FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND engineer_id = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'activity.edit')
);

CREATE POLICY "shared_activity_projection_update"
ON public.shared_activity_projection FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND engineer_id = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'activity.edit')
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND published_by = auth.uid()
  AND engineer_id = auth.uid()
  AND public.is_account_active(auth.uid())
  AND public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
  AND public.has_customer_access(auth.uid(), systemhouse_id, customer_id, 'write')
  AND public.has_permission(auth.uid(), 'activity.edit')
);