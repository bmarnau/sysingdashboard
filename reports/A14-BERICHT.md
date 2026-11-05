---
id: A14
titel: "types.ts-Abweichung (Plattformergänzung __InternalSupabase) prüfen"
status: erledigt
start: 2026-11-05T09:00+01:00
ende: 2026-11-05T06:20+01:00
branch: keiner (nur lesen; temporäre Änderung im Arbeitsverzeichnis zurückgesetzt)
pr: keiner
commit: keiner
ci: "Referenz main 9ab42d15, CI-Lauf 41968152050 success (Database Schema Drift success)"
---

# A14 Bericht

## Ergebnis

Empfehlung: **bewusst ignorieren**, jedenfalls bis nach dem Publish. Die 5 Zeilen passen zu `@supabase/supabase-js` und `postgrest-js` 2.110.7 und wirken nur auf Typen. Mit ihnen bleibt `tsc` grün.
Eine Übernahme würde aber den CI-Job „Database Schema Drift“ rot machen. Die CI erzeugt die Typen mit Supabase CLI 2.117.0 (`--local`) ohne diesen Block und vergleicht zeichengenau.
Lovable legt die Zeilen bei jeder Typgenerierung neu an (drei Sync-Branches vom 03. bis 05.11.). Das Rauschen bleibt also, solange `main` sie nicht enthält (R-12).
Wer das Rauschen beseitigen will, muss den Block in der Drift-Normalisierung ausnehmen und dann übernehmen. Das ist ein kleiner Code-PR (etwa 1 bis 2 h mit Test), nicht nur ein Typen-PR.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Inhalt | `__InternalSupabase: { PostgrestVersion: "14.5" }` am Anfang von `Database` | `git diff origin/main...origin/lovable-sync-1793852674` |
| Kompatibilität | supabase-js 2.110.7 liest den Block (`DatabaseWithoutInternals`, `ClientOptions`); Version 14 schaltet nur Typen für `maxAffected` und Spread auf Many frei | `node_modules/@supabase/postgrest-js/dist/index.d.mts:947-951`, `:1737` |
| Vorbereitung im Repo | `types.ts` enthält bereits `Omit<Database, "__InternalSupabase">` | `src/integrations/supabase/types.ts:1646` |
| Typprüfung mit Block | grün | `tsc --noEmit` exit 0 |
| Drift mit Block | `DATABASE_TYPES_DRIFT: DETECTED` | `node scripts/database-schema/check-drift.mjs` gegen Artefakt `database-schema-generated` aus Lauf 41968152050 |
| Drift ohne Block | `NONE` | dasselbe, Gegenprobe |
| CI-Generator | `supabase gen types --lang typescript --local`, CLI 2.117.0; Artefakt ohne Block | `package.json` `db:types:generate`, `.github/workflows/ci.yml:91-93`, `:147-148` |
| Wiederkehr | +5 Zeilen in `lovable-sync-1793765195`, `…767407`, `…852674` | `git diff --stat` |

## Vorschlag

| Option | Inhalt | Aufwand | Risiko |
| --- | --- | --- | --- |
| A (empfohlen bis nach dem Publish) | ignorieren; Sync-Dialog weiter mit „Repository-Version behalten“; im Standard Lovable-Grenzen festhalten | 0 h | Rauschen bleibt |
| B | `normalizeGeneratedText` entfernt den Block `__InternalSupabase` vor dem Vergleich, dann die 5 Zeilen übernehmen; Test für die Normalisierung | 1 bis 2 h | gering; Drift-Prüfung wird für diesen Block blind |
| C | nur die 5 Zeilen übernehmen | 0,5 h | CI rot (Drift), nicht zulässig |

## Offene Fragen, Risiken, Abweichungen

- Offene Frage an den Owner: Option A oder B?
- Risiko: `PostgrestVersion "14.5"` beschreibt den Server von Lovable Cloud. Lokal und in der CI kann die PostgREST-Version abweichen. Code mit `maxAffected` würde dort anders laufen. Heute nutzt der Code das nicht.
- Abweichung: Für die Prüfung wurde `types.ts` im Doku-Arbeitsverzeichnis kurz geändert und sofort zurückgesetzt (`git status` danach leer). Kein Commit, kein PR, wie im Auftrag.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Plattformabweichung bewertet
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - types.ts Option A oder B?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
