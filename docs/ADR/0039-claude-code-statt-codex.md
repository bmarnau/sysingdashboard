# ADR-0039: Claude Code ersetzt Codex als bevorzugtes lokales Werkzeug

- **Status**: Accepted
- **Datum**: 2026-10-28
- **Entscheider**: Owner (Planungsrunde 2026-10-28, Frage 7 von 7)
- **Ergänzt**: `docs/CODEX-GIT-CI-RULE.md`, `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md`, `docs/DATABASE-CHANGE-GOVERNANCE.md`

## Kontext

Codex steht dem Projekt bis zum 2026-11-02 nicht zur Verfügung (Owner-Angabe 2026-10-28). Die Arbeit läuft seit der Umstellung mit Claude Code und Lovable. Die Projektregeln nannten Codex als bevorzugtes Werkzeug für Git-, PR-, Merge- und CI-Fehler sowie als lokalen Weg für Entwicklung und Datenbank-Fallback.

## Entscheidung

1. Claude Code ersetzt Codex als bevorzugtes lokales Werkzeug für Git-, Branch-, PR-, Merge- und CI-Fehler und für lokale Entwicklung.
2. Die Grenzen bleiben unverändert und gelten werkzeugunabhängig: kein Raw-SQL, keine Dashboard-Klicks und keine Connector-Write-Aufrufe zur Anwendung maßgeblicher Datenbankänderungen; Datenaufträge nur nach ADR-0037; ADR-0035 für Migrationen.
3. Die Planung führt Aufträge als `claude_code_auftraege` statt `codex_auftraege`.
4. Historische Einträge (Tagebuch, Closure-Berichte, frühere Prompt-Pläne) bleiben unverändert.
5. Der Dateiname `docs/CODEX-GIT-CI-RULE.md` bleibt aus Linkgründen bestehen.

## Konsequenzen

- Die Regeldokumente sind widerspruchsfrei zur tatsächlichen Arbeitsweise.
- Eine Rückkehr zu Codex wäre eine neue Entscheidung (neuer ADR).
