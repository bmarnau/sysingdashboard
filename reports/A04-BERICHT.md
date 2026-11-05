---
id: A04
titel: "Nachweisregister: EV-0001 bis EV-0004 übernehmen"
status: erledigt
start: 2026-11-05T07:20+01:00
ende: 2026-11-05T05:55+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: 7d4eb3b2
ci: "nicht gelaufen (kein PR), Head-SHA 7d4eb3b2"
---

# A04 Bericht

## Ergebnis

EV-0001 bis EV-0004 aus dem Owner-Entwurf (`Downloads/NACHWEISE.yaml`, 2026-11-03) stehen jetzt in `docs/NACHWEISE.yaml`, im Format von EV-0005. YAML gültig, Prettier sauber.
Alle drei PRs sind gemergt, CI am Head jeweils 15/15. EV-0004 bleibt „nicht bestanden“.
Eine Abweichung: EV-0002 hat das Datum 2026-11-02, gemergt wurde PR 272 aber am 2026-11-03. Das Datum ist nicht angeglichen, sondern im Feld `abweichung` vermerkt.

| Eintrag | Beleg | Befund |
| --- | --- | --- |
| EV-0001 | PR 273, Merge 2d3299ab, 2026-11-03T04:52Z, CI 77efe750 15/15 | stimmt |
| EV-0002 | PR 272, Merge faf9cfdb, 2026-11-03T04:05Z, CI 068fac3a 15/15 | Datum im Entwurf 2026-11-02 weicht ab |
| EV-0003 | PR 271 (Doku-PR), Merge b558655a, 2026-11-02T14:19Z, CI 317098de 15/15 | stimmt; die eigentliche Abnahme ist durch Screenshots im Chat belegt, nicht in Git |
| EV-0004 | kein Beleg (Probe nicht durchgeführt) | unverändert „nicht bestanden“ |

## Offene Fragen, Risiken, Abweichungen

- Offene Frage an den Owner: EV-0002 auf 2026-11-03 setzen?
- Hinweis: EV-0005 sagt noch „der Server liefert Beträge weiter aus (QS6-4 offen)“. Das widerspricht A01. Nicht geändert, weil das außerhalb von A04 liegt. Vorschlag: nach der Entscheidung zu QS6-4 korrigieren.
- Abweichung: Bei EV-0001 ist eine zweite Einschränkung ergänzt, die auf den A01-Bericht verweist. Das Ergebnis „bestanden“ bleibt.
- Abweichung: Feldnamen an EV-0005 angeglichen (`grenzen` → `einschraenkungen`, `ort` → `beleg`, zusätzlich `titel`, `umgebung`, `version`).

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Nachweisregister EV-0001 bis EV-0005 vollständig
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - EV-0002 Datum?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
