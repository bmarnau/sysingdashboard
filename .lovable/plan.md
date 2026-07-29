
# Sprint 04 – Prüfbericht 2.0 & Struktur-Refactoring

## Kritisches Feedback vorab

Der Sprint bündelt zwei sehr verschiedene Arbeitsstränge (Report-Infrastruktur + großes UI-Refactoring). Ich schlage vor, **Report 2.0 zuerst** abzuschließen und den **Refactor als zweiten, isolierten Schritt** im selben Sprint zu fahren — sonst wird die Regressionsanalyse unlesbar (jede Report-Diff-Änderung überlagert Refactor-Effekte). Alles im Umfang bleibt, aber sequenziell.

Zusätzlich: die Prompt-Liste unter §3 (Prüfbereiche) beschreibt weitgehend das, was der Aggregator heute schon zusammenzieht — echte Neuarbeit sind **Historie, Hash, Freigabestufen, Vergleich, Audit**. Ich fokussiere die Umsetzung dort und ergänze fehlende Bereichsfelder (Auth, RLS, Docker, Azure-Readiness) als deklarative Sektionen ohne neue Scanner.

## Ausgangsanalyse (verifiziert)

- `scripts/technical-report/build.mjs` (747 LOC) ist ein reiner Aggregator: liest `test-report/*` + `tech-debt/*`, schreibt `technical-test-report.{json,md}` + `.prev.json`. Diff nur gegen den letzten Lauf, keine Historie, kein Hash, keine Freigabestufe (nur `recommendation.level`), keine Report-ID.
- Anzeige: `src/components/compliance/*` liest den Report via `?raw`-Import (ADR-0017). UI stabil, kein Umbau nötig außer neue Felder.
- `src/routes/_authenticated/dashboard.tsx` (3280 LOC): eine `Dashboard()`-Komponente + 4 Views (`ProjectsView`, `WorkPackagesView`, `ActivitiesView`, `BillingView`) + 4 Dialoge (Project/WP/Activity/Engineer) + Helper (`Card`, `TabButton`, `KpiCard`, `SearchInput`, `IconBtn`, `Modal`, `FormActions`, `PeriodToggle`) + Persistenz-Effekte + Validierung. Alle Views/Dialoge sind bereits in sich geschlossen — Extraktion ist mechanisch, verhaltensneutral.
- `src/components/ExportDialog.tsx` (807 LOC): `ExportDialog` + Prefs-Persistenz + Format-/Gruppierung-/Sort-Konfig + `GroupNode`-Preview + PDF-Lazy. Split entlang bereits vorhandener Blöcke möglich.
- ADR-0019 akzeptiert beide Findings befristet — muss nach Refactor geschlossen werden.

Risiken: Dashboard-State ist stark verflochten (Persistenz via `initDashboardPersistence`, `dashboardStore` PubSub). Refactor darf State nur **hochreichen**, nicht duplizieren.

## 1. Report 2.0 – Datenmodell

Neue Felder in `technical-test-report.json` (Schema-Version `2.0.0`):

```text
report:
  id                 // uuid v4, pro Lauf neu
  schemaVersion      // "2.0.0"
  version            // Reportversion, monoton (aus history-index)
  parentReportId     // Vorgängerbericht oder null
  integrity: { algo: "sha256", value, fields[] }
  identity: { dashboardVersion, commit, buildTag?, dbMigrationHead?,
              environment, generatedAt, generatedBy }
  releaseStage: { proposed, effective, reason, overridden?, overriddenBy? }
  sections: { architecture, auth, rbac, rls, supabase, apiSecurity,
              operations, dockerPortability, azureReadiness, tests, docs }
  findings[]         // erweitertes Schema (s.u.)
  diff               // gegen parentReportId
```

Finding-Schema (Superset zum jetzigen):
`id, title, area, category, severity, gateRelevant, status, description, evidence, rootCause, recommendation, owner, effort, dueDate, createdAt, closedAt, commitRef?, adrRef?, classification: confirmed|false-positive|accepted-debt|fixed|not-applicable`.

Bestehende Auto-Findings werden gemappt (kein Datenverlust). Manuelle Nachweise für Sektionen ohne Scanner (Auth E2E, RLS, Docker, Azure-Readiness) leben in `scripts/technical-report/manual-sections.json` und werden versioniert.

## 2. Historie & Integritäts-Hash

- Ablage: `test-report/history/<utc-timestamp>-<reportId>.json` (append-only, nie überschreiben).
- Index: `test-report/history/index.json` (Report-ID, Version, generatedAt, releaseStage, integrityHash, parentReportId).
- **Freigegebene Berichte** werden zusätzlich unter `history/released/` gehardlinkt und dürfen von Skripten nicht mehr geschrieben werden (Guard im Build-Skript).
- Löschung nur via `scripts/technical-report/archive.mjs` mit Audit-Zeile in `audit_log` (Rolle: systemadministrator) — sonst nur archivieren.
- Hash: `sha256` über kanonisch serialisierten Ausschnitt (`identity` ohne `generatedAt`, `sections`, `findings` sortiert nach `id`, `releaseStage.proposed`). Serialisierung: `JSON.stringify` mit sortierten Keys via `safe-stable-stringify`-Pattern (eigener Sortierer, keine Extra-Dep). Felder-Whitelist im Report unter `integrity.fields[]`, damit die Prüfung reproduzierbar bleibt. Zeitstempel + UI-Zustände sind ausgeschlossen.
- Verifikation via `scripts/technical-report/verify.mjs <file>` (rechnet Hash nach, exit 1 bei Mismatch, in CI angehakt).

## 3. Freigabelogik & Vergleich

Vorschlagsregel in `scripts/technical-report/release-gate.mjs`:

```text
production      ← 0 open critical, 0 gate-blocker, security+auth+rls green,
                  restore-test present, docs complete
pilot           ← wie production, aber restore-test optional
internal-test   ← 0 open critical, security+auth green
development     ← sonst
```

Manuelle Abweichung: `scripts/technical-report/override.mjs --stage=pilot --reason=… --ticket=…` schreibt in den Report (`releaseStage.overridden`) und in `audit_log`. Nur `systemadministrator` (Prüfung via Env-Guard im Skript, dokumentiert für Server-Seite).

Vergleich (`diff`) erweitert um: `reopened[]`, `severityChanged[]`, `gateChanged[]`, `statusChanged[]`, `expiredAcceptances[]`, `securityRegressions[]` (hervorgehoben in Markdown + UI-Panel).

## 4. UI-Anpassungen (minimal)

- `src/components/compliance/ComplianceSummary.tsx`: Report-ID, Version, Hash, Freigabestufe (proposed/effective), Parent-Link.
- neuer `ComplianceRegressions.tsx`: Security-Regressionen hervorheben.
- `ComplianceHistory.tsx`: liest `history/index.json` (via `?raw`-Import wie bisher) statt nur `prev.json`.
- Keine neuen Fachfunktionen im Dashboard.

## 5. Refactor – dashboard.tsx (verhaltensneutral)

Neue Struktur unter `src/components/dashboard/`:

```text
dashboard.tsx (Route)     ~150 LOC – nur Route + <DashboardPage/>
DashboardPage.tsx         State, Persistenz, Dialog-Orchestrierung
header/DashboardHeader.tsx        Header + Servicemenü + Suche
header/ServiceMenu.tsx
tabs/TabBar.tsx                   (nutzt vorh. TabButton)
kpi/KpiRow.tsx                    (nutzt KpiCard)
views/ProjectsView.tsx            1:1 aus dashboard.tsx
views/WorkPackagesView.tsx
views/ActivitiesView.tsx
views/BillingView.tsx
dialogs/ProjectDialog.tsx
dialogs/WorkPackageDialog.tsx
dialogs/ActivityDialog.tsx
dialogs/EngineerDialog.tsx
primitives/{Card,Modal,FormActions,SearchInput,IconBtn,PeriodToggle}.tsx
hooks/useDashboardData.ts         (State + storage effects)
hooks/useDashboardFilters.ts      (Period, Search, Tab)
lib/validation.ts                 (validateActivity, normalize*)
lib/format.ts                     (fmtDate, fmtEuro, newId)
lib/labels.ts                     (wpStatusLabel, priorityStyles, …)
```

Regeln: keine State-Duplizierung, Persistenz-Keys bleiben identisch, keine Verhaltensänderung. Snapshot- + Playwright-Smoketest belegen Regression-Freiheit.

## 6. Refactor – ExportDialog.tsx

Unter `src/components/export/`:

```text
ExportDialog.tsx           Shell + Steuerung (~150 LOC)
ExportFormatSelection.tsx
ExportScopeSelection.tsx  (Grouping + Sort)
ExportPreview.tsx         (GroupNode + Formatter)
ExportProgress.tsx
ExportResult.tsx
ExportErrorState.tsx
hooks/useExportProcess.ts (Prefs, Trigger, Progress)
lib/export-prefs.ts       (loadPrefs/savePrefs)
lib/export-filename.ts    (buildFileName, slugify, timestamp)
lib/export-format.ts      (HOURS_FMT, CURRENCY_FMT, formatters)
```

Öffentliche Exports (`ExportConfiguration`, `ExportFormat`, `GroupingId`, `SortKey`) bleiben re-exportiert für Import-Kompatibilität.

## 7. ADR-0019 & Akzeptanzen

Nach Refactor: `scripts/technical-report/tech-debt-acceptances.json` beide Einträge entfernen; ADR-0019 auf **abgeschlossen** setzen mit Liste der entstandenen Module und Rest-Zeilenzahlen. Neuer Detektor-Lauf muss keine neuen Oversize-Findings für die Nachfolger produzieren (Schwellen 400/600 bleiben).

## 8. Tests

- Vitest neu: `report-build`, `report-hash`, `report-history`, `report-diff`, `report-release-gate`, `report-override-audit`, `report-integrity-verify`.
- Vitest neu Refactor: Rendersmoke pro extrahierter View/Dialog + Persistenz-Roundtrip.
- Playwright: existierende Nav/Search/Login-Suites laufen unverändert.
- CI: `verify.mjs` in `report`-Stage, Historie-Append in Post-Report-Step.

## 9. Dokumentation

CHANGELOG (`1.43.0`), README (Report-Kapitel), `docs/adr/ADR-0017` fortgeschrieben (Schema 2.0), ADR-0019 geschlossen, neue `docs/technical-report-2.md` (Datenmodell, Hash, Historie, Freigabe), `help-documentation.ts` Kapitel „Technischer Prüfbericht 2.0".

## Reihenfolge der Umsetzung

1. Report-Schema 2.0 + Aggregator anpassen (ohne UI).
2. Historie + Hash + Verify-Skript.
3. Release-Gate + Override + Audit.
4. UI-Erweiterungen (Summary, History, Regressions).
5. Refactor Dashboard (Snapshot vor/nach vergleichen).
6. Refactor ExportDialog.
7. ADR-0019 schließen, Akzeptanzen entfernen.
8. Volltest, CHANGELOG, Doku, Go/No-Go.

## Nicht enthalten

Keine AVKK-Funktionen, keine Domänen-Migration, keine neuen Scanner, keine State-Management-Umbauten. Report bleibt Datei-basiert (kein DB-Store) — Historie-in-DB wäre Sprint-05-Kandidat.
