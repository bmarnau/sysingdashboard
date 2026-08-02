CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_read_authenticated
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY app_settings_admin_insert
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY app_settings_admin_update
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.audit_app_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_log (action, target, actor_id, payload)
  VALUES (
    'app_settings.' || lower(TG_OP),
    NEW.key,
    auth.uid(),
    jsonb_build_object('new_value', NEW.value)
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_app_settings_change() FROM PUBLIC;

CREATE TRIGGER app_settings_audit
  AFTER INSERT OR UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_app_settings_change();

INSERT INTO public.app_settings (key, value)
VALUES ('idle_timeout_minutes', '5'::jsonb);