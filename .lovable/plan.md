# SCOPED RE-REVIEW — BSF-03D Review-Fix Runde 1 (6484555..0fb1caf)

Geprüfter Diff: 6 Dateien — Migration `0000_bsf03d_reference_data_systemhouse_scope.sql`, `src/lib/reference-data/cache.ts`, zwei neue Testdateien, `roadmap.md`, `.lovable/plan.md`. Keine Code-/DB-Änderung in diesem Turn.

## Verdicts

- **SPEC COMPLIANCE: PASS**
- **CODE QUALITY / SECURITY: FINDINGS** (1 MEDIUM, 1 LOW — beide betreffen Teststärke bzw. Fehlerverhalten bei Altdaten, nicht die Migrationslogik selbst)

## Prüfergebnis je Punkt

1. **Strukturelle Unique-Erkennung — OK.** `pg_constraint` mit `conrelid = 'public.reference_value'::regclass`, `contype = 'u'`, Spaltenmenge über `array_agg(attname ORDER BY attname) = ARRAY['catalog_id','key']` — exakte Mengengleichheit, PK (`contype = 'p'`) und andere Unique-Constraints werden nicht getroffen. Dynamischer `DROP CONSTRAINT %I` nur für Treffer. Begründung im Kommentar vorhanden.
2. **FK-Check — OK.** `conname` + `conrelid`-Qualifizierung vorhanden.
3. **scope_type-Zielvertrag — OK.** Reihenfolge `ADD COLUMN IF NOT EXISTS ... NOT NULL DEFAULT 'global'` -> `UPDATE ... WHERE scope_type IS NULL` -> `SET DEFAULT` -> `SET NOT NULL` -> CHECK-Constraint (nur bei Nichtexistenz). Gültige Werte bleiben unverändert; die UPDATE-DML ist ein zulässiger Backfill der additiven Änderung.
4. **Idempotenz — OK.** Zweiter Lauf: Loop findet keinen Constraint mehr (partielle Unique-Indizes sind Indizes, nicht in `pg_constraint`); `CREATE UNIQUE INDEX IF NOT EXISTS` lässt sie unverändert; Policies/Trigger per `DROP IF EXISTS` + `CREATE`, Funktionen `CREATE OR REPLACE`, alle ALTERs wiederholbar.
5. **Cache — OK.** Legacy -> `scopeType: "global"`, `systemhouseId: null`; vorhandene gültige Werte bleiben erhalten; unbekannter `scopeType`/nicht-string `systemhouseId` werden auf sichere Defaults gezogen; kaputtes JSON, falsche `cacheVersion`, nicht-Array `values`/`catalogs`, `null`-Einträge -> `null`. **Keine UUID-Prüfung nötig:** Der Cache ist ein rein clientlokaler Lese-Cache; er wird nie zurück in die DB geschrieben, RLS/Server-Trigger bleiben Sicherheitsgrenze. Manipulation betrifft nur die eigene Anzeige. Kein Finding.
6. **Tests — Finding (MEDIUM), s. u.** Import-/DOM-Annahmen stimmen: `../env/test-instance` existiert (gleiche Konvention wie `source-scan.test.ts`), Vitest läuft mit `environment: "jsdom"`, `window.localStorage` ist verfügbar.
7. **Kein Auth/Preview/UI/Import/Backup-Touch — OK.** `git diff --stat` zeigt ausschließlich die sechs genannten Dateien.
8. **`roadmap.md` / `.lovable/plan.md` — Doku-Metadaten**, kein Scope-Creep.

## Findings

### MEDIUM-1 — Statischer Unique-Test kann mit falschem SQL grün werden
Datei: `src/__tests__/security/bsf03d-migration-contract.test.ts`, Test `should_detectLegacyUniqueStructurally_when_replacingCatalogKeyUnique` (Z. 43–49).
Die Assertions prüfen nur das isolierte Vorkommen einzelner Tokens irgendwo in der Datei: `pg_constraint`, `pg_attribute`, `contype = 'u'`, `'catalog_id'`, `'key'`. `'key'` kommt bereits zweimal an anderer Stelle vor (Audit-JSON `jsonb_build_object('key', ...)`), `pg_constraint` und `conrelid = ...::regclass` auch im FK-Check. Ein SQL, das z. B. `array_agg(...) @> ARRAY['catalog_id']` (Teilmenge statt exakter Menge) oder gar keinen Spaltenvergleich enthält, würde den Test bestehen.
Minimaler Fix: eine Assertion auf den Vergleichsausdruck selbst, z. B.
`expect(FLAT).toMatch(/array_agg\(a\.attname::text ORDER BY a\.attname\)[\s\S]{0,120}= ARRAY\['catalog_id', 'key'\]::text\[\]/)`
und den DO-Block isolieren (Substring zwischen `-- Abloesung des alten globalen Unique-Vertrags` und `CREATE UNIQUE INDEX IF NOT EXISTS reference_value_global_key_unique`) und `contype = 'u'`/`pg_attribute` nur innerhalb dieses Blocks prüfen.

### LOW-1 — Ungültige Altwerte in vorhandenem `scope_type` brechen die Migration laut
Datei: Migration, Abschnitt 1.
Existiert `scope_type` bereits mit einem Wert außerhalb `('global','systemhouse')`, schlägt das nachfolgende `ADD CONSTRAINT ... CHECK` fehl und die Migration rollt zurück. Das ist fachlich richtig (kein stilles Umschreiben gültiger/ungültiger Werte, Spec verlangt "keine gültigen Werte verändern"), sollte aber im SQL-Kommentar als bewusstes Fail-loud-Verhalten dokumentiert werden. Kein Codefix nötig; optional ein Kommentar von einer Zeile.

## Positiv festgehalten
- Keine DROP TABLE/COLUMN, TRUNCATE, DELETE, RESET, service_role in der Migration.
- Cache-Normalisierung verändert keine vorhandenen Felder und bricht den Cache-Key nicht (Begründung für Normalisierung statt Versionsbump nachvollziehbar).
- Testkonventionen (`should_..._when_...`, Vitest, `test-instance`-Import) eingehalten.

## Empfehlung
Kein Blocker. Nächster Schritt: MEDIUM-1 als Ein-Datei-Testhärtung in einer Mini-Runde nachziehen (nur Testdatei), danach PR-Pfad wie gewohnt. MERGE/DEPLOY: NEIN in diesem Turn; DB geändert: NEIN.
