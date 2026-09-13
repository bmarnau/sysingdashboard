# BSF-03D (#103) — Arbeitspaket-Kategorien als systemhausweite Stammdaten

## Befund (Repo-Stand `f943fae`, verifiziert)

- **WorkPackage** (`src/lib/dashboard-data.ts:27`) hat kein Kategoriefeld; Persistenz ist local-first (Zustand-Store + localStorage, `src/lib/store/*`). APs liegen **nicht** in der Cloud-DB — Kategoriezuordnung ist damit rein client-/exportseitig, nur der **Katalog** liegt in Reference Data.
- **CRUD-Gating**: `canEditWP = usePermission("workpackage.edit")` in `dashboard.tsx:219`; `viewer`/`customer` haben es nicht. Kategorie-Auswahl im Dialog erbt dieses Gating automatisch.
- **Reference-Data-Vertrag**: Adapter/Service/Typen (`src/lib/reference-data/*`) kennen **kein** `systemhouseId`/`scopeType`; `insertValue` sendet kein `systemhouse_id`. `CATALOG_KEYS` enthält nur AVKK-Kataloge. Es gibt **keine UI** für `createValue/updateValue/deactivateValue` (nirgends aufgerufen).
- **DB-Drift (wichtig)**: Die Live-DB enthält bereits die Migration `bsf03d_reference_data_systemhouse_scope` (`reference_catalog.scope_type` global|systemhouse, `reference_value.systemhouse_id`, Trigger `reference_value_validate_scope` inkl. Key-Immutabilität für `workpackage.category`, partielle Unique-Indizes, systemhouse-membership-gebundene RLS auf `reference_value`, Katalogzeile `workpackage.category` scope `systemhouse`, 0 Werte). **Im Repo fehlt diese SQL-Datei** (`supabase/migrations/` endet bei P5). RLS-Prüfung: `reference_value_*` = `has_permission(referencedata.view|manage) AND (systemhouse_id IS NULL OR has_active_systemhouse_membership(...))` → **systemhouse-scoped, keine Cross-Systemhouse-Sichtbarkeit**; Katalog-Metadaten (`reference_catalog`) bleiben global lesbar (unkritisch, keine Werte).
- **Export/Import**: `WorkPackageSchema` (`src/lib/json-schema.ts:74`) und Import-Mapping (`json-import-service.ts:442`) ohne Kategorie. **Backup** sichert bereits **alle** Kataloge/Werte aus dem Snapshot (`avkk-payload.ts`, `zip.ts` → `reference-data.json`); `workpackage.category` wird damit automatisch mitgesichert. Restore validiert Katalogreferenzen nur für AVKK.
- **Shared Projection** (`shared_work_package_projection`) hat nur title/status/priority — Kategorie ist nicht Teil des BSF-02C-Vertrags; bleibt außen vor (kein RPC-Change).

## Konservative Entscheidungen

1. **Migration**: Die im Repo fehlende Scope-Migration wird als idempotente Datei `supabase/migrations/20260913170000_bsf03d_reference_data_systemhouse_scope.sql` rekonstruiert (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`). Vorab per GitHub prüfen, ob `main` sie schon enthält — dann entfällt Schritt 1 (Repo = Source of Truth). Keine neuen Tabellen, keine Policy-Änderung, keine Service-Role.
2. **Vertrag**: `categoryKey?: string | null` am WorkPackage; `categoryLabel` **nicht** persistiert (Anzeige wird aus Katalog aufgelöst; bei unbekanntem Key Anzeige „Unbekannte Kategorie (key)“). Snapshots/Reports können das Label später ableiten (#106).
3. **Systemhaus-Kontext**: Die UI schreibt nur in das Systemhaus, für das eine aktive Membership besteht; bei >1 Membership Auswahl im Verwaltungsdialog; Lesen filtert RLS.
4. **Editierbarkeit**: Minimaler Verwaltungsdialog nur für `workpackage.category` (anlegen, Label/Sortierung ändern, deaktivieren; Key unveränderlich, kein Delete), gated `referencedata.manage` im Backend-Admin-Bereich. Kein generischer Katalog-Editor.

## Umsetzungsschritte (TDD: erst RED)

### Schritt 0 — Tests schreiben (müssen zuerst fehlschlagen)
- `src/__tests__/lib/reference-data/scope.test.ts`: `ReferenceValue.systemhouseId`, `ReferenceCatalog.scopeType`; `insertValue` sendet `systemhouse_id` bei Systemhaus-Katalog; `CATALOG_KEYS.workPackageCategory === "workpackage.category"`.
- `src/__tests__/lib/workpackage-category.test.ts`: `resolveCategory(wp, values)` → `none | active | inactive | unknown`; keine Ableitung von billable/priority/status.
- `src/__tests__/io/json-schema-category.test.ts`: Schema akzeptiert fehlend/null/String (max 100), lehnt Nicht-String ab; Roundtrip Export→Import erhält `categoryKey`; Import ohne Feld → `null`.
- `src/__tests__/integration/import-category-failsafe.test.ts`: unbekannte/deaktivierte Kategorie → Import-Warnung, Wert wird **unverändert** übernommen (keine stille Umdeutung), Vorschau zeigt Warnung.
- `src/__tests__/backup/reference-data-category.test.ts`: Backup enthält Katalog `workpackage.category` mit Werten; Restore mit AP-`categoryKey` ohne passenden Katalogwert → Warnung, kein Abbruch.
- `src/__tests__/components/WorkPackageDialog-category.test.tsx`: Select mit Default „— Keine Kategorie —“, nur aktive Werte + bereits gesetzter inaktiver Wert (`selectableValues`), axe-Check.
- `src/__tests__/components/crud-view-gating`-Erweiterung: viewer sieht Kategorie read-only, kein Verwaltungsbutton; `referencedata.manage`-los → kein Editor.
- `supabase/tests/bsf-03d-workpackage-category-rls.sql` (BEGIN…ROLLBACK): D01 Manager legt Wert in eigenem Systemhaus an PASS; D02 fremdes Systemhaus DENY; D03 Mitglied ohne `manage` DENY; D04 viewer liest nur eigenes Systemhaus; D05 global-Katalog + `systemhouse_id` → Trigger-Fehler; D06 Key-Änderung → Fehler; D07 doppelter Key pro Systemhaus → Unique-Fehler; D08 anon DENY.
- E2E `e2e/specs/dashboard-category.spec.ts`: AP anlegen mit Kategorie, Anzeige in Liste, viewer ohne Schreibpfad.

### Schritt 1 — Migration ins Repo (nur falls auf GitHub-main fehlend)
Datei s.o.; danach `supabase--get_types` prüfen (Types enthalten `scope_type`/`systemhouse_id` bereits).

### Schritt 2 — Reference-Data-Vertrag erweitern
- `types.ts`: `scopeType: "global" | "systemhouse"` am Katalog, `systemhouseId: string | null` am Wert, `CATALOG_KEYS.workPackageCategory`.
- `adapter.ts`: Mapping beider Felder; `ValueWritePayload.systemhouseId?: string | null`; Insert setzt `systemhouse_id`.
- `service.ts`: `listValues(key, { systemhouseId? })` optionaler Filter; Cache-Version bleibt 1 (additive Felder, alte Caches werden durch fehlende Felder als `null` gelesen — Test dafür).
- `docs/REFERENCE-DATA.md` fortschreiben.

### Schritt 3 — Domänenmodell + Export/Import/Backup
- `WorkPackage.categoryKey?: string | null`; `WorkPackageSchema.categoryKey: z.string().max(100).nullable().optional()`; `JSON_SCHEMA_VERSION` additiv 1.1.0 → 1.2.0 (Import akzeptiert weiterhin 1.0/1.1); Export/Import-Mapping; Beispieldateien (`example-file-service.ts`) um ein AP mit Kategorie ergänzen; Import-Vorschau: Warnung „Kategorie X unbekannt/deaktiviert“ (fail-safe, Wert bleibt).
- Restore-Validierung (`avkk-payload.ts`/`integrity.ts`): AP-`categoryKey` gegen `reference-data.json` prüfen → nur Warnung.
- Neues Modul `src/lib/workpackage-category.ts` (reine Fachlogik, providerneutral): `resolveCategory`, `categoryDisplayLabel`, Controlling-Helfer `groupByCategoryKey(workPackages)` als Vorbereitung für #106.

### Schritt 4 — UI
- `WorkPackageDialog.tsx`: Feld „Kategorie“ (Select) via `useReferenceData([CATALOG_KEYS.workPackageCategory])`, Default „— Keine Kategorie —“, Ladefehler → Feld deaktiviert mit Hinweis, gesetzter Wert bleibt erhalten. Tags unverändert.
- AP-Liste/Detail: Kategorie-Badge (nur Anzeige).
- `WorkPackageCategoryAdminDialog.tsx` im Backend-Admin (lazy), `<PermissionGate permission="referencedata.manage">`; Systemhauswahl aus aktiver Membership (bestehender Membership-Read wie in `customer-responsibility-management-adapter.ts:51`, ohne neue RLS).

### Schritt 5 — Doku/Abnahme
- HelpTopic (Arbeitspakete + Kataloge, `lastUpdated`), `CHANGELOG.md` **1.62.0**, `docs/DATA-SCHEMA.md`, `docs/RBAC-MATRIX.md` (keine neuen Permissions — nur Vermerk), `docs/CURRENT-STATUS.md`, Sprintnachweis `docs/BSF-03D-…md` nur mit realen Ergebnissen.
- Gates: `typecheck`, `lint`, `prettier --check`, `test` (Vitest gesamt), `test:a11y`, `test:security` (inkl. `rbac:check`, `security:check`), `test:debt`, `docs:check`, `project-status` check, `build`, E2E Chromium-Suite, SQL-Artefakt D01–D08 mit Rollback, Security Advisor read-only (nur SEC-01-Baseline erlaubt).

## Risiken / Regressionspunkte
- **DB-Drift** zwischen Live-DB und Repo: Migration muss idempotent sein und darf gegen die Live-DB keinen Fehler werfen; Journal-Name kollidiert nicht (neuer Dateiname).
- Cache-Kompatibilität: alte localStorage-Snapshots ohne `systemhouseId` → Felder defaulten auf `null`/`"global"`.
- AVKK-Kataloge sind global und bleiben unberührt; Regression `service.test.ts` und AVKK-Suites müssen grün bleiben.
- Mehrfach-Membership: Katalogwerte mehrerer Systemhäuser könnten gemischt erscheinen → Filter nach Systemhaus im Select, Fallback „alle sichtbaren“ bei genau einer Membership.
- Kein Schreibpfad für viewer/customer entsteht: nur bestehende Policies (`referencedata.manage` ∧ Membership), keine Service-Role, keine neuen RPCs.
- Nicht berührt: Shared-Projection-RPC, `customer_responsibility`, P5, AVKK-Definer-Funktionen.

## Abnahmekriterien
- Alle RED-Tests aus Schritt 0 GREEN; bestehende 696+ Vitest, E2E-Suite, SQL-Regression BSF-03 unverändert grün.
- AP ohne Kategorie bleibt gültig (Export/Import/Backup alt = neu).
- Unbekannte/deaktivierte Kategorie: sichtbar als Warnung, nie stillschweigend geändert/gelöscht.
- Cross-Systemhouse: kein Lesen/Schreiben fremder Werte (D02/D04 PASS).
- Advisor ohne neue Warnung; keine neue Permission, kein neues Recht für viewer.
- Abschlussbericht mit Dateien, Migration, Tests, Security/RBAC/RLS, Import/Export/Backup, Docs, Restpunkten (u. a. #106 Aggregation, #102 Template-Vorschlag).
