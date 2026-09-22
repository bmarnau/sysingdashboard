-- BSF-03E P0 — AVKK Responsibility Scope Hardening
-- Issue #63
--
-- Additiv und legacy-kompatibel:
-- - bestehende ungescopte AVKK-Saetze bleiben unveraendert lesbar/nutzbar,
-- - neue BSF-03E-faehige Project-/WorkPackage-Subjects koennen einen
--   serverseitig validierten Systemhouse-/Customer-Scope tragen,
-- - direkte AVKK-DML-Pfade fuer gescopte Zeilen werden an Membership +
--   Customer Access gebunden,
-- - BSF-03E-Kandidaten werden serverseitig auf das tatsaechliche Systemhouse
--   begrenzt.
--
-- Kein automatischer Legacy-Backfill: der verifizierte Bestand 2026-09-22
-- enthaelt 9 ungescopte Project-/WorkPackage-Subjects ohne eindeutigen aktiven
-- Shared-Projection-Match.

-- ---------------------------------------------------------------------------
-- 1. Additiver Subject-Scope
-- ---------------------------------------------------------------------------

ALTER TABLE public.avkk_subject
  ADD COLUMN IF NOT EXISTS systemhouse_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid;

ALTER TABLE public.avkk_subject
  DROP CONSTRAINT IF EXISTS avkk_subject_scope_pair_check,
  ADD CONSTRAINT avkk_subject_scope_pair_check
    CHECK (
      (systemhouse_id IS NULL AND customer_id IS NULL)
      OR
      (systemhouse_id IS NOT NULL AND customer_id IS NOT NULL)
    );

ALTER TABLE public.avkk_subject
  DROP CONSTRAINT IF EXISTS avkk_subject_scoped_type_check,
  ADD CONSTRAINT avkk_subject_scoped_type_check
    CHECK (
      systemhouse_id IS NULL
      OR subject_type IN ('project','workpackage')
    );

ALTER TABLE public.avkk_subject
  DROP CONSTRAINT IF EXISTS avkk_subject_customer_scope_fk,
  ADD CONSTRAINT avkk_subject_customer_scope_fk
    FOREIGN KEY (customer_id, systemhouse_id)
    REFERENCES public.customer(id, systemhouse_id)
    ON DELETE RESTRICT;

-- Die bisherige globale Eindeutigkeit verhindert dieselbe Source-ID in
-- verschiedenen Systemhaeusern. Legacy bleibt global eindeutig; gescopte
-- Identitaet ist systemhausbezogen. customer_id ist abgeleiteter Scope und
-- bewusst kein Bestandteil der stabilen Subject-Identitaet.
ALTER TABLE public.avkk_subject
  DROP CONSTRAINT IF EXISTS avkk_subject_subject_type_subject_id_key;

DROP INDEX IF EXISTS public.avkk_subject_legacy_identity_unique;
CREATE UNIQUE INDEX avkk_subject_legacy_identity_unique
  ON public.avkk_subject(subject_type, subject_id)
  WHERE systemhouse_id IS NULL AND customer_id IS NULL;

DROP INDEX IF EXISTS public.avkk_subject_scoped_identity_unique;
CREATE UNIQUE INDEX avkk_subject_scoped_identity_unique
  ON public.avkk_subject(systemhouse_id, subject_type, subject_id)
  WHERE systemhouse_id IS NOT NULL AND customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS avkk_subject_scope_idx
  ON public.avkk_subject(systemhouse_id, customer_id, subject_type)
  WHERE systemhouse_id IS NOT NULL AND customer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Scope muss zur aktiven Shared Projection passen
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bsf03e_avkk_subject_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.bsf03e_avkk_subject_scope_guard()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bsf03e_avkk_subject_scope_guard
  ON public.avkk_subject;
CREATE TRIGGER bsf03e_avkk_subject_scope_guard
  BEFORE INSERT OR UPDATE OF systemhouse_id, customer_id, subject_type, subject_id
  ON public.avkk_subject
  FOR EACH ROW
  EXECUTE FUNCTION public.bsf03e_avkk_subject_scope_guard();

-- ---------------------------------------------------------------------------
-- 3. Scoped Responsibility-Zielperson
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bsf03e_avkk_responsibility_target_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.bsf03e_avkk_responsibility_target_guard()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bsf03e_avkk_responsibility_target_guard
  ON public.avkk_responsibility;
CREATE TRIGGER bsf03e_avkk_responsibility_target_guard
  BEFORE INSERT OR UPDATE OF avkk_subject_id, person_id, valid_to
  ON public.avkk_responsibility
  FOR EACH ROW
  EXECUTE FUNCTION public.bsf03e_avkk_responsibility_target_guard();

-- ---------------------------------------------------------------------------
-- 4. avkk_can_write um realen Customer-Scope ergaenzen
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.avkk_can_write(_subject uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

REVOKE EXECUTE ON FUNCTION public.avkk_can_write(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avkk_can_write(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Scope-aware RLS: Subject
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avkk_subject_read ON public.avkk_subject;
CREATE POLICY avkk_subject_read ON public.avkk_subject
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.view')
    AND (
      (systemhouse_id IS NULL AND customer_id IS NULL)
      OR (
        public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
        AND public.has_customer_access(
          auth.uid(), systemhouse_id, customer_id, 'read'
        )
      )
    )
  );

DROP POLICY IF EXISTS avkk_subject_insert ON public.avkk_subject;
CREATE POLICY avkk_subject_insert ON public.avkk_subject
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.edit')
    AND created_by = auth.uid()
    AND (
      (systemhouse_id IS NULL AND customer_id IS NULL)
      OR (
        public.has_active_systemhouse_membership(auth.uid(), systemhouse_id)
        AND public.has_customer_access(
          auth.uid(), systemhouse_id, customer_id, 'write'
        )
      )
    )
  );

DROP POLICY IF EXISTS avkk_subject_update ON public.avkk_subject;
CREATE POLICY avkk_subject_update ON public.avkk_subject
  FOR UPDATE TO authenticated
  USING (public.avkk_can_write(id))
  WITH CHECK (public.avkk_can_write(id));

-- ---------------------------------------------------------------------------
-- 6. Scope-aware RLS: Responsibility
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avkk_responsibility_read
  ON public.avkk_responsibility;
CREATE POLICY avkk_responsibility_read
  ON public.avkk_responsibility
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.view')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
    )
  );

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
         AND (
           (s.systemhouse_id IS NULL AND s.customer_id IS NULL)
           OR (
             public.has_active_systemhouse_membership(
               auth.uid(), s.systemhouse_id
             )
             AND public.has_customer_access(
               auth.uid(), s.systemhouse_id, s.customer_id, 'write'
             )
           )
         )
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
         AND (
           (s.systemhouse_id IS NULL AND s.customer_id IS NULL)
           OR (
             public.has_active_systemhouse_membership(
               auth.uid(), s.systemhouse_id
             )
             AND public.has_customer_access(
               auth.uid(), s.systemhouse_id, s.customer_id, 'write'
             )
           )
         )
    )
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
         AND (
           (s.systemhouse_id IS NULL AND s.customer_id IS NULL)
           OR (
             public.has_active_systemhouse_membership(
               auth.uid(), s.systemhouse_id
             )
             AND public.has_customer_access(
               auth.uid(), s.systemhouse_id, s.customer_id, 'write'
             )
           )
         )
    )
  );

-- Historisches DELETE bleibt nur fuer Legacy kompatibel. Gescopte
-- BSF-03E-Verantwortungen muessen ueber valid_to historisiert werden.
DROP POLICY IF EXISTS avkk_responsibility_delete
  ON public.avkk_responsibility;
CREATE POLICY avkk_responsibility_delete
  ON public.avkk_responsibility
  FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.responsibility.assign')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Scope-aware RLS: Responsibility Types
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avkk_responsibility_type_read
  ON public.avkk_responsibility_type;
CREATE POLICY avkk_responsibility_type_read
  ON public.avkk_responsibility_type
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.view')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_responsibility r
       WHERE r.id = responsibility_id
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
         AND (
           (s.systemhouse_id IS NULL AND s.customer_id IS NULL)
           OR (
             public.has_active_systemhouse_membership(
               auth.uid(), s.systemhouse_id
             )
             AND public.has_customer_access(
               auth.uid(), s.systemhouse_id, s.customer_id, 'write'
             )
           )
         )
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
        JOIN public.avkk_subject s
          ON s.id = r.avkk_subject_id
       WHERE r.id = responsibility_id
         AND s.systemhouse_id IS NULL
         AND s.customer_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Read-Scope fuer Kompetenz und Konsequenz
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avkk_competence_read
  ON public.avkk_competence;
CREATE POLICY avkk_competence_read
  ON public.avkk_competence
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.view')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
    )
  );

DROP POLICY IF EXISTS avkk_consequence_read
  ON public.avkk_consequence;
CREATE POLICY avkk_consequence_read
  ON public.avkk_consequence
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'avkk.view')
    AND EXISTS (
      SELECT 1
        FROM public.avkk_subject s
       WHERE s.id = avkk_subject_id
    )
  );

-- INSERT/UPDATE fuer Kompetenz und Konsequenz bleiben an avkk_can_write()
-- gebunden; die Funktion ist oben fuer gescopte Subjects um Membership +
-- Customer Write Access erweitert worden.

-- ---------------------------------------------------------------------------
-- 9. Datensparsames, gescoptes Kandidatenverzeichnis
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.bsf03e_avkk_responsibility_candidates(
  _subject uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  subject_systemhouse uuid;
  subject_customer uuid;
  subject_type text;
  subject_source_id text;
BEGIN
  SELECT s.systemhouse_id, s.customer_id, s.subject_type, s.subject_id
    INTO subject_systemhouse, subject_customer, subject_type, subject_source_id
    FROM public.avkk_subject s
   WHERE s.id = _subject
     AND s.systemhouse_id IS NOT NULL
     AND s.customer_id IS NOT NULL
     AND s.subject_type IN ('project','workpackage')
     AND s.status = 'active';

  IF subject_systemhouse IS NULL
     OR subject_customer IS NULL
     OR auth.uid() IS NULL
     OR NOT public.is_account_active(auth.uid())
     OR NOT public.has_permission(
       auth.uid(), 'avkk.responsibility.assign'
     )
     OR NOT public.has_active_systemhouse_membership(
       auth.uid(), subject_systemhouse
     )
     OR NOT public.has_customer_access(
       auth.uid(), subject_systemhouse, subject_customer, 'write'
     ) THEN
    RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
      USING ERRCODE = '42501';
  END IF;

  -- Defense in depth: der persistierte AVKK-Scope muss weiterhin auf eine
  -- aktive Shared Projection zeigen.
  IF subject_type = 'project' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.shared_project_projection p
       WHERE p.systemhouse_id = subject_systemhouse
         AND p.customer_id = subject_customer
         AND p.source_id = subject_source_id
         AND p.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
        FROM public.shared_work_package_projection w
       WHERE w.systemhouse_id = subject_systemhouse
         AND w.customer_id = subject_customer
         AND w.source_id = subject_source_id
         AND w.is_active
    ) THEN
      RAISE EXCEPTION 'bsf03e_responsibility_scope_denied'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT x.user_id, x.display_name
  FROM (
    SELECT DISTINCT
      p.id AS user_id,
      COALESCE(
        NULLIF(btrim(p.first_name || ' ' || p.last_name), ''),
        NULLIF(btrim(p.display_name), ''),
        'Unbenannt'
      ) AS display_name
    FROM public.profiles p
    JOIN public.systemhouse_membership m
      ON m.user_id = p.id
     AND m.systemhouse_id = subject_systemhouse
     AND m.status = 'active'
     AND (m.valid_from IS NULL OR m.valid_from <= now())
     AND (m.valid_to IS NULL OR m.valid_to > now())
    WHERE p.status = 'active'::public.user_status
      AND EXISTS (
        SELECT 1
          FROM public.user_roles ur
         WHERE ur.user_id = p.id
           AND ur.role IN (
             'systemadministrator'::public.app_role,
             'administrator'::public.app_role,
             'teamlead'::public.app_role,
             'projectmanager'::public.app_role,
             'engineer'::public.app_role
           )
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.user_roles ur
         WHERE ur.user_id = p.id
           AND ur.role IN (
             'viewer'::public.app_role,
             'customer'::public.app_role,
             'kiosk'::public.app_role
           )
      )
  ) x
  ORDER BY x.display_name, x.user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION
  private.bsf03e_avkk_responsibility_candidates(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  private.bsf03e_avkk_responsibility_candidates(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.bsf03e_avkk_responsibility_candidates(
  _subject uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT *
    FROM private.bsf03e_avkk_responsibility_candidates(_subject);
$function$;

REVOKE EXECUTE ON FUNCTION
  public.bsf03e_avkk_responsibility_candidates(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.bsf03e_avkk_responsibility_candidates(uuid)
  TO authenticated;
