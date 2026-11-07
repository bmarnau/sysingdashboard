---
id: A23
titel: 'Doku-Nachtrag 2026-11-06: PR-Stand, Warteschlange, #278 im Tagesbündel'
status: erledigt
start: 2026-11-07T04:58+01:00
ende: 2026-11-07T05:20+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286 (Draft)
commit: 56c9760607219b66892d947083737f6bd0b33585 (auf fc78430d)
ci: 15/15 grün, Head 56c97606, MERGEABLE
---

# A23 Doku-Nachtrag 2026-11-06

## Ergebnis

1. CURRENT-STATUS: Überschrift auf 2026-11-07, Spanne der Warteschlange A01 bis A37 (statt A01 bis A14), Ereignisse vom 06.11. als eigener Absatz nachgetragen.
2. Alle PR-Aussagen im Abschnitt „Aktueller Wiederanlaufpunkt“ (30 Nummern) per `gh pr view` geprüft; 19 überholte Angaben mit „(inzwischen gemergt/geschlossen, Stand 2026-11-06)“ ergänzt, nichts gelöscht.
3. EV-0007 in `docs/NACHWEISE.yaml`: Vorschauprüfung PR 278 durch den Owner, Ergebnis teilweise (vier Punkte bestanden, drei ungeprüft).
4. GA-2 in `docs/GIT-AUFRAEUMEN.md` mit aktuellen Beispielen; Backlog, Tracker, Entwicklungstagebuch, Publish-Gate-Bericht (G19 teilweise) fortgeschrieben.
5. `docs:check`, `docs:project`, Prettier ohne Befund; CI 15/15.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| PR 275, 276, 280 | im Status „nicht gemergt“, tatsächlich gemergt 03.11. / 03.11. / 05.11. | `gh pr view`: bfd76ff4, 44b5ebf5, 9ab42d15 |
| PR 262, 264, 266, 267, 269, 272, 253 | Absätze U1 bis U6 und S0-06 sagten „PR offen, nicht gemergt“ | Merge 814c9cd6, 755614ad, 7ab63132, c24c4a5a, 2be2d6ce, faf9cfdb (272), 253 gemergt |
| PR 281, TDF-PR 46 | „PR noch offen“ bzw. „offen“ | 281 gemergt 05.11. 05:37Z; TDF 46 gemergt 03.11. 10:38Z |
| PR 222, 226, 231, 233, 234 | als offen/Drafts geführt | geschlossen 06.11. (222: 05:02Z), ohne Merge |
| PR 278 | gemergt 06.11. 05:11Z (`02cb3d28`), Head 4aad97a8 CI 15/15 | `gh pr view 278` |
| PR 284 | gemergt 06.11. 04:14Z (`34f20a3`) | `gh pr view 284` |
| Offene PRs | 286, 283, 282 (Drafts), 155, 124 (Draft) | `gh pr list` 07.11. |
| G19 | teilweise belegt: EV-0007 | Owner-Screenshots im Chat (nicht in Git), Angaben laut Auftrag A23 |

## Offene Fragen

- Abweichung: Die Screenshots der Vorschauprüfung liegen nicht in Git; EV-0007 stützt sich auf die Angaben im Auftrag. Der Vorschau-Stand (Commit) wurde in der Prüfung nicht festgehalten.
- Abweichung: Die Überschrift trägt 2026-11-07 statt 2026-11-06, weil der Auftrag am 07.11. ausgeführt wurde und die Statuskorrektur fc78430d bereits vom 07.11. ist.
- Offen für G19: Netzwerk-Reiter (Stylesheets aus `/vendor/react-pdf/`), Formularfelder, Link. Vorschlag: bei der nächsten Vorschau-Sitzung in fünf Minuten nachholen.
- Die älteren Abschnitte unterhalb von „Aktueller Wiederanlaufpunkt“ (vor 2026-10-28) wurden nicht geprüft; der Auftrag nennt nur den aktuellen Abschnitt.

## Eigene Ideen

- A24 (automatische Prüfung) lohnt sich: 19 von 30 PR-Aussagen waren überholt. Ein kleines Skript `scripts/check-status-prs.mjs` könnte Muster wie „PR NNN … nicht gemergt“ finden und gegen `gh api` prüfen (nur Warnung, nicht in der Pflicht-CI).
- CURRENT-STATUS wächst nach oben; ein festes Feld „Offene PRs (Stand …)“ ganz oben, das bei jedem Doku-Auftrag ersetzt wird, würde die Korrekturvermerke überflüssig machen.
- Für Vorschauprüfungen eine Mini-Vorlage (Commit-SHA, Uhrzeit, Prüfpunkte) im Chat bereitstellen, damit EV-Einträge ohne Nacharbeit entstehen.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 5 offene PRs, davon 4 Drafts.

```yaml
Reifegrad: Golden Gate in Vorbereitung, 3 von 22 Publish-Gates erfüllt, G19 teilweise
Projektstatus: Doku auf Stand 2026-11-07, PR 286 CI 15/15; Publish No-Go (R-07, R-14)
Offene_Fragen:
  - G19 Restpunkte (Netzwerk, Formularfelder, Link)
  - Merge-Freigabe PR 286
Roadmap:
  Sprints_bis_BSF: nicht belegt (Neubewertung A26 läuft)
  Sprints_bis_MVP: nicht belegt
```
