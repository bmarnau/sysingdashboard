
## Ziel dieser Stufe

Im Servicemenü entsteht der Bereich **Import / Export** mit funktionierendem **JSON-Export**, **Beispieldateien**, **Schnittstellen-Dokumentation** und automatisierten **Tests**. Import, Konfliktbehandlung, Benutzer-Mapping und JSON-Backup-Restore folgen in Stufe 2 (eigener Prompt) — der Menüpunkt zeigt diese Unterbereiche bereits an, beschriftet sie aber als „in Vorbereitung".

## Entscheidungen (vom Nutzer bestätigt)

- **Datenmodell:** unverändert, nur **optionale Brückenfelder** ergänzen (`Activity.engineerId`, `Project.customerId`). Bestehende UI bleibt unangetastet.
- **Backup:** ZIP-Pfad bleibt Default. JSON-Komplett-Export wird zusätzliche Option im Backup-Bereich (Download), Restore in Stufe 2.
- **Rollen:** nur UI-Gating über `UserRole` (admin/teamleiter sehen das Untermenü). Services bleiben aufrufbar.
- **Umfang:** Stufe 1 — Export, Schema, Beispieldateien, Tests, Doku.

## Liefergegenstände

### 1. Neues Menü im Servicebereich

`src/routes/index.tsx` → neuer Submenü-Eintrag **„Import / Export"** im bestehenden Service-Dropdown, sichtbar nur für `admin` / `teamleiter`. Unterpunkte öffnen einen gemeinsamen `ImportExportDialog` und springen per Tab:

- JSON Export *(aktiv)*
- JSON Import *(Platzhalter „Stufe 2")*
- Beispieldateien *(aktiv)*
- Import-Protokoll *(Platzhalter)*
- Backup → bestehender Backup-Dialog, neuer Button „JSON-Komplett-Export"
- Schnittstellen-Dokumentation → öffnet Handbuch direkt beim neuen Kapitel

### 2. Schema v1 + Brückenfelder

`src/lib/dashboard-data.ts` — `Activity` bekommt optionales `engineerId?: string`, `Project` optionales `customerId?: string`. **Keine** Änderung an bestehenden Daten, Komponenten oder Reports.

`src/lib/json-schema.ts` *(neu)* — TypeScript-Interfaces + Zod-Schemas für:

```ts
DashboardJsonExport {
  schemaVersion: "1.0.0"
  exportType: "full" | "partial"
  exportedAt, exportedBy, dashboardVersion
  users?, customers?, projects?, workPackages?,
  activities?, timeEntries?, targetTimeModels?, settings?
}
```

- `customers` werden beim Export aus eindeutigen `project.client`-Werten **synthetisiert** (stabile ID `cust-<slug>`), `Project.customerId` wird ergänzt.
- `timeEntries` werden beim Export aus `Activity` projiziert (`Activity` bleibt zusätzlich erhalten — Stufe 2 entscheidet, welcher Weg Quelle der Wahrheit beim Import wird).
- Sensible Felder werden **strikt** entfernt: keine Passwörter, keine MFA-Secrets, keine Session-Token. Eine zentrale Denylist (Übernahme aus `backup-service.ts`).

### 3. Services

`src/lib/json-export-service.ts` *(neu)*
- `exportFullJson(opts)` — sammelt alle Bereiche, baut `DashboardJsonExport`, gibt `Blob` + Dateiname zurück.
- `exportPartialJson(scope, opts)` — Scopes: `users | customers | projects | workpackages | activities | timeentries | settings | targettime`.
- `buildFileName(type, scope?)` → `dashboard-{scope|full}_YYYY-MM-DD_HHMMSS.json`.
- `registerInDownloadCenter(blob, meta)` — nutzt bestehenden `ExportDownloadService`, damit JSON-Exporte im Downloadbereich erscheinen.

`src/lib/json-schema-validation-service.ts` *(neu)*
- `validateExport(json)` → Zod-Parse + Referenzprüfung (project→customer, workPackage→project, activity→workPackage, timeEntry→activity/engineer).
- Wird in Stufe 1 vom Beispieldatei-Test und vom Export-„Prüfen"-Button benutzt; in Stufe 2 vom Import.

`src/lib/example-file-service.ts` *(neu)*
- `generateExampleFiles()` liefert ein festes Set von Beispiel-Blobs (Inhalt im Service definiert, deterministisch — keine Zufallsdaten):
  `example-full-export.json`, `example-users.json`, `example-projects-workpackages-activities.json`, `example-timeentries.json`, `example-settings.json`, `example-backup.json`.
- `getExampleFile(name)` für Download-Button.

`src/lib/backup-service.ts` — minimaler Eingriff: neue Methode `createJsonBackup()` (delegiert an `JsonExportService.exportFullJson` + speichert Metadaten im bestehenden BackupRecord-Store mit `format: "json"`). **Kein** Eingriff in den täglichen ZIP-Cronpfad.

### 4. UI

`src/components/ImportExportDialog.tsx` *(neu)*
- Shadcn-`Dialog` + `Tabs` für die sechs Unterbereiche.
- **Tab „JSON Export":** Auswahl Umfang (Radio: Alles / einzelne Bereiche), Toggles (Einstellungen einschließen, Benutzerprofile einschließen, Zeitbuchungen einschließen, Handbuch-Meta einschließen), Buttons **Export prüfen** (zeigt Zod-Trockenlauf-Ergebnis) und **JSON erzeugen & herunterladen** (Browser-Download + Eintrag im Download-Center, Sonner-Toast).
- **Tab „Beispieldateien":** Tabelle (Name, Beschreibung, Größe), je Zeile Download-Button + „Validierung anzeigen" (zeigt Validierungs-Resultat live).
- **Tab „Schnittstellen-Dokumentation":** Button öffnet `UserManualDialog` mit Topic `import-export`.
- Platzhalter-Tabs zeigen Karte mit Text „Folgt in Stufe 2".

`src/components/BackupDialog.tsx` — neuer Button **„JSON-Komplett-Export herunterladen"** im Kopfbereich.

### 5. Tests

`tests/example-files.test.ts` *(neu, Vitest)*
- Für jede Beispieldatei: gültiges JSON, korrekte `schemaVersion`, Pflichtfelder, Referenzintegrität, `engineerId`-Auflösung (sofern vorhanden), Konflikterkennungs-Stub liefert plausible Ergebnisse.
- Läuft via `bunx vitest run` und wird **nicht** automatisch in `docs:check` integriert.

### 6. Handbuch & Changelog (Pflicht laut Memory)

- `src/lib/help-documentation.ts` — neues Topic `import-export` (Zweck, Voll-/Teil-Export, Beispieldateien, Sicherheitsregeln, Brückenfelder, Schema-Versionierung, Beispiel-JSON, Hinweis: Import folgt in Stufe 2). `lastUpdated` setzen. Bestehendes `backup`-Topic um JSON-Option ergänzen.
- `CHANGELOG.md` — neuer Eintrag `## 1.12.0 - 2026-06-18` mit den oben gelieferten Punkten.
- `bun run docs:check` muss grün durchlaufen, bevor ich abschließe.

## Sicherheitsregeln

- Export-Service ruft eine zentrale `stripSensitiveFields()`-Funktion (gemeinsam mit `backup-service.ts` → Refactor in `src/lib/sensitive-fields.ts`).
- Niemals exportiert: Passwort-Hashes, MFA-Secrets, Session/Recovery-Tokens, OAuth-Refresh-Tokens, Backup-Verschlüsselungs-Keys.
- UI-Gating: Service-Menü prüft `currentUser.role` (falls keine Auth aktiv → Menü trotzdem sichtbar, mit Hinweis-Toast).

## Bewusst NICHT in Stufe 1

- JSON-Import (Vorschau, Konfliktdialog, Mapping, Ausführung)
- Import-Protokoll-Persistenz
- Backup-Wiederherstellung aus JSON
- Automatische Benutzeranlage bei unbekannten `engineerId`
- API-Endpunkte (Cloud)

Diese Themen bekommen einen eigenen Folgeprompt, der auf Schema und Validation-Service aufsetzt.

## Risiken / kritische Hinweise

- **„engineerId" ist heute ohne Bedeutung**: Activity hat keinen echten Bezug zu einem User. In Stufe 1 wird das Feld optional exportiert (leer, sofern unbekannt). Ohne Multi-Engineer-Modell bleibt der spätere Import-Mapping-Dialog ein Mehrwert nur, wenn Sie parallel beschließen, Activities künftig pro User zu pflegen — sonst ist die Benutzerzuordnung kosmetisch.
- **`Customer`-Synthese** über `project.client`-String ist verlustbehaftet (kein eindeutiger Kunden-PK, Tippfehler erzeugen Doubletten). Sauberer wäre eine echte Customer-Tabelle (Variante „vollständiger Refactor"). Wenn Kunden später echte Entität werden, brechen heute exportierte IDs — das ist hinzunehmen, weil Schema-Version dann hochgezogen wird.
- **Doppelter Wahrheitsgehalt `activities` vs. `timeEntries`** im Export ist redundant und kann beim Import zu Konflikten führen. Stufe 2 muss eine Quelle festlegen (Vorschlag: `timeEntries` ist die kanonische Form, `activities` wird beim Import ignoriert, wenn `timeEntries` vorhanden ist).
- **Alternative, die ich für sauberer halte**: statt jetzt JSON-Export parallel zum ZIP-Backup aufzubauen, das bestehende ZIP-Format um eine eingebettete `dashboard.json` (mit obigem Schema) zu erweitern. Damit gäbe es **eine** Quelle der Wahrheit und Import könnte automatisch beide Formate. Ich habe das hier nicht eingebaut, weil die Vorgabe „JSON als eigener Bereich" eindeutig war — bei Interesse kann ich diesen Weg in Stufe 2 nachziehen.
