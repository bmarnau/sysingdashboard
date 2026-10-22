-- QS-01 Migration A: Profil-Selbstupdate absichern
--
-- Befunde (docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml, QS-01):
--   SEC-PROFILE-SELF-UPDATE  profiles_self_update erlaubt jede Spalte der eigenen
--                            Zeile, auch status, email, mfa_enabled, created_at.
--   SEC-ACTIVE-ACCOUNT       die Policy prueft nicht, ob das Konto aktiv ist.
--
-- Entscheidung:
--   * BEFORE-UPDATE-Trigger als SECURITY INVOKER. Dadurch ist current_user die
--     aufrufende Rolle ('authenticated' ueber die Data-API). service_role,
--     postgres und SECURITY-DEFINER-Funktionen (current_user = Owner) bleiben
--     unberuehrt. Mit SECURITY DEFINER waere current_user immer der Owner und
--     die Pruefung wirkungslos.
--   * Administratoren (systemadministrator, administrator) duerfen weiterhin alle
--     Profile aendern (profiles_admins_update_all, Admin-Benutzerverwaltung).
--   * Kein Spalten-GRANT: Administratoren nutzen dieselbe Rolle 'authenticated'.
--   * Die Self-Update-Policy verlangt zusaetzlich ein aktives Konto.
--
-- Rollback: Trigger und Funktion loeschen, Policy auf die vorherige Fassung
--   (auth.uid() = id) zuruecksetzen. Keine Datenmigration.

CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Nur Aufrufe ueber die Data-API einschraenken.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Administratoren pflegen fremde und eigene Profile ueber die Benutzerverwaltung.
  IF public.has_any_role(
    auth.uid(),
    ARRAY['systemadministrator'::public.app_role, 'administrator'::public.app_role]
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'profile_self_update_forbidden_columns'
      USING ERRCODE = '42501',
            HINT = 'Konto-Felder (status, email, mfa_enabled, created_at) duerfen nur Administratoren aendern.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_profile_self_update() OWNER TO postgres;

-- Default-Privilegien vergeben EXECUTE an anon/authenticated; Trigger-Funktionen
-- brauchen das nicht und werden nicht direkt aufgerufen.
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM anon;
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM authenticated;
GRANT ALL ON FUNCTION public.guard_profile_self_update() TO service_role;

DROP TRIGGER IF EXISTS trg_profiles_guard_self_update ON public.profiles;
CREATE TRIGGER trg_profiles_guard_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_self_update();

-- Aktives Konto zur Pflicht machen (SEC-ACTIVE-ACCOUNT).
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND public.is_account_active(auth.uid()))
  WITH CHECK (auth.uid() = id AND public.is_account_active(auth.uid()));
