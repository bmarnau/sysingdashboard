## Root Cause (bestätigt)

**Sichtbarer Fehler (Konsole):**
`Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`
geworfen aus `src/integrations/supabase/client.ts` beim ersten Zugriff via `useEffect` → `supabase.auth.getSession()` in `src/routes/index.tsx`.

**Verifiziert im Sandbox:**
- `.env` enthält bereits `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` sowie die serverseitigen Pendants — Lovable Cloud injiziert korrekt.
- Der laufende Preview-Build (`assets/index-Bn7N6Rqg.js`) stammt aus einer Zeit **vor** der Auth-Umstellung; damals fehlten die VITE-Variablen im Build und wurden als Leerstring inline-substituiert. Ein frischer Publish/Preview-Build behebt die Fehlermeldung sofort.

**Echte Härtungslücken (unabhängig vom Stale-Build):**
1. `client.ts` wirft synchron aus einem Proxy-Getter → jede beliebige Komponente kann die gesamte App zerlegen; die Landing-Page ist nicht abgesichert.
2. `LandingPage` setzt `checked` nur im Success-Zweig von `getSession()` — bei Reject bleibt der Login-Button dauerhaft `disabled`.
3. `auth.tsx` hat keine `.catch()`-Absicherung an `getSession()` / `onAuthStateChange`.
4. `.env.example` dokumentiert die Auth-Variablen nicht → lokaler Klon läuft in denselben Fehler ohne Hinweis.

## Ziel

Öffentliche Routen (`/`, `/auth`) starten **immer**, auch wenn Supabase fehlkonfiguriert oder unerreichbar ist. Kein Auth-Bypass, kein localStorage-Fallback, kein leerer Bildschirm.

## Änderungen

### 1. `.env.example` erweitern
Auth-/Cloud-Variablen mit Kommentaren dokumentieren (client- vs. serverseitig, "von Lovable Cloud automatisch gesetzt, lokal nur für Standalone-Betrieb"). Keine echten Werte.

### 2. Neues Modul `src/integrations/supabase/config.ts`
Zentrale, wurf-freie Ermittlung:
```
type AuthConfigStatus = "configured" | "missing" | "invalid";
getAuthConfigurationStatus(): { status; missingKeys[]; provider: "supabase" }
```
- Liest `import.meta.env.VITE_SUPABASE_*` (Browser) bzw. `process.env.SUPABASE_*` (Server) ohne zu werfen.
- Validiert URL-Form und Publishable-Key-Prefix (`sb_publishable_` oder JWT-Shape).
- Verbietet explizit `sb_secret_*` im Client (→ `invalid`).
- Neue Error-Klasse `AuthConfigurationError` (secret-frei).

### 3. `client.ts` robuster (ohne Auto-Generation-Vertrag zu brechen)
Die Datei ist Auto-Generated → **nicht editieren**. Stattdessen:
- Neue Fassade `src/integrations/supabase/safe-client.ts` mit `trySupabase()` → gibt `{ ok: true, client }` oder `{ ok: false, status }` zurück. Interner try/catch um den Proxy-Zugriff.
- Alle App-eigenen Consumer (`index.tsx`, `auth.tsx`, `useCurrentUser`, `_authenticated/route.tsx`) benutzen die Fassade; kein direkter Import mehr in Rendern.

### 4. `src/routes/index.tsx` — Landing-Page-Zustandsmaschine
State: `"checking" | "authenticated" | "anonymous" | "config-error" | "connection-error"`.
- Vor Session-Call: `getAuthConfigurationStatus()`; bei `missing/invalid` → `config-error`-View mit klarer Meldung ("Anmeldung ist noch nicht konfiguriert").
- `getSession()` in `try/catch` mit `.finally(setChecked(true))`; Reject → `connection-error`-View + Retry-Button.
- Login-Button bleibt in `anonymous` und `connection-error` **aktiv**.

### 5. `src/routes/auth.tsx` absichern
- `getSession()`, `onAuthStateChange`, alle Submit-Handler mit try/catch + Toast.
- Bei `config-error`: Formulare deaktiviert, Hinweistext, kein Provider-Detail-Leak.
- Redirect-Ziel weiterhin per `safeRedirect()` (bereits vorhanden).

### 6. `_authenticated/route.tsx`
- `supabase.auth.getUser()` in try/catch. Bei Netzwerk-/Config-Fehler → Redirect nach `/auth?reason=unavailable` statt Endlos-Loop.

### 7. Systemstatus-Erweiterung
`SystemStatusDialog` bekommt Sektion "Authentifizierung":
- `Auth konfiguriert: ja/nein`
- `Provider: supabase`
- `Auth erreichbar: ja/nein/unbekannt` (via leichter `getSession()`-Ping)
- Letzter Konfig-Fehlercode (ohne URL/Key/Token).

### 8. Tests (Vitest + Playwright)
- **Unit** `config.test.ts`: alle 4 Statusfälle, `sb_secret_`-Ablehnung.
- **Unit** `safe-client.test.ts`: `trySupabase()` schluckt Proxy-Throw.
- **Component** `index.test.tsx`: 5 Zustände, Button-Enable-Verhalten.
- **Component** `auth.test.tsx`: Submit-Reject rendert Toast, kein Crash.
- **E2E** `startup.spec.ts`: `/`, `/auth`, `/dashboard` (anon → Redirect) laden ohne Konsolen-Error; zusätzlich Szenario mit gemockten leeren VITE-Werten via Build-Env-Override.
- **Security-Suite**: Assertion, dass `sb_secret_` niemals im Browser-Bundle vorkommt (grep über `dist/`).

### 9. Dokumentation
- `docs/DEPLOYMENT.md`: Abschnitt „Auth-Konfiguration Lovable Cloud vs. Self-Hosted".
- `src/lib/help-documentation.ts`: Kapitel „Anmeldung & Auth-Konfigurationsfehler" (neuer Topic-Slug, `lastUpdated`).
- `CHANGELOG.md`: `v1.40.1` – Startfehler nach Auth-Umstellung behoben, Landing-Page-Härtung, `AuthConfigurationError`, Systemstatus-Erweiterung.

### 10. Abschluss
- `bun run lint`, `build`, `test`, `test:security`, `test:e2e`, `docs:check`, `report:technical`.
- Frischen Publish-Build anstoßen (behebt die Stale-Bundle-Ursache im laufenden Preview automatisch).
- Kurzer Fehlerbericht unter `test-report/auth-startup-repair.md`.

## Nicht-Ziele / bewusst ausgeschlossen

- Kein Auth-Bypass, kein Öffnen von `/dashboard` für Anonyme.
- Kein Rückfall auf localStorage-Identität.
- Kein Fake-Supabase-Client.
- Kein Editieren der auto-generierten `client.ts`/`client.server.ts`/`auth-*.ts`/`types.ts`/`.env`.

## Erwartetes Ergebnis

`/` und `/auth` bleiben in **jeder** ENV-Situation renderbar; bei korrekter Cloud-Konfiguration verhält sich die App unverändert. Der aktuell sichtbare Konsolen-Error verschwindet, sobald der Publish-Build mit den bereits vorhandenen VITE-Variablen neu läuft; die Härtung verhindert die Klasse künftig.