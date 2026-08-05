# Datenmodell & Export-Schema

Das kanonische Schema für Export/Import und Azure-Sync lebt als Code, nicht
als Prosa — sonst driftet die Doku garantiert.

## Single Source of Truth

- **TypeScript-Typen**: [`src/lib/json-schema.ts`](../src/lib/json-schema.ts)
- **JSON-Schema-Validation** (Runtime): [`src/lib/json-schema-validation-service.ts`](../src/lib/json-schema-validation-service.ts)
- **Fixtures**: [`src/data/dashboard.json`](../src/data/dashboard.json)

Bei Änderungen am Datenmodell **immer** dort ändern, nicht hier.

## Top-Level Shape (verkürzt)

```ts
export type DashboardExport = {
  metadata: {
    version: string;      // Semver, siehe Versionierungsregeln unten
    exportedAt: string;   // ISO-8601
    exportedBy: string;   // userId
  };
  data: {
    engineers: Engineer[];
    projects: Project[];
    workPackages: WorkPackage[];
    activities: Activity[];
  };
};
```

## Versionierungsregeln

Das Export-Format nutzt eine **eigene Semver** unabhängig von der Dashboard-
Version (`CHANGELOG.md`), weil Nutzer alte Backups auch nach mehreren Dashboard-
Releases importieren.

| Änderung                                            | Version-Bump |
| --------------------------------------------------- | ------------ |
| Neues optionales Feld                               | `MINOR`      |
| Neue Enum-Werte (abwärtskompatibel)                 | `MINOR`      |
| Neues Pflichtfeld                                   | `MAJOR`      |
| Umbenennung / Typwechsel eines Felds                | `MAJOR`      |
| Bugfix ohne Schema-Effekt                           | `PATCH`      |

## Migrations-Policy

- **Import älterer MINOR/PATCH** → automatisch (fehlende optionale Felder
  bekommen Defaults).
- **Import älterer MAJOR** → expliziter Migrationsschritt in
  `src/lib/json-import-service.ts`. Migrationen sind **additiv-only** (nie
  Datenpunkte verwerfen), Ergebnis muss `json-schema-validation-service`
  bestehen.
- **Import neuerer MAJOR** → wird abgelehnt mit klarem Fehler.

Jede neue Migration:
1. Migration-Funktion in `json-import-service.ts` ergänzen (`migrateV<N>toV<N+1>`).
2. Testcase in `src/__tests__/integration/import.test.ts`.
3. Handbuch-Kapitel `changelog` mit Import-Kompatibilitätsnotiz.

## Grenzen

- **Keine binären Anhänge** im JSON-Export (Profilbilder werden separat als
  Data-URL im User-Record persistiert — kein Feld für Datei-Assets).
- **Keine Log-Historie** — Logs bleiben ausschließlich in IndexedDB
  (siehe [ADR-0005](./ADR/0005-frontend-logger-no-sentry.md)).
- **Kein Delta-Format** — alle Exports sind Full-Snapshots. Delta-Sync ist
  offenes Thema für später (CRDT-Kandidat).

## Backup-Archiv — Manifest 2.0

Das ZIP-Backup (Service → Backup) nutzt ein eigenes, vom JSON-Exportschema
unabhängiges Format. Seit Dashboard 1.48.0 gilt Manifest-Version `2.0`
(ADR-0022).

```jsonc
{
  "version": "2.0",
  "project": "dashboard",
  "createdAt": "2026-08-05T10:00:00.000Z",
  "keyCount": 12,
  "excludedKeys": ["engineer-dashboard:password_token"],
  "archiveItemCount": 3,
  "note": "…",
  "entries": [
    {
      "logicalName": "storage:engineer-dashboard:profile",
      "storageKey": "engineer-dashboard:profile", // null bei reinen Dokumenten
      "path": "data/engineer-dashboard_profile.json", // reine Speicheradresse
      "checksum": "sha256:…",
      "size": 128,
      "contentType": "application/json",
      "createdAt": "2026-08-05T10:00:00.000Z",
      "description": "optional"
    }
  ]
}
```

Regeln:

- `entries[]` ist die **einzige** fachliche Zuordnung. `path` trägt keine
  Bedeutung und darf frei gewählt werden.
- `logicalName`, `storageKey` (sofern nicht `null`) und `path` sind jeweils
  eindeutig.
- Jede Datei im Archiv außer `manifest.json` besitzt genau einen Eintrag.
- Abweichende Prüfsumme, Größe oder Dateityp bricht den Restore ab.
- Archive ohne `entries[]` (Format 1) werden beim Lesen migriert und mit einer
  Warnung im Restore-Protokoll versehen; sie werden nicht umgeschrieben.
