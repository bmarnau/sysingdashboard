    # Sprint 05B – Technische Konsolidierung

    Ziel: ExportDialog fertig modularisieren, Konsolenausgaben bereinigen, Druck/PDF des technischen Prüfberichts reparieren, Bericht neu erzeugen, Doku/ADR-0019 nachziehen.

    ## Ausgangslage (verifiziert)

    - `src/components/ExportDialog.tsx`: 602 Zeilen, enthält Zustand (12 `useState`), Ableitungen, `handlePrepare`-Ablauf inkl. PDF/CSV/JSON/Text, Dateinamen, Download-Registrierung, Fehler-/Preview-Zustand.
    - Direkte `console.*`-Aufrufe im Produktivcode (10 Fundstellen):
      - `src/start.ts:13`, `src/server.ts:68`, `src/server.ts:79`, `src/routes/__root.tsx:40`
      - `src/integrations/supabase/env-check.ts:82` (`warn`), `:93` (`info`)
      - `src/integrations/supabase/client.ts:54`, `client.server.ts:42`, `auth-middleware.ts:45` — **auto-generierte Dateien, dürfen nicht editiert werden**
      - `src/lib/logger.ts` (erlaubte Logger-Interna), `backend/services/logger.mjs` (erlaubt)
    - Druckpfad heute: `TechnicalReportDialog` setzt `body.printing-compliance`, ruft direkt `window.print()`; CSS in `src/styles.css` nutzt `body.printing-compliance > *:not(:has([data-compliance-print-content]))` → `display:none`. Der Report liegt in einem Radix-Portal (`fixed`, `max-h-[90vh]`, `overflow-y-auto`).
    - Die genaue Ursache des leeren Ausdrucks ist **noch nicht bestätigt**; Verdacht ist die `:not(:has(...))`-Regel bzw. der fixed/overflow-Container. Reproduktion ist erster Arbeitsschritt.

    ## Teil A – ExportDialog

    1. Neuer Hook `src/hooks/useExportDialog.ts`: Formatwahl, Filter-/Sortierzustand, Prefs-Laden, Dateinamensableitung, `prepare()`-Ablauf (Text/CSV/JSON + PDF-Preview), Fortschritt, Fehler, Retry, Cleanup beim Schließen.
    2. `ExportDialog.tsx` wird reine Präsentation (Felder, Buttons, Preview-Einbindung) — Ziel < 400 Zeilen.
    3. Bei Bedarf zusätzlich `src/components/export/ExportFilters.tsx` bzw. `ExportSortControls.tsx`, aber keine Zerlegung nur zur Zeilenreduktion.
    4. Keine Änderung an Exportformaten oder Dateinamensregeln.

    ## Teil B – Konsolenausgaben

    1. Bestandsaufnahme als Tabelle (Datei, Zeile, Zweck, Sensitivität, Entscheidung) in `docs/LOGGING.md`.
    2. Ersetzen durch `logger.*`, wo der Logger sicher verfügbar ist: `src/routes/__root.tsx`, `src/integrations/supabase/env-check.ts` (nur Variablennamen, keine Werte).
    3. Dokumentierte Ausnahmen: `src/start.ts` und `src/server.ts` (früher Worker-/SSR-Pfad ohne Browser-Sinks) sowie die drei auto-generierten Supabase-Dateien (dürfen nicht bearbeitet werden). Jede Ausnahme mit Begründung, Zeitbezug und Scanner-Regel.
    4. `scripts/tech-debt/detectors/console-usage.mjs` und `scripts/check-no-console.mjs`: begründete Ausnahmen als benannte Regeln statt pauschaler Pfad-Allowlist; Tests/Skripte weiterhin ausgenommen.
    5. Redaction in `src/lib/logger.ts` prüfen und um fehlende Muster ergänzen (`Server=`, `ConnectionString=`, generische `Authorization:`-Header).

    ## Teil C/D – Druck & PDF reparieren

    1. Fehler in Chromium via Playwright reproduzieren, DOM/CSS-Zustand während `beforeprint` protokollieren, Ursache schriftlich in `docs/PRINT-EXPORT.md` festhalten.
    2. Print-Root: `<div id="technical-report-print-root" ref>` innerhalb des Dialogs, das den kompletten Bericht umschließt (inkl. Identität, Summary, Bereiche, Diff, **alle** Findings, Maßnahmen, Integritätsblock).
    3. Druckmodus rendert im Print-State die vollständige, ungefilterte Findings-Liste (unabhängig von Tab/Filter/Accordion) — Filter gelten nur für die Bildschirmansicht.
    4. Print-CSS neu: Ausblenden per gezielter Selektoren statt `:not(:has())`; Print-Root und Elternkette explizit sichtbar, `position:static`, `overflow:visible`, keine Höhenbegrenzung, Overlay ausgeblendet. Tabellen `thead { display: table-header-group }`, `break-inside: avoid` nur auf kleinen Blöcken.
    5. Druckablauf: Print-State setzen → `requestAnimationFrame` (doppelt) → `window.print()` → Reset erst bei `afterprint`; Druck blockiert, wenn keine Reportdaten geladen sind.
    6. Eigener Berichtskopf/-fuß (`print-only`) mit Titel, Version, Report-ID, Datum.

    ## Teil E/F – Datenquelle & Reportlauf

    - Einzige Quelle bleibt `test-report/technical-test-report.json` (bereits als `?raw` gebunden); keine hart codierten Werte.
    - Nach den Änderungen: `bun run test:debt` → `bun run report:technical` → `node scripts/technical-report/verify.mjs`. Neuer Historieneintrag, aktualisierte Modulgrößen und geschlossene Logger-Findings.
    - UI erweitern, wo Pflichtinhalte fehlen (Management Summary, Testergebnis-Tabelle, Maßnahmenliste, Integritätsblock) — aus Reportdaten abgeleitet.

    ## Teil J – Tests

    - `src/__tests__/hooks/useExportDialog.test.ts`: Init, Formatwechsel, Validierung, Erfolg, Fehler, Retry, Dateiname, Download-Registrierung, Cleanup.
    - `src/__tests__/lib/logger.test.ts` erweitern: neue Redaction-Muster, Node-/Browser-Pfad, keine vollständigen Env-Werte.
    - `src/__tests__/lib/console-guard.test.ts`: Scanner-Test gegen unbegründete `console.*`.
    - `src/__tests__/components/TechnicalReportDialog.test.tsx`: Print-Root vorhanden, Druckklasse gesetzt/nach `afterprint` entfernt, Druck blockiert ohne Daten, vollständige Findings im Print-Modus, Version/Hash/Freigabestufe aus JSON.
    - `e2e/specs/report-print.spec.ts`: Playwright erzeugt PDF, prüft Größe, Seitenzahl, Pflichttexte, keine Secrets.
    - Visuelle Prüfung: PDF-Seiten nach PNG rendern und Erste/Tabellen-/Findings-/Letzte Seite kontrollieren.
    - Gesamtlauf: `typecheck`, `lint`, `test`, `build`, `docs:check`.

    ## Teil L – Dokumentation

    `CHANGELOG.md` (v1.45.0), `README.md`, `docs/ARCHITECTURE.md`, neu `docs/LOGGING.md` und `docs/PRINT-EXPORT.md`, Benutzerhandbuch (`src/lib/help-documentation.ts`: Druckhinweis inkl. Deaktivierung der Browser-Kopf-/Fußzeilen, Logging-Regeln), `docs/adr/ADR-0019-oversize-refactor-plan.md` mit tatsächlichen Größen fortschreiben (nur schließen, wenn beide Module unter Schwelle liegen), Tech-Debt-Akzeptanzen prüfen.

    ## Technische Hinweise

    - Auto-generierte Supabase-Dateien bleiben unverändert; ihre `console.error`-Aufrufe werden als dauerhafte, begründete Ausnahme im Scanner geführt.
    - Kein Redesign, keine fachlichen Funktionen, keine Azure-/M365-Themen.
    - Abschlussbericht mit den 22 geforderten Nachweispunkten inkl. Vorher/Nachher-Zahlen.
