# Plan — Azure-Servicebereich „Azure Daten" (Konzept, ohne Backend-Logik)

Ziel: Ein neuer, klar abgegrenzter Bereich im bestehenden Servicebereich, in dem alle Azure-Interaktionen ausschließlich manuell per Button ausgelöst werden. Es entsteht das UI- und Service-Interface-Gerüst — echte Azure-Aufrufe folgen in einem späteren Prompt.

## 1. Einstiegspunkt im Dashboard

- Header-Bereich „Service" (`src/routes/index.tsx`) bekommt einen zusätzlichen Button **„Azure Daten"** (nur sichtbar, wenn `can(user, 'systemstatus.view')` oder eine der Azure-Permissions vorhanden).
- Öffnet neuen Dialog `AzureDataDialog` (analoges Muster zu `SystemStatusDialog`, `ImportExportDialog`).
- Fällt Azure/`/api/status` aus, bleibt der Rest des Dashboards unberührt: der Dialog rendert Fehler-/Not-configured-Zustände, wirft aber keine Errors nach oben (ErrorBoundary + defensiver Fetch).

## 2. Neue Datei-Struktur

```text
src/components/azure/
  AzureDataDialog.tsx          # Container mit Tabs
  AzureStatusPanel.tsx         # Status + ENV-Validation (read-only)
  AzureActionsPanel.tsx        # 5 Aktions-Buttons + Bestätigungen
  AzureHistoryPanel.tsx        # Tabs: Verbindungstests | Exporte | Importe
  AzureImportPreviewDialog.tsx # Vorschau vor Import
  AzureConfirmDialog.tsx       # generischer Confirm mit Warnhinweis
src/lib/azure/
  azure-service.ts             # Frontend-Service-Fassade (Stubs, keine echten Calls)
  azure-history-store.ts       # lokale Historie (in-memory + localStorage, secret-frei)
  types.ts                     # AzureActionResult, HistoryEntry, ImportPreview...
```

Neue Permissions sind schon in `backend/services/rbac.mjs` vorhanden (`azure.connection.test`, `azure.export`, `azure.import`, `azure.database.build`, `backup.restore`). Falls sie in `src/lib/rbac/permissions.ts` noch fehlen, werden sie dort ergänzt (`check-rbac.mjs` erzwingt Parität).

## 3. Dialog-Aufbau (Tabs)

**Tab 1 — Status**
- Azure erlaubt? (`azure.allowed`)
- Auth-Modus (`azure.authMode`)
- SQL / Table / Storage konfiguriert (Badges: „Konfiguriert" / „Not configured")
- ENV-Validation (`security.envValidation`): OK-Badge oder Liste fehlender Variablennamen (keine Werte)
- Letzter Verbindungstest / letzter Export / letzter Import (Zeitstempel)
- Button **„Status aktualisieren"** → ruft `runSystemStatusCheck()`

**Tab 2 — Aktionen** (alle Buttons manuell, mit RBAC-Gate über `<PermissionGate>`)

| Button                    | Permission                | Bestätigung | Zusatz |
|---------------------------|---------------------------|-------------|--------|
| Verbindung testen         | `azure.connection.test`   | nein        | — |
| Datenbank aufbauen        | `azure.database.build`    | **ja**, Text-Eingabe „AUFBAUEN"| Warnung: erstellt/aktualisiert Schema |
| Nach Azure exportieren    | `azure.export`            | ja          | Hinweis „überschreibt Azure-Daten" |
| Aus Azure importieren     | `azure.import` + `backup.restore` | **ja, mehrstufig** | Erzwingt Vorschau + Backup |
| Historie leeren (lokal)   | `azure.connection.test`   | ja          | löscht nur lokale Anzeige-Historie |

Regeln pro Button:
- Ohne Permission: Button **nicht sichtbar** (nicht nur disabled) — via `<PermissionGate>`.
- `azure.allowed === false` (DEV / fehlende ENV): Buttons für „Datenbank aufbauen / Export / Import / Verbindung testen" sind sichtbar aber **disabled** mit Tooltip „Azure ist in diesem Modus nicht verfügbar – siehe Status".
- Jede Aktion ist idempotent gestartet: kein Auto-Retry, kein Polling, keine Intervalle. Erst nach Klick.

**Tab 3 — Historie**
- Drei Unter-Tabs: Verbindungstests / Exporte / Importe
- Tabelle: Zeitpunkt, Auslöser (User), Ergebnis (ok/failed), Dauer, Kurzmeldung
- Quelle: `azure-history-store` (lokal, secret-frei). Später ersetzbar durch `/api/status`-Daten.

## 4. Import-Flow (verpflichtend Vorschau + Backup)

```text
Klick „Aus Azure importieren"
  → 1. Confirm-Dialog: Warnung „überschreibt lokale Daten"
  → 2. `azureService.fetchImportPreview()` (Stub liefert Beispiel-Diff)
  → 3. AzureImportPreviewDialog zeigt: Anzahl neu/aktualisiert/gelöscht, Konfliktliste
  → 4. Pflicht-Checkbox „Ich habe die Vorschau geprüft"
  → 5. Automatisch `BackupService.createBackup('pre-azure-import')` (bestehender Service)
       → Anzeige „Backup erstellt: <id>"
  → 6. Zweiter Confirm mit Textbestätigung „IMPORTIEREN"
  → 7. `azureService.runImport()` (Stub) → Ergebnis in Historie
```
Bricht der Nutzer irgendwo ab, passiert nichts. Kein Schritt läuft automatisch ohne vorherigen Klick.

## 5. Service-Fassade `src/lib/azure/azure-service.ts`

Reine Frontend-Fassade — ruft später `/api/azure/*`. Jetzt nur Typen + Stubs, die klar mit `NotImplementedError` oder Mock-Daten antworten, damit die UI vollständig testbar ist:

```ts
export const azureService = {
  getStatus(): Promise<AzureStatus>            // proxied auf /api/status Payload
  testConnection(): Promise<AzureActionResult> // Stub: „not implemented"
  buildDatabase(): Promise<AzureActionResult>
  runExport(): Promise<AzureActionResult>
  fetchImportPreview(): Promise<ImportPreview>
  runImport(opts:{backupId:string}): Promise<AzureActionResult>
};
```

Alle Methoden fangen Fehler intern und geben `{ ok:false, message }` zurück — kein throw ins UI, damit Azure-Ausfall das Dashboard nie crasht.

## 6. Sichtbarkeit / Robustheit

- Der neue Bereich lebt komplett in einem lazy geladenen Dialog; ein Fehler beim Import der Azure-Komponenten wird per `ErrorBoundary` in einer Not-configured-Kachel gefangen.
- Kein `useEffect`-Auto-Fetch außer einmaligem Statuslesen beim Dialog-Öffnen (kein Intervall).
- Keine Secrets im UI, keine ENV-Werte, nur Booleans/Namen (analog `SystemStatusPayload`).

## 7. Dokumentation & Changelog (Pflicht laut Core-Memory)

- Neuer HelpTopic `azure-daten-service` in `src/lib/help-documentation.ts` (Kategorie „Betrieb", RBAC: alle Rollen mit `systemstatus.view`), `lastUpdated` aktualisiert.
- Bestehende Topics „Azure Servicebereich" / „Azure Verbindung testen" / „Nach Azure exportieren" / „Aus Azure importieren" / „Konflikthandling" / „Backup vor Import" bekommen einen Verweis auf den neuen Dialog.
- `CHANGELOG.md`: neue Version mit Bullet „Azure-Daten-Servicebereich (UI + Service-Fassade, keine Backend-Logik)".
- `bun run docs:check` wird nach der Umsetzung ausgeführt.

## 8. Check-10 Selbstprüfung (erfüllt durch obiges)

- Keine Auto-Aktion: alle Aufrufe hinter Buttons, kein Interval/Polling.
- ENV-Status: Tab „Status" zeigt `envValidation` + fehlende Namen.
- Import: Vorschau + Pflicht-Backup + doppelte Bestätigung.
- RBAC: `<PermissionGate>` pro Button, unsichtbar ohne Permission.
- Dashboard-Resilienz: Lazy Dialog + ErrorBoundary + defensiver Service.
- Fehlende Azure-Config: klare „Not configured"-Badges statt Fehler.

## 9. Kritisches Feedback / Alternativen

- **Alternative A (empfohlen langfristig):** eigener Route `/service/azure` statt Dialog — bessere Deep-Links, sauberere URL, einfachere Tests. Für den jetzigen Rahmen (Servicebereich = Header-Dialoge) bleibt der Dialog konsistent; Migration zur Route ist später ein 1:1-Umzug der Panels.
- **Alternative B:** Historie serverseitig via `/api/azure/history` statt localStorage. Sauberer, aber erfordert Backend-Arbeit — bewusst zurückgestellt bis zur echten Anbindung.
- **Warnung:** „Datenbank aufbauen" ist potenziell destruktiv. Sollte in einer späteren Iteration in „Schema anwenden (idempotent)" umbenannt und mit Dry-Run-Vorschau versehen werden.

Umfang dieses Prompts: **UI + Service-Fassade + Doku**, keine echte Azure-Kommunikation.
