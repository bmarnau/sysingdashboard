# ADR-0017 — Zentraler technischer Prüfbericht

Status: accepted
Datum: 2026-07-15
Kontext: Prompt 2A.8.

## Entscheidung

1. **Aggregation statt neuer Tests.** Alle Bereichsberichte
   (`security-report.*`, `api-*`, `backup-integrity-report.*`, `tech-debt.*`,
   `ops-report.*`, `docs:check`) werden von `scripts/technical-report/build.mjs`
   defensiv gelesen und in ein einheitliches Finding-Schema überführt. Kein
   Bereich wird dupliziert oder nachgetestet.
2. **Einheitliches Finding-Schema mit ID-Namespace.** Bereichs-IDs werden mit
   Prefix (`sec:`, `api:`, `backup:`, `td:`, `ops:`, `docs:`, `man:`)
   erhalten. Findings ohne stabile ID bekommen einen Titel-Hash — sichtbar
   markiert, damit Diff-Rauschen erkennbar bleibt.
3. **Report-Snapshot im Build eingefroren.** Der Dialog liest
   `test-report/technical-test-report.json` per Vite-`?raw`-Import, nicht via
   Runtime-Fetch. So ist die im Bundle enthaltene Sicht deterministisch mit
   dem jeweiligen Buildstand verknüpft und kein localStorage die
   Primärquelle (Vorgabe Prompt 2A.8).
4. **Soft-Gate.** `report:technical:ci` scheitert nur an Aggregator-Fehlern,
   nicht an Findings — analog ADR-0013/0016. Hard-Gate erst sinnvoll, wenn
   SEC-CRIT-001/002 geschlossen sind.
5. **Auto vs. manuell explizit.** Feld `source: 'auto' | 'manual'` unterscheidet
   Scanner-Befunde von menschlicher Bewertung
   (`scripts/technical-report/manual-findings.json`, versioniert).

## Konsequenzen

- Positiv: Ein Ort für „was ist Stand der Technik in diesem Build?".
- Positiv: Diff macht Regressionen sichtbar, ohne dass jeder Bereich einen
  eigenen Diff pflegen muss.
- Negativ: Aggregator hängt an den Eingaben. Fehlt ein Bereichsbericht,
  erscheint der Bereich als `not-run`, was in `overallStatus` zu `blocked`
  führen kann (Pflichtbereiche: security, backup, docs). Bewusst gewählt,
  damit „kein Bericht" nicht als „grün" durchgeht.
- Negativ: Titel-Hash-Fallback für E2E-Markdown liefert unscharfe
  Diff-Zuordnungen. Dokumentiert, akzeptiert bis stabile IDs vorliegen.

## Bekannte Einschränkungen

- Kein Push in externe Ticket-Systeme.
- Kein Aufruf der Bereichsscanner selbst — Report entsteht aus dem Zustand
  des `test-report/`-Ordners zur Aggregationszeit.
