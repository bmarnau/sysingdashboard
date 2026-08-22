# Datenmodell & Export-Schema

Stand: 2026-08-22

Das kanonische Schema fuer Export/Import und spaetere Provider-Synchronisation
lebt als Code, nicht als Prosa. Dieses Dokument beschreibt die Grenzen und den
tatsaechlich migrierten Supabase-Stand, ohne den Codevertrag zu duplizieren.

## Single Source of Truth

- **TypeScript-/Zod-Schema**: [`src/lib/json-schema.ts`](../src/lib/json-schema.ts)
- **JSON-Schema-Validation**: [`src/lib/json-schema-validation-service.ts`](../src/lib/json-schema-validation-service.ts)
- **Backupformat**: [`src/lib/backup/`](../src/lib/backup/)
- **Supabase-Migrationen**: [`supabase/migrations/`](../supabase/migrations/)

Bei Aenderungen am Datenmodell wird zuerst der jeweilige Code-/Migrationsvertrag
geaendert. Diese Datei dokumentiert den daraus abgeleiteten Ist-Zustand.

---

# JSON-Export / Import

## Schema-Version 1.1.0

Seit Schema 1.1.0 ist AVKK als optionaler, additiver Block Bestandteil des
JSON-Vertrags. Dokumente ohne `avkk` bleiben abwaertskompatibel gueltig.

Verkuerzte Struktur:

```ts
export type DashboardJsonExport = {
  schemaVersion: string;
  exportType: "full" | "partial";
  exportedAt: string;
  exportedBy: string;
  dashboardVersion: string;
  scopes?: Array<
    | "users"
    | "customers"
    | "projects"
    | "workpackages"
    | "activities"
    | "timeentries"
    | "settings"
    | "targettime"
    | "avkk"
  >;
  users?: UserProfileExport[];
  customers?: CustomerExport[];
  projects?: ProjectExport[];
  workPackages?: WorkPackageExport[];
  activities?: ActivityExport[];
  timeEntries?: TimeEntryExport[];
  targetTimeModels?: TargetTimeModelExport[];
  settings?: DashboardSettingsExport[];
  avkk?: AvkkExport;
};
```

Der AVKK-Block enthaelt Subjects, Verantwortungen, Kompetenzbewertungen,
Konsequenzen, Katalogreferenzen und die fuer den Snapshot benoetigten
Reference-Data-Werte. Labels werden als historische Momentaufnahme mitgefuehrt.
Zugangsdaten gehoeren nicht in diesen Vertrag.

## Versionierungsregeln

Das Exportformat nutzt eine eigene Semver unabhaengig von der
Dashboard-Version (`CHANGELOG.md`).

| Aenderung                             | Version-Bump |
| ------------------------------------ | ------------ |
| Neues optionales Feld               | MINOR        |
| Neue Enum-Werte, abwaertskompatibel | MINOR        |
| Neues Pflichtfeld                   | MAJOR        |
| Umbenennung / Typwechsel            | MAJOR        |
| Bugfix ohne Schema-Effekt           | PATCH        |

## Migrations-Policy

- Aeltere MINOR/PATCH-Versionen: kompatibel lesen bzw. mit Defaults ergaenzen.
- Aeltere MAJOR-Versionen: expliziter, additiver Migrationsschritt im Import.
- Neuere unbekannte MAJOR-Versionen: ablehnen statt stillschweigend Daten zu
  verlieren.

Jede Migration benoetigt Code, Regressionstest und Dokumentation.

## Grenzen des JSON-Vertrags

- Keine beliebigen binaeren Datei-Anhaenge.
- Keine Log-Historie; Logs bleiben im dafuer vorgesehenen lokalen Log-Speicher.
- Kein Delta-/CRDT-Format; der heutige Export ist Snapshot-orientiert.
- Der Kundenblock ist im aktuellen Modell teilweise synthetisch aus
  bestehenden Kundenbezeichnungen abgeleitet. Ein eigenstaendiges
  Kundenverantwortungsmodell ist ein spaeteres Fachthema.

---

# Backup-Archiv — Manifest 2.0

Das ZIP-Backup nutzt ein eigenes, vom JSON-Exportschema getrennt versioniertes
Manifest. Seit Dashboard 1.48.0 gilt Manifest-Version `2.0` (ADR-0022).

Verkuerzt:

```jsonc
{
  "version": "2.0",
  "project": "dashboard",
  "createdAt": "2026-08-05T10:00:00.000Z",
  "entries": [
    {
      "logicalName": "storage:engineer-dashboard:profile",
      "storageKey": "engineer-dashboard:profile",
      "path": "data/engineer-dashboard_profile.json",
      "checksum": "sha256:...",
      "size": 128,
      "contentType": "application/json",
      "createdAt": "2026-08-05T10:00:00.000Z"
    }
  ]
}
```

Regeln:

- `entries[]` ist die fachliche Zuordnung; Dateinamen selbst haben keine
  fachliche Bedeutung.
- `logicalName`, `storageKey` und `path` sind im jeweils zulaessigen Scope
  eindeutig.
- Jede Archivdatei ausser `manifest.json` besitzt genau einen Manifest-Eintrag.
- Pruefsumme, Groesse und Dateityp werden vor Restore validiert.
- Altarchive ohne `entries[]` koennen gelesen und intern auf den aktuellen
  Vertrag abgebildet werden; sie werden nicht stillschweigend umgeschrieben.

## AVKK und Reference Data im Backup

Seit Sprint 08B fuehrt das Backup zusaetzlich AVKK-/Reference-Data-Snapshots
(`avkk.json`, `reference-data.json`). Diese Daten werden mit Manifest und
Pruefsummen validiert.

Wichtig: Der Browser-Restore **schreibt AVKK nicht in Supabase zurueck**.
`restoreFromZip()` validiert IDs, Subjects, Katalogwerte und Katalogversionen
und erzeugt einen Restore-Bericht. Verwaiste lokale Aufgabenbezuege werden als
Quarantaene gemeldet. Ein Datenbank-Restore gehoert auf die Provider-/DB-Ebene
und darf nicht als Browsertransaktion simuliert werden.

Verbindliche Entscheidung: [ADR-0026](./ADR/0026-loeschstrategie-und-avkk-backup.md).

---

# Supabase-Datenbankstand

Dieser Abschnitt beschreibt den tatsaechlich migrierten MVP-Stand. Supabase ist
die fuehrende Authentifizierungs- und serverseitige Datenplattform des MVP.
Projekte, Arbeitspakete und Taetigkeiten bleiben im aktuellen Modell weiterhin
Local-First/browsergebunden.

Alle fachlichen Tabellen liegen im Schema `public`, sind durch explizite Grants
und RLS abgesichert und werden ueber die versionierten Migrationen aufgebaut.

## 1. Plattform- und Identitaetstabellen

| Tabelle        | Zweck                                  | Besonderheiten                                      |
| -------------- | -------------------------------------- | --------------------------------------------------- |
| `profiles`     | Benutzerprofil                         | Bezug zu `auth.users`, Kontostatus, RLS             |
| `user_roles`   | Rollenzuordnung                        | getrennt vom Profil, DB-seitige Schutzregeln        |
| `app_settings` | globale Laufzeit-/Facheinstellungen    | authentifiziert lesbar, Schreiben berechtigt/audit  |
| `audit_log`    | zentrales Pruefprotokoll               | append-orientiert, Schreibpfade kontrolliert        |

Authentifizierungsidentitaeten selbst liegen in `auth.users` und werden von
Supabase Auth verwaltet.

## 2. Reference Data

### `reference_catalog`

Katalogkopf mit `key`, Name, Beschreibung, Domaene, System-/Hierarchieflag,
Version und Zeitstempeln.

### `reference_value`

Versionierbare Katalogwerte mit Key/Label, Sortierung, Aktivstatus, optionaler
Hierarchie, Attributen, Gueltigkeit und Actor-Referenzen.

Werte werden fachlich deaktiviert bzw. zeitlich beendet statt als regulaerer
Pflegeweg entfernt.

### `reference_value_history`

Append-orientierte Historie fuer Katalogaenderungen. Der Trigger
`reference_value_track_change` schreibt Historie, erhoeht die Katalogversion und
protokolliert den Vorgang im Audit.

## 3. AVKK

### `avkk_subject`

Polymorpher Bezug eines AVKK-Sachverhalts auf ein Aufgabenobjekt. Der
Datenbankvertrag akzeptiert aus Kompatibilitaetsgruenden die Typen
`project`, `workpackage`, `activity` und `measure`.

**MVP-Fachscope:** In der produktiven AVKK-Arbeits- und Managementsicht sind nur
`project` und `workpackage` delegierbare AVKK-Aufgaben. `activity` bleibt ein
operativer Arbeits-/Leistungsnachweis; `measure` ist Zukunfts-/Legacy-Scope.
Die breitere DB-Enum ist daher kein Auftrag, diese Typen in der MVP-UI als
AVKK-Aufgaben anzuzeigen.

Es besteht weiterhin keine relationale Fremdschluesselbeziehung zu den lokal
gefuehrten Aufgabenobjekten. Titel-Snapshot, Typ-/ID-Eindeutigkeit und
Servicepruefungen sichern diese Grenze ab.

### `avkk_responsibility`

Verantwortungszuordnung mit Person, Rollen-Snapshot, Notiz und
Gueltigkeitszeitraum. Aenderungen an aktiver Verantwortung werden ueber die
berechtigten AVKK-Verantwortungspfade vorgenommen; fachlich bevorzugt das
aktuelle Modell Historisierung/Beendigung (`valid_to`) statt stiller
Ueberschreibung.

### `avkk_responsibility_type`

n:m-Zuordnung einer Verantwortung zu Verantwortungsarten mit Key-/Label-Snapshot.

### `avkk_competence`

Kompetenzdimension und Bewertung mit `support_needed`, Notiz und
`superseded_at`. Neue Bewertungen schreiben eine neue fachliche Historienstufe;
alte Bewertungen bleiben nachvollziehbar.

### `avkk_consequence`

Konsequenzbereich, Schweregrad, Terminwirkung, Beschreibung und
`superseded_at`; ebenfalls historisierend.

## 4. Grants und RLS

Die konkrete Policy ist durch Migrationen definiert. Zusammengefasst:

| Bereich                       | Lesen                         | Schreiben                                                     |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------- |
| Reference Catalog/Values      | `referencedata.view`          | `referencedata.manage`                                        |
| Reference History             | berechtigter Lesezugriff      | nur kontrollierte Triggerpfade                                |
| AVKK Subject                  | `avkk.view`                   | `avkk.edit` / subjectbezogene Schreibpruefung                 |
| AVKK Responsibility/Type     | `avkk.view`                   | `avkk.responsibility.assign`                                  |
| AVKK Competence/Consequence  | `avkk.view`                   | `avkk_can_write(subject)`                                     |

`anon` erhaelt keinen fachlichen AVKK-/Reference-Data-Zugriff. Frontend-RBAC
ist nur UI-Gating; die verbindliche Grenze liegt in RLS und serverseitigen
Pruefungen.

## 5. Relevante Datenbankfunktionen

| Funktion                         | Zweck                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| `has_permission(uuid, text)`     | zentrale Berechtigungsentscheidung fuer Policies            |
| `has_role(uuid, app_role)`       | Rollenpruefung                                               |
| `has_any_role(uuid, app_role[])` | Mehrfachrollenpruefung                                       |
| `is_account_active(uuid)`        | Kontostatus                                                  |
| `avkk_can_write(uuid)`           | subjectbezogene AVKK-Schreibentscheidung                     |
| `avkk_people_directory()`        | datensparsames Personenverzeichnis fuer AVKK-Zuordnung       |

`avkk_people_directory()` gibt nur die fuer die Zuordnung erforderlichen
Minimaldaten frei (ID, Anzeigename, Rolle, Status) und nicht E-Mail, Telefon,
MFA-Informationen oder Profilbilder.

Die konkrete Ausfuehrungsberechtigung und `search_path`-Haertung werden durch
die Migrationen und Security-Tests vorgegeben.

## 6. Bekannte Integritaets- und Betriebsgrenzen

1. **Polymorphe AVKK-Referenz ohne FK:** `subject_id` verweist auf lokal
   gefuehrte Aufgabenobjekte. Verwaiste Subjects sind moeglich und werden durch
   Service-/Backup-Pruefungen sichtbar gemacht.
2. **Snapshot-Redundanz:** Katalogtexte werden in AVKK-Zeilen mitgefuehrt, damit
   historische Sachverhalte auch nach Katalogaenderungen lesbar bleiben.
3. **Bestands-Enums:** WorkPackage-/Projekt-/Taetigkeitsstatus und
   Abrechnungsstatus sind weiterhin Teil des TypeScript-/Importvertrags und
   nicht vollstaendig auf Reference Data umgestellt.
4. **Gemischte Persistenz:** Lokale Fachobjekte und serverseitige AVKK-/Reference-
   Data-Daten liegen nicht in einer gemeinsamen Datenbanktransaktion. Backup
   kann beide Ebenen als Snapshot zusammenfuehren, der Browser-Restore darf aber
   keinen DB-Restore vortaeuschen.
5. **Provider-Backup:** Eine vollstaendige Wiederherstellung der serverseitigen
   Supabase-Daten ist Provider-/Betriebsaufgabe. Vor einem spaeteren Wechsel zu
   Azure SQL/Table oder einem autonomen Datenbankbetrieb ist ein eigener
   DB-Backup-/Restore-Nachweis erforderlich.
