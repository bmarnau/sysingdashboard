## Ursache (verifiziert)

Der veröffentlichte JS-Bundle enthält **keinen** `sb_publishable_*`-Key und keinen Supabase-URL-Wert:

```
curl -s https://sysingdashboard.lovable.app/assets/index-DeqK2Yjw.js \
  | grep -oE '(sb_publishable_[A-Za-z0-9_]{8}|VITE_SUPABASE_[A-Z_]+)'
→ (leer)
```

Damit stehen `import.meta.env.VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` im ausgelieferten Browser-Code auf `undefined`. Die Kette:

1. `src/integrations/supabase/config.ts` (Z. 41–51) liest die drei VITE_-Konstanten statisch. Beide sind leer.
2. `getAuthConfigurationStatus()` liefert `{ status: "missing", missingKeys: ["SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY"] }` (Z. 85–94), weil `readProcessEnv` im Browser nichts liefert.
3. `trySupabase()` (`safe-client.ts`, Z. 21–27) gibt `ok:false` zurück.
4. `src/routes/index.tsx` (Z. 42–43) schaltet in `config-error` → "Die Anmeldung ist noch nicht konfiguriert." Selbe Kette auf `/auth`.

**Warum ist der Bundle leer?**
- `.env` ist git-ignored (bestätigt in `.gitignore`) und existiert nur in der Sandbox.
- Der Lovable-Publish-Build hat im Runner-Environment keine `VITE_SUPABASE_*`-Variablen; Vite ersetzt sie zur Build-Zeit deshalb mit `undefined`.
- Erneutes Publish alleine hilft nicht — solange der Runner die Werte nicht kennt, entsteht immer wieder ein "leerer" Bundle.

**Wichtig:** Serverseitig sind die Pendants **vorhanden**. `/api/status` läuft und die serverseitigen `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` werden von Lovable Cloud in die Worker-Runtime injiziert (sie sind non-secret Publishable-Werte). Nur das Vite-Client-Inlining greift nicht.

## Fix (minimal, kein Refactoring)

Runtime-Fallback: neuer öffentlicher Endpoint `GET /api/public/auth-config`, der aus `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` ein kleines JSON liefert (`{ url, publishableKey }`). Der Browser-Bootstrap holt sich diese Werte, wenn die VITE_-Konstanten leer sind — und initialisiert den Supabase-Client damit. Damit funktioniert die Anmeldung sofort, unabhängig vom Vite-Inlining.

### Änderungen

1. **`src/routes/api/public/auth-config.ts` (neu)** — TanStack Server-Route:
   - `GET` liefert `{ url, publishableKey }` aus `process.env.SUPABASE_URL` und `process.env.SUPABASE_PUBLISHABLE_KEY`. Nur Publishable-Werte; niemals `SUPABASE_SERVICE_ROLE_KEY`. Ablehnt `sb_secret_*` explizit.
   - `Cache-Control: no-store`, kurze Zod-Validierung, keine Logs mit Werten.

2. **`src/integrations/supabase/runtime-config.ts` (neu)** — Browser-Bootstrap:
   - `loadAuthConfig(): Promise<{ url; publishableKey } | null>`
   - Reihenfolge: (a) `import.meta.env.VITE_*` wenn vorhanden, sonst (b) `fetch('/api/public/auth-config')`. Ergebnis wird gecacht (Module-Singleton).
   - Wirft nie; gibt `null` bei Fehler.

3. **`src/integrations/supabase/client.ts` (minimaler Eingriff)** — auto-generierter Header bleibt; die Datei muss aber ohnehin lesen können: statt hart auf VITE_-Konstanten zu prüfen, ruft der Proxy beim ersten Zugriff eine `bootstrapSupabase()`-Funktion aus `runtime-config.ts` auf, die synchron einen bereits geladenen Config-Snapshot liefert. Kein API-Umbau, keine geänderten Exports.

4. **`src/integrations/supabase/safe-client.ts`** — `trySupabase()` prüft zusätzlich den Snapshot aus `runtime-config.ts`, damit `getAuthConfigurationStatus()` bei Runtime-Fallback nicht mehr `"missing"` meldet.

5. **`src/routes/__root.tsx`** — `runStartupEnvCheck()`-Aufruf bleibt; zusätzlich wird **einmalig vor der ersten Auth-Nutzung** `loadAuthConfig()` awaited (im vorhandenen dynamischen Import-Block, Z. ~153). Kein neuer Provider, keine Änderung an der Route-Struktur.

6. **`.env.example`** — Kommentar ergänzen: bei fehlendem VITE_-Inlining greift der Runtime-Fallback über `/api/public/auth-config`.

7. **Doku**: `CHANGELOG.md` (v1.41.4 – „Auth-Config Runtime-Fallback"), Kapitel in `src/lib/help-documentation.ts` ("Auth-Bootstrap"), `test-report/technical-test-report.md`-Notiz.

### Was **nicht** angefasst wird

- RBAC / RLS / Datenbank-Policies
- Azure-Pfad und `/api/status`
- Auth-Gate (`_authenticated/route.tsx`), Login-Flow, Reset-Password
- Vite-Config, Build-Runner-Einstellungen

### Validierung

- Unit: Test für `runtime-config.ts` (VITE-Path, Fetch-Path, Fehlerpfad).
- Manuell/Playwright: Landing zeigt "Anmelden" (kein Config-Error), `/auth` lädt, Login mit Testuser, Reload, Signout, Password-Reset — jeweils in Preview UND Published.
- Bundle-Scan: bestätigen, dass der neue Endpoint auf `sysingdashboard.lovable.app/api/public/auth-config` `{ url, publishableKey }` liefert.

### Abschlussbericht (Template nach Umsetzung)

- Ursache: VITE_SUPABASE_*-Konstanten im Publish-Build nicht inlined → Client-Config leer → "nicht konfiguriert".
- Betroffene Dateien: siehe Liste oben.
- Testergebnisse: Vitest grün, Playwright Auth-Flows grün, identisches Verhalten Preview ↔ Published.
