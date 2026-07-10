
## Ziel

Neuer Menüpunkt „Log Viewer" im Servicemenü, der die bestehenden Logs
(`src/lib/logger.ts` Ringbuffer + IndexedDB-Sink) sichtbar und
durchsuchbar macht — **ohne** neue Log-Infrastruktur, ohne Änderung
bestehender Fachlogik.

## Umsetzung

### 1. Nur-lesende Query-API am IndexedDB-Sink

Neu: `src/lib/logger.indexeddb-reader.ts` (bewusst getrennt von
`logger.indexeddb.ts`, damit der Write-Sink weiter minimal bleibt).

- `readAllLogs(): Promise<LogEntry[]>` — öffnet dieselbe DB
  (`dashboard-logs` / Store `entries`), liest per Cursor absteigend nach
  `ts`-Index. Kein Schema-Change, kein neuer Store.
- `clearAllLogs(): Promise<void>` — optional, nur über explizite
  Nutzeraktion (mit Bestätigung).
- Fällt sauber zurück, wenn IndexedDB fehlt (SSR/Worker) → `[]`.

Ergänzung an `logger.ts`: kleine Hilfsmethode `getSources()` — extrahiert
distinct `context.label` / `context.module` / `context.operation` aus dem
In-Memory-Ring (für den Quellen-Filter). Kein Persistenz-Change.

### 2. UI-Komponente `src/components/LogViewerDialog.tsx`

Modaler Dialog (konsistent mit `SystemStatusDialog` / `BackupDialog`).

Layout:
- Desktop ≥ md: 2-spaltiges Grid `grid-cols-[260px_minmax(0,1fr)]`,
  Filter links (sticky), Logliste rechts.
- Mobile: Filter in `<Collapsible>` oberhalb der Liste, standardmäßig
  eingeklappt.

Filter (alle kombinierbar):
- Level-Checkboxen: debug / info / warn / error (default alle an).
- Zeitraum: Preset-Select „Letzte 15 min / 1 h / 24 h / 7 Tage /
  Benutzerdefiniert" (Custom = 2 datetime-local Felder).
- Quelle: Multi-Select aus `getSources()` (nur angezeigt, wenn ≥ 1
  Quelle vorhanden).
- Volltext-Input (mit `useDeferredValue`) — sucht in `message`,
  `error.message`, JSON-stringified `context`.

Datenquelle:
- Beim Öffnen einmalig aus IndexedDB laden, mit In-Memory-Ring
  mergen und deduplizieren nach `ts+message`.
- „Aktualisieren"-Button → neu laden.
- „Auto-Refresh"-Toggle (5 s Intervall via `setInterval` in Effect,
  clear on close).

Liste:
- Virtualisiert nicht — bewusst begrenzt auf 1000 Zeilen (siehe
  ADR-0006 „No Virtual Scrolling"). Wenn mehr Treffer als 1000: Banner
  „X weitere gefiltert — verfeinere die Filter".
- Zeile: Timestamp (relativ + absolut im Tooltip), Level-Badge farbig,
  Message (truncate), kleine Quelle-Chip. Klick → Detail-Sheet öffnet.

Detail-Sheet (rechts, `<Sheet>`):
- Vollständige Message, ISO-Timestamp, Level, Quelle.
- `context` als formatiertes JSON (`<pre>` mit `whitespace-pre-wrap`).
- Stacktrace nur wenn `error.stack` vorhanden.
- Buttons: „Als JSON kopieren" (via `navigator.clipboard`), „Schließen".

Aktionen (Kopf-Toolbar):
- „Gefiltert exportieren": erzeugt JSON-Blob aus aktuell gefilterten
  Einträgen und triggert Download `logs-YYYYMMDD-HHmm.json`.
- „Alle Logs löschen" (mit `confirm()`): ruft `clearAllLogs()` +
  `logger.clear()`.

Leere/Fehler-States:
- Keine Logs vorhanden: freundlicher Hinweis + Erklärung, dass in DEV
  in die Console geloggt wird.
- Fehler beim IndexedDB-Read: Alert-Panel mit Fehlermeldung, Fallback
  auf In-Memory-Ring.

Secrets: bereits durch `logger.ts` redigiert — keine zusätzliche
Verarbeitung nötig. Kein Feld wird umgangen.

### 3. Menü-Integration `src/routes/index.tsx`

- `LogViewerDialog` lazy-import analog zu `BackupDialog`.
- Neuer State `showLogViewer`.
- Menüeintrag im Service-Dropdown direkt nach „Backup…":
  `<FileText className="size-4 opacity-70" /> Log Viewer…`.
- Rendering mit Suspense + open-Gating.

Kein RBAC-Gate (Logs sind lokal im Browser, keine Fremd-Daten).

### 4. Handbuch + CHANGELOG

- Neues HelpTopic `log-viewer` in Kategorie „Service"
  (`src/lib/help-documentation.ts`): Zweck, Filter, Datenquelle,
  Retention (1000 Einträge / 7 Tage, aus IDB-Sink), Export, Secret-
  Redaction. `lastUpdated` setzen.
- `CHANGELOG.md`: neue Version `1.26.0` — Feature „Log Viewer im
  Servicemenü".
- `docs:check` grün.

### 5. Tests

- `src/__tests__/lib/logger.indexeddb-reader.test.ts` — mock
  `indexedDB` via `fake-indexeddb` (falls nicht vorhanden: einfacher
  In-Memory-Stub) und teste `readAllLogs` (sortiert desc), leere DB,
  `clearAllLogs`.
- `src/__tests__/components/LogViewerDialog.test.tsx`
  (`@testing-library/react`): rendert Dialog mit Fake-Logs, prüft
  Level-Filter, Volltextsuche, Detail-Öffnen, „Kopieren"-Button
  (Clipboard-Mock), Export-Button (URL.createObjectURL-Mock).
- A11y-Smoketest über bestehendes `axe`-Setup ergänzen.

## Technische Details

- Keine neue Abhängigkeit; für Tests ggf. `fake-indexeddb` als devDep,
  wenn nicht schon vorhanden — sonst manueller Stub.
- Performance: Filterung als reines `useMemo(() => logs.filter(...))`;
  bei 1000 Zeilen kein Bottleneck. `useDeferredValue` für Suchbegriff.
- Export nutzt bestehendes Muster aus `export-download-service.ts` —
  aber bewusst ohne Persistenz im Download-Center (Logs sind
  Debug-Artefakt, kein Report).

## Nicht enthalten

- Kein Server-Side-Log-Upload, kein neuer Backend-Endpoint.
- Keine Änderung am `logger.ts`-Sink-Verhalten außer der additiven
  `getSources()`-Methode.
- Kein RBAC (kann später ergänzt werden, wenn Rollen-Anforderung
  entsteht).
