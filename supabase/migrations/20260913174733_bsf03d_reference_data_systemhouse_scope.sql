-- BSF-03D — Arbeitspaket-Kategorien als systemhausbezogene Reference Data
-- Issue #103
-- Additiv und rueckwaertskompatibel: bestehende Kataloge/Werte bleiben global.

-- ---------------------------------------------------------------------
-- 1. Scope-Metadaten
-- ---------------------------------------------------------------------
ALTER TABLE public.reference_catalog
  ADD COLUMN scope_type text NOT NULL DEFAULT 'global';

ALTER TABLE public.reference_catalog
  ADD CONSTRAINT reference_catalog_scope_type_check
  CHECK (scope_type IN ('global', 'systemhouse'));

ALTER TABLE public.reference_value
  ADD COLUMN systemhouse_id uuid NULL;

ALTER TABLE public.reference_value
  ADD CONSTRAINT reference_value_systemhouse_fk
  FOREIGN KEY (systemhouse_id)
  REFERENCES public.systemhouse(id)
  ON DELETE RESTRICT;

ALTER TABLE public.reference_value_history
  ADD COLUMN systemhouse_id uuid NULL;

ALTER TABLE public.reference_value_history
  ADD CONSTRAINT reference_value_history_systemhouse_fk
  FOREIGN KEY (systemhouse_id)
  REFERENCES public.systemhouse(id)
  ON DELETE RESTRICT;

-- Bisher war der Key nur je Katalog eindeutig. Fuer systemhausbezogene
-- Kataloge ist derselbe technische Key in verschiedenen Systemhaeusern
-- erlaubt, innerhalb eines Systemhauses aber weiterhin eindeutig.
ALTER TABLE public.reference_value
  DROP CONSTRAINT reference_value_catalog_id_key_key;

CREATE UNIQUE INDEX reference_value_global_key_unique
  ON public.reference_value(catalog_id, key)
  WHERE systemhouse_id IS NULL;

CREATE UNIQUE INDEX reference_value_systemhouse_key_unique
  ON public.reference_value(catalog_id, systemhouse_id, key)
  WHERE systemhouse_id IS NOT NULL;

CREATE INDEX reference_value_systemhouse_idx
  ON public.reference_value(systemhouse_id, catalog_id, sort_order)
  WHERE systemhouse_id IS NOT NULL;

CREATE INDEX reference_value_history_systemhouse_idx
  ON public.reference_value_history(systemhouse_id, changed_at DESC)
  WHERE systemhouse_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Katalog workpackage.category
-- ---------------------------------------------------------------------
INSERT INTO public.reference_catalog (
  key,
  name,
  description,
  domain,
  is_system,
  is_hierarchical,
  version,
  scope_type
)
SELECT
  'workpackage.category',
  'Arbeitspaket-Kategorien',
  'Systemhausweite, editierbare Hauptklassifikation fuer Arbeitspakete.',
  'project',
  false,
  false,
  1,
  'systemhouse'
WHERE NOT EXISTS (
  SELECT 1 FROM public.reference_catalog WHERE key = 'workpackage.category'
);

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.reference_catalog
    WHERE key = 'workpackage.category'
      AND scope_type = 'systemhouse'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'workpackage.category must be a systemhouse-scoped catalog';
  END IF;
END
$do$;

-- ---------------------------------------------------------------------
-- 3. Scope-Integritaet auf Reference Values
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reference_value_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_catalog_key text;
  v_scope_type text;
BEGIN
  SELECT c.key, c.scope_type
    INTO v_catalog_key, v_scope_type
    FROM public.reference_catalog c
   WHERE c.id = NEW.catalog_id;

  IF v_scope_type IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'reference catalog does not exist';
  END IF;

  IF v_scope_type = 'global' AND NEW.systemhouse_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'global reference values must not have systemhouse_id';
  END IF;

  IF v_scope_type = 'systemhouse' AND NEW.systemhouse_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'systemhouse reference values require systemhouse_id';
  END IF;

  -- Ein Reference Value darf nach Anlage nicht zwischen Tenants verschoben
  -- werden. Fuer Arbeitspaket-Kategorien ist auch der technische Key stabil.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.catalog_id IS DISTINCT FROM NEW.catalog_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'reference value catalog_id is immutable';
    END IF;

    IF OLD.systemhouse_id IS DISTINCT FROM NEW.systemhouse_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'reference value systemhouse_id is immutable';
    END IF;

    IF v_catalog_key = 'workpackage.category' AND OLD.key IS DISTINCT FROM NEW.key THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'workpackage category key is immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reference_value_validate_scope ON public.reference_value;
CREATE TRIGGER reference_value_validate_scope
  BEFORE INSERT OR UPDATE ON public.reference_value
  FOR EACH ROW
  EXECUTE FUNCTION public.reference_value_validate_scope();

REVOKE ALL ON FUNCTION public.reference_value_validate_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reference_value_validate_scope() FROM anon;
REVOKE ALL ON FUNCTION public.reference_value_validate_scope() FROM authenticated;

-- ---------------------------------------------------------------------
-- 4. Historie/Audit um systemhouse_id erweitern
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reference_value_track_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.reference_value_history (
    value_id,
    catalog_id,
    systemhouse_id,
    operation,
    snapshot,
    changed_by
  )
  VALUES (
    NEW.id,
    NEW.catalog_id,
    NEW.systemhouse_id,
    lower(TG_OP),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    auth.uid()
  );

  UPDATE public.reference_catalog
     SET version = version + 1
   WHERE id = NEW.catalog_id;

  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'reference_value.' || lower(TG_OP),
    NEW.id::text,
    auth.uid(),
    jsonb_build_object(
      'catalog_id', NEW.catalog_id,
      'systemhouse_id', NEW.systemhouse_id,
      'key', NEW.key,
      'is_active', NEW.is_active
    )
  );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.reference_value_track_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reference_value_track_change() FROM anon;
REVOKE ALL ON FUNCTION public.reference_value_track_change() FROM authenticated;

-- ---------------------------------------------------------------------
-- 5. Tenant-faehige RLS-Policies bei unveraendertem Grant-Envelope
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS reference_value_read ON public.reference_value;
DROP POLICY IF EXISTS reference_value_insert ON public.reference_value;
DROP POLICY IF EXISTS reference_value_update ON public.reference_value;

CREATE POLICY reference_value_read ON public.reference_value
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.view')
    AND (
      systemhouse_id IS NULL
      OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    )
  );

CREATE POLICY reference_value_insert ON public.reference_value
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (
      systemhouse_id IS NULL
      OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    )
  );

CREATE POLICY reference_value_update ON public.reference_value
  FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (
      systemhouse_id IS NULL
      OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (
      systemhouse_id IS NULL
      OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    )
  );

DROP POLICY IF EXISTS reference_value_history_read ON public.reference_value_history;
CREATE POLICY reference_value_history_read ON public.reference_value_history
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (
      systemhouse_id IS NULL
      OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
    )
  );

-- SEC-02 Least-Privilege-Grants explizit beibehalten.
REVOKE ALL ON TABLE public.reference_catalog FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reference_value FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reference_value_history FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.reference_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reference_value TO authenticated;
GRANT SELECT ON TABLE public.reference_value_history TO authenticated;

GRANT ALL ON TABLE public.reference_catalog TO service_role;
GRANT ALL ON TABLE public.reference_value TO service_role;
GRANT ALL ON TABLE public.reference_value_history TO service_role;
