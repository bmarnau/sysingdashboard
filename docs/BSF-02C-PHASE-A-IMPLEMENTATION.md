# BSF-02C Phase A — Shared-Projection-Implementierung

Status: **IMPLEMENTIERT / VERIFIKATION AUSSTEHEND — NICHT MERGEBEREIT**  
Stand: 2026-09-02  
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

Die Live-Datenbank ist bis zur abschließenden Repository-Integration kontrolliert dem GitHub-`main` voraus. Deshalb ist dieser Stand ausdrücklich nicht release- oder mergefähig, bevor die reale DB-/RLS-Testmatrix und die vollständigen GitHub-Gates erfolgreich abgeschlossen sind.

## 3. Datenbankartefakt

Historische, bereits live angewendete Migration:

`supabase/migrations/20260902031900_6d4075e1-9916-42fd-8076-31420c84c71c.sql`

Diese Datei wird im Repository **bit-identisch zum angewendeten Lovable-Artefakt** übernommen. Historische, bereits angewendete Migrationen werden nicht nachträglich umgeschrieben. Falls die Verifikation morgen eine fachliche Korrektur verlangt, erfolgt sie ausschließlich als neue Folgemigration über einen erneut freigegebenen Lovable-Auftrag.

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

- `PUBLIC`: keine Table-Rechte,
- `anon`: keine Table-Rechte,
- `authenticated`: nur `SELECT`, `INSERT`, `UPDATE`,
- kein `DELETE`, `TRUNCATE`, `REFERENCES` oder `TRIGGER` für `authenticated`,
- keine DELETE-Policy,
- Service Role wird nicht im Browser-/Normal-Publish-Pfad verwendet.

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

## 6. Generierte Supabase-Typen

`src/integrations/supabase/types.ts` wird als echtes BSF-02C-Schemaartefakt übernommen. Die Ergänzungen enthalten die drei neuen Projection-Tabellen und ihre Beziehungen.

Die Datei ist **kein** Lovable-Preview/Auth-Overlay. Nicht übernommen werden weiterhin `client.ts` und `previewAuthStorage.ts`.

## 7. T01–T30-Testartefakt

Datei:

`supabase/tests/bsf-02c-shared-projection.sql`

Der erste Lovable-Teillauf erzeugte das Testartefakt, konnte es wegen des Lauf-/Creditlimits aber nicht real ausführen. Beim anschließenden Repository-Review wurde am Dateiende ein syntaktisch ungültiger Marker (`RAISE_ROLLBACK: DO ...`) erkannt.

Die GitHub-Integrationsfassung korrigiert **nur den Test-Runner-Vertrag**:

- `\set ON_ERROR_STOP on` analog zum bewährten BSF-02B-Testmuster,
- Assertions bleiben fail-fast,
- der ungültige Marker wurde entfernt,
- ein erfolgreicher Lauf endet regulär mit `ROLLBACK;`,
- die fachliche T01–T30-Testlogik wurde nicht verändert.

**Wichtig:** Die korrigierte Testfassung ist am 2026-09-02 noch nicht gegen die Live-Datenbank ausgeführt. `T01–T30 = PASS` darf bis zum realen Lauf nicht behauptet werden.

## 8. Verbindlicher nächster DB-Schritt

Sobald wieder Lovable-Credits verfügbar sind:

1. aktuellen GitHub- und DB-Stand read-only verifizieren,
2. Migration **nicht erneut anwenden**,
3. das committed Testartefakt exakt gegen den verbundenen Supabase-Kontext ausführen,
4. T01–T30 vollständig dokumentieren,
5. synthetische Testdaten durch `ROLLBACK` vollständig verwerfen,
6. Security Advisor / Grants / RLS read-only erneut prüfen,
7. bei jedem fachlichen FAIL stoppen und analysieren,
8. notwendige DB-Korrekturen ausschließlich als **neue** Lovable-Migration durchführen.

## 9. Noch nicht Teil dieser Phase

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

## 10. Merge-Gate

Dieser Integrationsstand bleibt **DRAFT / NOT MERGEABLE**, bis mindestens vorliegen:

- reale T01–T30: PASS,
- keine Testdatenreste,
- keine neue BSF-02C-Security-Advisor-Warnung,
- unveränderte bekannte SEC-01-Befunde nur als Baseline,
- Security Workflow auf Exact Head: PASS,
- vollständige CI auf Exact Head: PASS,
- E2E: PASS,
- Accessibility: PASS,
- Technical Debt: PASS,
- `14 · Technical Report & Quality Gate`: PASS,
- Netto-Diff ohne Lovable Preview/Auth-Overlay,
- Merge ausschließlich mit Expected-Head-SHA.

## 11. Abschlussstatus 2026-09-02

- DB-Migration durch Lovable angewendet: **JA**
- Migration im Integrationsbranch historisch unverändert gesichert: **JA**
- generierte Projection-Typen gesichert: **JA**
- T01–T30-Testartefakt syntaktisch für den nächsten Lauf korrigiert: **JA**
- T01–T30 real ausgeführt: **NEIN**
- weitere DB-Änderung nach Lovable-Teillauf: **NEIN**
- Preview/Auth-Overlay übernommen: **NEIN**
- Merge/Deploy: **NEIN**
- Status: **BLOCKED_VERIFICATION / DRAFT**
