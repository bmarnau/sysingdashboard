# BSF-03D Paket 1 — Review 6484555 gegen b90f93c (nur Prüfung, keine Umsetzung)

## Verdicts

- **SPEC COMPLIANCE: FINDINGS** (massiver Scope-Creep über Paket 1 hinaus; RED-Nachweis aus der Historie nicht belegbar)
- **CODE QUALITY / SECURITY: FINDINGS** (1 Blocker: nicht beauftragte Änderung am generierten Auth-Client / Preview-Broker-Storage; dazu Migrations- und Cache-Befunde)

## Findings priorisiert

### BLOCKER-1 — Preview-/Broker-Auth-Storage als unbeauftragte Nebenänderung
`src/integrations/supabase/client.ts` (Zeile 63: `storage: brokeredPreviewStorage()`) und neue Datei `src/integrations/supabase/previewAuthStorage.ts` (88 Zeilen, postMessage-Brokering der Session an die Editor-Origin).
Beides liegt außerhalb von Paket 1 und verletzt die Projektregel „keine Preview-/Broker-Auth-Storage-Logik als unbeauftragte Nebenänderung“ sowie „Auth nur im ausdrücklichen Auftrag ändern“. Sicherheitsrelevant: Session-Token verlässt den Tab per postMessage.
Minimale Korrektur: beide Änderungen aus dem Paket-1-Branch entfernen; falls plattformseitig erzwungen, als eigener, ausdrücklich beauftragter Vorgang mit separatem Security-Review führen.

### BLOCKER-2 — Scope-Creep weit über Paket 1
Nicht beauftragt in diesem Paket, aber im Diff enthalten:
- UI: `src/components/admin/WorkPackageCategoryDialog.tsx`, `src/components/dashboard/dialogs/WorkPackageDialog.tsx`, `src/components/dashboard/header/ServiceMenu.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/hooks/useWorkPackageCategories.ts`
- Import/Export: `src/lib/json-schema.ts` (Version 1.1.0 → 1.2.0), `src/lib/json-import-service.ts`
- Backup/Restore: `src/lib/backup/category-check.ts`, `src/lib/backup/restore.ts`
- Membership-Runtime: `src/lib/systemhouse/membership.ts`, `src/integrations/supabase/systemhouse-membership-adapter.ts`
- DB-Testartefakt/E2E-Vorgriff: `supabase/tests/bsf03d-workpackage-category.sql`
- Regenerierte Reports: `test-report/*`, `security-report/*`, `roadmap.md`
Minimale Korrektur: Paket 1 auf Migration + `types.ts` (generiert) + `reference-data/{types,adapter}.ts` + `dashboard-data.ts` (`categoryKey`) + `workpackage-category.ts` + zugehörige Unit-Tests reduzieren; der Rest wird Paket 2/3. Regenerierte Report-Artefakte gehören nicht in einen fachlichen Paket-1-Diff.

### HIGH-1 — RED-Nachweis nicht verifizierbar
`b90f93c..6484555` enthält nur Sammelcommits („Changes“, „Work in progress“, abschließend „TDD BSF-03D/#103 umgesetzt“). Es gibt keinen Commit, in dem Tests ohne Produktionscode rot sind. Der RED-Status ist damit nur behauptet, nicht belegt.
Minimale Korrektur: Paket-1-Branch in zwei Commits neu aufsetzen — (1) nur Tests (rot, Lauf-Log im Bericht), (2) Implementierung (grün).

### HIGH-2 — Migration enthält einen DROP CONSTRAINT und ist nicht kollisionsfrei bei abweichendem Namen
`drizzle/migrations/0000_bsf03d_reference_data_systemhouse_scope.sql`:
`ALTER TABLE public.reference_value DROP CONSTRAINT IF EXISTS reference_value_catalog_id_key_key;`
Das ist entgegen „keine destruktiven DROP-Aktionen“ ein Schemaeingriff; er ist funktional nötig (Ablösung durch zwei partielle Unique-Indizes), aber (a) im Auftrag nicht vorgesehen und (b) namensabhängig: heißt der Constraint in einer älteren DB anders, bleibt er stehen und blockiert später systemhausbezogene Duplikate über Systemhäuser hinweg.
Minimale Korrektur: Ablösung über `pg_constraint`-Lookup nach Spaltenmenge statt Namen und expliziten Hinweis im Migrationskopf, dass ein Unique-Constraint durch zwei partielle Indizes ersetzt wird.

### MEDIUM-1 — FK-Idempotenzprüfung nicht tabellenqualifiziert
Gleiche Datei, Block 2: `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reference_value_systemhouse_fk')` — ohne `conrelid`/`connamespace`. `conname` ist nicht global eindeutig; ein gleichnamiger Constraint an einer anderen Tabelle unterdrückt das Anlegen still.
Minimale Korrektur: `AND conrelid = 'public.reference_value'::regclass` ergänzen, analog zum Scope-Check-Block.

### MEDIUM-2 — Alte Cache-Snapshots sind nicht wirklich rückwärtssicher
`src/lib/reference-data/cache.ts`: `CACHE_KEY` bleibt `...v1`, `cacheVersion` bleibt `1`, und `readCache()` gibt den geparsten Snapshot ungemappt zurück. Ein vor dem Sprint geschriebener Cache liefert daher Objekte mit `scopeType: undefined` und `systemhouseId: undefined`, obwohl beide Felder im Typ verpflichtend sind. `adapter.toCatalog/toValue` greifen nur auf dem Netzwerkpfad. Jede spätere Filterung nach `systemhouseId` arbeitet auf stale Caches falsch (bis zu 24 h).
Minimale Korrektur: `cacheVersion` auf `2` heben (alter Cache wird verworfen) **oder** in `readCache()` normalisieren (`scopeType ?? "global"`, `systemhouseId ?? null`) — plus ein Test genau dafür. Der vorhandene Test `should_defaultToGlobalScope_when_legacyRowsLackScopeColumns` prüft nur den Adapter, nicht den Cache.

### MEDIUM-3 — Globale Werte bleiben für jeden Manager schreibbar
Migration Block 6: `reference_value_insert/update` erlauben Schreiben auf globale Werte (`systemhouse_id IS NULL`) für jeden mit `referencedata.manage`, unabhängig von Systemhaus. Cross-Systemhouse-DENY ist für systemhausbezogene Werte korrekt umgesetzt; die AVKK-Systemkataloge sind aber weiterhin nicht gegen Änderung durch nicht-systemadministrative Manager geschützt. Vorbestand, keine Regression — aber in einem Scope-Sprint zu dokumentieren.
Minimale Korrektur: als bekanntes Risiko in `docs` notieren; optional später `is_system`-Kataloge auf Systemadministrator einschränken (eigener Auftrag).

### LOW-1 — `ADD COLUMN IF NOT EXISTS` maskiert abweichenden Ist-Zustand
Wenn `scope_type` in der Live-DB bereits existiert, aber ohne `NOT NULL`/`DEFAULT 'global'`, wird der Unterschied stillschweigend übernommen.
Minimale Korrektur: nachgelagert `ALTER COLUMN SET DEFAULT` / `SET NOT NULL` idempotent absichern, oder im DB-Testartefakt explizit prüfen.

### LOW-2 — Key-Immutabilität nur für einen Katalog
`reference_value_validate_scope()` sperrt Key-Renames nur für `workpackage.category`. Für alle anderen Kataloge bleibt ein Key-Rename möglich, obwohl Snapshot-Spalten anderswo auf Key-Identität bauen. Kein Hard-Delete-Loch (DELETE ist per RLS verwehrt, Deaktivierung erfolgt über `is_active`/`valid_to`).
Minimale Korrektur: bewusste Entscheidung dokumentieren oder Key-Immutabilität generell auf `is_system`-Kataloge ausweiten.

## Was geprüft und in Ordnung ist

- Keine Änderung an Shared Projection, BSF-02C-Publish-RPC oder BSF-03-P5-Artefakten im Diff (Frage 7: PASS).
- Keine Secrets, kein Service-Role-Key, keine `supabase_admin`-Nutzung in Migration oder Code.
- RLS bindet systemhausbezogene Werte an `has_active_systemhouse_membership`; Lesen und Schreiben fremder Systemhäuser ist damit DENY. Globale AVKK-Werte bleiben lesbar wie zuvor (Frage 3: im Wesentlichen PASS, siehe MEDIUM-3).
- Trigger erzwingt Scope-Konsistenz sowie Immutabilität von `catalog_id` und `systemhouse_id`; `SET search_path TO ''`, `REVOKE ALL ... FROM PUBLIC, anon` vorhanden.
- Partielle Unique-Indizes bilden „global eindeutig“ vs. „je Systemhaus eindeutig“ fachlich korrekt ab; zusätzlicher Lookup-Index vorhanden.
- `workpackage.category` wird ohne Seed-Werte angelegt (`ON CONFLICT (key) DO NOTHING`) — Default „keine Kategorie“ bleibt gewahrt.
- `src/lib/workpackage-category.ts` ist providerneutral, deckt none/active/inactive/unknown und Gruppierung ab und leitet nachweislich kein billable/priority/status ab.
- `WorkPackage.categoryKey?: string | null` und die Adapter-Erweiterungen sind additiv und minimal.

## Empfohlener nächster Schritt (nicht ausgeführt)

Paket-1-Branch auf den vertraglichen Umfang zurückschneiden (BLOCKER-1/2), RED-Commit nachziehen (HIGH-1), danach Migration um HIGH-2 und MEDIUM-1 sowie den Cache um MEDIUM-2 korrigieren — erst dann Paket 2 (UI/Import/Backup/E2E).
