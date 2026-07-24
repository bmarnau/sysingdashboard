## Ziel

Die aktuellen Start-/Auth-Symptome und die technischen Critical Findings werden ohne neue Produktfunktionen bereinigt. Fokus: **SEC-CRIT-001**, **SEC-CRIT-002**, lauffähige Security/API-Suite, klare Trennung von Auth, RBAC/RLS und API-Health, anschließend neuer Technical Compliance Report.

## Gesicherte Ist-Analyse

- `src/integrations/supabase/config.ts` und `src/integrations/supabase/env-check.ts` nutzen bereits statische Vite-Zugriffe (`import.meta.env.VITE_SUPABASE_*`). Der frühere dynamische Zugriff ist im Code nicht mehr vorhanden.
- Die Browser-Signale zeigen trotzdem: Im aktuell geladenen Preview-Bundle fehlen `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` und `VITE_SUPABASE_PROJECT_ID`. Das erklärt die Meldung „Die Anmeldung ist noch nicht konfiguriert“ im Browser-Build.
- Zusätzlich schlägt `GET /api/status` mit `500 SERVICE_NOT_CONFIGURED` fehl. Ursache im Code: `src/routes/api/status.ts` ruft `ensureEnv()` auf. Diese Validierung verlangt in Production Azure-Variablen, obwohl `/api/status` ein öffentlicher, secret-freier Health-Endpunkt sein soll und `backend/services/statusService.mjs` fehlende ENV bereits selbst defensiv im Payload abbildet.
- `/api/sync` ist bereits auf Bearer-Token + `has_permission` umgestellt, ruft aber `ensureEnv()` vor der Authentifizierung auf. Dadurch kann fehlende Azure-Konfiguration anonyme Requests als 500 maskieren, statt zuerst die Auth-Grenze mit 401/403 durchzusetzen.
- Die aktuellen `test-report/security-report.*` und `test-report/technical-test-report.*` sind stale: `scripts/security/static-findings.json` hat SEC-CRIT-001/002 bereits akzeptiert/dokumentiert, der generierte Report zeigt aber noch die alten offenen Findings.
- Die Test-/Doku-Artefakte enthalten noch historische Aussagen: kein produktiver Auth-Provider, `X-Sync-Token`, localStorage-Tamper öffnet Sysadmin-Sichten. Diese Aussagen widersprechen dem aktuellen Auth-Zielbild.

## Umsetzungsplan

1. **Health-Endpoint stabilisieren**
   - In `src/routes/api/status.ts` den `ensureEnv()`-Fail-Fast entfernen.
   - `/api/status` liefert immer den secret-freien Status aus `getStatus()` plus Correlation-ID.
   - Fehlende Azure-Konfiguration bleibt sichtbar, blockiert aber App-Start und Health nicht.

2. **Sync-Endpoint strikt trennen: Auth vor Payload/Sync/ENV**
   - In `src/routes/api/sync.ts` die Reihenfolge korrigieren:
     1. Bearer-Header prüfen.
     2. Server-Auth-ENV (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) prüfen.
     3. Token mit `auth.getUser()` validieren.
     4. Request-Body validieren.
     5. `has_permission(user, azure.import|azure.export)` prüfen.
     6. Erst danach `runSync()` ausführen.
   - `endpointMeta` für `/api/sync` ergänzen: `authRequired: true`, `classification: "privileged"`, Permission-Hinweis.
   - Kein Rückfall auf `X-Sync-Token`, keine caller-supplied Rolle/Owner-ID.

3. **API Discovery und API-Tests auf die neue Auth-Grenze aktualisieren**
   - `scripts/api-discovery/analyzers.mjs` so anpassen, dass Bearer-Auth, `auth.getUser()` und `has_permission` als Auth-/Permission-Guard erkannt werden.
   - Endpoint-Registry (`src/__tests__/api/registry/endpoints.ts`) für `/api/sync` auf `authRequired: true` und Azure-Permission aktualisieren.
   - Smoke-/Runner-Tests so anpassen, dass geschützte Write-Endpunkte ohne Session 401/403 liefern dürfen und genau das als korrekter Auth-Nachweis zählt.
   - Functional-Coverage für `/api/sync` von „X-Sync-Token/PROD-only“ auf „Bearer + DB-Permission“ ändern.

4. **SEC-CRIT-002 Regressionsschutz korrigieren**
   - E2E-Test `ui-gate-tamper.spec.ts` invertieren: gefälschter `northbit-active-user` darf keine Sysadmin-/Dashboard-Sicht öffnen; sichtbar bleiben Landing/Auth-CTA.
   - Kommentare in `manipulation.test.tsx` klarstellen: `can()` ist reine Matrixlogik, Identitätsvertrauen entsteht nur vorher durch `useCurrentUser()` aus Session + `user_roles`.

5. **Security-Report-Generator und Dokumentation entstalen**
   - Security-Report-Grenzen von „kein produktiver Auth-Provider“ auf „Auth aktiv; echte E2E-Anmeldung nur mit Test-Session“ aktualisieren.
   - Handbuch-Kapitel zu Systemstatus, Security Suite und API Discovery aktualisieren.
   - `docs/API.md` und `docs/DEPLOYMENT.md` auf aktuellen Auth-/ENV-Stand bringen.
   - `CHANGELOG.md` mit einer neuen Version für diese Reparatur ergänzen.

6. **Reports neu erzeugen und validieren**
   - Security/API-Artefakte neu generieren:
     - API Discovery
     - API Smoke/Functional Reports
     - Security Report
     - Technical Report
   - Zielzustand im neuen Technical Compliance Report:
     - keine offenen `SEC-CRIT-001`/`SEC-CRIT-002` als Blocker,
     - `/api/sync` als privilegierter, authentifizierter Endpoint erkannt,
     - `/api/status` als öffentlicher Health-Endpoint ohne 500 durch optionale Azure-ENV,
     - Quality Gate blockiert nicht mehr wegen der beiden Critical Findings.

## Erwartetes Ergebnis

- Die Browser-Meldung „Anmeldung nicht konfiguriert“ ist nach einem frischen Publish-Build mit vorhandenen `VITE_SUPABASE_*`-Werten behoben; der Code nutzt dafür bereits statische Vite-Zugriffe.
- Der zusätzliche `/api/status`-500 und der `dwl.proxy.response.error` werden durch die Health-Endpoint-Korrektur beseitigt.
- SEC-CRIT-001/002 erscheinen im neuen Technical Compliance Report nicht mehr als offene Critical Blocker.
- Auth, RBAC/RLS und API-Health sind fachlich sauber getrennt.