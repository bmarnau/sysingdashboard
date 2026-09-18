# API Reference

Server-Routen des Dashboards. Alle Endpoints liegen unter `src/routes/api/`
(TanStack Start Server-Routes) und laufen im Cloudflare Worker.

> **Wahrheitsquelle ist ab v1.34.0 das automatisch erzeugte Inventar**
> `test-report/api-inventory.json` (siehe ADR-0014, Handbuch-Kapitel
> „API Discovery und Testabdeckung"). Dieses Dokument beschreibt
> vertragsrelevante Details (Payload-Beispiele, Fehlercodes) und wird
> gegen das Inventar per CI abgeglichen.

**Auth-Status (Stand 2026-09-18)**: Supabase Auth ist die aktive MVP-/BSF-Authentifizierung. Öffentliche
Health-Routen bleiben anonym und secret-frei; schreibende Routen benötigen eine
gültige Bearer-Session und prüfen Berechtigungen serverseitig.

## `GET /api/status`

Health-/Systemstatus, secret-frei. Wird vom Dashboard-Dialog
„Service → Systemstatus…" und externen Uptime-Checks konsumiert.

**Response 200** (`application/json`):

```json
{
  "status": "ok",
  "version": "1.64.0",
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
- `500` nur bei unerwartetem Handler-Fehler; fehlende optionale Azure-ENV wird
  im Payload als Status gemeldet und blockiert Health nicht.

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

- **Auth**: `Authorization: Bearer <Session-Token>` ist Pflicht. Der Handler
  validiert den Benutzer über den Auth-Service und prüft danach
  `has_permission(user, 'azure.export')` bzw. `has_permission(user, 'azure.import')`.

**Fehler**:

- `401` ohne gültige Session.
- `403` bei fehlender Azure-Berechtigung.
- `400` bei Schema-Verletzung (Zod-Validation).
- `405` bei anderer HTTP-Methode als `POST`.
- `500` bei Azure-Fehler — Details im Response-Body, Secret-frei.
- `503` wenn `AZURE_*`-ENV in PROD nicht gesetzt.

## Öffentliche Endpoints

`GET /api/public/auth-config` liefert ausschließlich die für den Browser erforderliche
öffentliche Supabase-Clientkonfiguration als Laufzeit-Fallback. Die Route liefert keine
Service-Role-Keys, Passwörter oder sonstigen Geheimnisse und ist durch eigene Security-/
Contract-Tests abgesichert.

Weitere Webhooks oder Cron-Endpunkte existieren derzeit nicht. Neue öffentliche,
zustandsändernde Endpoints benötigen einen eigenen Authentizitätsvertrag
(z. B. Signatur-Verifikation) und dürfen nicht allein aufgrund des Pfads als vertrauenswürdig
behandelt werden.

## Historisches Standalone-Backend

Bis v1.16.0 lief ein eigenständiger Node-ESM-HTTP-Server (`backend/server.mjs`)
für lokale Entwicklung. Ersetzt durch die TanStack-Server-Routen oben.
Die framework-freien Services unter `backend/services/` sind geblieben und
werden von beiden Wegen importiert. Die alten Server-/Routes-Dateien liegen
zu Referenzzwecken unter `archive/legacy-standalone-backend/`.

## Endpoint-Selbstdeklaration (`endpointMeta`)

Ab v1.34.1 dürfen Routen ihre Klassifizierung direkt exportieren.
API Discovery liest den Block statisch und behandelt ihn vor Registry und
Heuristik:

```ts
export const endpointMeta = {
  public: true,
  reason: "Health/Status – kein Secret, kein State",
  classification: "public",
} as const;
```

`reason` ist Pflicht bei `public: true` — sonst erzeugt Discovery das
Low-Finding `public-without-reason`. Details: ADR-0014 (Amendment).
