-- BSF-03D (#103) — Reference Data: Systemhaus-Scope + Katalog `workpackage.category`
--
-- Rekonstruiert die in der Live-DB bereits vorhandene Scope-Grundlage als
-- idempotente Repo-Migration. Sicher auf alter DB (ohne Scope-Spalten) und auf
-- bereits vorgezogener DB: ausschließlich additiv, IF NOT EXISTS /
-- CREATE OR REPLACE / ON CONFLICT DO NOTHING, keine Datenlöschung, keine
-- Service-Role, keine Verbreiterung bestehender Rechte.
--
-- Vertrag:
--   * reference_catalog.scope_type ∈ {'global','systemhouse'}, Default 'global'
--     (alle AVKK-Kataloge bleiben global).
--   * reference_value.systemhouse_id: NULL bei global, Pflicht bei systemhouse
--     (Trigger reference_value_validate_scope, Key-Immutabilität für
--     workpackage.category).
--   * Eindeutigkeit: (catalog_id,key) global bzw. (catalog_id,systemhouse_id,key).
--   * RLS: bestehende Permission-Gates (referencedata.view/manage) UND aktive
--     Systemhaus-Membership für systemhausbezogene Werte. Keine neue Permission.

-- 1) Katalog-Scope
ALTER TABLE public.reference_catalog
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'global';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'reference_catalog_scope_type_check'
       AND conrelid = 'public.reference_catalog'::regclass
  ) THEN
    ALTER TABLE public.reference_catalog
      ADD CONSTRAINT reference_catalog_scope_type_check
      CHECK (scope_type IN ('global', 'systemhouse'));
  END IF;
END $$;

-- 2) Wert-Scope
ALTER TABLE public.reference_value
  ADD COLUMN IF NOT EXISTS systemhouse_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reference_value_systemhouse_fk'
  ) THEN
    ALTER TABLE public.reference_value
      ADD CONSTRAINT reference_value_systemhouse_fk
      FOREIGN KEY (systemhouse_id) REFERENCES public.systemhouse(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.reference_value
  DROP CONSTRAINT IF EXISTS reference_value_catalog_id_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS reference_value_global_key_unique
  ON public.reference_value (catalog_id, key)
  WHERE systemhouse_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reference_value_systemhouse_key_unique
  ON public.reference_value (catalog_id, systemhouse_id, key)
  WHERE systemhouse_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reference_value_systemhouse_idx
  ON public.reference_value (systemhouse_id, catalog_id, sort_order)
  WHERE systemhouse_id IS NOT NULL;

-- 3) Historie
ALTER TABLE public.reference_value_history
  ADD COLUMN IF NOT EXISTS systemhouse_id uuid;

CREATE INDEX IF NOT EXISTS reference_value_history_systemhouse_idx
  ON public.reference_value_history (systemhouse_id, changed_at DESC)
  WHERE systemhouse_id IS NOT NULL;

-- 4) Scope-Validierung (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.reference_value_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.reference_value_validate_scope() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS reference_value_validate_scope ON public.reference_value;
CREATE TRIGGER reference_value_validate_scope
  BEFORE INSERT OR UPDATE ON public.reference_value
  FOR EACH ROW EXECUTE FUNCTION public.reference_value_validate_scope();

-- 5) Historie/Audit um Systemhaus ergänzen (bestehender SECURITY DEFINER, search_path leer)
CREATE OR REPLACE FUNCTION public.reference_value_track_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.reference_value_track_change() FROM PUBLIC, anon;

-- 6) RLS: Membership-Bindung für systemhausbezogene Werte
DROP POLICY IF EXISTS reference_value_read ON public.reference_value;
CREATE POLICY reference_value_read ON public.reference_value
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.view')
    AND (systemhouse_id IS NULL OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id))
  );

DROP POLICY IF EXISTS reference_value_insert ON public.reference_value;
CREATE POLICY reference_value_insert ON public.reference_value
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (systemhouse_id IS NULL OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id))
  );

DROP POLICY IF EXISTS reference_value_update ON public.reference_value;
CREATE POLICY reference_value_update ON public.reference_value
  FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (systemhouse_id IS NULL OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id))
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (systemhouse_id IS NULL OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id))
  );

DROP POLICY IF EXISTS reference_value_history_read ON public.reference_value_history;
CREATE POLICY reference_value_history_read ON public.reference_value_history
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'referencedata.manage')
    AND (systemhouse_id IS NULL OR public.has_active_systemhouse_membership(auth.uid(), systemhouse_id))
  );

-- 7) Katalog `workpackage.category` (systemhausweit, editierbar, ohne Seed-Werte)
INSERT INTO public.reference_catalog (key, name, description, domain, is_system, is_hierarchical, scope_type)
VALUES (
  'workpackage.category',
  'Arbeitspaket-Kategorien',
  'Systemhausweite, editierbare Hauptklassifikation fuer Arbeitspakete.',
  'project',
  false,
  false,
  'systemhouse'
)
ON CONFLICT (key) DO NOTHING;