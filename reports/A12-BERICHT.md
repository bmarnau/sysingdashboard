---
id: A12
titel: "Doku-Nachtrag: Entscheidungen 04. und 05.11., Aufräumregel ops/*"
status: erledigt
start: 2026-11-05T08:30+01:00
ende: 2026-11-05T06:10+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: 348bf775
ci: "nicht gelaufen (kein PR), Head-SHA 348bf775; docs:check, docs:project, Prettier lokal grün"
---

# A12 Bericht

## Ergebnis

Die Entscheidungen des Owners stehen jetzt in Tracker (`fortschritt`), `CURRENT-STATUS.md`, `ENTWICKLUNGSTAGEBUCH.md` und `BACKLOG.md`: Version 1.70.0, Verschiebung in ganzen Tagen, 2a/2b nach dem Publish, 2c als Datenauftrag mit Vorlage, Kiosk Weg A.
`ops/*` ist in `CLAUDE.md` (Regel 6) und `docs/GIT-AUFRAEUMEN.md` (GA-3 und Auftragstext) als nie zu löschen aufgenommen. `CLAUDE.md` verweist zusätzlich auf den Betrieb.
Neu ist `docs/BETRIEB-TEILAUTOMATIK.md` (Rollen, Branches, Zyklus als Mermaid, Grenzen, Berichtsformat, Erfahrungen).
Neue Dokumente sind in `docs/ARTEFAKTE.yaml` eingetragen (ART-08). Die Korrektur zu PR 46 lief bereits in A07.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Entscheidungen | 5 Punkte in Tracker und Status | Commit 348bf775, Tracker `fortschritt` 2026-11-05 |
| Backlog | 2a/2b mit DM-01 bis DM-14 nach dem Publish (Zeile Demodaten), gemeinsamer Ladeweg nach dem Publish | `docs/BACKLOG.md` |
| Aufräumregel | `ops/*` in CLAUDE.md und GA-3 | `git diff` |
| Prüfungen | docs:check „synchron“, docs:project „konsistent (2026-11-05)“, YAML gültig | lokal |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: `scripts/git-hygiene.mjs` (Liste `PROTECTED`, Zeile 16) kennt `ops/` nicht. Das ist Code, deshalb nicht geändert (A12: nur Doku). Weil Orphan-Branches nie in `main` enthalten sind, meldet das Skript sie trotzdem nicht als löschbar. Vorschlag: `/^ops\//` in einem kleinen Code-PR ergänzen.
- Abweichung: Den Betriebsprompt selbst gibt es nur beim Owner (nicht in Git, ART-09). `docs/BETRIEB-TEILAUTOMATIK.md` fasst ihn zusammen.
- Hinweis: `CLAUDE.md` wurde geändert. Lovable liest die Datei ebenfalls, nach dem Merge greift die Regel auch dort.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Doku des Tages vollständig bis A12
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - git-hygiene.mjs um ops/ ergänzen?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
