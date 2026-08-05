# Sprint 06A – Backupformat 2.0 und manifestbasierte Restore-Zuordnung

## Ziel

Backups erhalten ein Manifest der Version 2.0 mit einer expliziten `entries[]`-Liste. Jede Datei im Archiv wird dort mit ihrem logischen Namen, ihrem echten Storage-Key, Prüfsumme, Größe, Typ und Erstellungsdatum beschrieben. Die Wiederherstellung liest ausschließlich diese Liste; Dateinamen im Archiv verlieren jede fachliche Bedeutung. Alte Backups (Manifest v1) bleiben lesbar und werden intern still auf die v2-Struktur gehoben.

Bedienung, Oberfläche, öffentliche API, Import/Export, RBAC und RLS bleiben unverändert.

## Was gebaut wird

### 1. Manifest v2 (`src/lib/backup/types.ts`, `constants.ts`)

Neuer Typ `BackupManifestV2`:

```text
version: "2.0"
project, createdAt, keyCount, excludedKeys, archiveItemCount, note   (wie bisher)
entries: [
  { logicalName, storageKey, path, checksum ("sha256:<hex>"),
    size, contentType, createdAt, description? }
]
```

`BackupManifestV1` bleibt als Typ erhalten (nur noch lesend). Konstante `MANIFEST_VERSION = "2.0"`, `SUPPORTED_MANIFEST_MAJORS = [1, 2]`.

### 2. Prüfsummen (`src/lib/backup/checksum.ts`, neu)

`sha256Hex(bytes)` über WebCrypto (`crypto.subtle.digest`), verfügbar in Browser, Worker und Node-Testumgebung. Da die Hash-Berechnung asynchron ist, wird `buildZip()` zu `async`; die Aufrufkette in `create-backup.ts` ist bereits asynchron.

### 3. Erzeugung (`src/lib/backup/zip.ts`, `snapshot.ts`)

Beim Packen wird für jede Datei ein Eintrag erzeugt: Daten-Dateien behalten den maskierten Pfad `data/<safe>.json`, tragen aber den unmaskierten Original-Key in `storageKey`. Kollidierende maskierte Namen bekommen ein Suffix (`__2`), da der Key nun aus dem Manifest kommt. Auch `README.md`, `INSTALL.md`, `.env.example`, `archive-index.json` und `dashboard.json` werden als Einträge geführt (`storageKey: null`, `contentType` gesetzt) — sie sind Dokumente, keine Storage-Keys. Das Manifest selbst listet sich nicht.

### 4. Migration v1 → v2 (`src/lib/backup/manifest.ts`, neu)

`loadManifest(entries)` liefert immer eine v2-Struktur:
- v2: parsen, validieren.
- v1 (oder fehlende Version): aus den vorhandenen `data/*.json`-Pfaden werden Einträge synthetisiert (Storage-Key wie bisher aus dem Dateinamen abgeleitet, Prüfsummen zur Laufzeit berechnet), Ergebnis wird als „migriert" markiert und als Warnung im Restore-Ergebnis ausgewiesen.
- Unbekannte MAJOR-Version: Ablehnung mit klarer Meldung (bestehende `allowNewer`-Regel bleibt gültig).

### 5. Integritätsprüfung (`src/lib/backup/integrity.ts`)

Neu `validateManifestEntries(manifest, zipEntries)` prüft: Manifest vorhanden und parsebar, `entries` nicht leer, `storageKey` eindeutig, `logicalName` eindeutig, jeder Pfad im Archiv vorhanden und umgekehrt kein verwaister Datei-Eintrag, Prüfsumme stimmt, Größe stimmt, `contentType` plausibel. Jede Abweichung ist ein harter Fehler — manipulierte Manifeste werden damit erkannt. `validateZip()` ruft die Prüfung nach dem Packen zusätzlich auf.

### 6. Restore (`src/lib/backup/restore.ts`)

Neuer Ablauf: entpacken → Manifest laden (inkl. Migration) → Manifest validieren → Integritätsprüfung der Einträge → Restoreplan aus `entries[]` mit `storageKey !== null` bilden → bestehende Prüfungen (Projektname, Modus, Sensibilitäts-Denylist, Pre-Snapshot, transaktionales Schreiben, Rollback) unverändert anwenden. Die Ableitung des Keys aus dem Dateinamen entfällt vollständig und existiert nur noch im Migrationspfad für v1-Archive.

### 7. Tests (`src/__tests__/backup/`)

Neue Suite `manifest-v2.test.ts` und Erweiterung der Restore-Tests: v1-Backup wird restauriert (Migrationspfad), v2-Backup wird restauriert, neu erzeugtes Backup trägt Version 2.0, manipuliertes Manifest, fehlende `entries`, doppelter `storageKey`, doppelter `logicalName`, falsche Prüfsumme, falsche Größe, unplausibler Dateityp, unbekannte Manifestversion. Bestehende Suites bleiben unverändert grün.

### 8. Dokumentation

`docs/ADR/0022-backupformat-2.md` (Begründung `entries[]`, Nutzen für AVKK, Azure-Storage, Docker, Mehrmandantenfähigkeit, künftige Storage-Provider), `docs/ARCHITECTURE.md`, `docs/DATA-SCHEMA.md`, README, `CHANGELOG.md` (v1.48.0), Handbuchkapitel Backup/Restore in `src/lib/help-documentation.ts` (`lastUpdated`), `docs/ENTWICKLUNGSTAGEBUCH.md`, technischer Prüfbericht neu erzeugt inkl. Integritäts-Hash.

## Verifikation

`bun run typecheck`, Vitest-Gesamtlauf, `bun run lint`, `lint:no-console`, `docs:check`, Build, danach Prüfbericht-Neuerzeugung und Go/No-Go-Empfehlung für Sprint 07.

## Bewusste Einschränkungen

- Bestehende Archive werden nicht umgeschrieben; die Migration ist rein lesend und temporär.
- Für v1-Archive bleibt die Key-Rekonstruktion aus Dateinamen die einzig mögliche Quelle — das ist Bestandsschutz, kein neuer Vertrag.
- Keine Verschlüsselung, keine Änderung der Kompression, keine UI-Änderung.
