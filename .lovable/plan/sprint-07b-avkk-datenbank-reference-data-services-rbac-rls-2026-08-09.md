# Sprint 07B – AVKK-Datenbank, Reference Data, Services, RBAC/RLS

Ziel: Das in 07A definierte Modell produktiv in der Cloud-Datenbank umsetzen — Kataloge, AVKK-Datenstrukturen, Berechtigungen, Zugriffsschicht, Cache/Offline und Tests. **Keine AVKK-Oberfläche** (folgt in Sprint 08).

## 1. Analyse vor Umsetzung (erster Schritt, ohne Migration)

Geprüft wird der Ist-Stand und in `docs/AVKK-IMPLEMENTATION-07B.md` festgehalten: vorhandene Tabellen (`profiles`, `user_roles`, `app_settings`, `audit_log`), Rollen/Permission-Funktionen (`has_permission`, `has_role`), Audit-Trigger, Local-First-Persistenz (`src/lib/store/dashboard-persistence.ts`), Backup/Restore, ID-Format der lokalen Projekte/Arbeitspakete/Tätigkeiten. Erst danach Migrationen.

Bereits verifiziert: Es gibt heute keine AVKK- oder Reference-Data-Tabellen; Projekte, Arbeitspakete und Tätigkeiten liegen ausschließlich lokal (`src/lib/dashboard-data.ts` + localStorage); Berechtigungen laufen serverseitig über `has_permission()`.

## 2. Polymorphie — Entscheidung

Bewertet werden Option A (Übergangsmodell beibehalten), B (gemeinsame Work-Item-Tabelle) und C (Teilmigration einzelner Objekttypen). **Empfehlung: Option A.** Begründung: Alle drei Aufgabenobjekte sind heute Local-First; jede Migration würde Import/Export, Backup 2.0, Merge/Rollback und sämtliche Dashboard-Ansichten gleichzeitig treffen und den Sprint verdoppeln.

Konsequenz, ehrlich dokumentiert:

- `subject_type` per `CHECK` auf `project | workpackage | activity | measure` begrenzt, `UNIQUE (subject_type, subject_id)`.
- **Keine** echte FK-Integrität zum Aufgabenobjekt; eine Existenzprüfung ist nur in der Service-Schicht gegen den lokalen Bestand möglich und wird ausdrücklich nicht als Datenbankgarantie ausgegeben.
- Zusätzlich `title_snapshot`, damit verwaiste AVKK-Sätze lesbar bleiben; Report für verwaiste Referenzen als Integritätsprüfung.
- Aufnahme als Architekturgrenze in `docs/PROJECT-STATUS.yaml` (technicalDebt) und in ADR-0025 mit Migrationspfad.

## 3. Datenbank (Migrationen)

**Reference Data**: `reference_catalog`, `reference_value`, `reference_value_history` exakt nach `docs/REFERENCE-DATA.md` (Schlüssel, Label, Beschreibung, Sortierung, `is_active`, `is_default`, `attributes` jsonb, `valid_from/valid_to`, Version am Katalog, `created_by/updated_by`). Kein Löschen, nur Deaktivieren. History-Trigger plus kompakter Eintrag in `audit_log`.

**AVKK**: `avkk_subject`, `avkk_responsibility`, `avkk_responsibility_type` (n:m für Mehrfach-Verantwortungsarten), `avkk_competence`, `avkk_consequence` nach `docs/AVKK.md` Abschnitt 8 — inklusive `*_key_snapshot`/`*_label_snapshot`, `support_needed`, `note`, `valid_from/valid_to` bzw. `superseded_at`. FK auf `avkk_subject` mit CASCADE, auf `reference_value` mit RESTRICT.

Je Tabelle in derselben Migration: GRANTs (`authenticated`, `service_role`; kein `anon`), RLS aktivieren, Policies, `updated_at`-Trigger, Audit-Trigger (`avkk.<table>.<op>` bzw. `reference_value.<op>`).

**Seeds** (in der Migration, wertegleich zu 07A): `avkk.responsibility_type` (8), `avkk.responsibility_role` (2), `avkk.competence_dimension` (8), `avkk.competence_rating` (3, mit `weight`), `avkk.consequence_area` (13), `avkk.consequence_severity` (4, mit `rank`), `avkk.schedule_impact` (5, mit `rank`).

## 4. RBAC/RLS

Neue Permissions in `src/lib/rbac/permissions.ts` **und** spiegelbildlich in `backend/services/rbac.mjs` sowie in der DB-Funktion `has_permission()`: `avkk.view`, `avkk.edit`, `avkk.responsibility.assign`, `avkk.management.view`, `referencedata.view`, `referencedata.manage` — Rollenmatrix wie in AVKK.md 9.2 (customer bleibt vorerst ausgeschlossen). `scripts/check-rbac.mjs` muss grün bleiben.

RLS: Lesen mit `avkk.view`; Schreiben mit `avkk.edit`; Verantwortungszuweisung zusätzlich mit `avkk.responsibility.assign`; Engineers nur auf eigene Zeilen (`person_id = auth.uid()` oder `created_by = auth.uid()`). Reference Data: Lesen für alle Angemeldeten, Pflege nur mit `referencedata.manage`, kein DELETE.

## 5. Zugriffsschicht (kein Supabase in Komponenten)

```text
Supabase-Adapter → Repository → ReferenceDataService / AvkkService → Hooks (Sprint 08)
```

- `src/lib/reference-data/` — Adapter, Repository, Service (`listCatalogs`, `listValues`, `getValue`, `createValue`, `updateValue`, `deactivateValue`, `getCatalogVersion`), Cache.
- `src/lib/avkk/` — Repository und Service (Subject anlegen/lesen, Verantwortung, Kompetenz, Konsequenz), Subject-Validierung, Snapshot-Befüllung, abgeleiteter Frühindikator „gefährdet trotz Zuordnung" als **Service-Regel** aus vorhandenen Bewertungen (kein zweiter persistierter Status), Schwellwert konfigurierbar über `app_settings`.

## 6. Cache, Offline, Reconnect

Read-Through-Cache für Kataloge in localStorage: Key `sysing.referencedata.v1`, gespeichert werden Katalogversion, Zeitstempel und Werte — **keine Tokens**. Ablauf: Cache lesen → sofort nutzbar → online nachladen → atomar ersetzen. Definiert werden max. Alter, Verhalten bei veraltetem/fehlendem Cache (veraltet = nutzbar mit Kennzeichnung „Katalogstand vom …", fehlend + offline = klarer Fehlerzustand).

Offline: Katalogpflege ist gesperrt (Service liefert einen expliziten Fehlerzustand, RLS scheitert serverseitig ohnehin) — keine lokale Vormerkung, keine erfundene Synchronisation. AVKK-Schreibvorgänge sind online-only und melden offline sichtbar; keine stillen Verluste. Reconnect: Kataloge neu laden, Cache ersetzen, deaktivierte Werte übernehmen, Fehler über den bestehenden Logger.

## 7. Generierte Typen

`src/integrations/supabase/types.ts` wird beim Migrieren neu erzeugt. Statt einer pauschalen Ignore-Regel: als generiertes Artefakt in `docs/ARCHITECTURE.md` und `docs/CONTRIBUTING.md` kennzeichnen, Generierungsschritt dokumentieren, Handpflege untersagen. Aufnahme in `.prettierignore` **nur**, falls die Datei nach Regenerierung tatsächlich gegen die Formatprüfung verstößt — geprüft wird das nach der Migration; sonst bleibt sie in der Prüfung.

## 8. Tests und Nachweise

- Reference-Data-Service: Laden, Sortierung, inaktive Werte, Cache-Hit/Miss/veraltet, Offline-Schreibsperre, Reconnect.
- AVKK-Service: Subject-Erstellung, ungültiger `subject_type` wird abgelehnt, Mehrfach-Verantwortungsarten, Snapshot-Felder, Frühindikator-Ableitung.
- Sicherheit: RBAC-Matrix (Frontend/Backend-Spiegel), Rollen-Denials, keine Katalog-Hardcodierung (Guard-Test gegen doppelte Katalogdefinitionen im UI-Code).
- Security-Linter der Datenbank nach jeder Migration; Gates: `lint`, `typecheck`, `lint:no-console`, `docs:check`, `project-status:check`, `test:full`, Build.

## 9. Dokumentation

ADR-0025 (Umsetzungsentscheidungen 07B inkl. Polymorphie-Übergang und Offline-Regeln), `docs/AVKK.md`/`docs/REFERENCE-DATA.md` auf „umgesetzt" aktualisieren, `docs/DATA-SCHEMA.md` um die neuen Tabellen, Handbuchkapitel AVKK/Referenzdaten aktualisieren, `CHANGELOG.md` 1.52.0, `docs/PROJECT-STATUS.yaml` (Sprint 07B abgeschlossen, 08 geplant, Architekturgrenze als Schuld), Entwicklungstagebuch, technischer Prüfbericht neu erzeugen.

## Kritische Anmerkungen

1. Ohne echte FK-Integrität kann die Datenbank verwaiste AVKK-Sätze nicht verhindern. Das ist ein bewusster Kompromiss, kein gelöstes Problem — der Integritätsreport macht ihn sichtbar.
2. AVKK-Daten liegen serverseitig, Aufgabenobjekte lokal. Ein Backup enthält damit nur die halbe Wahrheit; Backup-Erweiterung um AVKK-Export ist ein Kandidat für Sprint 08 und wird als Risiko geführt.
3. Der Sprint ist groß. Falls er geteilt werden soll, wäre der natürliche Schnitt: 07B-1 Reference Data komplett, 07B-2 AVKK-Tabellen und Services.
