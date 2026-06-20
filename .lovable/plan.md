## Stufe 2 — JSON-Import + kritische Hinweise 1–4 adressieren

Ziel: Vollständige Import-Pipeline (Datei → Validierung → Vorschau → Konflikt/Mapping → Ausführung → persistiertes Protokoll) plus JSON-Restore. Gleichzeitig die in Stufe 1 markierten Schwachstellen entschärfen, **ohne** das bestehende Datenmodell zu refaktorieren.

---

### 1. Import-Pipeline

**Neue Services**

- `src/lib/json-import-service.ts`
  - `readFile(file): Promise<DashboardJsonExport>` — JSON.parse + Zod via `JsonSchemaValidationService`
  - `buildPlan(doc, currentState, options): ImportPlan` — pure Funktion, liefert pro Entität `creates / updates / conflicts / skipped` (Diff per `id`, `updatedAt`-Vergleich, Strategie `overwrite | keep | merge`)
  - `applyPlan(plan, options): ImportResult` — schreibt in dieselben `localStorage`-Keys / Storages, die die bestehenden Hooks lesen; in `try`-Block mit Pre-Snapshot, bei Fehler automatischer Rollback aus dem Snapshot
  - Auto-Snapshot in IndexedDB (über bestehenden `export-archive`) vor jedem Import — Eintrag als „Pre-Import Snapshot" im Download-Center sichtbar

- `src/lib/import-log-service.ts`
  - Persistiert pro Lauf: `runId`, `fileName`, `timestamp`, `actor`, `scopes`, `counts {created,updated,skipped,errors}`, `conflicts[]`, `mappings[]`, `rollback?: boolean`
  - Speicher: IndexedDB (analog `export-archive`), Retention konfigurierbar (Default 90 Tage)

**Neue UI-Komponenten**

- `src/components/ImportPreviewDialog.tsx` — Drei Schritte
  1. **Datei + Schema-Validierung** (zeigt Zähler, Issues, Schema-Version, Mismatch-Warnung)
  2. **Konflikt-/Strategie-Auswahl** pro Entität (`overwrite all / keep existing / per-row`) + Tabelle der konkreten Konflikte (Diff-View `current` ↔ `incoming`)
  3. **Benutzer- und Kunden-Mapping** (siehe Punkte 1+2 unten)
  4. **Ausführung** mit Progress + abschließendem Protokoll-Link

- `ImportExportDialog.tsx` — Tabs „JSON Import" und „Import-Protokoll" aktivieren (Platzhalter ersetzen), Tab „Protokoll" listet `import-log-service`-Einträge mit Aufklapp-Detail und „Rollback"-Button, solange Pre-Snapshot existiert.

---

### 2. Adressierung der kritischen Hinweise

**Punkt 1 — `activity.engineerId` ist im Single-Engineer-Modus kosmetisch**

- Import-Pipeline behandelt `engineerId` als optional. Wenn das Dashboard nur einen Engineer kennt, wird der Mapping-Schritt automatisch übersprungen und alle eingehenden `engineerId`-Werte werden ignoriert (mit Warnung im Protokoll: „Single-Engineer-Modus aktiv — N Zeitbuchungen einem Engineer zugeordnet").
- Bei mehreren `UserProfile`s wird eine Mapping-Tabelle angeboten (incoming `engineerId` → bestehender User / „neu anlegen" / „überspringen"). Default-Vorschlag per E-Mail-Match.
- Kein Datenmodell-Refactor — die Brückenfelder bleiben optional, das Dashboard verhält sich unverändert.

**Punkt 2 — Kunden-String-Synthese erzeugt Doubletten**

- Vor dem Import läuft ein **Customer-Normalizer** (`normalizeName`: trim + collapse whitespace + casefold) gegen `incoming.customers` und alle bestehenden `project.client` / `workPackage.client`-Werte.
- Ein **Kunden-Merge-Schritt** in der Vorschau zeigt Verdachts-Duplikate (Levenshtein ≤ 2 oder gleicher Normalize-Schlüssel) und bietet „zusammenführen", „neu anlegen", „bestehenden Namen verwenden".
- Beim Apply wird die Wahl auf alle abhängigen `project.client` / `workPackage.client` / `activity.client` projiziert.
- Eine echte `Customer`-Tabelle wird **nicht** eingeführt (außerhalb des bewilligten Scopes „Schema mit Brückenfeldern").

**Punkt 3 — `activities` vs. `timeEntries` redundant**

- Festlegung im Import-Service: `timeEntries` ist kanonisch, sobald vorhanden. `activities` liefert nur Stamm­daten (Titel, Workpackage-Zuordnung).
- Konfliktregel implementiert + dokumentiert: Wenn beide vorhanden und ein `activity.date/duration` von der gleichnamigen `timeEntry` abweicht, gewinnt `timeEntries`; Differenz erscheint als Warnung im Protokoll.
- Export bleibt rückwärtskompatibel (beide Felder werden weiterhin geschrieben), aber `JsonExportService` markiert `activities` jetzt als `legacy: true` per Kommentar im Schema, damit Drittsysteme den Hinweis sehen.

**Punkt 4 — Eingebettete `dashboard.json` im ZIP-Backup**

- `backup-service.ts` zusätzlich: vor dem ZIP-Schreiben wird ein `DashboardJsonExport` (Voll-Export) erzeugt und als `dashboard.json` neben den bestehenden Storage-Keys in dasselbe ZIP gelegt.
- `restoreFromZip` bevorzugt beim Restore die `dashboard.json` (saubere, schemavalidierte Quelle) und fällt nur dann auf die rohen localStorage-Dumps zurück, wenn die JSON fehlt oder ungültig ist.
- Damit gibt es **eine** kanonische Quelle pro Backup, ohne dass der ZIP-Pfad oder die Daily-Automatik bricht.
- Hinweis im Restore-Dialog + Handbuch: „Backups ab v1.14 enthalten eine eingebettete dashboard.json — alte ZIPs bleiben lesbar."

---

### 3. Sicherheit & Robustheit

- `applyPlan` läuft **transaktional**: Alle Schreibvorgänge erst nach erfolgreicher Vorab-Snapshot-Erstellung; Fehler → Rollback auf Snapshot, Protokoll markiert `rollback: true`.
- Schema-Version-Mismatch: harter Stopp + erklärender Dialog; kein „best effort"-Import.
- Sensible Felder im Import-Payload werden vorab durch dieselbe `stripSensitiveFields`-Funktion entfernt (auch in Import-Richtung, damit ein manipulierter Export kein passwordHash einschleust).
- UI-Gating: „JSON Import" und „Rollback" nur für `administrator`. Services bleiben aufrufbar (konsistent mit Stufe-1-Entscheidung „Nur UI-Gating").

---

### 4. Tests & Doku

- `scripts/test-example-files.mjs` um Import-Round-Trip-Tests erweitern: jede Beispieldatei → `buildPlan` → `applyPlan` gegen leeren Mock-State → erneuter Export muss schemagleich sein.
- Neue Tests für Konflikt-Strategien, Customer-Merge, Engineer-Mapping, Rollback.
- Handbuch (`help-documentation.ts`): neues Unterkapitel „JSON Import — Ablauf, Konflikte, Mapping, Rollback" und Ergänzung im Backup-Kapitel zur eingebetteten `dashboard.json`.
- `CHANGELOG.md` → **1.14.0**, `lastUpdated` der betroffenen HelpTopics setzen, `bun run docs:check` muss grün sein.

---

### 5. Risiken / bewusst nicht im Scope

- Kein Multi-Engineer-Datenmodell-Refactor (Engineer-Mapping wirkt erst, wenn Activities tatsächlich pro User geführt werden).
- Keine echte `Customer`-Tabelle — nur Merge/Normalisierung über Strings.
- Keine Cloud-Persistenz für Import-Protokoll/Snapshots — bleibt lokal (IndexedDB), Schema aber so geformt, dass ein späterer Cloud-Sync 1:1 funktioniert (analog zum Download-Center).
- Keine API-Endpunkte.

### Dateien (geplant)

Neu: `src/lib/json-import-service.ts`, `src/lib/import-log-service.ts`, `src/components/ImportPreviewDialog.tsx`
Geändert: `src/components/ImportExportDialog.tsx`, `src/lib/backup-service.ts`, `src/lib/json-export-service.ts` (Legacy-Markierung), `src/lib/help-documentation.ts`, `CHANGELOG.md`, `scripts/test-example-files.mjs`, ggf. `src/lib/export-archive.ts` (Snapshot-Typ)
