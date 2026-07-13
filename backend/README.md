# backend/

Framework-freie ESM-Services, die von den TanStack-Server-Routes unter
`src/routes/api/` (Cloudflare Worker mit `nodejs_compat`) importiert werden.

**Kein eigenständiger HTTP-Server mehr.** Der frühere Standalone-Node-
Listener ist mit v1.27.2 nach `archive/legacy-standalone-backend/`
verschoben — Kontext und Rollback-Anleitung dort.

## Module

| Datei                    | Rolle                                                       |
| ------------------------ | ----------------------------------------------------------- |
| `services/syncService.mjs`   | Dashboard-Sync-Logik (Azure/Local), Fehler via `SyncError` |
| `services/statusService.mjs` | Secret-freies `/api/status`-Payload                        |
| `services/ensure-env.mjs`    | Lazy ENV-Guard für Server-Routes (cached)                  |
| `services/rbac.mjs`          | Mirror der Frontend-Permission-Matrix (via `scripts/check-rbac.mjs` verglichen) |
| `services/logger.mjs`        | ESM-Pendant zum Frontend-Logger, gleiche Redaction-Regeln  |

## Regeln

- Keine Framework-Imports (`@tanstack/*`, React, Express …). Nur Node-Standard
  und lokale `config/*.mjs`.
- Kein direkter `console.*` außerhalb `services/logger.mjs` — CI-Guard
  `scripts/check-no-console.mjs`.
- Keine Secrets loggen — `logger` redacted `token|password|authorization|bearer|apikey`
  und JWT-Muster automatisch.
