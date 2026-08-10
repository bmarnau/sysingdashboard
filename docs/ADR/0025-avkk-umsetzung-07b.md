# ADR-0025: Technische Umsetzung von AVKK und Reference Data in Supabase

- **Status**: Accepted
- **Datum**: 2026-08-10
- **Kontext-ADR**: [ADR-0024](./0024-avkk-und-reference-data.md) (fachliche
  Architekturentscheidung), [ADR-0003](./0003-local-first-localstorage.md)
  (Local-First-Persistenz der Aufgabenobjekte)

ADR-0024 entscheidet **was** gebaut wird. Dieses ADR dokumentiert die **konkret
umgesetzte** technische Lösung aus Sprint 07B (v1.52.0) inklusive der
eingegangenen Kompromisse.

## Kontext

Sprint 07B sollte das AVKK-Modell produktiv in Supabase umsetzen, ohne die
bestehende Local-First-Persistenz (Projekte, Arbeitspakete, Tätigkeiten in
`localStorage`) anzutasten. Aufgabenobjekte besitzen fachliche Kurzschlüssel
(`WP-001`), keine UUIDs — eine Datenbank-Fremdschlüsselbeziehung auf sie ist
damit technisch unmöglich.

## Entscheidung

### 1. Tatsächliche Tabellenstruktur

Reference Data (Plattformdienst):

| Tabelle                   | Zweck                             | Besonderheiten                                                             |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `reference_catalog`       | Katalogdefinition                 | `UNIQUE (key)`, `version` wird durch Trigger hochgezählt                   |
| `reference_value`         | Katalogwerte                      | `UNIQUE (catalog_id, key)`, `is_active`, `valid_from/valid_to`, Selbst-FK  |
| `reference_value_history` | Änderungshistorie (Snapshot)      | append-only, `CHECK (operation IN ('insert','update'))`, kein UPDATE/DELETE |

AVKK:

| Tabelle                    | Zweck                        | Besonderheiten                                                                    |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `avkk_subject`             | Aufgabenbezug (polymorph)    | `CHECK subject_type ∈ {project, workpackage, activity, measure}`, `UNIQUE (subject_type, subject_id)`, `subject_title_snapshot` |
| `avkk_responsibility`      | Verantwortungszuordnung      | FK auf `avkk_subject`, `person_id → profiles.id`, Rollen-Snapshot, `valid_from/valid_to` |
| `avkk_responsibility_type` | Verantwortungsarten (n:m)    | `UNIQUE (responsibility_id, type_value_id)`, kein UPDATE erlaubt                   |
| `avkk_competence`          | Kompetenzbewertung           | Fortschreibung über `superseded_at` statt Überschreiben, Snapshot von Dimension und Bewertung |
| `avkk_consequence`         | Konsequenzbewertung          | Snapshot von Bereich, Schweregrad und Terminwirkung                                |

Indizes: `avkk_competence_subject_idx (avkk_subject_id, superseded_at)`,
`avkk_consequence_subject_idx (avkk_subject_id, superseded_at)`,
`avkk_responsibility_subject_idx`, `avkk_responsibility_person_idx`,
`reference_value_catalog_idx (catalog_id, sort_order)`,
`reference_value_history_value_idx (value_id, changed_at DESC)`.

Vollständige Spalten-, Constraint- und Grant-Übersicht:
[`docs/DATA-SCHEMA.md`](../DATA-SCHEMA.md).

### 2. Reference-Data-Modell

Werte werden **nie gelöscht**, nur deaktiviert (`is_active = false`,
`valid_to`). Konsumenten speichern zusätzlich zur Wert-ID immer
`key`- und `label`-Snapshots, damit historische Datensätze auch nach einer
Umbenennung lesbar bleiben. Jede Schreiboperation schreibt einen
Historieneintrag und erhöht die Katalogversion (Trigger
`reference_value_track_change`).

### 3. Services und Schichtung

```text
UI/Hooks → Fassade (index.ts) → Service → Repository → Adapter → Supabase
```

Nur `adapter.ts` importiert `@/integrations/supabase/client`. Die Grenze wird
statisch geprüft (`scripts/tech-debt/detectors/layer-violations.mjs`,
`src/__tests__/security/avkk-rls.test.ts`).

### 4. RLS-Modell

Alle Policies sind auf `TO authenticated` beschränkt; `anon` erhält durch keine
Policy Zugriff. Lesen ist an `avkk.view` bzw. `referencedata.view` gebunden,
Katalogpflege an `referencedata.manage`, Verantwortungszuordnung an
`avkk.responsibility.assign`. Einfügen erzwingt zusätzlich
`created_by = auth.uid()`. DELETE ist auf AVKK-Sachdaten nicht erlaubt
(Fortschreibung statt Löschung); einzige Ausnahme ist
`avkk_responsibility(_type)`.

### 5. RBAC-Anbindung

Sechs neue Permissions (`avkk.view`, `avkk.edit`,
`avkk.responsibility.assign`, `avkk.management.view`, `referencedata.view`,
`referencedata.manage`) sind dreifach gespiegelt: `public.has_permission()`
(Datenbank), `src/lib/rbac/permissions.ts` (Frontend),
`backend/services/rbac.mjs` (Server). `bun run rbac:check` erzwingt die
Spiegelung der beiden letzteren.

### 6. `avkk_can_write`

Signatur `public.avkk_can_write(_subject uuid) → boolean`,
`SECURITY DEFINER`, `STABLE`, `SET search_path = public`. `EXECUTE` ist auf
`authenticated` und `service_role` vergeben, **nicht** auf `anon`.

Bewertung der Linterwarnung „für authenticated ausführbar":

- **Warum erforderlich**: Die Funktion wird im `USING`/`WITH CHECK` der
  RLS-Policies von `avkk_subject`, `avkk_competence` und `avkk_consequence`
  ausgewertet. Diese Ausdrücke laufen mit den Rechten des aufrufenden Nutzers;
  ohne `EXECUTE` schlägt jeder Schreibvorgang fehl.
- **Parameter**: genau eine `uuid` (interner Primärschlüssel eines
  AVKK-Subjects). Kein Textparameter, keine dynamische SQL-Zusammensetzung.
- **Sicherheitsmodus**: `SECURITY DEFINER` ist nötig, weil die Funktion
  `user_roles` und `avkk_responsibility` liest, die der Aufrufer selbst nicht
  vollständig lesen darf. `search_path` ist fest auf `public` gesetzt, damit
  keine Objekte aus einem manipulierten Suchpfad gezogen werden können.
- **Rückgabe**: ausschließlich `true`/`false`. Keine Zeilen, keine Spalten,
  keine Fehlermeldungen mit Dateninhalt.
- **Missbrauchsanalyse**: Ein direkter Aufruf mit geratener UUID liefert nur
  die eigene Schreibberechtigung. Das ist keine zusätzliche Information — der
  Nutzer könnte dasselbe durch einen Schreibversuch feststellen. Es entsteht
  kein Rückschluss auf fremde Verantwortlichkeiten oder Sachdaten, da die
  Antwort ausschließlich vom eigenen `auth.uid()` abhängt.

**Ergebnis**: fachlich korrekt und sicher. Die Funktion wird **nicht** entfernt
und die Warnung nicht unterdrückt; sie wird als bewusst akzeptierte Ausnahme im
technischen Prüfbericht geführt (`man:avkk-can-write-execute`) und durch
`src/__tests__/security/avkk-rls.test.ts` gegen stilles Verschwinden gesichert.

### 7. Polymorphe Subject-Zuordnung und Local-First-Abgrenzung

`avkk_subject.subject_id` ist `text`, nicht `uuid`, weil die Aufgabenobjekte
lokal liegen und fachliche Kurzschlüssel tragen. Abgesichert wird über
`CHECK` auf den Typ, `UNIQUE (subject_type, subject_id)`, den Titel-Snapshot,
eine Existenzprüfung in der Anwendungsschicht (`registerSubjectResolver`) und
die Integritätsprüfung `findOrphanSubjects()`.

**Ehrlich benannt**: Es gibt keine referenzielle Integrität zwischen AVKK und
den Aufgabenobjekten. Verwaiste Datensätze sind möglich und werden erkannt,
nicht verhindert.

### 8. Cache-Verhalten

Read-Through-Cache im `localStorage` (`sysing.referencedata.v1`), maximales
Alter 24 h, atomarer Austausch, keine Tokens und keine personenbezogenen Daten
im Cache. Älterer Stand bleibt nutzbar, wird aber als „stale" gekennzeichnet.
Ohne Cache und ohne Verbindung gibt es einen expliziten Fehlerzustand
(`REFDATA_UNAVAILABLE_OFFLINE`) statt einer leeren Liste. Schreibvorgänge sind
offline gesperrt; es wird nichts lokal vorgemerkt.

### 9. Audit

Datenbankseitige Trigger schreiben in `public.audit_log`
(`avkk_audit_change`, `reference_value_track_change`). Client-Inserts in
`audit_log` sind durch Policy blockiert; das Protokoll ist damit nicht durch
die Anwendung manipulierbar. Der Servicevertrag kennt keinen expliziten
Audit-Aufruf — Auditierung ist bewusst eine Datenbankgarantie, keine
Anwendungszusage.

## Alternativen

- **Gemeinsame `work_item`-Tabelle mit echter FK-Integrität**: verworfen —
  Big-Bang-Migration von Import/Export, Backup 2.0, Merge/Rollback und allen
  Ansichten in einem Sprint, ohne fachlichen Mehrwert für AVKK.
- **Teilmigration einzelner Objekttypen nach Supabase**: verworfen — erzeugt
  zwei Wahrheiten für dieselbe Objektfamilie.
- **Frühindikator als persistierte Statusspalte**: verworfen — zweite
  Statusquelle mit Konsistenzpflicht; er wird aus Verantwortung und Kompetenz
  abgeleitet.
- **`avkk_can_write` als `SECURITY INVOKER`**: verworfen — die Funktion müsste
  dann Lesezugriff auf `user_roles` und alle `avkk_responsibility`-Zeilen
  voraussetzen, was die Rechte weiter öffnen würde als die aktuelle Lösung.
- **Kataloge im Repository als JSON**: verworfen (siehe ADR-0024).

## Konsequenzen

Positiv: AVKK ist additiv, ohne Eingriff in den Bestand; Kataloge sind ohne
Release pflegbar; Auditierung und Historie sind datenbankseitig garantiert;
RLS setzt die Rollenmatrix serverseitig durch.

Negativ / Trade-offs:

- Keine FK-Integrität auf Aufgabenobjekte (Risiko `RISK-AVKK-POLYMORPH`).
- Doppelte Pflege der Rollenmatrix an drei Stellen (durch `rbac:check`
  abgesichert, aber weiterhin Aufwand).
- Snapshot-Spalten duplizieren Katalogtexte — bewusst zugunsten der Lesbarkeit
  historischer Datensätze.
- Der Reference-Data-Cache kann bis zu 24 h alt sein; Deaktivierungen greifen
  in der UI erst nach Refresh oder Reconnect.

## Migrationspfad zu stärkerer Integrität

1. Aufgabenobjekte erhalten stabile UUIDs in der Local-First-Persistenz
   (Import/Export- und Backup-Schema anpassen, additive Migration).
2. `avkk_subject` erhält eine zusätzliche Spalte `subject_uuid uuid`, zunächst
   nullable und parallel befüllt.
3. Nach Übernahme der Aufgabenobjekte in die Datenbank wird `subject_uuid` zur
   FK-Spalte; `subject_type`/`subject_id` bleiben als Migrationsnachweis.
4. `findOrphanSubjects()` bleibt als Kontrolle bis zum Abschluss von Schritt 3.

## Trust-Boundary / Security-Note

Vertrauensgrenze ist die Datenbank, nicht der Client. Die UI-Gates
(`PermissionGate`) sind Komfort, nicht Schutz — maßgeblich sind RLS und
`has_permission()`. Der Service-Role-Schlüssel wird von AVKK und Reference Data
nicht verwendet.
