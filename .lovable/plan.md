## Ziel

`POST /api/sync` und `GET /api/status` auch im Lovable-/Cloudflare-Deployment erreichbar machen, ohne Logik zu duplizieren. Trennung UI ↔ Datenzugriff über klare Modulgrenzen statt eines separaten Prozesses.

## Architektur

```text
backend/
  services/        framework-frei, einzige Stelle mit Business-Logik
    syncService    runSync(), getSyncMeta()
    statusService  getStatus()
  routes/          Node-HTTP-Adapter (lokaler Dev-Server, bleibt bestehen)
  server.cjs       node backend/server.cjs  (nur lokal)
src/routes/api/
  sync.ts          TanStack-Server-Route → ruft services/syncService
  status.ts        TanStack-Server-Route → ruft services/statusService
```

Frontend ruft ausschließlich `/api/sync` und `/api/status` (relative URLs, gleiche Origin). Kein direkter Azure-Import im Client.

## Schritte

1. **Services ESM-kompatibel machen.** TanStack-Server-Routes laufen im ESM-Bundle, können `.cjs` nicht statisch importieren. Lösung: Services in `backend/services/*.mjs` (ESM) umstellen und `backend/routes/*.cjs` + `backend/server.cjs` per dynamischem `import()` darauf zugreifen lassen. Dadurch:
   - eine einzige Quelle für `runSync`/`getStatus`
   - der lokale Node-Server läuft weiter (`node backend/server.cjs`)
   - die TSS-Routes können die Services normal importieren
   - `config/env.cjs` und `config/secretManager.cjs` werden parallel als `.mjs` bereitgestellt (gleicher Inhalt, ESM-Exports), damit beide Welten ohne Interop-Reibung importieren können.

2. **Server-Route `src/routes/api/status.ts`** — `GET`-Handler ruft `getStatus()` aus `backend/services/statusService.mjs`, antwortet JSON. CORS nicht nötig (same-origin).

3. **Server-Route `src/routes/api/sync.ts`** — `POST`-Handler liest JSON-Body (optional `{ source }`), validiert mit Zod, ruft `runSync()`. Fehler → generische 500-Antwort, keine Stacktraces an Clients. Kein `OPTIONS`-Handler (same-origin).

4. **Modulgrenzen härten.** In `backend/services/syncService.mjs` bleibt der Azure-Pfad weiter durch `assertAzureAllowed()` und `secretManager.consume()` geschützt. Damit gilt auch in Production: ohne gesetzte Secrets wirft `runSync()` kontrolliert, der Worker liefert 500 ohne Secret-Leak.

5. **Lebenszeichen-Test.** Nach Build die zwei Endpunkte über `invoke-server-function` aufrufen (`GET /api/status`, `POST /api/sync`) und Antworten verifizieren.

6. **Doku-Sync** (Projekt-Pflicht):
   - `CHANGELOG.md`: neuer Eintrag `1.16.0 - 2026-06-22`, beschreibt die Spiegelung als TSS-Server-Routes.
   - `src/lib/help-documentation.ts`: Wenn ein passendes HelpTopic existiert (Backend/Architektur), `lastUpdated` aktualisieren; falls nicht, ein neues Topic „Backend-API" anlegen (kurz: Endpunkte, Dev vs. Prod, Sicherheitsregeln).
   - `bun run docs:check` ausführen.

## Bewusst nicht im Umfang

- **Frontend-Refactor.** Es gibt aktuell keinen direkten Azure-Zugriff im Client (Dashboard arbeitet lokal/IndexedDB). Ich erzwinge die Regel „Frontend darf nur die API nutzen" nicht durch Refactor bestehender Services — das wäre ein eigener, größerer Schritt. Sobald echte Datenanbindung kommt, läuft sie über `fetch('/api/...')`.
- **Auth auf den Routes.** `/api/*` ist in TSS standardmäßig öffentlich. Falls die Endpunkte später nicht öffentlich sein dürfen, separate Folgeaufgabe (Supabase-Auth-Middleware oder Webhook-Secret).
- **Keine neuen Dependencies.** Weder Express noch ein HTTP-Framework — wir nutzen die bereits vorhandenen TSS-Server-Routes und die bestehende Node-`http`-Implementierung.

## Kritischer Hinweis

Die Verlagerung auf TSS-Server-Routes ist der einzige Weg, der in eurem Cloudflare-Deployment tatsächlich live geht. Der separate `backend/server.cjs` bleibt nützlich für lokale Node-Tests und CI-Skripte, ist aber **nicht** der Production-Pfad. Wenn ihr später entscheidet, dass der Standalone-Server nicht mehr gebraucht wird, kann `backend/server.cjs` + `backend/routes/*.cjs` ersatzlos gelöscht werden — die Services wandern dann nach `src/lib/` und werden direkt von den TSS-Routes importiert. Sag Bescheid, falls ich diese Vereinfachung direkt mitmachen soll.