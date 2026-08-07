# ADR-0022: Backupformat 2.0 — manifestbasierte Zuordnung

- **Status**: Accepted
- **Datum**: 2026-08-05
- **Sprint**: 06A

## Kontext

Bis Version 1.47.0 war die fachliche Zuordnung eines Backup-Inhalts an seinen
Dateinamen gebunden: `data/<safeKeyFileName(key)>.json`. Der Restore
rekonstruierte den localStorage-Key, indem er `data/` und `.json` entfernte.
Das hatte drei harte Nachteile:

1. **Informationsverlust.** `safeKeyFileName()` ersetzt Sonderzeichen durch
   `_`. Der Originalschlüssel `engineer-dashboard:profile` wurde als
   `engineer-dashboard_profile` wiederhergestellt — eine stille Datenmutation.
2. **Kollisionsgefahr.** Zwei Keys, die sich nur in maskierten Zeichen
   unterscheiden, überschrieben sich gegenseitig.
3. **Keine Integritätsaussage.** Ohne Prüfsumme und Größe pro Datei war eine
   Manipulation des Archivs nicht erkennbar (offenes Follow-up aus ADR-0015).

Zusätzlich blockierte die Namenskopplung künftige Speicherziele (Azure Blob,
Objektspeicher, Mehrmandanten-Ablagen), in denen Pfade nicht frei wählbar sind.

## Entscheidung

Das Manifest der Version `2.0` führt eine explizite Zuordnungstabelle:

```text
entries: [
  { logicalName, storageKey, path, checksum, size, contentType, createdAt, description? }
]
```

- `storageKey` trägt den **unmaskierten** Zielschlüssel; `null` kennzeichnet
  reine Dokumente (README, INSTALL, `.env.example`, `archive-index.json`,
  `dashboard.json`).
- `path` ist reine Speicheradresse ohne fachliche Bedeutung. Kollisionen
  werden beim Packen durch ein Suffix aufgelöst.
- `checksum` ist `sha256:<hex>` über den unkomprimierten Inhalt.
- Restore arbeitet **ausschließlich** über `entries[]`. Die Ableitung eines
  Keys aus einem Dateinamen existiert nur noch im Migrationspfad.

Jede Abweichung zwischen Manifest und Archiv (fehlende Datei, verwaiste Datei,
falsche Prüfsumme, falsche Größe, unplausibler Dateityp, doppelter
`storageKey` oder `logicalName`) ist ein **harter Fehler** und bricht den
Restore vor jedem Schreibvorgang ab.

## Rückwärtskompatibilität

Archive ohne `entries[]` (Format 1) werden beim Lesen still auf die
v2-Struktur gehoben: die Einträge werden aus den vorhandenen Speicheradressen
synthetisiert, Prüfsummen zur Laufzeit berechnet. Das Ergebnis wird als
Warnung im Restore-Protokoll ausgewiesen. Bestehende Archive werden nicht
verändert. Für sie bleibt die maskierte Key-Rekonstruktion die einzig
mögliche Quelle — Bestandsschutz, kein neuer Vertrag.

Ein vorhandenes, aber leeres `entries` gilt dagegen als defektes v2-Manifest
und wird abgewiesen.

## Alternativen

- **Nur Prüfsummen ergänzen, Namenskopplung behalten** — löst Punkt 3, nicht
  Punkt 1 und 2, und hätte das Format trotzdem gebrochen.
- **Keys base64-kodiert als Dateinamen** — reversibel, aber weiterhin an das
  Dateisystem gekoppelt und für Menschen unlesbar; Prüfsummen fehlten weiter.
- **Manifest v1 erweitern statt MAJOR-Bump** — hätte alte Clients dazu
  gebracht, neue Archive scheinbar erfolgreich, aber unvollständig zu lesen.

## Konsequenzen

Positiv:

- Originalschlüssel werden exakt wiederhergestellt.
- Manipulierte oder beschädigte Archive werden vor dem Schreiben erkannt.
- Speicheradressen sind frei wählbar — Voraussetzung für Azure-Blob-,
  Docker-Volume- und mandantenfähige Ablagen.

Negativ:

- `buildZip()` und `validateZip()` sind asynchron (WebCrypto).
- Archive der Version 1 benötigen beim Lesen einen Migrationsschritt, der
  Prüfsummen erst zur Laufzeit berechnet.
- Alte Clients können v2-Archive nicht einspielen (beabsichtigt, MAJOR-Bump).

## Verifikation

`src/__tests__/backup/manifest-v2.test.ts` deckt Restore aus v2, Migration aus
v1, leere/doppelte/verwaiste Einträge, falsche Prüfsumme, falsche Größe,
unplausiblen Dateityp und unbekannte MAJOR-Version ab. Die bestehenden Suites
(`create`, `integrity`, `restore`) laufen unverändert grün.
