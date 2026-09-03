# BSF-02C Phase A — Shared-Projection-Implementierung

Status: **DB/RLS ACCEPTANCE PASS — MERGE NUR MIT GRÜNEM EXACT-HEAD-GATE**  
Stand: 2026-09-03  
Issue: #88  
ADR: ADR-0032  
Design: `docs/BSF-02C-DESIGN.md`

## 1. Zweck

Phase A von BSF-02C ergänzt die bereits genehmigte providerneutrale Shared-Projection-Architektur um die minimale persistente Supabase-Datenbankbasis für den gemeinsamen Customer-Pfad:

```text
Systemhouse
  -> Customer
    -> Shared Project Projection
      -> Shared WorkPackage Projection
        -> Shared Activity Projection
```

Die Local-First-Arbeitskopien bleiben bis BSF-04 die operative Quelle. Diese Phase führt keine vollständige zentrale Project-/WorkPackage-/Activity-Datenhaltung ein.

## 2. Herkunft und kontrollierter Zwischenzustand

GitHub-`main` war bei der Implementierung:

`1b3f94fe5919713fa86f42bda48d0ef8f0f6474c`

Die DB-/RLS-Implementierung wurde gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md` über einen ausdrücklich begrenzten Lovable-Auftrag erzeugt und auf dem verifizierten Supabase-Projekt angewendet.

Lovable-Implementierungsref:

`5d487c0e4eddf697fe290e655c4b8bdf8a7f19e2`

Der Lovable-Workspace enthielt vor der Implementierung ausschließlich bekannte Preview/Auth-Overlays gegenüber GitHub-`main`:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/previewAuthStorage.ts`

Diese Overlay-Dateien sind **nicht** Bestandteil des bereinigten BSF-02C-Integrationsstands.

Die Live-Datenbank ist bis zur abschließenden Repository-Integration kontrolliert dem GitHub-`main` voraus. Die DB-/RLS-Abnahme ist am 2026-09-03 erfolgreich erfolgt. Merge und Deploy dürfen unabhängig vom Dokumentationszeitpunkt ausschließlich mit einem grünen Security-/CI-Gate auf dem jeweils aktuellen PR-Exact-Head erfolgen.

## 3. Datenbankartefakt

Historische, bereits live angewendete Migration:

`supabase/migrations/20260902031900_6d4075e1-9916-42fd-8076-31420c84c71c.sql`

Diese Datei wird im Repository **bit-identisch zum angewendeten Lovable-Artefakt** übernommen. Historische, bereits angewendete Migrationen werden nicht nachträglich umgeschrieben. Eine eventuell später notwendige DB-Korrektur darf ausschließlich als neue, separat freigegebene Folgemigration erfolgen.

Die Migration führt ein:

- `shared_project_projection`,
- `shared_work_package_projection`,
- `shared_activity_projection`,
- Composite Customer-/Parent-FKs innerhalb desselben `(systemhouse_id, customer_id)`-Scopes,
- Übergangsidentität `(systemhouse_id, customer_id, source_id)`,
- zusätzliche fail-closed Source-ID-Kollisionssperre `(systemhouse_id, source_id)`,
- `published_by` als Provenance-/Autoritätsmerkmal, nicht als fachliche Identität,
- Soft-Withdraw über `is_active` / `withdrawn_at`,
- Identity-Guard für Scope, Source-ID und Publisher,
- minimale Grants,
- RLS für Read und Publish.

## 4. Grants und RLS

### Grants

Der Acceptance-Lauf bestätigte:

- `PUBLIC`: keine Table-Rechte,
- `anon`: keine Table-Rechte,
- `authenticated`: nur `SELECT`, `INSERT`, `UPDATE`,
- kein `DELETE`, `TRUNCATE`, `REFERENCES` oder `TRIGGER` für `authenticated`,
- keine DELETE-/ALL-Policy,
- RLS auf allen drei Projection-Tabellen aktiv.

Die im Lovable-Testkontext zusätzlich sichtbare Rolle `sandbox_exec` ist eine Plattform-/Test-Harness-Rolle und nicht Bestandteil des Anwendungsvertrags. Service Role wird nicht im Browser-/Normal-Publish-Pfad verwendet.

### Read

Read verlangt gemeinsam:

- authentifizierte User-ID,
- aktives Konto,
- aktive Systemhouse-Membership,
- Customer Access `read` bzw. `write`,
- `dashboard.view` als zusätzliches fachliches Recht.

Customer Access bleibt die harte Scope-Grenze; `dashboard.view` allein reicht nicht.

### Project / WorkPackage Publish

- `published_by = auth.uid()`,
- aktives Konto,
- aktive Membership,
- Customer Access `write`,
- `project.edit`.

`workpackage.edit` allein reicht für das gemeinsame Struktur-Publishing weiterhin nicht.

### Activity Publish

Zusätzlich gilt:

- `activity.edit`,
- `engineer_id = auth.uid()`,
- `published_by = auth.uid()`.

Ein Browser kann damit im vorgesehenen Normalpfad keine Leistung einem anderen Engineer zuschreiben.

## 5. Parent- und Identitätsintegrität

Composite Foreign Keys verhindern Project-/WorkPackage-/Activity-Verknüpfungen über Customer- oder Systemhouse-Grenzen hinweg.

Explizit parentlose Bestandsobjekte bleiben möglich (`parent_link_status = 'none'`). Ein `linked`-Objekt benötigt dagegen den passenden Parent im identischen Customer-/Systemhouse-Scope.

Die zusätzliche Source-ID-Kollisionssperre bildet den in `shared-projection-contract.ts` beschriebenen AVKK-Übergangsvertrag ab: gleiche Source-ID derselben Entity-Art darf innerhalb eines Systemhauses nicht still zwei Customer-Identitäten erzeugen.

Der reale Acceptance-Lauf bestätigte die drei besonders kritischen strukturellen Negativfälle mit expliziter SQLSTATE-/Constraint-Prüfung:

- T26b: SQLSTATE `23505` / `shared_project_projection_source_collision_unique`,
- T19: SQLSTATE `23503` / `shared_work_package_projection_parent_fk`,
- T22: SQLSTATE `23503` / `shared_activity_projection_parent_fk`.

## 6. Generierte Supabase-Typen

`src/integrations/supabase/types.ts` enthält die zum angewendeten Schema gehörenden Definitionen für die drei neuen Projection-Tabellen und ihre Beziehungen.

Die Datei ist **kein** Lovable-Preview/Auth-Overlay. Nicht übernommen werden weiterhin `client.ts` und `previewAuthStorage.ts`.

## 7. T01–T30-Testartefakt und Testhärtung

Datei:

`supabase/tests/bsf-02c-shared-projection.sql`

Git-Blob der am 2026-09-03 abgenommenen Testfassung:

`94ac0c835348beac9b5790361a07e24e0d87e29f`

Lovable bestätigte für die geladene Raw-Datei des Acceptance-Heads zusätzlich SHA-256:

`b510d4aead4bb1a628c15ae66bc3c81d83a46d9870460920f20278f62fe26b89`

Der erste Lovable-Teillauf hatte ein Testartefakt erzeugt, es wegen des damaligen Lauf-/Creditlimits aber nicht real ausgeführt. Im Repository-Review wurden danach zwei Testqualitätsprobleme vor der realen Abnahme behoben.

### Runner-Härtung

- `\set ON_ERROR_STOP on` für psql-Ausführung,
- ungültiger historischer Schlussmarker entfernt,
- erfolgreicher Lauf endet regulär mit `ROLLBACK;`.

### False-Positive-Härtung

Vor der Live-Abnahme wurde erkannt, dass T19, T22 und T26b in einer älteren Fassung bereits an fehlendem C2-Customer-Access scheitern konnten. Damit wäre ein scheinbares PASS möglich gewesen, ohne die jeweils beabsichtigte strukturelle Constraint-Grenze tatsächlich zu erreichen.

Die Testfassung wurde deshalb ohne Produkt-/DB-Änderung präzisiert:

- synthetischer `U_OTHER` besitzt `write`-Access auf C1 und C2,
- T26b prüft exakt `23505` + `shared_project_projection_source_collision_unique`,
- T19 prüft exakt `23503` + `shared_work_package_projection_parent_fk`,
- T22 prüft exakt `23503` + `shared_activity_projection_parent_fk`,
- eine temporäre Assertion vergleicht SQLSTATE und Constraint-Namen fail-fast,
- T18 wurde gegen die aktuelle RBAC-Single-Source-of-Truth geprüft: `engineer` besitzt `workpackage.edit` und `activity.edit`, aber kein `project.edit`.

Damit können RLS-DENY und strukturelle Constraint-DENY nicht mehr versehentlich miteinander verwechselt werden.

## 8. Reale DB-/RLS-Abnahme vom 2026-09-03

Acceptance-Head:

`ebf244ed71e9a057c0a18a08a18bc50b5c39c58e`

Verifiziertes Supabase-Projekt:

`zffimqwnrsuzuozsgnlc`

Die historische Migration war bereits vorhanden und wurde **nicht erneut angewendet**.

### Runner

Die privilegierte psql-Dateiausführung war im Lovable-Sandbox-Kontext nicht möglich, weil die dortige `sandbox_exec`-Rolle keinen Zugriff auf `auth` besitzt. Der Test wurde deshalb über den verbundenen Supabase-SQL-Runner in einem einzigen Batch ausgeführt.

Für diesen Runner wurden ausschließlich die beiden psql-Metadirektiven `\set ON_ERROR_STOP on` und `\echo ...` transient ausgelassen. Sämtliche echten SQL-Statements von `BEGIN;` bis einschließlich `ROLLBACK;` wurden inhaltlich unverändert als ein fail-fast Batch ausgeführt. Die Repository-Datei wurde dafür nicht verändert.

### Ergebnis

Der vollständige Batch erreichte regulär `ROLLBACK;`. Da jede Abweichung im Testartefakt `RAISE EXCEPTION` auslöst, gilt:

- T01–T30: **PASS**,
- T16a/T16b: **PASS**,
- T26a/T26b: **PASS**,
- T29a/T29b: **PASS**,
- T30a/T30b/T30c: **PASS**.

Der SQL-API-Runner stellt die einzelnen `NOTICE`-Zeilen nicht als Textlog bereit. Der Einzelnachweis beruht daher auf der fail-fast-Semantik des unveränderten SQL-Batches und darauf, dass der Lauf das reguläre `ROLLBACK` erreichte. Die drei erwarteten Constraints für T19/T22/T26b wurden zusätzlich read-only als vorhanden bestätigt.

### Rollback und Residuen

Nach dem Lauf wurden die synthetischen Testidentitäten und Testobjekte read-only kontrolliert. Ergebnis:

- Test-Auth-User: 0,
- Test-Profile/Rollen: 0,
- Test-Systemhäuser/Kunden: 0,
- Test-Membership/Customer-Access: keine Testreste,
- Shared Project/WorkPackage/Activity Testzeilen: 0,
- temporäre `pg_temp`-Hilfsfunktionen: verworfen.

Es erfolgte keine dauerhafte DB-Änderung durch den Acceptance-Lauf.

### Security Advisor

Nach dem Test wurden zwei bekannte SECURITY-DEFINER-Befunde aus der bestehenden SEC-01-Baseline gemeldet. Sie betreffen `avkk_can_write` und `avkk_people_directory`. Es wurde keine neue BSF-02C-bezogene Warnung festgestellt.

## 9. GitHub-Abnahme des Acceptance-Heads

Für `ebf244ed71e9a057c0a18a08a18bc50b5c39c58e` wurden nach der Testhärtung ausgeführt:

- Security Workflow #484: **PASS**,
- CI Workflow #492: **PASS**,
- Static / Prettier / ESLint / TypeScript / RBAC / Docs: **PASS**,
- Unit & Components: **PASS**,
- Backend: **PASS**,
- API: **PASS**,
- RBAC & Security: **PASS**,
- Import/Export: **PASS**,
- Backup/Restore: **PASS**,
- Production Build: **PASS**,
- Playwright E2E: **PASS**,
- Accessibility: **PASS**,
- Technical Debt: **PASS**,
- `14 · Technical Report & Quality Gate`: **PASS**.

Der danach erzeugte reine Dokumentations-Head `6bc67d9cd5ac3c69410bd2f63ee8ead150c26f26` wurde ebenfalls vollständig geprüft: Security Workflow #485 **PASS**, CI Workflow #493 **PASS** einschließlich E2E, Accessibility, Technical Debt und finalem Quality Gate.

## 10. Lovable-Workspace-Nebeneffekt

Der Lovable-Abschlussbericht behauptete zunächst `CODE-/REPO-AENDERUNGEN = NEIN`. Eine unabhängige Diff-Prüfung nach dem Lauf zeigte jedoch einen rein formatterartigen Edit in der isolierten Lovable-Workspace-Variante von:

`src/integrations/supabase/types.ts`

Dabei wurden ausschließlich Klammern in generischen TypeScript-Typausdrücken verändert. Dieser Edit war **nicht beauftragt**, ist **kein BSF-02C-Acceptance-Artefakt** und wird verworfen.

Wichtig für die Freigabe:

- der GitHub-PR-Head blieb nach dem Lovable-Lauf unverändert bei `ebf244ed...`,
- der Lovable-Formatter-Edit ist nicht in PR #110 enthalten,
- die DB-Abnahme verwendete die Raw-Testfassung des GitHub-Exact-Heads,
- die produktive Migration wurde nicht erneut ausgeführt,
- keine Preview/Auth-Overlay-Datei wurde in den GitHub-PR übernommen.

Der interne Lovable-Workspace ist damit weiterhin als nicht maßgebliche Variantenumgebung zu behandeln; GitHub bleibt die maßgebliche Integrationsquelle.

## 11. Noch nicht Teil dieser Phase

Noch nicht implementiert bzw. nicht freigegeben sind:

- providerneutraler Supabase Repository-Adapter,
- dedizierte Publish-Server-Function/Route mit User-JWT,
- Shared Customer Read-Service,
- sichtbare Customer-UI / BSF-03,
- Customer Responsibility,
- PM-Controlling,
- Teamlead-Leistungsnachweis,
- BSF-04-Zentralisierung.

Issue #88 bleibt deshalb auch nach einem erfolgreichen Phase-A-Merge offen, bis der minimale gemeinsame Read-/Publish-Pfad vollständig umgesetzt und abgenommen ist.

## 12. Merge-Gate nach DB-Acceptance

Dauerhaft nachgewiesen:

- reale T01–T30: **PASS**,
- T19/T22/T26b exakte strukturelle Constraints: **PASS**,
- Rollback: **PASS**,
- keine Testdatenreste: **PASS**,
- Grants/RLS: **PASS**,
- keine neue BSF-02C-Security-Advisor-Warnung: **PASS**,
- GitHub Security #484 / CI #492 auf dem real getesteten Acceptance-Head: **PASS / PASS**,
- GitHub Security #485 / CI #493 auf dem anschließenden reinen Dokumentations-Head: **PASS / PASS**,
- Lovable-Workspace-Nebeneffekt nicht in GitHub übernommen: **PASS**.

Die DB-Acceptance bleibt an den unveränderten Test-Blob `94ac0c835348beac9b5790361a07e24e0d87e29f` gebunden. Dokumentationsänderungen nach dem Acceptance-Head ändern diesen Nachweis nur dann nicht, wenn Migration, Testartefakt und generierte Supabase-Typen unverändert bleiben.

Für Ready-for-Review und Merge gilt zusätzlich zeitlos: **Security und vollständige CI müssen auf dem jeweils aktuellen PR-Exact-Head grün sein.** Der aktuelle Exact-Head-Nachweis wird deshalb in PR #110 und Issue #88 geführt und nicht als vergänglicher Status in diesem Dokument festgeschrieben.

## 13. Abschlussstatus

- DB-Migration durch Lovable ursprünglich angewendet: **JA**
- historische Migration im Integrationsbranch unverändert gesichert: **JA**
- Migration im Acceptance-Lauf erneut angewendet: **NEIN**
- T01–T30 real ausgeführt: **JA / PASS**
- ROLLBACK erfolgreich: **JA**
- Testdatenreste: **0**
- Grants/RLS vertragskonform: **JA**
- neue BSF-02C-Advisor-Warnung: **NEIN**
- unbeauftragter Lovable-Workspace-Formatter-Edit erkannt: **JA, VERWORFEN / NICHT IN GITHUB**
- Preview/Auth-Overlay übernommen: **NEIN**
- Merge/Deploy: **nur nach grünem Exact-Head-Gate**
- Status: **DB/RLS ACCEPTANCE PASS / MERGE NUR MIT GRÜNEM EXACT-HEAD-GATE**
