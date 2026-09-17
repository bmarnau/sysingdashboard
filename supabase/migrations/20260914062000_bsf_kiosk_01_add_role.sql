-- BSF-KIOSK-01: technische Kiosk-Rolle additiv einfuehren.
-- Separater Migrationsschritt: Der neue Enum-Wert wird erst in der
-- Folgemigration verwendet, damit PostgreSQL-Transaktionsgrenzen sauber bleiben.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kiosk';
