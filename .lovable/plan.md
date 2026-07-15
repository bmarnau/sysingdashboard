
# Prompt 2A.8 – Zentraler technischer Prüfbericht

Ziel: Ein Aggregator, der alle vorhandenen Bereichsberichte (Security, API Discovery, Backup-Integrität, Tech-Debt, Ops, Vitest, Playwright) zu **einem** konsolidierten technischen Prüfbericht zusammenführt — mit Findings, Maßnahmenreihenfolge, Versionsvergleich und Freigabeempfehlung. Reine Aggregation, keine neuen Tests.

## 1. Neue Skripte

**`scripts/technical-report/collectors/`** — je ein kleiner Reader pro Quelle, defensiv (fehlende Datei → Bereich als `not-run` markieren, nicht crashen):
- `security.mjs` → `test-report/security-report.json`
- `api.mjs` → `test-report/api-*.json` + `api-findings.md`
- `backup.mjs` → `test-report/backup-integrity-report.json`
- `tech-debt.mjs` → `tech-debt/findings.json` + `test-report/tech-debt.json`
- `ops.mjs` → `test-report/ops-report.json` (Build/Bundle/Perf/Stability/Ops)
- `vitest.mjs` → `test-report/*-vitest.json` (backup, security)
- `e2e.mjs` → `e2e/reports/*.md` (best-effort Zähl-Parse)
- `docs.mjs` → Ergebnis von `scripts/check-docs-sync.mjs` (Exitcode + kurzer Reason)

**`scripts/technical-report/normalize.mjs`** — einheitliches Finding-Schema:
```
{ id, severity, category, area, title, description, cause, impact,
  evidence: {file, line?, reportRef}, components[], recommendation,
  dependencies[], order, effort: 'S'|'M'|'L', status, source: 'auto'|'manual' }
```
Bereichs-IDs werden verlustfrei übernommen (`SEC-CRIT-001`, `DISC-CRIT-…`, `TD-…`) und mit Prefix in einen Gesamt-Namespace gehoben.

**`scripts/technical-report/build.mjs`** — Aggregator; erzeugt:
- `test-report/technical-test-report.json`
- `test-report/technical-test-report.md`
- `test-report/technical-test-report.prev.json` (Rotation für Vergleich)

**`scripts/technical-report/diff.mjs`** — Vergleich gegen `prev.json` (neu / behoben / verschlechtert / unverändert / wieder aufgetreten). Match über Finding-ID.

**`scripts/technical-report/rules.mjs`** — Bewertungsregeln (Single Source of Truth):
- Gesamtstatus-Ableitung: `failed` bei ≥1 CRITICAL offen, `passed-with-findings` bei HIGH/MEDIUM offen, `blocked` wenn Pflicht-Bereich `not-run`, `passed` sonst.
- Freigabe-Matrix (dev / pilot / eingeschränkt-pilot / nicht-pilot / nicht-prod / nächste-phase) — leitet sich aus offenen CRITICAL/HIGH nach Bereich ab, deckt sich mit ADR-0013.
- Maßnahmen-Sortierreihenfolge exakt wie im Prompt vorgegeben.

## 2. Berichtsstruktur (`technical-test-report.md`)

1. Prüfidentität — Dashboard-Version (aus `CHANGELOG.md`), Commit (aus `BUILD_INFO`), Build-Zeit, Testzeit, Umgebung (Node/Bun/OS, CI-Flag).
2. Gesamtstatus — passed / passed-with-findings / failed / blocked.
3. Executive Summary — Top-Ergebnisse, Hauptrisiken, Release-Empfehlung.
4. Testergebnisse nach Bereich — Tabelle mit 13 Bereichen (Frontend, Backend, API, UI/E2E, RBAC, Auth, Azure, Datenintegrität, Backup/Restore, Accessibility, Performance, Dokumentation, technische Schulden): Status, Zahl offener Findings, Report-Referenz.
5. Findings — vollständig, sortiert nach Schweregrad, mit allen im Prompt geforderten Feldern.
6. Sortierte Maßnahmenliste — 14-stufige Reihenfolge wie vorgegeben.
7. Vergleich zum vorherigen Bericht — 5 Kategorien.
8. Freigabeempfehlung — genau eine der 6 Stufen + Begründung.

## 3. UI-Anzeige im Servicebereich

Neuer Dialog **`src/components/TechnicalReportDialog.tsx`** (Lazy-Loaded, konsistent mit `SystemStatusDialog`/`LogViewerDialog`):
- Lädt den Report zur Buildzeit als Asset (`import report from '../../test-report/technical-test-report.json'` via Vite `?raw`/JSON-Import) — kein Runtime-Fetch nötig, Report ist mit dem Build eingefroren.
- Zeigt: Prüfidentität, Ampel-Gesamtstatus, Bereichstabelle, Top-Findings (kollabierbar), Freigabeempfehlung, Diff-Zusammenfassung.
- Kein localStorage als Quelle; nur UI-Filter (Severity/Bereich) dürfen persistiert werden.
- Menüeintrag im Servicebereich unter „Systemstatus".

**Fallback** wenn Report fehlt: Dialog zeigt Hinweis „Bericht nicht generiert — `bun run report:technical` ausführen".

## 4. Package-Scripts & CI

- `report:technical` → führt Collectors + Aggregator + Diff aus.
- `report:technical:ci` → identisch, exit 1 nur bei Aggregator-Fehler (nicht bei Findings — Soft-Gate, analog ADR-0013/0016).
- `.github/workflows/ci.yml`: neuer Step `technical-report` **nach** allen bestehenden Test-Jobs; lädt Artefakte der Vorjobs, ruft `report:technical:ci`, veröffentlicht `technical-test-report.{json,md}` als Artefakt.

## 5. Handbuch & Doku

- `src/lib/help-documentation.ts`: neues Kapitel „Technischer Prüfbericht" (Schweregrade, Freigaberegeln, Bearbeitungsprozess, Versionsvergleich). `DOCUMENTATION_VERSION` → 1.16.0.
- `CHANGELOG.md`: v1.37.0-Eintrag → treibt `DASHBOARD_VERSION`.
- **ADR-0017** „Zentraler technischer Prüfbericht": Aggregator statt paralleler Bereichsberichte, Finding-Namespace, Report-Snapshot im Bundle, Soft-Gate.

## 6. Sicherheits- & Qualitäts-Leitplanken (aus Prompt-Vorgaben)

- Report **wird nicht** in localStorage als Primärquelle abgelegt — Snapshot lebt in `test-report/` und im Build-Bundle.
- Collectors dürfen keine Payloads/Secrets weiterreichen: Werte >200 Zeichen werden abgeschnitten, ENV-Werte nie übernommen (nur Namen wie in ADR-0013), Stacktraces gekürzt.
- Jedes Finding trägt `evidence.reportRef` (Datei + Anker), damit reproduzierbar.
- Feldern `source: 'auto' | 'manual'` unterscheidet Scanner-Befunde von menschlich hinzugefügten Bewertungen; manuelle Findings liegen in `scripts/technical-report/manual-findings.json` (bearbeitbar, versioniert).

## Technischer Anhang

- Kein neuer Runtime-Code außer dem Dialog.
- Reine Node-Skripte (`.mjs`), keine neuen Dependencies (JSON/Markdown-Handling wie in bestehenden Scannern).
- Reportformat kompatibel mit vorhandenem `test-report/`-Namensschema.
- Diff nutzt stabile Finding-IDs; wo Bereiche keine stabilen IDs liefern (E2E-Markdown), wird ein Hash aus `title+area` als Fallback-ID erzeugt und im Report als solcher markiert.

## Nicht Teil dieses Prompts

- Neue Tests, neue Detektoren, Hard-Gates, Server-Push des Berichts, Web-Auslieferung außerhalb des Dialogs.
