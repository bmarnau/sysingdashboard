# Legacy Standalone Backend (archiviert in v1.27.2)

Historischer Node-ESM-HTTP-Server. Ursprünglich für lokale Entwicklung /
Ops-CLI gedacht, seit **v1.16.0** durch TanStack-Server-Routen unter
`src/routes/api/` abgelöst. Nicht mehr aus dem Runtime-Pfad importiert,
kein npm-Script referenziert ihn.

## Inhalt

| Datei                 | Zweck                                                |
| --------------------- | ---------------------------------------------------- |
| `server.mjs`          | Node-`http`-Listener + CORS + Route-Dispatch         |
| `routes/status.mjs`   | Adapter `/api/status` → `backend/services/statusService.mjs` |
| `routes/sync.mjs`     | Adapter `/api/sync`   → `backend/services/syncService.mjs`   |
| `README-original.md`  | Original-README des `backend/`-Verzeichnisses        |

## Was blieb produktiv?

`backend/services/*.mjs` (framework-frei) wird weiterhin direkt von den
TanStack-Server-Routen importiert und ist **nicht** archiviert.

## Reaktivierung (Notfall)

```bash
mv archive/legacy-standalone-backend/server.mjs backend/server.mjs
mv archive/legacy-standalone-backend/routes     backend/routes
# Start:
node backend/server.mjs
```

Danach: neuen CHANGELOG-Eintrag und ADR-Notiz zur Begründung ergänzen,
sowie `scripts/check-no-console.mjs` um `backend/routes` / `backend/server.mjs`
wieder erweitern.
