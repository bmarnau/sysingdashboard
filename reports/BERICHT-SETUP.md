---
id: SETUP
titel: Warteschlange für den Teilautomatikbetrieb einrichten
status: erledigt
start: 2026-11-05T05:30+01:00
ende: 2026-11-05T05:46+01:00
branch: ops/queue, ops/reports
pr: keiner (Orphan-Branches, kein Merge)
commit: "ops/queue 8bf15d68, ops/reports e0be4e52"
ci: entfällt (keine CI auf ops/*)
---

# Bericht Einrichtung

## Ergebnis

Beide Orphan-Branches sind angelegt, gepusht und mit dem Remote abgeglichen.
Archiv `ops-queue-2026-11-05c.zip` in ein leeres Scratch-Verzeichnis entpackt, alle 15 YAML-Dateien gültig, INDEX listet 14 Aufträge, keine Zugangsdaten.
Die Einrichtung lief zunächst nach dem ersten Auftrag (Chat). Der zweite, genauere Auftrag wurde mit je einem Folge-Commit nachgezogen, ohne Force-Push.
A01 war zu diesem Zeitpunkt schon erledigt, A02 lief.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| YAML-Prüfung | 15 von 15 gültig (strict, uniqueKeys), INDEX 14 Aufträge, 0 Statusabweichungen zwischen INDEX und Einzeldateien, keine Datei ohne Indexeintrag | `yaml` 2.x per Node, Ausgabe `gueltig 15/15; INDEX auftraege=14` |
| Status laut INDEX | bereit: A01 A02 A03 A10 A04 A07 A11 A12 A13 A14; geplant: A05 A08 A09 A06 | `queue/INDEX.yaml` |
| Zugangsdaten | keine; einziger Treffer ist das Verbot in A09 Zeile 12 | `grep -rniE 'passw\|token\|secret\|api[_-]?key\|sk-\|sb_\|eyJ\|PRIVATE'` |
| ops/queue Commit 1 | f22bced4 „ops(queue): Warteschlange anlegen (INDEX und A01 bis A14)“, Autor Bernd Marnau (bmarnau) | `git log` |
| ops/queue Commit 2 | 8bf15d68 „ops: Warteschlange A01-A14 einrichten“, README nach `queue/README.md`, Branch enthält nur `queue/` | `git ls-files` |
| ls-remote ops/queue | `8bf15d685973652844d90234ecc21b760b65d77e	refs/heads/ops/queue` | gleich lokalem HEAD 8bf15d68 |
| ops/reports | be6c35fc (Anlage), 72134063 (A01 Start), 44a803bd (A01 erledigt), e0be4e52 (Felder umgestellt) | `git log` |
| ls-remote ops/reports vor diesem Bericht | `e0be4e52919a4d012e5fdd32fe24a92e8cdb8776	refs/heads/ops/reports` | gleich lokalem HEAD |

## Offene Fragen, Risiken, Abweichungen

- Abweichung 1: Der erste Auftrag nannte A01 bis A10. Das Archiv enthielt A01 bis A14, übernommen wurden alle 14 (der zweite Auftrag bestätigt das).
- Abweichung 2: `README.md` lag zunächst im Stamm, jetzt unter `queue/README.md`. Die Historie behält den ersten Commit (kein Force-Push).
- Abweichung 3: `laufender_auftrag` steht nicht auf „keiner“, weil A02 zum Zeitpunkt der Umstellung lief. Die erste Fassung hatte `aktueller_auftrag: keiner` (be6c35fc).
- Abweichung 4: Die ersten Zeitstempel in STATUS.yaml waren UTC (Git Bash ohne Zeitzonendaten), seitdem Europe/Berlin (+01:00).
- Hinweis: Der Betriebsprompt verbietet Schreiben auf ops/queue. Die beiden Commits dort stammen aus dem ausdrücklichen Einrichtungsauftrag. Danach schreibt diese Session nicht mehr auf ops/queue.
- Hinweis: A06 bleibt geplant (Abhängigkeit „PR 280 gemergt“ ist inzwischen erfüllt, `main` 9ab42d15, aber der Planer muss den Status setzen).

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Teilautomatikbetrieb eingerichtet, Schleife läuft
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - A06 freigeben (PR 280 ist gemergt)?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
