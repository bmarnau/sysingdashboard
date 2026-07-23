# Publish-Build mit korrekten Supabase-Envs neu erzeugen

## Ausgangslage (verifiziert)

- `.env` enthält lokal `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Lokaler `bun run build` inlined die Werte korrekt in `dist/client/assets/index-*.js` (Substring `sb_publishable_...` und `*.supabase.co` gefunden). Der Code-Pfad in `src/integrations/supabase/config.ts` funktioniert also — der bisherige Publish-Build war schlicht ohne diese Variablen im Runner erzeugt worden.
- Somit ist keine Code-Änderung nötig; nur ein sauberer Re-Publish, bei dem die drei Variablen im Build-Runner sichtbar sind.

## Schritte

1. **Env-Präsenz für den Publish-Runner sicherstellen**
   - Bestätigen, dass die Lovable-Cloud-Anbindung aktiv ist (Backend verbunden) — sie liefert die drei `VITE_SUPABASE_*`-Werte automatisch in den Publish-Build ein.
   - Kein manuelles Setzen erforderlich, solange die Cloud verbunden bleibt; Werte sind bereits identisch mit `.env`.

2. **Re-Publish auslösen**
   - Über Publish-Dialog „Update" ausführen (Aufruf via `preview_ui--publish`).
   - Vor Publish `security--get_scan_results` prüfen (keine ungelösten Critical-Findings).

3. **Verifikation des veröffentlichten Bundles**
   - Nach Abschluss des Deployments (~1 Min) `https://sysingdashboard.lovable.app` aufrufen.
   - Neues Hauptbundle (`/assets/index-*.js`) laden und per `grep`/DevTools prüfen, dass
     - der String `sb_publishable_` und
     - die konkrete Supabase-URL (`*.supabase.co`)
     enthalten sind.
   - Startseite `/` und `/auth` öffnen: Die Meldung „Die Anmeldung ist noch nicht konfiguriert" darf nicht mehr erscheinen; Login-/Registrierungs-Formular ist bedienbar.

4. **Dokumentation**
   - `CHANGELOG.md`: Patch-Eintrag „Publish-Build mit inlined Supabase-Envs re-deployed" unter neuer Patch-Version (v1.41.2).
   - `HelpTopic` zum Kapitel Deployment: kurzer Hinweis, dass ein Publish nach Änderungen an Env-Variablen zwingend erforderlich ist, damit Vite die Werte statisch einsetzt.
   - `bun run docs:check` ausführen.

## Rollback

Nicht erforderlich — reiner Re-Publish ohne Code-/Schema-Änderung. Bei Problemen den vorherigen Deploy in Lovable erneut publishen.

## Technische Details

- Vite ersetzt `import.meta.env.VITE_*` ausschließlich zur Build-Zeit per Static-Replace. Der bereits durchgeführte Fix in `config.ts` (statischer Zugriff statt dynamischer Lookup) bleibt unverändert; er ist Voraussetzung, aber allein nicht ausreichend, wenn der Runner die Variablen nicht kennt.
- Kein Eingriff in `src/integrations/supabase/client.ts` (auto-generiert).
