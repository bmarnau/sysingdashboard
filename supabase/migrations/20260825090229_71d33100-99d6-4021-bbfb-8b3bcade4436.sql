-- =========================================================
-- BSF-02B: Systemhouse-Membership- / Customer-Access-DDL und RLS
-- Fail-closed: Tabellen werden angelegt, sofort RLS-geschützt,
-- Policies und authenticated-Grants folgen erst danach.
-- =========================================================

-- ---------- Stufe 1: systemhouse + customer ----------

CREATE TABLE public.systemhouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT systemhouse_status_check CHECK (status IN ('active','inactive'))
);

ALTER TABLE public.systemhouse ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.systemhouse FROM PUBLIC;
REVOKE ALL ON public.systemhouse FROM anon;
REVOKE ALL ON public.systemhouse FROM authenticated;
GRANT ALL ON public.systemhouse TO service_role;

CREATE TABLE public.customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_status_check CHECK (status IN ('active','inactive')),
  CONSTRAINT customer_systemhouse_fk FOREIGN KEY (systemhouse_id)
    REFERENCES public.systemhouse (id) ON DELETE RESTRICT,
  CONSTRAINT customer_id_systemhouse_unique UNIQUE (id, systemhouse_id)
);

CREATE INDEX customer_systemhouse_idx ON public.customer (systemhouse_id);

ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer FROM PUBLIC;
REVOKE ALL ON public.customer FROM anon;
REVOKE ALL ON public.customer FROM authenticated;
GRANT ALL ON public.customer TO service_role;

-- ---------- Stufe 2: membership + customer_access ----------

CREATE TABLE public.systemhouse_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  valid_from timestamptz NULL,
  valid_to timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT systemhouse_membership_status_check CHECK (status IN ('active','inactive')),
  CONSTRAINT systemhouse_membership_window_check CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT systemhouse_membership_systemhouse_fk FOREIGN KEY (systemhouse_id)
    REFERENCES public.systemhouse (id) ON DELETE RESTRICT,
  CONSTRAINT systemhouse_membership_user_fk FOREIGN KEY (user_id)
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT systemhouse_membership_unique UNIQUE (systemhouse_id, user_id)
);

CREATE INDEX systemhouse_membership_user_idx ON public.systemhouse_membership (user_id);

ALTER TABLE public.systemhouse_membership ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.systemhouse_membership FROM PUBLIC;
REVOKE ALL ON public.systemhouse_membership FROM anon;
REVOKE ALL ON public.systemhouse_membership FROM authenticated;
GRANT ALL ON public.systemhouse_membership TO service_role;

CREATE TABLE public.customer_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  systemhouse_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  access_level text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  valid_from timestamptz NULL,
  valid_to timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_access_level_check CHECK (access_level IN ('read','write')),
  CONSTRAINT customer_access_status_check CHECK (status IN ('active','inactive')),
  CONSTRAINT customer_access_window_check CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT customer_access_customer_fk FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer (id, systemhouse_id) ON DELETE CASCADE,
  CONSTRAINT customer_access_user_fk FOREIGN KEY (user_id)
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT customer_access_unique UNIQUE (systemhouse_id, customer_id, user_id)
);

CREATE INDEX customer_access_user_idx ON public.customer_access (user_id);
CREATE INDEX customer_access_scope_idx ON public.customer_access (systemhouse_id, customer_id);

ALTER TABLE public.customer_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_access FROM PUBLIC;
REVOKE ALL ON public.customer_access FROM anon;
REVOKE ALL ON public.customer_access FROM authenticated;
GRANT ALL ON public.customer_access TO service_role;

-- updated_at: bestehende Funktion wiederverwenden
CREATE TRIGGER systemhouse_set_updated_at BEFORE UPDATE ON public.systemhouse
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customer_set_updated_at BEFORE UPDATE ON public.customer
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER systemhouse_membership_set_updated_at BEFORE UPDATE ON public.systemhouse_membership
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customer_access_set_updated_at BEFORE UPDATE ON public.customer_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Stufe 3: Autorisierungshelfer ----------

CREATE OR REPLACE FUNCTION public.has_active_systemhouse_membership(
  _user_id uuid,
  _systemhouse_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.has_customer_access(
  _user_id uuid,
  _systemhouse_id uuid,
  _customer_id uuid,
  _required_level text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
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

REVOKE EXECUTE ON FUNCTION public.has_active_systemhouse_membership(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_systemhouse_membership(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_systemhouse_membership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_systemhouse_membership(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.has_customer_access(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_customer_access(uuid, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_customer_access(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_customer_access(uuid, uuid, uuid, text) TO service_role;

-- ---------- Stufe 4: self-only Policies, dann Scope-Policies, dann Grants ----------

CREATE POLICY "membership_select_own"
  ON public.systemhouse_membership FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customer_access_select_own"
  ON public.customer_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "systemhouse_select_member"
  ON public.systemhouse FOR SELECT TO authenticated
  USING (public.has_active_systemhouse_membership(auth.uid(), id));

CREATE POLICY "customer_select_scoped"
  ON public.customer FOR SELECT TO authenticated
  USING (public.has_customer_access(auth.uid(), systemhouse_id, id, 'read'));

GRANT SELECT ON public.systemhouse TO authenticated;
GRANT SELECT ON public.customer TO authenticated;
GRANT SELECT ON public.systemhouse_membership TO authenticated;
GRANT SELECT ON public.customer_access TO authenticated;