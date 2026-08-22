-- F-11: datensparsames Personenverzeichnis fuer AVKK-Anzeige und Delegation.
--
-- Ziel:
-- - AVKK-Leser sehen fuer bereits zugeordnete Verantwortungen einen Namen statt UUID.
-- - Rollen mit avkk.responsibility.assign sehen zusaetzlich aktive Personen zur Delegation.
-- - Vollstaendige Profile (E-Mail, Telefon, MFA, Profilbild usw.) bleiben geschuetzt.
-- - Personen werden fachlich als "Vorname Nachname" dargestellt, sofern beide Werte vorliegen.

CREATE OR REPLACE FUNCTION public.avkk_people_directory()
RETURNS TABLE (
  id uuid,
  display_name text,
  role public.app_role,
  status public.user_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    p.id,
    COALESCE(
      NULLIF(BTRIM(p.first_name || ' ' || p.last_name), ''),
      NULLIF(BTRIM(p.display_name), ''),
      'Unbenannt'
    ) AS display_name,
    ur.role,
    p.status
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT r.role
    FROM public.user_roles r
    WHERE r.user_id = p.id
    ORDER BY r.granted_at DESC
    LIMIT 1
  ) ur ON true
  WHERE auth.uid() IS NOT NULL
    AND public.has_permission(auth.uid(), 'avkk.view')
    AND (
      (
        public.has_permission(auth.uid(), 'avkk.responsibility.assign')
        AND p.status = 'active'::public.user_status
      )
      OR EXISTS (
        SELECT 1
        FROM public.avkk_responsibility ar
        WHERE ar.person_id = p.id
          AND ar.valid_to IS NULL
      )
    )
  ORDER BY display_name, p.id;
$function$;

REVOKE ALL ON FUNCTION public.avkk_people_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avkk_people_directory() TO authenticated;

COMMENT ON FUNCTION public.avkk_people_directory() IS
  'Minimaler AVKK-Personenvertrag: bestehende Verantwortliche fuer avkk.view; aktive Delegationsempfaenger zusaetzlich fuer avkk.responsibility.assign; bevorzugte Darstellung Vorname Nachname.';
