# Backend API

Lokaler Node-HTTP-Server zur Trennung von UI und Datenzugriff.

## Struktur

```
backend/
  server.mjs          # HTTP-Server (Node, keine Dependencies)
  routes/
    sync.mjs          # POST /api/sync
    status.mjs        # GET  /api/status
  services/
    syncService.mjs   # Sync-Logik (Mock in dev, Azure in prod)
    statusService.mjs # Status-Aggregation
```

## Start

```bash
node backend/server.mjs
# → http://127.0.0.1:8787
```

Umgebungsvariablen:
- `PORT` (default 8787)
- `HOST` (default 127.0.0.1)
- `NODE_ENV` (`development` default — kein Azure-Zugriff)

## Endpunkte

### `POST /api/sync`
Body (optional): `{ "source": "manual" | "cron" }`
Antwort: `{ ok, mode, recordsProcessed, startedAt, durationMs }`

### `GET /api/status`
Antwort: `{ mode, azure: { allowed, secrets }, sync: { lastRun, ... } }`
Secret-Werte werden **nie** im Klartext zurückgegeben — nur Boolean-Status.

## Sicherheit

- `config/env.js` blockt Azure-Zugriffe im dev-Mode (`assertAzureAllowed`).
- `config/secretManager.js` kapselt ENV-Zugriff, gibt keine Rohwerte zurück.
- Fehler werden generisch beantwortet, Stacktraces nie an Clients gesendet.

## Wichtiger Hinweis zum Deployment

Dieser Server läuft **nur lokal**. Das produktive Lovable-/Cloudflare-Deployment
führt `backend/server.mjs` nicht aus. Wenn die API auch in Production unter
`/api/*` erreichbar sein soll, müssen die Handler zusätzlich als TanStack
server routes unter `src/routes/api/sync.ts` und `src/routes/api/status.ts`
gespiegelt werden — die `services/*` können dabei unverändert importiert werden.
