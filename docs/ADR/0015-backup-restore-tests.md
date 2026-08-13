# ADR-0015 — Backup-/Restore-/IO-Test-Suite

Status: accepted
Datum: 2026-07-13
Kontext: Prompt 2A.6.

## Entscheidung

1. **Option A** — additive `restoreFromZip()` in `src/lib/backup-service.ts` statt reiner ZIP-Ebenen-Tests. Grund: ohne echten Restore-Pfad ist die Wiederherstellbarkeit nicht nachweisbar.
2. **Keine Prüfsumme** im Manifest (Follow-up): Backup-Integrität wird strukturell (Pflichtdateien, Manifest, Nach-Validierung nach Schreiben) belegt. Optionaler `sha256`-Hash bleibt späterem Bump vorbehalten, um die bestehenden Backups nicht zu invalidieren.
3. **PDF-Prüfung minimal** — Struktur/Layout ist Aufgabe des E2E-Bereichs; die Suite prüft die Text-Exports (JSON/CSV/NDJSON) semantisch und die PDF-Erzeugung nur über die vorhandenen Integrationstests.
4. **Report-Format** spiegelt das Security-/API-Discovery-Schema (JSON + MD, `test-report/backup-integrity-report.*`) für konsistente Downstream-Auswertung.
5. **Soft-Gate** analog zu 2A.5B — der Job scheitert nicht am Report, sondern nur an konkreten Vitest-Fehlern. Umstellung auf hart, sobald SEC-CRIT-001/002 erledigt sind.

## Konsequenzen

- Restore ist jetzt eine dokumentierte, testbare Public-API; UI kann später ohne API-Bruch angebunden werden.
- Kein Manifest-Bump, kein Migrationszwang bestehender Backups.
- Prüfsummen-Follow-up bleibt sichtbar in `test-report/backup-integrity-report.md` unter „Bekannte Einschränkungen".
