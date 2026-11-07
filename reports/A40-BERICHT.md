---
id: A40
titel: "Entscheidungen 2026-11-07 ins Git: Gate G24, bm@-Restrisiko, R-04, Folgepunkte"
status: erledigt
start: 2026-11-07T07:52+01:00
ende: 2026-11-07T08:12+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286
commit: 3a921e20
ci: docs:check/docs:project grün; Draft 286
---

# A40-Bericht

Grundlage: Auftrag `queue/A40.yaml` (`origin/ops/queue`), Anlage `queue/anlagen/RP-02-ergebnis-2026-11-07.md` (Teile G und H selbst geprüft), `reports/A38-BERICHT.md` (`origin/ops/reports`), Worktree `wt-a40` auf Tagesbündel `0abc7662`. Nur Doku, nichts committet. Quelle aller Entscheidungen: Owner 2026-11-07, Planer-Auftrag A40.

## Ergebnis

1. G24 „RLS-Invariante vor Publish belegt“ ist als Muss-Gate in Gate-Bericht (Nachtrag, Tabelle, YAML) und Publish-Plan (D6, P4, PP-11, `muss_gates`) eingetragen, Stand **erfüllt** laut RP-02 vom 2026-11-07, **gültig bis 2026-11-14**.
2. G20 ist Folgepunkt nach dem Publish; Restrisiko bm@ als RA-02 (Nachfrist 30 Tage nach dem Publish) in `RISIKOREGISTER.yaml` und `.md`.
3. Neue Zählung: 23 geführte Gates, davon 22 vor dem Publish: **7 erfüllt, 2 in PR, 1 extern, 12 offen**; 1 Folgepunkt (G20); G23 Vorschlag, nicht gezählt. Muss-Gates im Publish-Plan: 15, davon 4 erfüllt, 2 in PR, 9 offen.
4. R-04: zweite Vertrauensperson als Rolle Familie/Lebenspartner in Zugangsübersicht, Notfallhandbuch (Lücke 2, Kontenregel 1) und Risikoregister; kein Name, Umschlag und Zugang offen, ZN-18 (kiosk@) offen.
5. Backlog: QS-01 C′ vor L8 (kein Gate), PR 155 und PR 124 nach dem Publish, A07 nach A39, Abschnitt „Ergänzung 2026-11-07“; R-07/R-10 unverändert.

| Punkt                     | Beobachtung                                                                                                                                                                                         | Beleg                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Prüfung RP-02 für G24     | Teil H: „RLS ist auf allen 25 Tabellen aktiv“; `anon` nur auf den 9 Tabellen der Liste (SELECT/INSERT/UPDATE/DELETE). Teil G: 65 Policies, „Rollen sind durchgehend `{authenticated}`“; J2 nennt 25 Tabellen | Anlage Teil G (Kopf, 65 Zeilen), Teil H (Kopf und Tabellenzeile `anon`), Teil J2                                     |
| Herleitung Zählung        | A28: 22 Gates, 6/2/1/13. G20 offen → Folgepunkt (offen 12). G24 neu erfüllt (erfüllt 7, Gates 23). G23 nicht in Tabelle                                                                              | `docs/PUBLISH-GATE-BERICHT.md` Nachtrag „Ergänzung A40“, YAML `zaehlung_nachtrag_a40_2026_11_07`                      |
| Muss-Gates Publish-Plan   | Liste vorher 14 (G20 war nie Muss-Gate im Plan), jetzt 15 mit G24; `folgepunkte_nach_publish` mit G20                                                                                                | `docs/PUBLISH-PLAN.md` Abschnitt 3                                                                                   |
| RA-02                     | Owner, 2026-11-07, Gate G20, Befristung 30 Tage nach dem Publish, Ende mit Weg B oder neuer Entscheidung                                                                                            | `docs/RISIKOREGISTER.yaml` `risikoakzeptanzen`, `docs/RISIKOREGISTER.md` Abschnitt 5                                 |
| R-04                      | Rolle benannt, Umschlag und Zugang offen; YAML-Block `zweite_vertrauensperson`; ZN-03, ZN-18 mit Stand                                                                                              | `docs/ZUGAENGE-UND-NOTFALLKONTO.md` Abschnitte 3, 5, 6; `docs/NOTFALL-HANDBUCH.md` Abschnitt 6 Lücke 2, Abschnitt 7 |
| Backlog                   | QS-01 C′, G24, Anzeigemodus bm@, PR-Bestand ergänzt; neuer Abschnitt; fehlerhafte Strichzeile aus A38 entfernt                                                                                      | `docs/BACKLOG.md`                                                                                                    |
| Prettier                  | `--write` und `--check` auf allen 7 Dateien ohne Befund (über `node C:/dev/sysingdashboard/node_modules/prettier/bin/prettier.cjs`)                                                                | Lauf 2026-11-07 08:10 +01:00                                                                                         |
| YAML                      | `RISIKOREGISTER.yaml` und YAML-Blöcke in Gate-Bericht, Publish-Plan, Zugangsübersicht mit `js-yaml` geladen                                                                                         | Lauf 2026-11-07 08:11 +01:00                                                                                         |

## Offene Fragen

- G24 verfällt am 2026-11-14; der Publish liegt laut Plan frühestens in KW 48. RP-02 G und H muss daher in P4 wiederholt werden (Owner, ca. 0,5 h). Ein eigener Kurz-Datenauftrag nur für G und H wäre handlicher als die volle RP-02 (siehe Eigene Ideen).
- RP-02 H fragt nur vier Tabellenrechte ab; TRUNCATE, REFERENCES, TRIGGER sind für G24 nicht Kriterium (A38 B5, RP-02b).
- Abweichung: Der Auftrag nennt „G20 von Muss auf Folgepunkt“. Im Publish-Plan stand G20 nie in `muss_gates`; im Gate-Bericht gab es keine Muss-Spalte. Umgesetzt als neuer Stand „Folgepunkt“ im Gate-Bericht und als `folgepunkte_nach_publish` im Plan.
- Abweichung: `npx --prefix C:/dev/sysingdashboard prettier` fand Prettier nicht (Windows); Prettier stattdessen direkt über `node …/prettier.cjs` aus dem Hauptrepo aufgerufen, ohne Junction.
- Abweichung: In `docs/BACKLOG.md` stand eine Zeile aus A38, die nur aus Strichen bestand (vermutlich eine versehentlich übernommene Tabellen-Trennzeile); sie ist entfernt.
- Tracker, CURRENT-STATUS und Entwicklungstagebuch nicht geändert (Vorgabe); Texte in `A40-TEXTE.md`. `docs:check` und `docs:project` laufen in der Hauptsitzung.
- R-07/R-10 (`stand_support`) unverändert; Support-Antwort zu den leeren Migrations-Statements offen, Owner wartet bis Montag 2026-11-09.

## Eigene Ideen

- RP-02-GH als festen Kurz-Datenauftrag (nur Teile G und H, drei SELECT-Abfragen) in `docs/DATENAUFTRAG-RESTORE-PROBE.md` oder einer eigenen Datei ablegen, damit die Wiederholung für G24 in P4 in wenigen Minuten läuft und das Ergebnis maschinell gegen die 9er-Liste geprüft werden kann.
- `gueltig_bis` als Feld im YAML-Block des Gate-Berichts generell einführen und in `docs:check` prüfen (abgelaufener Beleg ⇒ Stand nicht „erfüllt“). Passt zum Backlog-Punkt „Gate-Zählung aus dem YAML-Block in docs:check“ (A26).
- Den CI-Vertragstest „RLS 25/25, keine Policy ohne `TO authenticated`“ gegen `supabase/schema/public-schema.sql` vor C′ einführen; er ersetzt den Live-Beleg nicht, verhindert aber, dass eine neue Migration die Invariante bricht.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 4 offene PRs, davon 3 Drafts.

```yaml
Reifegrad: Doku-Stand der Owner-Entscheidungen 2026-11-07 vollständig im Worktree; G24 belegt bis 2026-11-14
Projektstatus: Publish weiterhin No-Go (R-07); 22 Gates vor dem Publish, 7 erfüllt, 2 in PR, 1 extern, 12 offen; G20 Folgepunkt
Offene_Fragen:
  - Wiederholung RP-02 G und H in P4 (Beleg verfällt 2026-11-14)
  - Support-Antwort R-07/R-10 (Owner wartet bis 2026-11-09)
  - Notfallumschlag und Zugang der Vertrauensperson, Bestätigung ZN-18
  - G23 (A29) weiter ohne Owner-Entscheidung
Roadmap:
  Sprints_bis_BSF: unbekannt
  Sprints_bis_MVP: unbekannt
```
