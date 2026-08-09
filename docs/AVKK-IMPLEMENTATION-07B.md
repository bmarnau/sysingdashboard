# AVKK & Reference Data — Umsetzungsanalyse und Zielarchitektur (Sprint 07B)

- **Status**: verbindlich für Sprint 07B (v1.52.0)
- **Grundlagen**: [`docs/AVKK.md`](./AVKK.md), [`docs/REFERENCE-DATA.md`](./REFERENCE-DATA.md),
  [ADR-0024](./ADR/0024-avkk-und-reference-data.md), [ADR-0025](./ADR/0025-avkk-umsetzung-07b.md),
  [ADR-0003](./ADR/0003-local-first-localstorage.md)

---

## 1. Ist-Analyse (vor der Migration erhoben)

### 1.1 Datenbank

| Objekt                                                                                                                                                          | Stand                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `public.profiles`                                                                                                                                               | vorhanden, 1:1 zu Auth-Benutzer, Status `active/inactive/…`    |
| `public.user_roles`                                                                                                                                             | vorhanden, Enum `app_role` mit 7 Rollen, RLS aktiv             |
| `public.app_settings`                                                                                                                                           | vorhanden, Key/Value (jsonb), Audit-Trigger                    |
| `public.audit_log`                                                                                                                                              | vorhanden, Client-Insert blockiert, nur Trigger schreiben      |
| `has_permission()`, `has_role()`, `has_any_role()`, `is_account_active()`                                                                                       | vorhanden, `STABLE`, `search_path = public`                    |
| AVKK-Tabellen, Reference-Data-Tabellen                                                                                                                          | **nicht vorhanden**                                            |
| Projekte, Arbeitspakete, Tätigkeiten                                                                                                                            | **nicht in der Datenbank** — ausschließlich lokal (Local-First) |

`has_permission()` kodiert die Rollenmatrix heute als `IN (...)`-Liste je Rolle. Neue
Permissions müssen dort **und** in `src/lib/rbac/permissions.ts` **und** in
`backend/services/rbac.mjs` ergänzt werden; `scripts/check-rbac.mjs` prüft die
Spiegelung der beiden letztgenannten.

### 1.2 Local-First-Bestand

`src/lib/dashboard-data.ts` definiert `Project`, `WorkPackage`, `Activity` mit
`id: string`. Die IDs sind **keine UUIDs**, sondern fachliche Kurzschlüssel aus
`src/data/dashboard.json` bzw. der Persistenz (`src/lib/store/`). Konsequenz für
AVKK: `avkk_subject.subject_id` ist **`text`**, nicht `uuid`. Eine Datenbank-FK auf
die Aufgabenobjekte ist damit derzeit technisch unmöglich.

Auswahlwerte (`WorkPackageStatus`, `Priority`, `ActivityCategory`,
`ProjectStatus`, `BillingStatus`) sind Union Types im Code und Bestandteil von
Import/Export-Schema und Backup 2.0. Sie werden in 07B **nicht** abgelöst —
Reference Data wird zunächst nur für die AVKK-Kataloge produktiv genutzt; die
Migration der Bestands-Enums ist ein Folgeschritt (Sprint 08+), weil sie
Schema, Backup und Beispieldateien gleichzeitig berührt.

### 1.3 Bestehende Service-Struktur

`src/lib/<domäne>/` mit Facade-Modul (Beispiel `src/lib/backup/` + Fassade
`backup-service.ts`). UI greift über Hooks/Fassaden zu, nie direkt auf den
Supabase-Client (Layer-Regel aus `docs/ARCHITECTURE.md`, geprüft durch
`scripts/tech-debt/detectors/layer-violations.mjs`). AVKK und Reference Data
folgen exakt diesem Muster.

---

## 2. Entscheidung zur Polymorphie

Bewertet wurden die drei Optionen aus dem Sprintauftrag:

| Option                                        | Umfang        | Risiko                                                             | FK-Integrität | Bewertung   |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------ | ------------- | ----------- |
| **A** — Übergangsmodell `subject_type` + `id` | klein         | verwaiste Referenzen möglich                                       | nein          | **gewählt** |
| **B** — gemeinsame `work_item`-Tabelle        | sehr groß     | Bruch von Import/Export, Backup 2.0, Merge/Rollback, allen Ansichten | ja            | verworfen   |
| **C** — Teilmigration einzelner Objekttypen   | mittel--groß  | zwei Wahrheiten für dieselbe Objektfamilie                          | teilweise     | verworfen   |

Begründung: Alle AVKK-fähigen Objekte liegen heute lokal. B und C würden die
Local-First-Persistenz, Import/Export, Backup 2.0 und sämtliche
Dashboard-Ansichten in einem Sprint gleichzeitig verändern — ohne fachlichen
Mehrwert für AVKK selbst.

**Ehrliche Einordnung:** Es besteht keine referenzielle Integrität zwischen
AVKK-Datensätzen und Aufgabenobjekten. Abgesichert wird über:

1. `CHECK` auf `subject_type ∈ {project, workpackage, activity, measure}`,
2. `UNIQUE (subject_type, subject_id)`,
3. Existenzprüfung gegen den lokalen Bestand in `AvkkService` (Anwendungsschicht,
   keine Datenbankgarantie),
4. `subject_title_snapshot`, damit verwaiste Sätze lesbar bleiben,
5. Integritätsprüfung `findOrphanSubjects()`, die verwaiste Referenzen meldet.

Aufgenommen als Architekturgrenze in `docs/PROJECT-STATUS.yaml` und ADR-0025.

---

## 3. Zielarchitektur

```text
React-Komponenten / Hooks            (Sprint 08)
        ↓
ReferenceDataService | AvkkService   Fachlogik, Validierung, Frühindikator
        ↓
Repository                           Query-Zusammenbau, Zeilen → Domänentypen
        ↓
Supabase-Adapter                     einziger Ort mit @/integrations/supabase/client
        ↓
Supabase (RLS, Trigger, audit_log)
```

- Kataloge: `src/lib/reference-data/{adapter,repository,service,cache,types}.ts`
  plus Fassade `src/lib/reference-data/index.ts`.
- AVKK: `src/lib/avkk/{adapter,repository,service,indicators,types}.ts`
  plus Fassade `src/lib/avkk/index.ts`.

### 3.1 Frühindikator „zugeordnet, aber gefährdet"

Wird **abgeleitet**, nicht gespeichert: eine Aufgabe gilt als gefährdet, wenn
mindestens eine Verantwortung zugeordnet ist **und** mindestens eine
Kompetenzbewertung `missing` ist oder mindestens zwei `partial` sind. Die
Schwelle liegt in `app_settings` (`avkk.risk_threshold`), damit sie ohne Release
angepasst werden kann. Keine zweite Statusquelle in der Datenbank.

### 3.2 Cache und Offline

- Cache-Key `sysing.referencedata.v1`, Inhalt: Katalogversion, Zeitstempel,
  Werte. Keine Tokens, keine personenbezogenen Daten.
- Ablauf: Cache lesen → sofort nutzbar → online neu laden → atomar ersetzen.
- Max. Alter 24 h. Älterer Cache bleibt nutzbar, wird aber als „Katalogstand
  vom …" gekennzeichnet. Fehlender Cache + offline = expliziter Fehlerzustand,
  keine leere Liste.
- Katalogpflege offline gesperrt (`ReferenceDataOfflineError`); serverseitig
  scheitert der Schreibvorgang ohnehin. Keine lokale Vormerkung.
- AVKK-Schreibvorgänge sind online-only und melden offline sichtbar.
- Reconnect lädt Kataloge neu, ersetzt den Cache und übernimmt Deaktivierungen.

---

## 4. Generierte Supabase-Typen

`src/integrations/supabase/types.ts` wird bei jeder Migration vollständig neu
erzeugt und darf nicht handgepflegt werden. Die Datei bleibt in der
Formatprüfung, solange sie formatkonform erzeugt wird; eine Aufnahme in
`.prettierignore` erfolgt nur, wenn eine Regenerierung nachweislich dagegen
verstößt. Der Generierungsschritt ist in `docs/CONTRIBUTING.md` dokumentiert.
