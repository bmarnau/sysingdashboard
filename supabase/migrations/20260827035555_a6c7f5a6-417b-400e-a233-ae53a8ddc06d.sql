-- SEC-02 (Issue #91): Reference-Data table privileges hardened to least privilege.
-- No structural change, no data change, no policy change, no function/trigger change.

REVOKE ALL ON TABLE public.reference_catalog FROM PUBLIC;
REVOKE ALL ON TABLE public.reference_value FROM PUBLIC;
REVOKE ALL ON TABLE public.reference_value_history FROM PUBLIC;

REVOKE ALL ON TABLE public.reference_catalog FROM anon;
REVOKE ALL ON TABLE public.reference_value FROM anon;
REVOKE ALL ON TABLE public.reference_value_history FROM anon;

REVOKE ALL ON TABLE public.reference_catalog FROM authenticated;
REVOKE ALL ON TABLE public.reference_value FROM authenticated;
REVOKE ALL ON TABLE public.reference_value_history FROM authenticated;

-- Minimal contract for authenticated; RLS remains the functional boundary.
GRANT SELECT ON TABLE public.reference_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reference_value TO authenticated;
GRANT SELECT ON TABLE public.reference_value_history TO authenticated;