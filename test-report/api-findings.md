# API Discovery — Findings

Generated: 2026-07-24T05:45:52.939Z
Dashboard: 1.41.3 · Commit: 452e517

## Zusammenfassung

- Endpoints: **2**
- Unklassifiziert: **0**
- Smoke passed / failed / skipped: **2** / **0** / **0**
- Functional coverage complete / partial / missing: **0** / **2** / **0**

## HIGH (1)

### DISC-HIGH-sync-no-validation — Schreibender Endpoint ohne erkennbare Request-Validierung
- Endpoint: `POST /api/sync`
- Datei: `src/routes/api/sync.ts`
- Kategorie: missing-validation
- Beschreibung: Keine `z.object(...)` o. ä. im Handler gefunden.
- Empfehlung: Zod-Schema für Request-Body ergänzen.

## MEDIUM (4)

### DISC-MED-azure-connection-test-orphan-registry — Registry-Eintrag ohne existierende Route
- Endpoint: `POST /api/azure/connection-test`
- Datei: `src/__tests__/api/registry/endpoints.ts`
- Kategorie: orphan-registry-entry
- Beschreibung: Endpoint ist in der Registry gelistet, aber im Build nicht vorhanden.
- Empfehlung: Registry-Eintrag entfernen oder Route wiederherstellen.

### DISC-MED-azure-export-orphan-registry — Registry-Eintrag ohne existierende Route
- Endpoint: `POST /api/azure/export`
- Datei: `src/__tests__/api/registry/endpoints.ts`
- Kategorie: orphan-registry-entry
- Beschreibung: Endpoint ist in der Registry gelistet, aber im Build nicht vorhanden.
- Empfehlung: Registry-Eintrag entfernen oder Route wiederherstellen.

### DISC-MED-azure-import-orphan-registry — Registry-Eintrag ohne existierende Route
- Endpoint: `POST /api/azure/import`
- Datei: `src/__tests__/api/registry/endpoints.ts`
- Kategorie: orphan-registry-entry
- Beschreibung: Endpoint ist in der Registry gelistet, aber im Build nicht vorhanden.
- Empfehlung: Registry-Eintrag entfernen oder Route wiederherstellen.

### DISC-MED-rbac-assignments-orphan-registry — Registry-Eintrag ohne existierende Route
- Endpoint: `GET,POST,DELETE /api/rbac/assignments`
- Datei: `src/__tests__/api/registry/endpoints.ts`
- Kategorie: orphan-registry-entry
- Beschreibung: Endpoint ist in der Registry gelistet, aber im Build nicht vorhanden.
- Empfehlung: Registry-Eintrag entfernen oder Route wiederherstellen.
