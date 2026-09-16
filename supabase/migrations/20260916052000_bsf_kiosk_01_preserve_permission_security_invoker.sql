-- BSF-KIOSK-01: bestehenden Security-Invoker-Vertrag der zentralen
-- Permission-Funktion nach der Kiosk-Erweiterung wiederherstellen.
ALTER FUNCTION public.has_permission(uuid, text) SECURITY INVOKER;
