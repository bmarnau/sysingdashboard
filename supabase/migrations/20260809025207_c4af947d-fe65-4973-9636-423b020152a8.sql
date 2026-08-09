-- =====================================================================
-- Sprint 07B — Reference Data (Plattformdienst) + AVKK-Fachmodell
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Permissions erweitern (has_permission ist SSoT in der DB)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        (ur.role = 'systemadministrator') OR
        (ur.role = 'administrator' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit',
          'azure.connection.test','azure.export','azure.import',
          'backup.restore','users.manage','auditlog.view',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view','referencedata.manage'
        )) OR
        (ur.role = 'teamlead' AND _perm IN (
          'dashboard.view','documentation.view','systemstatus.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view'
        )) OR
        (ur.role = 'projectmanager' AND _perm IN (
          'dashboard.view','documentation.view',
          'project.edit','workpackage.edit','activity.edit','azure.export',
          'avkk.view','avkk.edit','avkk.responsibility.assign',
          'avkk.management.view','referencedata.view'
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
        ))
      )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------
-- 2. Reference Data
-- ---------------------------------------------------------------
CREATE TABLE public.reference_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  domain text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_hierarchical boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reference_catalog TO authenticated;
GRANT ALL ON public.reference_catalog TO service_role;
ALTER TABLE public.reference_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_catalog_read ON public.reference_catalog
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'referencedata.view'));
CREATE POLICY reference_catalog_insert ON public.reference_catalog
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'referencedata.manage'));
CREATE POLICY reference_catalog_update ON public.reference_catalog
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'referencedata.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'referencedata.manage'));

CREATE TRIGGER reference_catalog_set_updated_at
  BEFORE UPDATE ON public.reference_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reference_value (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.reference_catalog(id) ON DELETE RESTRICT,
  key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  parent_value_id uuid REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, key)
);

CREATE INDEX reference_value_catalog_idx ON public.reference_value (catalog_id, sort_order);

GRANT SELECT, INSERT, UPDATE ON public.reference_value TO authenticated;
GRANT ALL ON public.reference_value TO service_role;
ALTER TABLE public.reference_value ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_value_read ON public.reference_value
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'referencedata.view'));
CREATE POLICY reference_value_insert ON public.reference_value
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'referencedata.manage'));
CREATE POLICY reference_value_update ON public.reference_value
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'referencedata.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'referencedata.manage'));

CREATE TRIGGER reference_value_set_updated_at
  BEFORE UPDATE ON public.reference_value
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reference_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_id uuid NOT NULL,
  catalog_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('insert','update')),
  snapshot jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reference_value_history_value_idx ON public.reference_value_history (value_id, changed_at DESC);

GRANT SELECT ON public.reference_value_history TO authenticated;
GRANT ALL ON public.reference_value_history TO service_role;
ALTER TABLE public.reference_value_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_value_history_read ON public.reference_value_history
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'referencedata.manage'));
CREATE POLICY reference_value_history_block_insert ON public.reference_value_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- Historie + Katalogversion + zentrales Audit
CREATE OR REPLACE FUNCTION public.reference_value_track_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.reference_value_history (value_id, catalog_id, operation, snapshot, changed_by)
  VALUES (
    NEW.id,
    NEW.catalog_id,
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
    jsonb_build_object('catalog_id', NEW.catalog_id, 'key', NEW.key, 'is_active', NEW.is_active)
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER reference_value_track
  AFTER INSERT OR UPDATE ON public.reference_value
  FOR EACH ROW EXECUTE FUNCTION public.reference_value_track_change();

-- ---------------------------------------------------------------
-- 3. AVKK
-- ---------------------------------------------------------------
CREATE TABLE public.avkk_subject (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('project','workpackage','activity','measure')),
  subject_id text NOT NULL,
  subject_title_snapshot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);

GRANT SELECT, INSERT, UPDATE ON public.avkk_subject TO authenticated;
GRANT ALL ON public.avkk_subject TO service_role;
ALTER TABLE public.avkk_subject ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER avkk_subject_set_updated_at
  BEFORE UPDATE ON public.avkk_subject
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.avkk_responsibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avkk_subject_id uuid NOT NULL REFERENCES public.avkk_subject(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  role_key_snapshot text NOT NULL,
  role_label_snapshot text NOT NULL,
  note text NOT NULL DEFAULT '',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avkk_responsibility_subject_idx ON public.avkk_responsibility (avkk_subject_id);
CREATE INDEX avkk_responsibility_person_idx ON public.avkk_responsibility (person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avkk_responsibility TO authenticated;
GRANT ALL ON public.avkk_responsibility TO service_role;
ALTER TABLE public.avkk_responsibility ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER avkk_responsibility_set_updated_at
  BEFORE UPDATE ON public.avkk_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.avkk_responsibility_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsibility_id uuid NOT NULL REFERENCES public.avkk_responsibility(id) ON DELETE CASCADE,
  type_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  type_key_snapshot text NOT NULL,
  type_label_snapshot text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (responsibility_id, type_value_id)
);

GRANT SELECT, INSERT, DELETE ON public.avkk_responsibility_type TO authenticated;
GRANT ALL ON public.avkk_responsibility_type TO service_role;
ALTER TABLE public.avkk_responsibility_type ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.avkk_competence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avkk_subject_id uuid NOT NULL REFERENCES public.avkk_subject(id) ON DELETE CASCADE,
  dimension_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  dimension_key_snapshot text NOT NULL,
  dimension_label_snapshot text NOT NULL,
  rating_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  rating_key_snapshot text NOT NULL,
  rating_label_snapshot text NOT NULL,
  support_needed boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  superseded_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avkk_competence_subject_idx ON public.avkk_competence (avkk_subject_id, superseded_at);

GRANT SELECT, INSERT, UPDATE ON public.avkk_competence TO authenticated;
GRANT ALL ON public.avkk_competence TO service_role;
ALTER TABLE public.avkk_competence ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER avkk_competence_set_updated_at
  BEFORE UPDATE ON public.avkk_competence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.avkk_consequence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avkk_subject_id uuid NOT NULL REFERENCES public.avkk_subject(id) ON DELETE CASCADE,
  area_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  area_key_snapshot text NOT NULL,
  area_label_snapshot text NOT NULL,
  severity_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  severity_key_snapshot text NOT NULL,
  severity_label_snapshot text NOT NULL,
  schedule_impact_value_id uuid NOT NULL REFERENCES public.reference_value(id) ON DELETE RESTRICT,
  schedule_impact_key_snapshot text NOT NULL,
  schedule_impact_label_snapshot text NOT NULL,
  description text NOT NULL DEFAULT '',
  superseded_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX avkk_consequence_subject_idx ON public.avkk_consequence (avkk_subject_id, superseded_at);

GRANT SELECT, INSERT, UPDATE ON public.avkk_consequence TO authenticated;
GRANT ALL ON public.avkk_consequence TO service_role;
ALTER TABLE public.avkk_consequence ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER avkk_consequence_set_updated_at
  BEFORE UPDATE ON public.avkk_consequence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Schreibrecht inkl. Engineer-Einschränkung (rekursionsfrei via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.avkk_can_write(_subject uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_permission(auth.uid(), 'avkk.edit')
     AND (
       NOT public.has_role(auth.uid(), 'engineer'::public.app_role)
       OR EXISTS (
         SELECT 1 FROM public.avkk_subject s
          WHERE s.id = _subject AND s.created_by = auth.uid()
       )
       OR EXISTS (
         SELECT 1 FROM public.avkk_responsibility r
          WHERE r.avkk_subject_id = _subject AND r.person_id = auth.uid()
       )
     );
$function$;

REVOKE EXECUTE ON FUNCTION public.avkk_can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avkk_can_write(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.avkk_responsibility_subject(_responsibility uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT r.avkk_subject_id FROM public.avkk_responsibility r WHERE r.id = _responsibility;
$function$;

REVOKE EXECUTE ON FUNCTION public.avkk_responsibility_subject(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avkk_responsibility_subject(uuid) TO authenticated, service_role;

-- Policies: avkk_subject
CREATE POLICY avkk_subject_read ON public.avkk_subject
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.view'));
CREATE POLICY avkk_subject_insert ON public.avkk_subject
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'avkk.edit') AND created_by = auth.uid());
CREATE POLICY avkk_subject_update ON public.avkk_subject
  FOR UPDATE TO authenticated
  USING (public.avkk_can_write(id))
  WITH CHECK (public.avkk_can_write(id));

-- Policies: avkk_responsibility (Zuweisung braucht eigenes Recht)
CREATE POLICY avkk_responsibility_read ON public.avkk_responsibility
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.view'));
CREATE POLICY avkk_responsibility_insert ON public.avkk_responsibility
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND created_by = auth.uid()
  );
CREATE POLICY avkk_responsibility_update ON public.avkk_responsibility
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.responsibility.assign'))
  WITH CHECK (public.has_permission(auth.uid(), 'avkk.responsibility.assign'));
CREATE POLICY avkk_responsibility_delete ON public.avkk_responsibility
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.responsibility.assign'));

CREATE POLICY avkk_responsibility_type_read ON public.avkk_responsibility_type
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.view'));
CREATE POLICY avkk_responsibility_type_insert ON public.avkk_responsibility_type
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'avkk.responsibility.assign'));
CREATE POLICY avkk_responsibility_type_delete ON public.avkk_responsibility_type
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.responsibility.assign'));

-- Policies: avkk_competence
CREATE POLICY avkk_competence_read ON public.avkk_competence
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.view'));
CREATE POLICY avkk_competence_insert ON public.avkk_competence
  FOR INSERT TO authenticated
  WITH CHECK (public.avkk_can_write(avkk_subject_id) AND created_by = auth.uid());
CREATE POLICY avkk_competence_update ON public.avkk_competence
  FOR UPDATE TO authenticated
  USING (public.avkk_can_write(avkk_subject_id))
  WITH CHECK (public.avkk_can_write(avkk_subject_id));

-- Policies: avkk_consequence
CREATE POLICY avkk_consequence_read ON public.avkk_consequence
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'avkk.view'));
CREATE POLICY avkk_consequence_insert ON public.avkk_consequence
  FOR INSERT TO authenticated
  WITH CHECK (public.avkk_can_write(avkk_subject_id) AND created_by = auth.uid());
CREATE POLICY avkk_consequence_update ON public.avkk_consequence
  FOR UPDATE TO authenticated
  USING (public.avkk_can_write(avkk_subject_id))
  WITH CHECK (public.avkk_can_write(avkk_subject_id));

-- Audit für AVKK-Tabellen
CREATE OR REPLACE FUNCTION public.avkk_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE TRIGGER avkk_subject_audit AFTER INSERT OR UPDATE ON public.avkk_subject
  FOR EACH ROW EXECUTE FUNCTION public.avkk_audit_change();
CREATE TRIGGER avkk_responsibility_audit AFTER INSERT OR UPDATE OR DELETE ON public.avkk_responsibility
  FOR EACH ROW EXECUTE FUNCTION public.avkk_audit_change();
CREATE TRIGGER avkk_responsibility_type_audit AFTER INSERT OR DELETE ON public.avkk_responsibility_type
  FOR EACH ROW EXECUTE FUNCTION public.avkk_audit_change();
CREATE TRIGGER avkk_competence_audit AFTER INSERT OR UPDATE ON public.avkk_competence
  FOR EACH ROW EXECUTE FUNCTION public.avkk_audit_change();
CREATE TRIGGER avkk_consequence_audit AFTER INSERT OR UPDATE ON public.avkk_consequence
  FOR EACH ROW EXECUTE FUNCTION public.avkk_audit_change();

-- ---------------------------------------------------------------
-- 4. Seeds: AVKK-Kataloge (wertegleich zu docs/AVKK.md)
-- ---------------------------------------------------------------
INSERT INTO public.reference_catalog (key, name, description, domain, is_system) VALUES
  ('avkk.responsibility_type', 'Verantwortungsarten', 'Art der Verantwortung je Aufgabe', 'avkk', true),
  ('avkk.responsibility_role', 'Verantwortungsrollen', 'Verantwortlicher oder Stellvertreter', 'avkk', true),
  ('avkk.competence_dimension', 'Kompetenzdimensionen', 'Dimensionen der Umsetzbarkeit', 'avkk', true),
  ('avkk.competence_rating', 'Kompetenzbewertungen', 'Bewertung je Kompetenzdimension', 'avkk', true),
  ('avkk.consequence_area', 'Konsequenzbereiche', 'Betroffene Bereiche bei Nichterfüllung', 'avkk', true),
  ('avkk.consequence_severity', 'Konsequenz-Schweregrade', 'Schweregrad der Auswirkung', 'avkk', true),
  ('avkk.schedule_impact', 'Terminwirkungen', 'Auswirkung auf Termine', 'avkk', true);

INSERT INTO public.reference_value (catalog_id, key, label, sort_order, is_default, attributes)
SELECT c.id, v.key, v.label, v.sort_order, v.is_default, v.attributes
FROM public.reference_catalog c
JOIN (VALUES
  ('avkk.responsibility_type','result','Ergebnis',10,true,'{}'::jsonb),
  ('avkk.responsibility_type','deadline','Termin',20,false,'{}'::jsonb),
  ('avkk.responsibility_type','quality','Qualität',30,false,'{}'::jsonb),
  ('avkk.responsibility_type','communication','Kommunikation',40,false,'{}'::jsonb),
  ('avkk.responsibility_type','documentation','Dokumentation',50,false,'{}'::jsonb),
  ('avkk.responsibility_type','budget','Budget',60,false,'{}'::jsonb),
  ('avkk.responsibility_type','approval','Freigabe',70,false,'{}'::jsonb),
  ('avkk.responsibility_type','coordination','Koordination',80,false,'{}'::jsonb),

  ('avkk.responsibility_role','owner','Verantwortlicher',10,true,'{}'::jsonb),
  ('avkk.responsibility_role','deputy','Stellvertreter',20,false,'{}'::jsonb),

  ('avkk.competence_dimension','knowledge','Fachwissen',10,false,'{}'::jsonb),
  ('avkk.competence_dimension','experience','Erfahrung',20,false,'{}'::jsonb),
  ('avkk.competence_dimension','time','Zeit',30,false,'{}'::jsonb),
  ('avkk.competence_dimension','material','Material',40,false,'{}'::jsonb),
  ('avkk.competence_dimension','tools','Werkzeuge',50,false,'{}'::jsonb),
  ('avkk.competence_dimension','budget','Budget',60,false,'{}'::jsonb),
  ('avkk.competence_dimension','authorization','Berechtigung',70,false,'{}'::jsonb),
  ('avkk.competence_dimension','support','Unterstützung',80,false,'{}'::jsonb),

  ('avkk.competence_rating','available','vorhanden',10,true,'{"weight": 0}'::jsonb),
  ('avkk.competence_rating','partial','teilweise vorhanden',20,false,'{"weight": 1}'::jsonb),
  ('avkk.competence_rating','missing','nicht vorhanden',30,false,'{"weight": 2}'::jsonb),

  ('avkk.consequence_area','own_work','eigene Arbeit',10,false,'{}'::jsonb),
  ('avkk.consequence_area','team','Team',20,false,'{}'::jsonb),
  ('avkk.consequence_area','project','Projekt',30,false,'{}'::jsonb),
  ('avkk.consequence_area','customer','Kunde',40,false,'{}'::jsonb),
  ('avkk.consequence_area','management','Management',50,false,'{}'::jsonb),
  ('avkk.consequence_area','company','Unternehmen',60,false,'{}'::jsonb),
  ('avkk.consequence_area','data_protection','Datenschutz',70,false,'{}'::jsonb),
  ('avkk.consequence_area','information_security','Informationssicherheit',80,false,'{}'::jsonb),
  ('avkk.consequence_area','compliance','Compliance',90,false,'{}'::jsonb),
  ('avkk.consequence_area','contract','Vertrag',100,false,'{}'::jsonb),
  ('avkk.consequence_area','sla','SLA',110,false,'{}'::jsonb),
  ('avkk.consequence_area','image','Image',120,false,'{}'::jsonb),
  ('avkk.consequence_area','economic','wirtschaftliche Auswirkungen',130,false,'{}'::jsonb),

  ('avkk.consequence_severity','low','gering',10,true,'{"rank": 1}'::jsonb),
  ('avkk.consequence_severity','medium','mittel',20,false,'{"rank": 2}'::jsonb),
  ('avkk.consequence_severity','high','hoch',30,false,'{"rank": 3}'::jsonb),
  ('avkk.consequence_severity','critical','kritisch',40,false,'{"rank": 4}'::jsonb),

  ('avkk.schedule_impact','none','keine',10,true,'{"rank": 0}'::jsonb),
  ('avkk.schedule_impact','minor','gering',20,false,'{"rank": 1}'::jsonb),
  ('avkk.schedule_impact','delay','Verzögerung',30,false,'{"rank": 2}'::jsonb),
  ('avkk.schedule_impact','major_delay','erhebliche Verzögerung / Eskalation',40,false,'{"rank": 3}'::jsonb),
  ('avkk.schedule_impact','project_stop','Projektstopp',50,false,'{"rank": 4}'::jsonb)
) AS v(catalog_key, key, label, sort_order, is_default, attributes)
  ON v.catalog_key = c.key;

INSERT INTO public.app_settings (key, value)
VALUES ('avkk.risk_threshold', '{"missingCount": 1, "partialCount": 2}'::jsonb)
ON CONFLICT (key) DO NOTHING;