## Sprint 05 – Architektur-Refactoring (verhaltensneutral)

### Befund aus der Code-Analyse (verifiziert)

`src/routes/_authenticated/dashboard.tsx` (3280 Zeilen) enthält heute in **einer** Datei:
- Route-Definition + `Dashboard()` mit ~30 lokalen States, 5 `useEffect`, Persistenz-Bootstrap, abgeleitete Metriken (`targetSource`, `periodRef`, `metrics`, `chartBuckets`, `periodActivities`)
- Label-/Style-Maps (`wpStatusLabel`, `priorityStyles`, `billingStyles`, …), Storage-Key-Helfer, `fmtDate`/`fmtEuro`/`newId`
- Validierung/Normalisierung (`validateActivity`, `normalizeActivity`, `normalizeWorkPackage`)
- Präsentations-Primitives (`Card`, `TabButton`, `PeriodToggle`, `KpiCard`, `SearchInput`, `IconBtn`, `Modal`, `FormActions`)
- 4 Tab-Views (`ProjectsView`, `WorkPackagesView`, `ActivitiesView`, `BillingView`) mit je eigenem Filter-State
- 4 Formular-Dialoge (`ProjectDialog`, `WorkPackageDialog`, `ActivityDialog`, `EngineerDialog`)
- 13 lazy-geladene Service-Dialoge + Servicemenü/Hilfemenü/Globale Suche

`src/components/ExportDialog.tsx` (807 Zeilen): Konfigurations-State, Präferenz-Persistenz (`loadPrefs`/`savePrefs`), Dateinamens-Logik (`buildFileName`, `slugify`, `timestamp`), PDF-Erzeugung/Preview, Download-Ablage, Formatter + `GroupNode`-Renderer.

**Abweichung zur Vorgabe, bewusst:** die vorgeschlagenen Namen `DashboardNavigation`, `ComplianceSummaryPanel`, `ReportStatusPanel` haben im Dashboard keine Entsprechung — Compliance/Report leben in `src/components/compliance/` bzw. `TechnicalReportDialog`. Ich schneide entlang der real vorhandenen Verantwortlichkeiten statt Platzhalter-Komponenten zu erzeugen.

---

### Aufgabe 1 – Regressionsbasis

`bun run lint`, `tsgo` (TS), `bun run test`, `bun run build` als Ausgangsmessung; `bun run test:debt` für LOC-Baseline. Playwright-Referenz-Screenshots (Desktop 1440, Tablet 834, Mobile 390) unter `e2e/__screenshots__/sprint05-baseline/` über einen neuen Spec `e2e/specs/visual-baseline.spec.ts`; Ergebnisse in `test-report/sprint05-regression.md`.

### Aufgabe 2 – Dashboard zerlegen

Neue Struktur unter `src/components/dashboard/`:

```text
dashboard/
  constants.ts            Label-/Style-Maps, inputCls
  formatters.ts           fmtDate, fmtEuro, newId, isValidISODate
  domain.ts               validateActivity, normalize*(), empty*()
  primitives/             Card, TabButton, KpiCard, IconBtn, SearchInput,
                          PeriodToggle, Modal, FormActions
  DashboardHeader.tsx     Kopfzeile, Benutzer-Button, Datumszeile
  DashboardToolbar.tsx    Neu-Menü, Servicemenü, Hilfemenü
  DashboardSearch.tsx     Globale Suche inkl. Outside-Click
  DashboardTabs.tsx       Tab-Leiste
  panels/                 KpiPanel, ChartPanel, PerformancePanel
  views/                  ProjectsView, WorkPackagesView, ActivitiesView, BillingView
  dialogs/                ProjectDialog, WorkPackageDialog, ActivityDialog, EngineerDialog
  DashboardServiceDialogs.tsx  alle 13 lazy Dialoge + Suspense
```

`dashboard.tsx` behält danach nur: Route, `head()`, Layout-Komposition, Hook-Aufrufe, Dialog-Orchestrierung. Zielgröße < 300 Zeilen.

### Aufgabe 3 – ExportDialog zerlegen

`src/components/export/`: `ExportDialog.tsx` (nur Komposition), `ExportConfiguration.tsx`, `ExportPreview.tsx` (inkl. `GroupNode`), `ExportProgress.tsx`, `ExportError.tsx`, `ExportFooter.tsx`, `export-format.ts` (Formatter, Options-Listen, `buildFileName`, `slugify`). Der bestehende Pfad `src/components/ExportDialog.tsx` bleibt als Re-Export bestehen, damit der Lazy-Import und die Tests unverändert funktionieren.

### Aufgabe 4 – Hooks/Services

- `src/hooks/dashboard/useDashboardBootstrap.ts` – Bootstrap, Persistenz-Init, Normalisierung, `hydrated`
- `src/hooks/dashboard/usePeriodSelection.ts` – viewMode/periodOffset + localStorage + `useTransition`
- `src/hooks/dashboard/useDashboardMetrics.ts` – targetSource, periodRef, metrics, chartBuckets, periodActivities
- `src/hooks/dashboard/useDashboardDialogs.ts` – konsolidierter Dialog-State (ein Reducer statt ~20 Booleans)
- `src/hooks/dashboard/useGlobalSearch.ts` – Suchergebnisse + Outside-Click
- `src/hooks/dashboard/useDashboardMutations.ts` – save/delete für Projekt/WP/Aktivität gegen den Store
- `src/hooks/export/useExportConfiguration.ts` und `useExportRun.ts` – Präferenzen, PDF-Erzeugung, Download

Fachlogik ohne React (Dateiname, Validierung, Normalisierung) wandert in reine Module und wird direkt unit-testbar.

### Aufgabe 5–7 – Datenfluss, Konsistenz, Performance

Store bleibt einzige Domain-Quelle; die `Updater<T>`-Wrapper werden zu stabilen Callbacks in `useDashboardMutations`. Konstanten-Arrays (`HELP_QUICKLINKS`, Options-Listen) raus aus dem Render-Body. `React.memo` nur für die vier Tab-Views plus `useCallback` für weitergereichte Handler — keine spekulative Optimierung. Fehlerbehandlung einheitlich über `logger` + `toast`.

### Aufgabe 8 – Tests

Neu unter `src/__tests__/components/dashboard/` und `src/__tests__/components/export/`: Primitives-Rendering, `useDashboardMetrics` (Periodenwechsel, leere Daten), `usePeriodSelection` (Persistenz), `useDashboardDialogs` (Reducer-Übergänge), `buildFileName`/`slugify` (Randfälle, Sonderzeichen), Export-Fehlerpfad (PDF-Fehler → ExportError). Bestehende Suites, `test:a11y`, `test:security` und die E2E-Specs müssen unverändert grün bleiben; Screenshot-Vergleich gegen die Baseline aus Aufgabe 1.

### Aufgabe 9 – Dokumentation

`docs/adr/ADR-0019-oversize-refactor-plan.md` → umgeschrieben auf „umgesetzt" mit finaler Struktur und Begründung; Akzeptanz-Einträge in `scripts/technical-report/tech-debt-acceptances.json` entfernt (Ticket `SPRINT-04-DASHBOARD-SPLIT` erledigt); `docs/ARCHITECTURE.md` um das Komponentendiagramm ergänzt; `README.md` Ordnerübersicht; `CHANGELOG.md` → **v1.44.0**; neues Handbuch-Kapitel entfällt (keine Benutzeränderung), stattdessen `lastUpdated`-Pflege plus `bun run docs:check`.

### Qualitätsprüfung + Abschlussbericht

Abschluss-Lauf: `lint`, TS, `test`, `test:a11y`, `test:security`, `test:debt`, `build`, Playwright-Vergleich, `report:technical`. Ergebnis als `test-report/sprint05-abschlussbericht.md` (Zusammenfassung, Architektur, Qualität, beseitigte/verbleibende technische Schuld, Risiken, Empfehlung Sprint 06).

---

### Kritische Hinweise

1. **Risiko.** Das ist der riskanteste Umbau bisher: 4000 Zeilen ohne Component-Level-Tests. Die Screenshot-Baseline aus Aufgabe 1 ist die einzige echte Absicherung — ohne sie würde ich den Sprint nicht starten.
2. **Reihenfolge.** Ich arbeite in überprüfbaren Etappen mit Testlauf nach jeder: (a) reine Extraktion ohne Logikänderung → (b) Hooks → (c) ExportDialog → (d) Doku. Nach Etappe (a) ist bereits ein Abbruch ohne Schaden möglich.
3. **Dialog-Reducer.** Aufgabe 4 legt ~20 Boolean-States zu einem Reducer zusammen — das ist der einzige Punkt mit echtem Verhaltensrisiko (mehrere gleichzeitig offene Dialoge). Falls du das konservativer willst, lasse ich die Booleans und verschiebe sie nur in den Hook.
4. **`ExportDialog.tsx` als Re-Export** vermeidet Änderungen an `dashboard.tsx`-Lazy-Import und Tests; alternativ harte Umstellung aller Call-Sites — sag Bescheid, wenn du keine Wrapper-Datei willst.
