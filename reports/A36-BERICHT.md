---
id: A36
titel: hourlyRate aus der gemeinsamen Projektion entfernen? Analyse und Plan (QS6-4 Härtung)
status: erledigt
start: 2026-11-07T05:10+01:00
ende: 2026-11-07T05:25+01:00
branch: keiner
pr: keiner
commit: keiner (nur Plan)
ci: entfällt
---

# A36 Bericht

## Ergebnis

1. `hourlyRate` steht auf dem Veröffentlichungsweg nur im Server-Schema, im Client-Payload und in einer Client-Prüfung. Die Datenbank kennt es nicht.
2. `bsf02c_publish_shared_projection_snapshot` und `shared_activity_projection` haben keine Satzspalte. Option B (Spalte per Datenauftrag) ist damit gegenstandslos; nur eine lesende Live-Gegenprobe bleibt offen.
3. Option A braucht fünf Dateien; ohne Verengung von `SharedDataMigrationInput` bricht die Typprüfung.
4. Keine Dateiüberschneidung mit PR 283 und A27 (nur Doku-Dateien, gehören ins Tagesbündel).
5. Empfehlung Option A nach Freigabe, Aufwand 3 h, Publish-Risiko niedrig, kein Gate. Plan: `A36-PLAN.md`.

| Punkt                     | Beobachtung                                                                    | Beleg                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Schema                    | Pflichtfeld `hourlyRate` im `activitySchema`, `z.object` ohne `.strict()`      | `src/lib/customer-data-runtime/shared-projection.schema.ts:71-82`, `:79`; `package.json:133` |
| Server-Funktion           | geparste Activities gehen als `Activity[]` in den Migrationsplan               | `src/lib/customer-data-runtime/shared-projection.functions.ts:97`, `:100-106`; `src/lib/customer-data/types.ts:87`; `src/lib/customer-data/migration.ts:69` |
| Client-Payload            | Typ, Prüfung „Ungültiger Stundensatz“, Zuweisung                               | `src/lib/customer-data/publish-to-team.ts:83`, `:197-203`, `:290`                             |
| Adapter                   | Satz wird verworfen, nicht im `source_hash`                                    | `src/integrations/supabase/shared-projection-adapter.ts:92-117`                               |
| Lesepfad                  | Mapping ohne Satz                                                              | `src/integrations/supabase/shared-projection-adapter.ts:185-202`; `src/integrations/supabase/types.ts:1126-1148` |
| RPC                       | INSERT/UPDATE nur `duration_hours`, `billable`, `billing_status`               | `supabase/migrations/20260929053733_bsf03e_p3b_due_projection.sql:7`, `:295-302`, `:318-323` |
| Tabelle                   | keine Satz- oder Betragsspalte                                                 | `supabase/migrations/20260902031900_6d4075e1-9916-42fd-8076-31420c84c71c.sql:101-145`        |
| Gegenprobe                | `grep -rni hourly supabase/`: 0 Treffer                                        | Lauf 2026-11-07 auf `origin/main` 7dc4699d                                                    |
| Tests                     | Fixtures nutzen lokales `Activity` (Obermenge), bleiben gültig; 2 neue Tests   | `src/__tests__/lib/publish-to-team.test.ts:94`, `:188`, `:215`; `shared-projection-contract.test.ts:39`; `shared-projection-runtime.test.ts:45` |
| Export, Import, Demodaten | nicht betroffen, bleiben lokal bzw. bei PR 283                                 | `src/lib/json-schema.ts:112`, `:133`; `src/lib/demo-data/dataset.ts:494-589`; `gh pr view 283` (23 Dateien) |
| Abgrenzung A27            | A27 ändert `ActivityDialog.tsx` und `dashboard.tsx`, Option A nicht            | `queue/A27.yaml` (ops/queue)                                                                  |

## Offene Fragen

- Freigabe des Owners für Option A (Draft-PR) steht aus; ohne Freigabe keine Umsetzung.
- Live-Spaltenliste von `shared_activity_projection` ist nicht geprüft (zu belegen, lesende Gegenprobe durch den Owner).
- Versionsversatz Client/Server beim Lovable-Publish: ob Server-Funktion und Bundle atomar ausgeliefert werden, ist zu belegen.
- Abweichung vom Auftrag: Ablage unter `out/A36-PLAN.md` statt `reports/A36-PLAN.md` (Vorgabe des Koordinators); Übernahme nach `reports/` durch den Planer.
- Option B wurde nicht als Spaltenänderung geplant, weil keine Spalte existiert.

## Eigene Ideen

- Im Server-Schema allgemein `.strict()` erwägen, aber erst nach einer Übergangsfrist; heute würde es alte Clients brechen. Alternativ ein Test, der die Schlüsselmenge des geparsten Payloads gegen eine Positivliste prüft (Datensparsamkeit als Vertrag).
- Eigenen Typ `SharedActivityInput` in `src/lib/customer-data/types.ts` statt `Omit<Activity, …>` einführen; dann fällt jedes künftig neu hinzukommende lokale Feld nicht still in den Server-Vertrag.
- Contract-Test, der Zod-Schema und `activityPayload` des Adapters vergleicht: Felder im Schema, die der Adapter nicht schreibt, sollten auffallen.
- Gleiche Prüfung für `client` und `engineerId` an Projekt und Arbeitspaket wiederholen (Datensparsamkeits-Inventur des gesamten Publish-Vertrags).
- Die Option-A-Änderung mit A27 terminlich koppeln, aber in getrenntem PR, damit 283 nicht wächst.

## Abschluss

- Lieferungen: `A36-PLAN.md`, dieser Bericht.
- Grenze eingehalten: kein Merge, kein Publish, keine Datenänderung, keine Datei im Repository geändert, keine Zugangsdaten.

Hygiene: 0 gemergte Remote-Branches, 5 offene PRs, davon 4 Drafts.

```yaml
Reifegrad: Plan mit Zeilenbelegen; Option A umsetzungsreif, Option B gegenstandslos laut Repository
Projektstatus: Publish No-Go (R-07); QS6-4 durch D4 geschlossen, A36 ist optionale Härtung ohne Gate
Offene_Fragen:
  - Freigabe Option A durch den Owner?
  - Live-Gegenprobe Spaltenliste shared_activity_projection (zu belegen)
  - Atomare Auslieferung Client/Server beim Lovable-Publish (zu belegen)
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
