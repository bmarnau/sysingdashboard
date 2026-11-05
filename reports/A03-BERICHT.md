---
id: A03
titel: F-U7-03 und F-U7-04 Ursachenanalyse
status: erledigt
start: 2026-11-05T06:45+01:00
ende: 2026-11-05T05:52+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: e53f19bf
ci: "nicht gelaufen (kein PR), Head-SHA e53f19bf"
---

# A03 Bericht

## Ergebnis

F-U7-03: Der Projektstatus ist eine Eingabe (Standard `on_track`) und wird nie aus der Deadline abgeleitet. „Überfällig“ im Bericht wird aus der Deadline berechnet. Es fehlt eine Regel, die beides verbindet. Empfehlung: Variante A, ein Hinweis „Deadline überschritten“ (3 bis 5 h).
F-U7-04: Es liegt keine Rechte- oder RLS-Ursache vor. Die Daten liegen je Konto im Browser. alexa@ = Startdatei + Demodaten 2.2.0 (10/30/63), kiosk@ = Startdatei + Demodaten 2.1.0 (7/11/12).
Abgeleitet: kiosk@ lief vermutlich auf der veröffentlichten App 1.69.0 (gebaut vor Demodaten 2.2.0).
Vollbericht: `docs/BERICHT-F-U7-03-04.md` (Commit e53f19bf).

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Status Eingabe | Standard `on_track`, keine Ableitung | `src/components/dashboard/domain.ts:78` |
| P-101, P-103 | `on_track`, Deadline 2026-06-30 und 2026-07-15 | `src/data/dashboard.json:16-20`, `:40-44` |
| Fälligkeit berechnet | `due < today` → overdue | `src/lib/avkk/workspace.ts:111-116`, `:386` |
| Speicher je Konto | localStorage, Rückfall Startdatei 4/6/6 | `src/lib/store/dashboard-persistence.ts:38-40`, `:63-70` |
| Demodaten 2.2.0 | 6/24/57 | `buildDemoDataset()` auf 9ab42d15 |
| Demodaten 2.1.0 | 3/5/6 | `buildDemoDataset()` aus 148bafaa |
| Projektion | nur im Veröffentlichungsdialog gelesen | `src/routes/_authenticated/dashboard.tsx:172-177` |

## Offene Fragen, Risiken, Abweichungen

- Offene Frage an den Owner: Unter welcher Adresse wurde kiosk@ geprüft (Vorschau oder veröffentlichte App)?
- Offene Frage an den Owner: F-U7-03 Variante A, B oder C?
- Risiko: Abnahmen mit mehreren Konten sind nur vergleichbar, wenn Adresse, App-Version und Demodaten-Version gleich sind. Das betrifft auch EV-0005.
- Abweichungen vom Auftrag: keine. Für die Zählung wurde `buildDemoDataset()` lokal mit bun ausgeführt (reiner Code, kein Live-System).

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Golden Gate Testphase, U7-Befunde erklärt
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - Adresse der kiosk@-Prüfung?
  - F-U7-03 Variante?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
