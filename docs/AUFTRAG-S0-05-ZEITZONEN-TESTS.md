# Auftrag S0-05: Zeitzonen-abhängige Tests in `time-period.test.ts`

Stand: 2026-10-28 · Ziel: lokaler Claude Code · Priorität P3 · unabhängig von Lovable (kein Publish, keine Datenänderung)

## Befund (reproduziert am 2026-10-28)

| Zeitzone         | Ergebnis                  | Ursache                                                                                                                                                                                           |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UTC              | 20 von 20 Tests bestanden | Referenz der CI                                                                                                                                                                                   |
| Europe/Berlin    | 4 Fehlschläge             | Tests formatieren lokale Mitternacht mit `toISOString().slice(0, 10)` (UTC) und verschieben das Datum um einen Tag. Die Produktfunktionen (`toISODate`, lokale Getter) sind korrekt.              |
| America/New_York | 2 Fehlschläge             | `sumActivitiesInRange` und `buildChartBuckets` parsen Datumstexte `YYYY-MM-DD` mit `new Date(a.date)` als UTC-Mitternacht und vergleichen mit lokalen Grenzen. Das ist ein Produktverhalten (P3). |

Betroffene Tests (Berlin): `should_returnFixedHolidays_when_yearIs2025`, `should_computeEasterMonday_when_yearIs2024`, `should_excludeWeekendsAndHolidays_when_may2025`, `should_recreateRange_when_monthKeyRoundtripped`.
Betroffene Tests (New York): `should_sumActivitiesInsideRange_when_weekMode`, `should_produceFiveWeekdayBuckets_when_weekMode`.

## Anforderungen

1. Die Testdatei `src/__tests__/lib/time-period.test.ts` muss lokale Kalendertage zeitzonenunabhängig formatieren (lokaler Hilfsbaustein mit `getFullYear/getMonth/getDate`, kein `toISOString` für lokale Daten).
2. Die vier Berlin-Tests müssen unter `TZ=Europe/Berlin` und `TZ=UTC` bestehen.
3. Die Produktfunktionen `sumActivitiesInRange` und `buildChartBuckets` sollten Datumstexte `YYYY-MM-DD` als lokalen Kalendertag auswerten. Die Änderung muss minimal sein, Zeitstempel mit Zeitzonenangabe müssen unverändert funktionieren. Wenn dies mehr als eine kleine Änderung erfordert, ist es nicht umzusetzen, sondern als Befund zu melden.
4. Es darf keine Änderung an Produktlogik außerhalb von `src/lib/time-period.ts` geben.
5. `npm run docs:check`, `npm run docs:project`, Tests, `tsc`, `eslint` und Prettier müssen grün sein. Bekannte unabhängige Warnung in `dashboard.tsx` bleibt unverändert.

## Abnahmebeleg

- Testlauf der Datei unter den drei Zeitzonen `UTC`, `Europe/Berlin`, `America/New_York` (Befehl: `TZ=<zone> npx vitest run src/__tests__/lib/time-period.test.ts`), jeweils 20 von 20.
- Vollsuite unter `TZ=Europe/Berlin`: die vier bekannten Fehlschläge dürfen nicht mehr auftreten.

## Auftragstext für lokalen Claude Code

```text
Arbeite im Repo bmarnau/sysingdashboard nach CLAUDE.md. Lies zuerst docs/CURRENT-STATUS.md, docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml und docs/AUFTRAG-S0-05-ZEITZONEN-TESTS.md.

Aufgabe S0-05: Zeitzonen-abhängige Tests in src/__tests__/lib/time-period.test.ts beheben.
1. Branch fix/s0-05-time-period-tz von aktuellem main anlegen.
2. Fehler reproduzieren: TZ=Europe/Berlin und TZ=America/New_York npx vitest run src/__tests__/lib/time-period.test.ts (erwartet 4 bzw. 2 Fehlschläge).
3. Tests: lokale Kalendertage ohne toISOString formatieren (lokaler Hilfsbaustein).
4. Produkt (nur src/lib/time-period.ts, nur wenn klein): Datumstexte YYYY-MM-DD in sumActivitiesInRange und buildChartBuckets als lokalen Kalendertag auswerten; Zeitstempel mit Zonenangabe unverändert. Wenn nicht klein: nicht umsetzen, als Befund melden.
5. Prüfen: Datei unter TZ=UTC, Europe/Berlin, America/New_York je 20/20; npm run docs:check, docs:project, tsc, eslint, Prettier der geänderten Dateien.
6. Doku: Tracker (S0-05 status, fortschritt mit Beleg), CURRENT-STATUS, ENTWICKLUNGSTAGEBUCH.
7. Committen, pushen, mit git ls-remote --heads origin fix/s0-05-time-period-tz gegen den lokalen Commit prüfen. PR per REST gegen main, CI abwarten.
Nicht mergen und nicht veröffentlichen; Merge erfolgt nur auf ausdrückliche Anweisung. Keine Zugangsdaten in Dateien. Am Ende: Hygiene-Zeile (gemergte Remote-Branches, offene PRs, Drafts) und YAML-Block (Reifegrad, Projektstatus, Offene_Fragen, Roadmap).
```
