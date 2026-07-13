
## Prompt 2A.6 — Backup / Restore / Import / Export Test-Suite

Ziel: automatisierte Nachweise für Datenintegrität und Wiederherstellbarkeit, mit maschinenlesbarem Integritätsbericht + Handbuch-Update.

### Rahmen & Randbedingungen (kritisch — bitte prüfen)

- **Restore-Funktion existiert heute nicht als eigenständige API.** `backup-service.ts` erzeugt und validiert ZIPs, aber es gibt kein `BackupService.restore(id)`, das ein ZIP zurück in localStorage schreibt. Zwei Optionen:
  - **A (empfohlen)**: Kleine, additive `restoreFromZip(bytes, opts)`-Funktion in `backup-service.ts` ergänzen (entpackt → validiert → schreibt keys atomar mit Pre-Snapshot/Rollback, spiegelt die bereits im Import-Service etablierte Snapshot-Mechanik). Ohne diese Funktion sind Restore-Tests reine Whitebox-Prüfungen der ZIP-Struktur, kein echter Wiederherstellungsnachweis.
  - **B**: Nur ZIP-/Manifest-Ebene testen, Restore-Bereich als „nicht testbar — Funktion fehlt" im Integritätsbericht ausweisen und als Follow-up markieren.
  Ich schlage **A** vor, hälst du es für zu großen Scope, sag Bescheid.
- **Prüfsumme fehlt heute im Manifest.** Ehrlich als Finding melden; optional additiv `sha256` über die Datenblöcke im Manifest ergänzen (klein, aber Scope-Erweiterung — nur wenn gewünscht).
- **PDF-Prüfung ist bewusst minimal** (Header `%PDF-`, Seitenanzahl per Regex, Größe > 0). Struktur/Layout-Verifikation ist außerhalb dieser Suite.
- **Rollen/Scope-Begrenzung im Export**: das JSON-Schema hat kein Rollen-Feld pro Export; wir testen die vorhandene `scopeWhitelist`/Partial-Scope-Logik + `stripSensitiveFields` — echte Backend-RBAC-Enforcement bleibt Follow-up aus 2A.5 (SEC-CRIT-001).

### Neue Test-Dateien (Vitest, Modus `backup` bzw. `io`)

```
src/__tests__/backup/
  create.test.ts          Backup erzeugen, ZIP-Struktur, Manifest, Version, Vollständigkeit, RBAC/Assignments, Log-Regel
  integrity.test.ts       beschädigtes ZIP, unvollständiges ZIP, sensible Felder, (optional) Prüfsumme
  restore.test.ts         leerer/bestehender Datenbestand, alte/neue Version, fehlende Assignments,
                          beschädigte Daten, Abbruch ohne Teilzustand, Actor/Herkunft, Restore-Protokoll
src/__tests__/io/
  import.suite.test.ts    gültig/ungültig/falsche Version/Konflikte/Duplikate/Referenzen/
                          Vorschau/Pflichtbackup/Abbruch/keine stillen Löschungen
  export.suite.test.ts    JSON/CSV/PDF, Schema, Dateiname, Inhalt, Sonderzeichen (UTF-8/Emoji/CR-LF),
                          leere Daten, große Menge (10k Aktivitäten), Scope-Begrenzung
```

Fixtures und Helper landen in `src/__tests__/fixtures/backup.ts` und `src/__tests__/fixtures/restore-scenarios.ts` (deterministische Snapshots + kaputte ZIPs generiert via `fflate`). Alle Tests binden `src/__tests__/env/test-instance.ts` ein (Isolation, kein echter Azure-Call).

### Restore-API (nur bei Option A)

Ergänzung in `src/lib/backup-service.ts` (additiv, keine Signatur-Änderung bestehender Exports):

```ts
export interface RestoreOptions {
  actor: string;
  mode: "empty" | "overwrite" | "merge";   // "empty" verlangt leeren Zustand
  allowOlderMinor?: boolean;               // Default true
  allowNewerMajor?: boolean;               // Default false
}
export interface RestoreResult { ok: boolean; runId: string; snapshotId: string;
  counts: { keysWritten: number; keysSkipped: number }; warnings: string[];
  errors: string[]; rollback: boolean; startedAt: string; finishedAt: string; actor: string; }
export async function restoreFromZip(bytes: Uint8Array, opts: RestoreOptions): Promise<RestoreResult>
```

Implementierung: Pre-Snapshot der betroffenen localStorage-Keys → validieren (Manifest, `manifest.project`, Version, Pflichtdateien) → alle Keys schreiben oder bei erstem Fehler zurückrollen → Eintrag in `backup:restoreLog` (max. 100). Reine Client-seitige Operation, kein Backend.

### Report-Generator

Neue Datei `scripts/backup-integrity/report.mjs` liest die Vitest-JSON-Ausgabe der neuen Suiten und schreibt:

```
test-report/backup-integrity-report.json
test-report/backup-integrity-report.md
```

Format (JSON):

```json
{
  "generatedAt": "…",
  "summary": { "checked": 42, "passed": 40, "failed": 2, "restorable": true },
  "categories": {
    "backup":  { "passed": 12, "failed": 0, "findings": [] },
    "restore": { "passed": 9,  "failed": 1, "findings": [{ "id": "RST-001", "severity": "high", "recommendation": "…" }] },
    "import":  { "passed": 11, "failed": 0, "findings": [] },
    "export":  { "passed": 8,  "failed": 1, "findings": [{ "id": "EXP-004", "severity": "medium", "recommendation": "…" }] }
  },
  "records": { "backupsChecked": 3, "restoreScenarios": 7, "importCases": 11, "exportCases": 8 }
}
```

Severity-Skala und Empfehlungs-Katalog spiegeln das Security-Report-Schema aus 2A.5 (konsistent für spätere Dashboards).

### package.json / CI

- Neue Scripts:
  - `test:backup:integrity` → `vitest run src/__tests__/backup src/__tests__/io --reporter=json --outputFile.json=test-report/backup-vitest.json && node scripts/backup-integrity/report.mjs`
  - `test:full` erweitert um `test:backup:integrity`
- `.github/workflows/ci.yml`: neuer Step nach den bestehenden Test-Jobs; Artefakt-Upload für `test-report/backup-integrity-*`.
- Release-Gate: **soft** (Warnung im Log), analog 2A.5B, bis SEC-CRIT-001/002 gefixt sind.

### Doku

- `CHANGELOG.md`: Eintrag `## 1.35.0 - 2026-07-13` mit Backup-/Restore-Test-Suite und (falls Option A) `restoreFromZip`.
- `src/lib/help-documentation.ts`: neues Kapitel „Backup- und Restore-Tests" + Ergänzung in „Downloadbereich" (Restore-Pfad). `DOCUMENTATION_VERSION` bleibt (keine Struktur-Änderung), `lastUpdated` gesetzt.
- `docs/adr/ADR-0015-backup-restore-tests.md`: dokumentiert Entscheidung zu Option A vs. B, Prüfsummen-Follow-up, PDF-Prüftiefe, Soft-Gate.

### Verifikation vor Abschluss

`bun run test:backup`, `bun run test:io`, `bun run test:backup:integrity`, `bun run docs:check`, `bun run lint` — plus stichprobenartige Sichtprüfung `test-report/backup-integrity-report.md`.

### Offene Entscheidungen für dich

1. **Option A (echte `restoreFromZip`) oder B (nur ZIP-Ebene testen)?**
2. **Prüfsumme (`sha256` im Manifest) additiv mit einführen** — ja/nein?
3. **Release-Gate hart oder weiter soft** bis Backend-RBAC steht?
