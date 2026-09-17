-- BSF-03A: bestehenden Security-Invoker-Vertrag der zentralen
-- Permission-Funktion nach der Controlling-Erweiterung bewahren.
--
-- Main/KIOSK-01 legt public.has_permission(uuid,text) als SECURITY INVOKER fest.
-- Diese additive Korrektur stellt ausschliesslich diesen Funktionsmodus wieder her.
-- Body, Signatur, search_path und ACL bleiben unveraendert.
ALTER FUNCTION public.has_permission(uuid, text) SECURITY INVOKER;
