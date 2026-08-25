-- SEC-01 / Issue #89 — Migration A: app_settings Key-Allowlist
DROP POLICY IF EXISTS app_settings_read_authenticated ON public.app_settings;

CREATE POLICY app_settings_read_public_keys
  ON public.app_settings FOR SELECT TO authenticated
  USING (key IN ('idle_timeout_minutes', 'avkk.risk_threshold'));

CREATE POLICY app_settings_read_admin
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'));

-- SEC-01 / Issue #89 — Migration B: avkk_can_write search_path-Härtung
CREATE OR REPLACE FUNCTION public.avkk_can_write(_subject uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
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

REVOKE EXECUTE ON FUNCTION public.avkk_can_write(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.avkk_people_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.avkk_can_write(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avkk_people_directory() TO authenticated;