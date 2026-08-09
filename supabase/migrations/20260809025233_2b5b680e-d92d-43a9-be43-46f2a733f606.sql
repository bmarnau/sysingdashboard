REVOKE EXECUTE ON FUNCTION public.reference_value_track_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.avkk_audit_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reference_value_track_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.avkk_audit_change() TO service_role;

DROP FUNCTION IF EXISTS public.avkk_responsibility_subject(uuid);