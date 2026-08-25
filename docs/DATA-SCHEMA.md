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
    version: string; // Semver, siehe Versionierungsregeln unten
    exportedAt: string; // ISO-8601
    exportedBy: string; // userId
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

| Änderung                             | Version-Bump |
| ------------------------------------ | ------------ |
| Neues optionales Feld                | `MINOR`      |
| Neue Enum-Werte (abwärtskompatibel)  | `MINOR`      |
| Neues Pflichtfeld                    | `MAJOR`      |
| Umbenennung / Typwechsel eines Felds | `MAJOR`      |
| Bugfix ohne Schema-Effekt            | `PATCH`      |

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
      "description": "optional",
    },
  ],
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

---

# Supabase-Datenbankstand

Stand: Dashboard 1.52.0 (Sprint 07B). Dieser Abschnitt beschreibt **den
tatsächlich migrierten Zustand**, nicht die Planung. Geplante, aber nicht
angelegte Tabellen sind hier nicht aufgeführt. Technische Begründungen:
[ADR-0025](./ADR/0025-avkk-umsetzung-07b.md).

Alle Tabellen liegen im Schema `public`, haben RLS aktiviert und `id uuid`
(Default `gen_random_uuid()`) als Primärschlüssel, sofern nicht anders
vermerkt.

## 1. Plattform- und Identitätstabellen (Bestand)

| Tabelle        | PK                  | Zweck                             | Besonderheiten                                         |
| -------------- | ------------------- | --------------------------------- | ------------------------------------------------------ |
| `profiles`     | `id` → `auth.users` | Benutzerprofil                    | Status `active/inactive/locked/archived`, kein DELETE  |
| `user_roles`   | `id`                | Rollenzuordnung                   | `UNIQUE (user_id, role)`, Enum `app_role` (7 Werte)    |
| `app_settings` | `key`               | Key/Value-Konfiguration (`jsonb`) | Audit-Trigger, kein DELETE                             |
| `audit_log`    | `id`                | Zentrales Protokoll               | append-only, kein UPDATE/DELETE, nur Trigger schreiben |

## 2. Reference Data

### `reference_catalog`

`key` (unique), `name`, `description`, `domain`, `is_system`,
`is_hierarchical`, `version` (Integer, durch Trigger erhöht), `created_at`,
`updated_at`.

### `reference_value`

`catalog_id` → `reference_catalog.id`, `key`, `label`, `description`,
`sort_order`, `is_active`, `is_default`, `parent_value_id` →
`reference_value.id` (Selbstreferenz für hierarchische Kataloge),
`attributes jsonb`, `valid_from`, `valid_to`, `created_by`/`updated_by` →
`auth.users.id`.

- `UNIQUE (catalog_id, key)`
- Index `(catalog_id, sort_order)`
- Kein DELETE: Werte werden über `is_active = false` und `valid_to` beendet.

### `reference_value_history`

`value_id`, `catalog_id`, `operation` (`insert` | `update`), `snapshot jsonb`,
`changed_by`, `changed_at`. Append-only, kein UPDATE/DELETE. Index
`(value_id, changed_at DESC)`.

**Trigger**: `reference_value_track_change` (AFTER INSERT/UPDATE) schreibt die
Historie, erhöht `reference_catalog.version` und protokolliert in `audit_log`.
`set_updated_at` auf beiden Tabellen.

## 3. AVKK

### `avkk_subject` — polymorpher Aufgabenbezug

`subject_type text`, `subject_id text`, `subject_title_snapshot text`,
`status text`, `version integer`, `created_by`, `updated_by`.

- `CHECK subject_type IN ('project','workpackage','activity','measure')`
- `UNIQUE (subject_type, subject_id)`
- **Keine Fremdschlüsselbeziehung** zu den Aufgabenobjekten — siehe
  Abschnitt 6.

### `avkk_responsibility`

`avkk_subject_id` → `avkk_subject.id`, `person_id` → `profiles.id`,
`role_value_id` → `reference_value.id`, `role_key_snapshot`,
`role_label_snapshot`, `note`, `valid_from`, `valid_to`.
Indizes auf `avkk_subject_id` und `person_id`. Einzige AVKK-Tabelle mit
erlaubtem DELETE.

### `avkk_responsibility_type`

`responsibility_id` → `avkk_responsibility.id` (n:m zu Verantwortungsarten),
`type_value_id` → `reference_value.id`, `type_key_snapshot`,
`type_label_snapshot`. Kein UPDATE erlaubt.

### `avkk_competence`

`avkk_subject_id`, `dimension_value_id` und `rating_value_id` →
`reference_value.id` jeweils mit `key`/`label`-Snapshot, `support_needed`,
`note`, `superseded_at`. Bewertungen werden **fortgeschrieben**: die alte Zeile
erhält `superseded_at`, eine neue Zeile wird eingefügt. Index
`(avkk_subject_id, superseded_at)`. Kein DELETE.

### `avkk_consequence`

`avkk_subject_id`, `area_value_id`, `severity_value_id`,
`schedule_impact_value_id` (je → `reference_value.id`, je mit
`key`/`label`-Snapshot), `description`, `superseded_at`. Index
`(avkk_subject_id, superseded_at)`. Kein DELETE.

**Trigger**: `avkk_audit_change` (AFTER INSERT/UPDATE/DELETE) auf allen
AVKK-Tabellen, `set_updated_at` wo `updated_at` existiert.

## 4. Grants und RLS

Für jede Tabelle gilt:

```sql
GRANT SELECT, INSERT, UPDATE ON public.<table> TO authenticated;  -- DELETE nur avkk_responsibility(_type)
GRANT ALL ON public.<table> TO service_role;
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
```

`anon` erhält durch **keine** Policy Zugriff auf AVKK- oder
Reference-Data-Tabellen.

| Tabelle                    | SELECT               | INSERT / UPDATE                                         | DELETE   |
| -------------------------- | -------------------- | ------------------------------------------------------- | -------- |
| `reference_catalog`        | `referencedata.view` | `referencedata.manage`                                  | verboten |
| `reference_value`          | `referencedata.view` | `referencedata.manage`                                  | verboten |
| `reference_value_history`  | `referencedata.view` | nur Trigger                                             | verboten |
| `avkk_subject`             | `avkk.view`          | `avkk.edit` (+ `created_by = auth.uid()` beim Einfügen) | verboten |
| `avkk_responsibility`      | `avkk.view`          | `avkk.responsibility.assign`                            | erlaubt  |
| `avkk_responsibility_type` | `avkk.view`          | `avkk.responsibility.assign`                            | erlaubt  |
| `avkk_competence`          | `avkk.view`          | `avkk_can_write(avkk_subject_id)`                       | verboten |
| `avkk_consequence`         | `avkk.view`          | `avkk_can_write(avkk_subject_id)`                       | verboten |

## 5. Datenbankfunktionen

| Funktion                         | Modus           | Rückgabe  | Zweck                                                               |
| -------------------------------- | --------------- | --------- | ------------------------------------------------------------------- |
| `has_permission(uuid, text)`     | STABLE, INVOKER | `boolean` | Rollenmatrix, Basis aller Policies                                  |
| `has_role(uuid, app_role)`       | STABLE, INVOKER | `boolean` | Einzelrollenprüfung                                                 |
| `has_any_role(uuid, app_role[])` | STABLE, INVOKER | `boolean` | Mehrfachrollenprüfung                                               |
| `is_account_active(uuid)`        | STABLE, INVOKER | `boolean` | Kontostatus                                                         |
| `avkk_can_write(uuid)`           | STABLE, DEFINER | `boolean` | Schreibentscheidung je AVKK-Subject; Ingenieure nur eigen/zuständig |
| `avkk_people_directory()`        | STABLE, DEFINER | Tabelle   | Minimaler AVKK-Personenvertrag (ID, Name, Rolle, Status)            |

Die INVOKER-Funktionen setzen `search_path = public`. Die beiden
SECURITY-DEFINER-Funktionen setzen seit SEC-01 (Issue #89) `search_path = ''`
und referenzieren alle Objekte vollständig schemaqualifiziert.

`avkk_can_write` bleibt bewusst SECURITY DEFINER: Sie liest `avkk_subject` und
wird zugleich in der UPDATE-Policy genau dieser Tabelle ausgewertet — als
SECURITY INVOKER entstünde eine RLS-Rekursion. Sie ist für `authenticated`
ausführbar, weil die Policy-Auswertung das erfordert; bewertet und akzeptiert
in ADR-0025 sowie im technischen Prüfbericht (`man:avkk-can-write-execute`).

`avkk_people_directory()` bleibt ebenfalls SECURITY DEFINER, weil `profiles`
Nicht-Administratoren per RLS nur die eigene Zeile freigibt. Die Funktion prüft
`auth.uid()` und `avkk.view` im Rumpf und gibt ausschließlich ID, Anzeigename,
Rolle und Status aus — keine E-Mail, Telefonnummer, MFA-Information oder
Profilbilder (`man:avkk-people-directory-definer`).

Für beide Funktionen besitzen `PUBLIC` und `anon` kein `EXECUTE`.

### Lesbarkeit von `app_settings` (SEC-01)

Angemeldete Benutzer lesen nur die ausdrücklich freigegebenen Keys
`idle_timeout_minutes` und `avkk.risk_threshold`
(`app_settings_read_public_keys`). Alle übrigen — auch künftig hinzugefügten —
Keys sind ausschließlich mit der Berechtigung `users.manage` lesbar
(`app_settings_read_admin`). Damit gilt deny-by-default: Ein neuer
client-lesbarer Key erfordert bewusst eine Migration. Schreibende Zugriffe
bleiben unverändert an `users.manage` gebunden. Nachweis:
`supabase/tests/sec01-settings-and-avkk-definer.sql`.

Settings mit Vertraulichkeitsbedarf (Endpunkte, Kennungen,
Integrationsparameter) gehören nicht in `app_settings`, sondern in die
Secret-Verwaltung bzw. eine ausschließlich serverseitig gelesene Tabelle.


## 6. Bekannte Integritätsgrenzen

1. **Polymorphe Referenz ohne FK**: `avkk_subject.subject_id` ist `text` und
   verweist auf lokal gespeicherte Aufgabenobjekte. Verwaiste Datensätze sind
   möglich. Absicherung: `CHECK` auf den Typ, `UNIQUE (subject_type,
subject_id)`, Titel-Snapshot, Existenzprüfung im Service und die
   Integritätsprüfung `findOrphanSubjects()`.
2. **Snapshot-Redundanz**: Katalogtexte werden in AVKK-Zeilen dupliziert. Das
   ist bewusst — historische Datensätze bleiben nach Umbenennungen lesbar,
   erfordern aber, dass Auswertungen den Snapshot und nicht den Katalog lesen.
3. **Bestands-Enums noch nicht migriert**: `WorkPackageStatus`, `Priority`,
   `ActivityCategory`, `ProjectStatus` und `BillingStatus` sind weiterhin
   TypeScript-Union-Typen und Bestandteil von Import/Export und Backup 2.0.
4. **AVKK ist nicht Teil des Export-/Backupformats**: Das JSON-Exportschema und
   Backup 2.0 decken nur die Local-First-Daten ab. AVKK-Daten liegen
   ausschließlich in Supabase und werden dort gesichert.
