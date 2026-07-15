# Technischer Prüfbericht — Aggregator (Prompt 2A.8, ADR-0017)

`scripts/technical-report/build.mjs` sammelt vorhandene Bereichsberichte
(Security, API, Backup/Restore, Tech-Debt, Ops, Docs) und schreibt einen
konsolidierten Bericht:

- `test-report/technical-test-report.json`
- `test-report/technical-test-report.md`
- `test-report/technical-test-report.prev.json` (Rotation für Diff)

## Ausführung

```
bun run report:technical
```

## Manuelle Findings

`scripts/technical-report/manual-findings.json` (`source=manual`). IDs
beginnen mit `man:` und werden im Report von automatisch gesammelten
Findings (`source=auto`) unterschieden.

## Soft-Gate

Der Aggregator scheitert nur an eigenem Fehler, nicht an offenen Findings —
analog ADR-0013/0016. Umstellung auf Hard-Gate erst nach Schließung von
SEC-CRIT-001/002 sinnvoll.

## Keine Secrets

Werte werden auf 200/400/800 Zeichen begrenzt, ENV-Werte nie übernommen
(nur Namen — siehe ADR-0013). Reports enthalten keine Payloads.
