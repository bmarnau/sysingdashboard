-- DB-DRIFT-FK: Fremdschluessel reference_value_history.systemhouse_id -> systemhouse(id)
--
-- Befund (2026-10-22, read-only Pruefung Lovable): Der Constraint existiert live
-- (Typ f, ON DELETE RESTRICT, validiert), ist aber in keiner Migration enthalten.
-- Diese Migration zieht den Live-Stand nach, damit ein Neuaufbau aus den Migrationen
-- dasselbe Schema liefert. Auf der Live-Datenbank ist sie ein No-Op.
--
-- Idempotent: legt den Constraint nur an, wenn er fehlt.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.reference_value_history'::regclass
      AND c.conname = 'reference_value_history_systemhouse_fk'
  ) THEN
    ALTER TABLE ONLY public.reference_value_history
      ADD CONSTRAINT reference_value_history_systemhouse_fk
      FOREIGN KEY (systemhouse_id) REFERENCES public.systemhouse(id) ON DELETE RESTRICT;
  END IF;
END
$$;
