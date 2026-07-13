# API Discovery — Findings

Generated: 2026-07-13T05:31:47.533Z
Dashboard: 1.33.0 · Commit: f508bed

## Zusammenfassung

- Endpoints: **2**
- Unklassifiziert: **1**
- Smoke passed / failed / skipped: **2** / **0** / **0**
- Functional coverage complete / partial / missing: **0** / **2** / **0**

## CRITICAL (1)

### DISC-CRIT-sync-no-auth — Endpoint mit Wirkung write ohne Authentifizierung
- Endpoint: `POST /api/sync`
- Datei: `src/routes/api/sync.ts`
- Kategorie: privileged-without-auth
- Beschreibung: Anonymer Aufruf verändert Daten oder löst schreibende Operationen aus.
- Empfehlung: Auth-Middleware ergänzen und Permission-Guard serverseitig prüfen.

## MEDIUM (5)

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

### DISC-MED-status-unclassified — Endpoint ist nicht klassifiziert
- Endpoint: `GET /api/status`
- Datei: `src/routes/api/status.ts`
- Kategorie: unclassified-endpoint
- Beschreibung: Keine Auth, keine Permission, kein /api/public/ Prefix — Klassifizierung explizit setzen.
- Empfehlung: In Registry `permission`/`authRequired` setzen oder unter `/api/public/*` mit Signaturprüfung ablegen.
