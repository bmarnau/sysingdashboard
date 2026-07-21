
## Root Cause

`src/integrations/supabase/config.ts` liest die Vite-Variablen über einen **dynamischen Property-Zugriff**:

```ts
const env = (import.meta as any)?.env as Record<string, string | undefined>;
const v = env?.[name];              // ← wird von Vite NICHT ersetzt
```

Vite inlined `import.meta.env.VITE_*` nur bei **statischem** Zugriff. Über einen Variablennamen (`env[name]`) bleibt im produzierten Browser-Bundle nichts übrig, daher liefert `getAuthConfigurationStatus()` in der veröffentlichten App `status: "missing"`, obwohl Lovable Cloud die Werte korrekt bereitstellt (`.env` enthält alle drei `VITE_SUPABASE_*`). `trySupabase()` gibt `{ ok: false }` zurück und die Routen zeigen die rote Meldung.

Der generierte `client.ts` verwendet dagegen bereits statischen Zugriff und würde funktionieren – er wird nur durch die Fassade nie erreicht.

## Fix

### 1. `src/integrations/supabase/config.ts`

- `readViteEnv(name)` durch statische Konstanten ersetzen, die einmalig auf Modulebene ausgewertet werden:

  ```ts
  const VITE_URL = import.meta.env.VITE_SUPABASE_URL;
  const VITE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  ```

- `readProcessEnv` als SSR-Fallback beibehalten (dort ist `process.env` ein echtes Objekt).
- Validierung (`isValidHttpsUrl`, `isPlausiblePublishableKey`) unverändert – akzeptiert weiterhin `sb_publishable_*` und Legacy-JWT-Anon-Keys, weist `sb_secret_*` zurück.
- Keine URL, kein Key, kein Token wird geloggt oder zurückgegeben.

### 2. `src/routes/auth.tsx` und `src/routes/index.tsx` – DEV-Diagnose

Die Fehlermeldung nur in `import.meta.env.DEV` um vier nicht-sensible Felder erweitern:

- `status` (`configured` | `missing` | `invalid`)
- `missingKeys` (nur Namen, keine Werte)
- `invalidReason` (generischer String aus `config.ts`)
- `clientCreated: yes|no` (Ergebnis von `trySupabase().ok`)

In Production bleibt die Meldung unverändert kurz.

### 3. Keine weiteren Änderungen

- `client.ts` bleibt unangetastet (auto-generiert, korrekter statischer Zugriff).
- `safe-client.ts` bleibt unverändert – der Cache wird nach dem Fix ohnehin `{ ok: true }` cachen.
- `.env`, `.env.example`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts` bleiben unverändert.
- Kein manueller Schlüssel im Code, keine deaktivierte Sicherheitsprüfung.

## Verifikation

1. `bun run build` – erfolgreich, keine TS-Fehler.
2. `tsgo` typecheck.
3. `bunx vitest run src/__tests__/integrations/supabase-config.test.ts` – bestehende Config-Tests weiterhin grün; ggf. Erwartung an `readViteEnv`-Interna anpassen, falls dort auf die alte Signatur getestet wird.
4. Erneutes Publish via `preview_ui--publish`.
5. Playwright-Smoke gegen `http://localhost:8080/` und `http://localhost:8080/auth`:
   - Prüfe, dass die rote Meldung nicht erscheint.
   - Prüfe, dass die Felder E-Mail/Passwort/Registrierung aktiv sind.
   - Fülle das Registrierungsformular mit Test-Werten bis unmittelbar vor Absenden (kein Submit).
6. `CHANGELOG.md` + `help-documentation.ts` gemäß Doku-Sync-Pflicht aktualisieren (Patch-Version).

## Abnahmekriterien

- Rote Meldung „Anmeldung ist noch nicht konfiguriert“ verschwunden.
- Registrierungsformular aktiv.
- `trySupabase()` liefert `{ ok: true, client }`.
- `supabase.auth.getSession()` läuft ohne Konfigurationsfehler.
- Keine Schlüssel im Repository ergänzt; nur `config.ts` (Kernfix) sowie `auth.tsx`/`index.tsx` (DEV-Diagnose), `CHANGELOG.md`, `help-documentation.ts` (Doku) verändert.

## Kritische Anmerkung

Die aktuelle `config.ts`-Struktur mit dynamischer Env-Lesung war eine Fehlerquelle, die sich in Dev nicht zeigt (dort ist `import.meta.env` ein echtes Proxy-Objekt) und ausschließlich im Production-Bundle bricht – klassischer „works on my machine“-Fall. Nach dem Fix schlage ich vor, in einem Folge-Prompt einen Vitest gegen den **gebauten** Bundle-Output zu ergänzen (`bun run build` + serve + Headless-Check), damit dieselbe Klasse Fehler zukünftig nicht erneut unbemerkt bleibt.
