# Reference Data — allgemeiner Plattformdienst

- **Status**: Architektur definiert (Sprint 07A, v1.51.0), Implementierung ab Sprint 07B
- **Architekturentscheidung**: [ADR-0024](./ADR/0024-avkk-und-reference-data.md)

Reference Data ist ein **allgemeiner Plattformdienst** für alle Katalog- und
Auswahlwerte des Sysing Dashboards. Er ist ausdrücklich **kein AVKK-Modul**;
AVKK ist lediglich der erste Konsument.

---

## 1. Warum ein eigener Dienst?

Heute sind Auswahlwerte an mehreren Stellen fest verdrahtet — z. B. als Union
Types in `src/lib/dashboard-data.ts` (`WorkPackageStatus`, `Priority`,
`ActivityCategory`) und als Stilzuordnungen in
`src/components/dashboard/constants.ts`. Daraus folgen vier Probleme:

1. Jede fachliche Ergänzung ist ein Code-Release.
2. Es gibt keine Historie, wer wann welchen Wert geändert hat.
3. Reihenfolge, Beschreibung und Zusatzattribute sind über UI-Dateien verstreut.
4. Auswertungen kodieren Bewertungslogik (z. B. Gewichtungen) erneut im Code.

Reference Data löst das an einer Stelle, für alle Fachbereiche.

---

## 2. Geltungsbereich

| Bereich           | Beispiele                                                                  |
| ----------------- | -------------------------------------------------------------------------- |
| AVKK              | Verantwortungsarten, Kompetenzdimensionen, Bewertungen, Konsequenzbereiche |
| Projektmanagement | Projektstatus, Arbeitspaketstatus, Prioritäten, Tätigkeitskategorien       |
| Organisation      | Abteilungen, Standorte, Teams, Kostenstellen                               |
| Kunden/Verträge   | Kundenkategorien, Vertragsarten, SLA-Stufen                                |
| Dokumente         | Dokumenttypen, Klassifizierungen                                           |
| Betrieb           | Umgebungen, Systemklassen, Kritikalitätsstufen                             |

Ein Katalog wird nur dann angelegt, wenn der Wertebereich fachlich gepflegt
werden soll. Technische Aufzählungen ohne fachliche Pflege (z. B.
Backup-Formatversionen) bleiben im Code.

---

## 3. Datenmodell

```text
reference_catalog (1) ──< reference_value (n) ──< reference_value_history (n)
                                   │
                                   └── parent_value_id (self, optional, hierarchisch)
```

### 3.1 `reference_catalog`

| Feld                        | Typ         | Bedeutung                                                |
| --------------------------- | ----------- | -------------------------------------------------------- |
| `id`                        | uuid PK     |                                                          |
| `key`                       | text UNIQUE | technischer Schlüssel, z. B. `avkk.competence_dimension` |
| `name`                      | text        | Anzeigename                                              |
| `description`               | text        | Zweck des Katalogs                                       |
| `domain`                    | text        | Fachbereich (`avkk`, `project`, `org`, …)                |
| `is_system`                 | bool        | Systemkatalog: Werte dürfen nicht gelöscht werden        |
| `is_hierarchical`           | bool        | erlaubt `parent_value_id`                                |
| `version`                   | int         | wird bei jeder Wertänderung erhöht                       |
| `created_at` / `updated_at` | timestamptz |                                                          |

### 3.2 `reference_value`

| Feld                        | Typ         | Bedeutung                                                     |
| --------------------------- | ----------- | ------------------------------------------------------------- |
| `id`                        | uuid PK     |                                                               |
| `catalog_id`                | uuid FK     | → `reference_catalog`, `ON DELETE RESTRICT`                   |
| `key`                       | text        | Schlüssel, eindeutig **je Katalog**                           |
| `label`                     | text        | Anzeigename (deutsch)                                         |
| `description`               | text        | optional                                                      |
| `sort_order`                | int         | Reihenfolge in Auswahlfeldern                                 |
| `is_active`                 | bool        | Deaktivierung statt Löschung                                  |
| `is_default`                | bool        | Vorbelegung                                                   |
| `parent_value_id`           | uuid FK     | optional, Selbstreferenz für Hierarchien                      |
| `attributes`                | jsonb       | Zusatzattribute, z. B. `{ "weight": 2 }` oder `{ "rank": 3 }` |
| `valid_from` / `valid_to`   | timestamptz | fachliche Gültigkeit                                          |
| `created_by` / `updated_by` | uuid        | → `profiles`                                                  |
| `created_at` / `updated_at` | timestamptz |                                                               |

`UNIQUE (catalog_id, key)`.

### 3.3 `reference_value_history`

Vollständige Vorher-Kopie jeder Änderung (`value_id`, `snapshot jsonb`,
`operation`, `changed_by`, `changed_at`). Zusätzlich schreibt ein Trigger einen
kompakten Eintrag in das bestehende `public.audit_log`
(`action = 'reference_value.<op>'`) — analog zu `audit_app_settings_change()`.
Es entsteht **keine zweite Auditinfrastruktur**.

---

## 4. Verbindliche Regeln

1. **Kein Hardcoding**: Auswahlwerte, die fachlich gepflegt werden, dürfen nicht
   als Union Type oder Array im React-Code stehen. Zugriff ausschließlich über
   den Reference-Data-Service.
2. **Kein Löschen**: Werte werden über `is_active = false` bzw. `valid_to`
   deaktiviert. Referenzen (`ON DELETE RESTRICT`) bleiben gültig.
3. **Snapshot beim Konsumenten**: Fachdatensätze speichern zusätzlich zum FK den
   Schlüssel und das Label zum Zeitpunkt der Erfassung, damit Historie und
   Reports stabil lesbar bleiben.
4. **Versionierung**: jede Wertänderung erhöht `reference_catalog.version`.
   Exporte und Reports geben Katalogversion und Zeitstempel mit aus.
5. **Erweiterbarkeit ohne Schemaänderung**: neue Zusatzeigenschaften gehen nach
   `attributes` (jsonb), nicht in neue Spalten.
6. **Berechtigung**: Lesen für alle angemeldeten Benutzer (`referencedata.view`),
   Pflege nur mit `referencedata.manage` (siehe [AVKK.md](./AVKK.md) Abschnitt 9).
7. **Mehrsprachigkeit**: `label` ist zunächst deutsch. Übersetzungen kommen bei
   Bedarf als `attributes.i18n = { "en": "…" }` hinzu — kein Schemabruch.

---

## 5. Speicherstrategie

### 5.1 Entscheidung: Supabase-Tabellen (MVP)

| Option                | Bewertung                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Supabase-Tabellen** | **Gewählt.** Relationale Integrität, RLS, Audit-Trigger, gemeinsame Sicht für alle Benutzer, sofort verfügbar. |
| JSON-Dateien im Repo  | Verworfen: jede fachliche Änderung wäre ein Deployment, keine Laufzeitpflege, keine Benutzerhistorie.          |
| Statische Konstanten  | Verworfen: exakt der heutige Zustand, den dieser Dienst ablösen soll.                                          |
| Externes MDM-System   | Verworfen für den MVP: Betriebs- und Integrationsaufwand steht in keinem Verhältnis zum Nutzen.                |

Kritische Anmerkung: Supabase-Kataloge stehen im Widerspruch zum Local-First-
Ansatz aus ADR-0003. Das ist bewusst so entschieden — Kataloge sind gemeinsame
Stammdaten, keine Arbeitsdaten. Als Ausgleich ist ein **Read-Through-Cache**
im Browser (siehe 5.2) verbindlich, damit die UI bei kurzzeitiger
Nichtverfügbarkeit weiterarbeiten kann.

### 5.2 Caching und Offline

- Beim Start werden alle aktiven Kataloge einmalig geladen und mit ihrer
  Katalogversion im lokalen Speicher abgelegt.
- Bei Netzfehler wird der letzte bekannte Stand verwendet und in der UI als
  „Katalogstand vom …" gekennzeichnet.
- Schreibvorgänge sind im Offline-Fall gesperrt (kein Offline-Merge für
  Stammdaten — das würde Konflikte erzeugen, die fachlich niemand auflösen kann).

### 5.3 Migrationspfad

Sollte später ein zentrales Stammdatensystem hinzukommen, bleibt der
Service-Vertrag (`listCatalog(key)`, `getValue(catalogKey, valueKey)`) stabil;
nur die Datenquelle wird ausgetauscht.

---

## 6. Servicevertrag (Zielbild, Sprint 07B)

| Funktion                                          | Zweck                                          |
| ------------------------------------------------- | ---------------------------------------------- |
| `listCatalogs(domain?)`                           | Kataloge auflisten                             |
| `listValues(catalogKey, { includeInactive })`     | Werte sortiert nach `sort_order`               |
| `getValue(catalogKey, valueKey)`                  | Einzelwert inkl. `attributes`                  |
| `createValue` / `updateValue` / `deactivateValue` | Pflege, nur mit `referencedata.manage`         |
| `getCatalogVersion(catalogKey)`                   | Version für Cache-Invalidierung und Reportkopf |

Der Service liegt in der Service-Schicht des Schichtenmodells
(`docs/ARCHITECTURE.md`); UI greift ausschließlich über eine Facade/Hook zu,
nie direkt auf den Supabase-Client.

---

## 7. Erst-Kataloge (Sprint 07B)

`avkk.responsibility_type`, `avkk.responsibility_role`,
`avkk.competence_dimension`, `avkk.competence_rating`,
`avkk.consequence_area`, `avkk.consequence_severity`,
`avkk.schedule_impact`, `project.status`, `workpackage.status`,
`task.priority`, `activity.category`.

Die Migration der bestehenden Union Types (`project.status`,
`workpackage.status`, `task.priority`, `activity.category`) erfolgt
**wertegleich**, damit Bestandsdaten, Import/Export und Backup 2.0 unverändert
funktionieren.

---

## 8. Abgrenzung Sprint 07A

Keine Migration, keine Tabellen, kein Service-Code, keine UI. Sprint 07A liefert
ausschließlich Architektur, Regeln und Katalogliste.
