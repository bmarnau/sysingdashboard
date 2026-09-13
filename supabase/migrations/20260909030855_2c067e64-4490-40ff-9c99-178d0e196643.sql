REVOKE ALL ON TABLE public.customer_responsibility FROM PUBLIC;
REVOKE ALL ON TABLE public.customer_responsibility FROM anon;
REVOKE ALL ON TABLE public.customer_responsibility FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_responsibility TO authenticated;
GRANT ALL ON TABLE public.customer_responsibility TO service_role;