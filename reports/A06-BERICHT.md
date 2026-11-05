---
id: A06
titel: "L2-12 Rest: Version, Bewertungskriterien, Cockpit-Einträge"
status: erledigt
start: 2026-11-05T06:36+01:00
ende: 2026-11-05T07:10+01:00
branch: docs/2026-11-05-l2-12-abschluss
pr: 282 (Draft)
commit: 92bf1d3b
ci: "15/15 grün (CI 41977241670, Security 41977241652), Head 92bf1d3b"
---

# Bericht A06

## Ergebnis

1. Das Handbuch hat ein neues Kapitel `management-cockpit`. Es beschreibt Gründe und Datenzustände und erklärt die Bewertungskriterien mit je einem durchgerechneten Beispiel: AVKK-Schweregrade (hoch ab Rang 3, kritisch ab Rang 4), Risikoschwelle 1/2 sowie Risikobewertung W × A mit R-07 = 3 × 5 = 15, Stufe hoch. Handbuch 1.26.0.
2. Der CHANGELOG 1.70.0 nennt jetzt das Cockpit (U1 bis U6) und das neue Kapitel. U7 (QS-06) stand schon drin. Version 1.70.0 bleibt, das Datum ist neu 2026-11-05.
3. In der Merge-Checkliste steht als Tag nach dem Publish v1.70.0.
4. Die Owner-Entscheidung zu `types.ts` (`__InternalSupabase` bis nach dem Publish ignorieren) steht in Tracker und Backlog. Der Vorschlag „Drift-Normalisierung anpassen, 1 bis 2 h“ ist als Nach-Golden-Gate-Punkt eingetragen.
5. PR 281 war vor dem Start schon gemergt. Deshalb läuft das Bündel als neuer Branch und PR 282, nicht als Nachtrag zu PR 281.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Warteschlangen-Update (erneut gesendet) | ZIP 05d identisch mit `origin/ops/queue` a09f58e7, kein neuer Commit nötig | `diff -r` → IDENTISCH |
| Abhängigkeit „PR 280 gemergt“ | erfüllt, 2026-11-05T04:29Z | `gh api …/pulls/280` merge 9ab42d15 |
| Schweregrade | gering 1, mittel 2, hoch 3, kritisch 4 | `supabase/migrations/20260809025207_…sql:511-514` |
| Schwellen hoch/kritisch | `HIGH_SEVERITY_RANK = 3`, `CRITICAL_SEVERITY_RANK = 4`; Cockpit zählt `highConsequence` (Rang ≥ 3) | `src/lib/avkk/management.ts:28-30`, `:78`; `src/integrations/supabase/management-cockpit-avkk-adapter.ts:345-352` |
| Risikoschwelle | `missingCount 1`, `partialCount 2`; ohne gültige Verantwortung nicht gefährdet | `src/lib/avkk/types.ts:85`, `src/lib/avkk/indicators.ts:20-46`, Migration `:525` |
| „Kritisch“ | Rang ≥ 4 und (gefährdet oder überfällig) | `src/lib/avkk/management.ts:144` |
| Risikobewertung | Skala 1–5, Score w × a, hoch ab 15, mittel 8–14; R-07 w 3, a 5, Score 15, hoch | `docs/RISIKOREGISTER.yaml:7-10`, `:22-24`, R-07 |
| Cockpit-Gründe und Datenzustände | 5 Gründe, `DATA_STALE` > 7 Tage, PARTIAL-Hinweis, „Nicht ermittelbar“ | `src/lib/management-cockpit/compose.ts:20`, `:140-215`; `ManagementCockpitView.tsx:20-58` |
| Satz zu QS6-4 im Handbuch | korrigiert: Server-Lesepfade ohne Beträge, Exporte folgen mit QS6-5 | `src/lib/help-documentation.ts` (Rollen & Berechtigungen), `docs/BERICHT-QS6-4-ANALYSE.md` |
| Tests | `app-version` auf 2026-11-05, `help-documentation-version` auf 1.26.0 | `src/__tests__/lib/*.test.ts` |
| Lokal | docs:check und docs:project grün, Prettier grün, tsc ohne Fehler, Vitest `src/__tests__/lib` 70/70 Dateien (532 Tests), Handbuchtests 7/7 | Ausgaben in der Sitzung |
| CI | 15/15 | `gh pr checks 282` |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: Das Datum von 1.70.0 ist von 2026-11-04 auf 2026-11-05 geändert. `docs:check` verlangt, dass kein Kapitel neuer ist als der oberste CHANGELOG-Eintrag. Die Version bleibt wie entschieden 1.70.0. Soll stattdessen das Datum 04.11. bleiben (dann müsste das Kapitel auf 04.11. datiert werden, was nicht stimmt)?
- Abweichung: Neuer Branch und PR 282 statt PR 281, weil PR 281 schon gemergt war. Der lokale Branch `docs/2026-11-05-teilautomatik` ist gelöscht.
- Das Kapitel `management-cockpit` ist neu. L2-12 verlangt „Hilfe und Handbuch beschreiben den Bereich“; ein Cockpit-Kapitel fehlte bisher.
- Beobachtung, kein Auftrag: Das Beispiel R-07 beschreibt ein Projektrisiko, kein Datum im Cockpit. Das Kapitel sagt das ausdrücklich.
- Merge von PR 282 durch den Owner per REST. Kein Publish, kein Tag. Der Zeitüberlauf in BackendAdminDialog bleibt im Backlog.

Hygiene: 0 gemergte Remote-Branches, 9 offene PRs, davon 8 Drafts.

```yaml
Reifegrad: "L2-12 dokumentiert; Cockpit im Handbuch, Version 1.70.0 vorbereitet"
Projektstatus: "Golden Gate vor Publish; offen QS6-5 (A15), Audit K1/K2 (A16), R-07"
Offene_Fragen:
  - "Datum 1.70.0 auf 2026-11-05 bestätigen"
  - "Merge PR 282"
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
