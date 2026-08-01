# ADR-0019 – Oversize-Module: Refactor-Plan für Dashboard-Shell und ExportDialog

**Status:** akzeptiert · **Datum:** 2026-07-27 · **Sprint:** 03A

## Kontext

Der Oversize-Detektor meldet zwei Module über der 500-Zeilen-Schwelle:

- `src/routes/_authenticated/dashboard.tsx` (3281 Zeilen) — Dashboard-Shell mit Header, Servicemenü, Suche und Panels.
- `src/components/ExportDialog.tsx` (808 Zeilen) — Export-Wizard mit Vorschau, Progress und Download-Logik.

Beide Findings sind **reine Wartbarkeits-Debt** — kein Sicherheits-, Auth- oder Funktionsrisiko. Ein sofortiger Refactor würde den Sprint sprengen und die stabile Auth-/Compliance-Regression gefährden.

## Entscheidung

Beide Findings werden befristet bis **2026-12-31** über `scripts/technical-report/tech-debt-acceptances.json` akzeptiert (Ticket `SPRINT-04-DASHBOARD-SPLIT`). Der Refactor erfolgt in einem dedizierten UI-Sprint:

1. **Dashboard-Split**: Header/Servicemenü/Suche in eigene Komponenten unter `src/components/dashboard/` extrahieren. Panels bleiben Kinder.
2. **ExportDialog-Split**: `ExportWizard`, `ExportPreview`, `ExportProgress`, `ExportDownload` als Sub-Komponenten. Gemeinsamer Zustand über bestehenden Store.
3. Nach Refactor Akzeptanz entfernen und Detektor-Schwelle bestätigen.

## Konsequenzen

- **Compliance-Report** zeigt beide Findings als `accepted` mit Ticket-Referenz — kein High-Blocker.
- **Reviews** müssen die Akzeptanz vor Ablauf des Verfallsdatums erneut bewerten.
- **Keine funktionale Änderung** in diesem Sprint.

## Umsetzungsstand (Sprint 05 / 05B, Stand 1.44.3)

| Modul | vorher | jetzt | Status |
| --- | --- | --- | --- |
| `src/routes/_authenticated/dashboard.tsx` | 3281 | 979 | Teilerfolg — weiterhin über der 500-Zeilen-Schwelle, Akzeptanz `td-oversize-7e9a0b20` bleibt bis 2026-12-31 gültig |
| `src/components/ExportDialog.tsx` | 808 | 308 | erledigt — Akzeptanz entfernt (`ExportSortControls`, `ExportSummary`, `export-options`, `export-naming`, `useExportDialog`) |

Verbleibende Oversize-Findings ohne Akzeptanz (Medium, kein Gate-Blocker):
`src/lib/backup-service.ts` (1084), `src/components/ui/sidebar.tsx` (745, Fremdcode
shadcn), `src/components/UserManualDialog.tsx` (731). Sie werden im nächsten
Wartungssprint bewertet.

## Nachtrag Sprint 05B — Print-Architektur

Der vollständige PDF-Druck des Prüfberichts wurde bewusst **nicht** im Dialogbaum
gelöst, sondern über ein eigenes Print-Root am `body`
(`src/components/compliance/ComplianceReportPrint.tsx`). Begründung und
Verifikationsergebnisse: `docs/PRINT-VERIFICATION.md`.

