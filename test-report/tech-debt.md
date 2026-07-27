# Technical-Debt-Bericht

- **Version**: 1.42.1
- **Erzeugt**: 2026-07-27T03:17:06.017Z
- **Findings gesamt**: 64 (automated: 61, manual: 3)
- **Severity-Verteilung**: Critical 0 · High 3 · Medium 18 · Low 42 · Informational 1
- **Diff zum Vorlauf**: 14 neu, 8 behoben, 50 bestehend

> Analyseverfahren und Grenzen: siehe Handbuch-Kapitel „Technical-Debt-Analyse".

## API (4)

### [High] Fehlerantwort ohne Correlation-ID
- **ID**: `td-correlation-err-shape-34111d3b`
- **Location**: src/routes/api/public/auth-config.ts
- **Quelle**: automated (`correlation-id-error-shape`)
- **Beschreibung**: Handler antwortet mit unstrukturierter Fehler-Response ohne `correlationId`.
- **Ursache**: Direkter `Response.json({error})`-Aufruf statt `jsonErrorWithCorrelation(status, code, message)`.
- **Auswirkung**: Client kann Fehler nicht mit einem Server-Log-Eintrag verknüpfen.
- **Empfehlung**: Alle Fehlerpfade auf `jsonErrorWithCorrelation(status, code, message)` umstellen.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:06.007Z · **Zuletzt geprüft**: 2026-07-27T03:17:06.007Z · **Version**: 1.42.1

### [Medium] API-Endpoint ohne Eingabevalidierung
- **ID**: `td-endpoint-zod-34111d3b`
- **Location**: src/routes/api/public/auth-config.ts
- **Quelle**: automated (`endpoint-validation-missing`)
- **Beschreibung**: Kein `.parse()`/`.safeParse()`-Aufruf im Handler erkennbar.
- **Ursache**: Request-Body wird ohne Schema-Prüfung verarbeitet.
- **Auswirkung**: Malformierte Payloads erreichen Business-Logik; potenziell inkonsistente Speicherung.
- **Empfehlung**: Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.973Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.973Z · **Version**: 1.42.1

### [Low] API-Endpoint ohne strukturierte Fehlerantwort
- **ID**: `td-endpoint-err-cdae73c5`
- **Location**: src/routes/api/status.ts
- **Quelle**: automated (`endpoint-error-shape`)
- **Beschreibung**: Kein erkennbarer 4xx/5xx-Response-Pfad.
- **Ursache**: Handler wirft ungefangen; Framework antwortet mit generischer 500-Antwort.
- **Auswirkung**: Client kann Fehler nicht klassifizieren, Correlation erschwert.
- **Empfehlung**: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.973Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.973Z · **Version**: 1.42.1

### [Low] API-Endpoint ohne strukturierte Fehlerantwort
- **ID**: `td-endpoint-err-ce5fa0be`
- **Location**: src/routes/api/sync.ts
- **Quelle**: automated (`endpoint-error-shape`)
- **Beschreibung**: Kein erkennbarer 4xx/5xx-Response-Pfad.
- **Ursache**: Handler wirft ungefangen; Framework antwortet mit generischer 500-Antwort.
- **Auswirkung**: Client kann Fehler nicht klassifizieren, Correlation erschwert.
- **Empfehlung**: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.973Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.973Z · **Version**: 1.42.1

## Frontend (21)

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-08e8609a`
- **Location**: src/start.ts:13
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-2c49302b`
- **Location**: src/integrations/supabase/auth-middleware.ts:45
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-375dfc5b`
- **Location**: src/routes/__root.tsx:40
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-43084e7a`
- **Location**: src/integrations/supabase/client.ts:54
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-665c1d8d`
- **Location**: src/integrations/supabase/client.server.ts:42
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-6c701bbd`
- **Location**: src/server.ts:68
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-74bd3646`
- **Location**: src/server.ts:79
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.info außerhalb der Logger-Fassade
- **ID**: `td-console-9771f164`
- **Location**: src/integrations/supabase/env-check.ts:93
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.info(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.warn außerhalb der Logger-Fassade
- **ID**: `td-console-993be125`
- **Location**: src/integrations/supabase/env-check.ts:82
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.warn(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [Medium] Direktes console.error außerhalb der Logger-Fassade
- **ID**: `td-console-f7820fc7`
- **Location**: src/lib/help-documentation.ts:426
- **Quelle**: automated (`console-direct`)
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

### [High] Modul überschreitet Größenschwelle (808 Zeilen)
- **ID**: `td-oversize-26e43c0a`
- **Location**: src/components/ExportDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 808 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: gross · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [High] Modul überschreitet Größenschwelle (3281 Zeilen)
- **ID**: `td-oversize-7e9a0b20`
- **Location**: src/routes/_authenticated/dashboard.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 3281 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: gross · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Medium] Modul überschreitet Größenschwelle (745 Zeilen)
- **ID**: `td-oversize-242b307c`
- **Location**: src/components/ui/sidebar.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 745 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Medium] Modul überschreitet Größenschwelle (731 Zeilen)
- **ID**: `td-oversize-f3843ebe`
- **Location**: src/components/UserManualDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 731 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (436 Zeilen)
- **ID**: `td-oversize-32eb5e8c`
- **Location**: src/components/WorkingTimeModelsDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 436 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (560 Zeilen)
- **ID**: `td-oversize-38954b26`
- **Location**: src/components/ImportExportDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 560 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (466 Zeilen)
- **ID**: `td-oversize-564261af`
- **Location**: src/components/ImportPreviewDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 466 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (481 Zeilen)
- **ID**: `td-oversize-af210d92`
- **Location**: src/components/SystemStatusDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 481 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (496 Zeilen)
- **ID**: `td-oversize-d5f3942b`
- **Location**: src/components/LogViewerDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 496 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (563 Zeilen)
- **ID**: `td-oversize-ebfd4b54`
- **Location**: src/components/UserManagementDialog.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 563 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (490 Zeilen)
- **ID**: `td-oversize-feb81a2f`
- **Location**: src/components/PerformanceReport.tsx
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 490 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

## Tests (4)

### [Medium] E2E-Suite ist bewusst nur Smoke
- **ID**: `td-manual-playwright-smoke-only`
- **Location**: e2e/
- **Quelle**: manual
- **Beschreibung**: Die Playwright-Suite (smoke, rbac-gating, import-export) prüft nur Erreichbarkeit und grobe DOM-Sichtbarkeit. Echte RBAC-Gating- und Import/Export-Flows werden nicht End-to-End geprüft.
- **Ursache**: Fehlende stabile data-testid-Anker in der UI; die E2E-Suite wurde zusammen mit der Testinstanz (v1.28.0) als Rahmen etabliert.
- **Auswirkung**: Regressionen in Gating- oder Import/Export-Flows werden nur durch Vitest-Komponenten erkannt, nicht durch echten Browser-Kontext.
- **Empfehlung**: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-13 · **Zuletzt geprüft**: 2026-07-13 · **Version**: 1.28.0

### [Low] MSW-Handler decken nur wenige Azure-Endpunkte
- **ID**: `td-manual-msw-coverage-gap`
- **Location**: src/__tests__/mocks/handlers/azure.ts
- **Quelle**: manual
- **Beschreibung**: Aktuell sind nur die im Rahmen von 2A.1 benötigten Azure-Antworten gemockt. Weitere Azure-Aufrufe (Insert, Delete, Batch) würden im Testlauf ungefiltert ins Netz gehen — MSW onUnhandledRequest:error verhindert dies zwar, blockiert aber auch neue Test-Fälle.
- **Ursache**: Iterativer Aufbau der Mock-Landschaft.
- **Auswirkung**: Neue Azure-Feature-Tests scheitern zunächst an fehlenden Handlern statt an Business-Logik.
- **Empfehlung**: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-13 · **Zuletzt geprüft**: 2026-07-13 · **Version**: 1.28.0

### [Low] CI installiert Chromium bei jedem Lauf
- **ID**: `td-manual-ci-playwright-cache`
- **Location**: .github/workflows/ci.yml
- **Quelle**: manual
- **Beschreibung**: bunx playwright install --with-deps chromium läuft in jedem Job neu (~200 MB Cache). Kein actions/cache@v4 auf ~/.cache/ms-playwright.
- **Ursache**: CI-Änderung in 2A.1 bewusst minimal gehalten.
- **Auswirkung**: CI-Laufzeit ~1–2 min höher, Netzwerkkosten unnötig.
- **Empfehlung**: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Hoch · **Status**: offen
- **Erstmals**: 2026-07-13 · **Zuletzt geprüft**: 2026-07-13 · **Version**: 1.28.0

### [Informational] Kein Coverage-Report vorhanden
- **ID**: `td-coverage-027fe478`
- **Location**: coverage/coverage-summary.json
- **Quelle**: automated (`coverage-missing-report`)
- **Beschreibung**: Für den aktuellen Buildstand liegt keine Coverage-Zusammenfassung vor. Coverage-Lücken können nicht bewertet werden.
- **Ursache**: `bun run test:coverage` wurde vor `test:debt` nicht ausgeführt.
- **Auswirkung**: Trend-Analyse der Testabdeckung blind.
- **Empfehlung**: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.995Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.995Z · **Version**: 1.42.1

## Architektur (35)

### [Medium] UI-Direktzugriff auf Azure-Interna
- **ID**: `td-layer-b432b1b9`
- **Location**: src/components/azure/AzureActionsPanel.tsx:7
- **Quelle**: automated (`ui-imports-azure-internal`)
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.947Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.947Z · **Version**: 1.42.1

### [Medium] UI-Direktzugriff auf Persistenz-Schicht
- **ID**: `td-layer-e0ac1bea`
- **Location**: src/routes/_authenticated/dashboard.tsx:115
- **Quelle**: automated (`ui-imports-persistence`)
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/store/dashboard-persistence"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Umgeht Store-Selectors und Debounce-Persistenz; erzeugt versteckte Kopplung an localStorage-Layout.
- **Empfehlung**: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.947Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.947Z · **Version**: 1.42.1

### [Medium] UI-Direktzugriff auf Azure-Interna
- **ID**: `td-layer-e4fb0e64`
- **Location**: src/components/azure/AzureHistoryPanel.tsx:4
- **Quelle**: automated (`ui-imports-azure-internal`)
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.947Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.947Z · **Version**: 1.42.1

### [Medium] Modul überschreitet Größenschwelle (1084 Zeilen)
- **ID**: `td-oversize-789d61fa`
- **Location**: src/lib/backup-service.ts
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 1084 Zeilen (Schwelle 600). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Modul überschreitet Größenschwelle (702 Zeilen)
- **ID**: `td-oversize-392d9209`
- **Location**: src/lib/json-import-service.ts
- **Quelle**: automated (`oversize-module`)
- **Beschreibung**: Die Datei hat 702 Zeilen (Schwelle 600). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: mittel · **Wahrscheinlichkeit**: Mittel · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.956Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.956Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-1634f273`
- **Location**: src/components/ui/collapsible.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-19eefab7`
- **Location**: src/components/ui/progress.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-242b307c`
- **Location**: src/components/ui/sidebar.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-2452737a`
- **Location**: src/lib/i18n/format.ts
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-2900775b`
- **Location**: src/components/ui/chart.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-2c46e416`
- **Location**: src/components/ui/carousel.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-432c9ba1`
- **Location**: src/components/ui/scroll-area.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-47d5b07c`
- **Location**: src/components/ui/pagination.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-4c5ab6a6`
- **Location**: src/components/ui/context-menu.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-4fae0654`
- **Location**: src/components/ui/alert-dialog.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-539cbbad`
- **Location**: src/components/ui/toggle-group.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-60027755`
- **Location**: src/components/ui/form.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-7ed7cbb9`
- **Location**: src/components/ui/textarea.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-8152e2df`
- **Location**: src/components/ui/aspect-ratio.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-8b8d7a5b`
- **Location**: src/components/ui/menubar.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-906e6010`
- **Location**: src/components/ui/resizable.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-98f7d819`
- **Location**: src/components/ui/drawer.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-9b5a9f9b`
- **Location**: src/lib/rbac/permission-groups.ts
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-adda4e46`
- **Location**: src/components/ui/accordion.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-af1ee499`
- **Location**: src/components/ui/navigation-menu.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-b0c0d351`
- **Location**: src/components/ui/popover.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-bd7563ab`
- **Location**: src/integrations/supabase/auth-middleware.ts
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-d5b25a61`
- **Location**: src/components/ui/breadcrumb.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-da11a267`
- **Location**: src/components/ui/slider.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-deb46595`
- **Location**: src/components/ui/avatar.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-ded2d8d0`
- **Location**: src/components/ui/table.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-e4656c7f`
- **Location**: src/components/ui/dropdown-menu.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-e89d394d`
- **Location**: src/components/ui/hover-card.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-f35c0af6`
- **Location**: src/components/ui/calendar.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1

### [Low] Möglicherweise verwaistes Modul
- **ID**: `td-orphan-fee5a79a`
- **Location**: src/components/ui/command.tsx
- **Quelle**: automated (`orphan-module`)
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: klein · **Wahrscheinlichkeit**: Niedrig · **Status**: offen
- **Erstmals**: 2026-07-27T03:17:05.991Z · **Zuletzt geprüft**: 2026-07-27T03:17:05.991Z · **Version**: 1.42.1
