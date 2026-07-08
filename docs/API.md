# API Reference

Server-Routen des Dashboards. Alle Endpoints liegen unter `src/routes/api/`
(TanStack Start Server-Routes) und laufen im Cloudflare Worker.

**Auth-Status (Stand 2026-07-08)**: Es gibt aktuell **keine Authentifizierung**.
Endpoints sind auf published-Deployments öffentlich erreichbar. Vor Go-Live
mit realen Kundendaten muss Auth ergänzt werden (siehe [ADR-0002](./ADR/0002-frontend-rbac-mirrored.md)).

## `GET /api/status`

Health-/Systemstatus, secret-frei. Wird vom Dashboard-Dialog
„Service → Systemstatus…" und externen Uptime-Checks konsumiert.

**Response 200** (`application/json`):
```json
{
  "status": "ok",
  "version": "1.24.0",
  "commit": "abc1234",
  "buildTime": "2026-07-08T09:00:00.000Z",
  "azure": { "configured": false, "reachable": null },
  "env": { "mode": "production", "validated": true }
}
```

Response-Shape wird von `backend/services/statusService.mjs` +
`src/routes/api/status.ts` erzeugt. Enthält **keine** Connection-Strings, SAS,
Tokens.

**Fehler**:
- `405` bei anderer HTTP-Methode als `GET`.
- `500` bei ENV-Validation-Failure (nur PROD).

## `POST /api/sync`

Triggert einen manuellen Sync der lokalen Dashboard-Daten zu Azure (SQL /
Table Storage / Blob). Aufrufer ist typischerweise der Sync-Button im
Dashboard.

**Request Body** (`application/json`):
```json
{
  "engineers": [...],
  "projects": [...],
  "workPackages": [...],
  "activities": [...]
}
```
Shape: siehe [`DATA-SCHEMA.md`](./DATA-SCHEMA.md) und `src/lib/json-schema.ts`.

**Response 200**:
```json
{
  "ok": true,
  "written": { "projects": 12, "workPackages": 84, "activities": 302 },
  "durationMs": 431
}
```

**Fehler**:
- `400` bei Schema-Verletzung (Zod-Validation).
- `405` bei anderer HTTP-Methode als `POST`.
- `500` bei Azure-Fehler — Details im Response-Body, Secret-frei.
- `503` wenn `AZURE_*`-ENV in PROD nicht gesetzt.

## Nicht öffentliche Endpoints

Es gibt derzeit **keine** `/api/public/*`-Routen, keine Webhooks, keine Cron-
Endpoints. Sollten welche entstehen: **immer** Signatur-Verifikation im Handler
(HMAC + `timingSafeEqual`), da `/api/public/*` auf published-Sites Auth
umgeht.

## Standalone-Backend (`backend/`)

Für lokale Entwicklung/Ops läuft `backend/server.mjs` als eigenständiger
Node-ESM-HTTP-Server mit denselben Routes. Nicht Teil des Produktions-Deployments.
