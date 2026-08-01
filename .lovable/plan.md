## Ziel

Sprint 05B abschließen — keine neuen Funktionen. Nur fehlende Nachweise, Berichte, Dokumentation und Qualitätsgates. Version steigt auf **1.44.3**.

## Ausgangslage (verifiziert)

- `src/components/TechnicalReportDialog.tsx` (254 Z.) rendert den Print-Root via Portal an `document.body` (`#technical-report-print-root`), setzt `body.printing-compliance`, wartet zwei `requestAnimationFrame`, ruft `window.print()` und räumt über `afterprint` + Fallback auf.
- `src/components/compliance/ComplianceReportPrint.tsx` (422 Z.) enthält alle 11 Pflichtabschnitte inkl. Maßnahmenliste und Integritätsnachweis.
- Modulgrößen: `dashboard.tsx` 978, `ExportDialog.tsx` 308.
- `CHANGELOG.md` oberster Eintrag ist **1.44.0** — die Sprint-05B-Arbeiten (1.44.1 Export-Hook, 1.44.2 Logger, Print-Fix) sind dort noch **nicht** eingetragen.
- In `package.json` existiert **kein** `typecheck`-Script (Teil F fordert es).

## Teil A – Druckpfad verifizieren

1. Neuer Playwright-Spec `e2e/specs/compliance-print.spec.ts`:
   - `page.emulateMedia({ media: "print" })`, Dialog öffnen, „Drucken / PDF" klicken.
   - `window.print` vorher im Page-Kontext stubben (Aufruf zählen), damit der reale Klickpfad ohne blockierenden Browserdialog durchläuft.
   - Assertions: `#technical-report-print-root` existiert als direktes Kind von `document.body`, `body` trägt `printing-compliance`, alle 11 `section.tr-sec`-Überschriften vorhanden, Dialog-Chrome (`.no-print`) hat `display: none` im Print-Medium, nach `afterprint`-Dispatch ist Root wieder entfernt.
   - Screenshot des Print-Roots im Print-Medium als visueller Nachweis.
2. Ergänzend `page.pdf()` **nach** dem Klick (Print-Root im DOM) — liefert das echte A4-PDF zur Sichtprüfung.
3. Vitest-Ergänzung: Print-Root-Portal-Lebenszyklus (Mount/Cleanup) als DOM-Test.

## Teil B – Visueller Nachweis

- PDF via `pdftoppm` in Seitenbilder wandeln und **jede** Seite prüfen: Seiten-/Tabellenumbrüche, Überschriften, A4-Ränder, keine abgeschnittenen Zellen, Findings- und Maßnahmenlisten vollständig, Integritätsblock am Ende.
- Gefundene Layoutfehler in `src/styles.css` (Print-Block) korrigieren und erneut prüfen, bis sauber.
- Nachweis nach `docs/PRINT-VERIFICATION.md` (Ablauf, DOM-Struktur, Screenshots-Beschreibung, Befunde) und Bilder unter `test-report/print/`.

## Teil C – Technischer Prüfbericht

- `bun run test:debt`, `security:report`, `api:report`, `ops:report` soweit ohne externe Abhängigkeit lauffähig, danach `bun run report:technical`.
- `scripts/technical-report/manual-sections.json` und `manual-findings.json` aktualisieren: Logger-Bereinigung, Print-Architektur, neue Modulgrößen; erledigte Findings entfernen statt neu zu bewerten.
- `scripts/technical-report/tech-debt-acceptances.json`: Akzeptanzen für `dashboard.tsx`/`ExportDialog.tsx` prüfen — `ExportDialog` ist unter Schwelle, Akzeptanz entfällt.
- Integrität mit `node scripts/technical-report/verify.mjs` bestätigen; Historien-Snapshot entsteht automatisch.

## Teil D – ADR-0019

`docs/adr/ADR-0019-oversize-refactor-plan.md` fortschreiben mit Statusmatrix **erledigt / akzeptiert / offen**: Dashboard-Split (erledigt, 3281→978), ExportDialog-Split (erledigt, 807→308), verbleibende Rest-Schulden, neue Print-Architektur, Logger-Bereinigung, Restrisiken.

## Teil E – Dokumentation

- `CHANGELOG.md`: Einträge 1.44.1, 1.44.2 und **1.44.3** (Sprint-05B-Abschluss) nachtragen — 1.44.3 wird damit `DASHBOARD_VERSION`.
- `docs/LOGGING.md` (Redaction-Muster, Console-Policy, dokumentierte Ausnahmen).
- `docs/PRINT-VERIFICATION.md`: Ursache des Druckfehlers, Portal-/Print-Root-Lösung, Print-CSS, Playwright-Grenzen (`page.pdf()` löst `window.print()` nicht aus; kein echter Browser-Druckdialog automatisierbar).
- `README.md` + `docs/ARCHITECTURE.md`: Verweise auf Print-Architektur und Modulstruktur.
- Handbuch `src/lib/help-documentation.ts`: Kapitel „Prüfbericht drucken / als PDF sichern" ergänzen bzw. aktualisieren, `lastUpdated` setzen.

## Teil F – Qualitätsprüfung

`typecheck`-Script (`tsc --noEmit` via vorhandener TS-Konfiguration) in `package.json` ergänzen, dann ausführen und Ergebnisse protokollieren: `lint`, `typecheck`, `test`, `build`, `docs:check`, zusätzlich `lint:no-console`.

## Teil G/H – Konsistenz und Abschlussbewertung

Versionsstand in CHANGELOG, Handbuch, Systemstatus, `technical-test-report.json`/`.md` und UI abgleichen; Widersprüche beheben. Danach Checkliste aus Teil H Punkt für Punkt mit Nachweis belegen.

## Abschlussbericht

Antwort in Chat mit den 13 geforderten Punkten inkl. konkreter Zahlen (Testanzahl, Modulgrößen, Findings) und einer expliziten, belegten Aussage, ob Sprint 05C starten darf — mit ehrlicher Nennung jedes Punkts, der nicht automatisiert nachweisbar ist (insbesondere echter Browser-Druckdialog).

## Technische Details

- Keine Änderung an Geschäftslogik; Codeänderungen beschränkt auf Print-CSS-Korrekturen (falls die Sichtprüfung Fehler zeigt), neues Testfile, `package.json`-Script.
- Playwright-Screenshots und PDFs liegen unter `test-report/print/`, nicht im Bundle.
