# API Discovery — Findings

Generated: 2026-08-13T04:48:06.367Z
Dashboard: 1.58.0 · Commit: 88cde9a

## Zusammenfassung

- Endpoints: **3**
- Unklassifiziert: **0**
- Smoke passed / failed / skipped: **2** / **0** / **1**
- Functional coverage complete / partial / missing: **0** / **2** / **1**

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
