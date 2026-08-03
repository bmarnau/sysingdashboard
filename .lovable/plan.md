## Ziel

Ein fortschreibbares Entwicklungstagebuch als **eine** Markdown-Quelle (`docs/ENTWICKLUNGSTAGEBUCH.md`), im Dashboard unter **Service → Entwicklungstagebuch** lesbar dargestellt.

## Quellenlage (geprüft)

- `CHANGELOG.md` — durchgehende Versionshistorie bis 1.45.0 (wird bereits per `?raw` zur Build-Zeit eingelesen; dasselbe Muster nutze ich für das Tagebuch).
- `docs/ADR/*` und `docs/adr/ADR-00xx-*` — Architekturentscheidungen 0001–0020.
- `test-report/technical-test-report.md`, `security-report/`, `tech-debt/findings.json` — Prüfstände.
- Git-Historie lese ich lokal (`git log`, read-only) zur Datierung der Sprints; ein GitHub-API-Abruf ist nicht nötig.

## Umsetzung

1. **`docs/ENTWICKLUNGSTAGEBUCH.md`** (neu), Struktur:
   - Vision und Zielbild
   - Managementübersicht (nicht-technisch, eine Seite)
   - Zeitstrahl Idee → Prototyp → MVP → Härtung
   - Sprintübersicht als Tabelle bis v1.45.0 (Version, Datum, Ziel, Ergebnis)
   - Schwierigkeiten und wie sie gelöst wurden (Auth-Inbetriebnahme, Build-Env-Inlining, Print-Portal, Logger-Bereinigung, CI/Bun-Lockfile)
   - Architekturentscheidungen mit Verweis auf die jeweilige ADR
   - Ausblick / offene Punkte (E2E-Grenze aus ADR-0020)
   - Pflegehinweis: pro Sprint ein neuer Abschnitt, gleiche Quelle wie CHANGELOG-Eintrag
2. **Anzeige**: neue Komponente `src/components/DevDiaryDialog.tsx`, liest `docs/ENTWICKLUNGSTAGEBUCH.md?raw`. Rendering über einen kleinen, sicheren Markdown-Renderer (`src/lib/markdown/render-basic.tsx`) für das im Projekt übliche Subset (Überschriften, Listen, Tabellen, Code, Fettdruck) — **kein** `dangerouslySetInnerHTML`, keine neue Abhängigkeit. Mit Suchfeld und Sprungmarken über die Kapitel.
3. **Menü**: Eintrag „Entwicklungstagebuch" in `ServiceMenu.tsx`, sichtbar mit Berechtigung `documentation.view`; Dialog lazy geladen wie die übrigen Dialoge.
4. **Doku-Pflicht**: neues HelpTopic „Entwicklungstagebuch" in `src/lib/help-documentation.ts` (`lastUpdated` gesetzt), damit `docs:check` (Komponenten-Heuristik) grün bleibt; Verweis in `README.md` und `docs/ARCHITECTURE.md`.
5. **Tests**: Vitest für den Markdown-Renderer (Escaping/Subset) und für den Dialog (Kapitel vorhanden, RBAC-Gate); Doku-Test, dass die oberste CHANGELOG-Version auch im Tagebuch als jüngster Sprint auftaucht.
6. **Abschluss**: `CHANGELOG.md` → **1.46.0**, Prüfbericht neu erzeugen (`bun run report:*`), dann `bun run typecheck`, `docs:check`, `lint:no-console`, `vitest`.

## Technische Hinweise

- Kein neues npm-Paket: `react-markdown` würde Bundle und Sanitizing-Risiko bringen; der bestehende Handbuch-Renderer wird dafür in ein wiederverwendbares Modul gehoben und um Tabellen erweitert.
- `?raw`-Import aus `docs/` ist unkritisch: der Inhalt ist öffentliche Projektdokumentation, keine Secrets. Ich prüfe den Text vor Commit auf Namen/Tokens.
- Das Tagebuch bleibt Markdown-Datei (Single Source), keine DB-Tabelle — konsistent zu CHANGELOG und ADRs.

## Abgrenzung

Keine automatische Generierung aus Git-Commits zur Laufzeit; die Rekonstruktion erfolgt einmalig beim Anlegen und wird danach pro Sprint manuell fortgeschrieben (wie CHANGELOG).
