---
id: PR-BESTAND
titel: Bestand offener Pull Requests bewerten
status: erledigt
start: 2026-11-06T05:18+01:00
ende: 2026-11-06T05:34+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286 (Draft)
commit: 2a735c20
ci: läuft
---

# PR-Bestand 2026-11-06

Grundlage: `origin/main` `34f20a3`, nur lesend. Ausführlicher Bericht: `BERICHT-PR-BESTAND-2026-11-06.md`.

## Ergebnis

1. #226, #231, #233, #234 (L2-Cockpit) und #222 (QS-06) sind vollständig durch PR 262, 264, 266, 267, 269, 272 und 273 ersetzt; sie sollten geschlossen werden.
2. Nur auf den alten Branches: zwei Planungsdateien (`docs/superpowers/plans/2026-10-27-l2-cockpit-p2b.md`, `...-p3.md`) und überholte Doku-Commits.
3. #278 ist konfliktfrei; Merge nach Prüfung in der Lovable-Vorschau, Plugin `sysing:ensure-css-config` ist auf `main` vorhanden (`vite.config.ts` Zeilen 42 bis 54, 70 bis 81).
4. #155 und #124 brauchen eine Entscheidung des Owners.
5. #284 ist bereits gemergt (Merge-Commit `34f20a3`); #282 und #283 sind Drafts mit CI 15/15 und je einem Konflikt in `docs/CURRENT-STATUS.md`.

## Beobachtungen

| Punkt | Beobachtung                                                                                                                     | Beleg                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| #278  | mergen nach Prüfung (1.5 h): konfliktfrei, 23 hinter `main`, CI 15/15 am alten Head; Vorschau-Nachweis fehlt                    | Commit `281c665`, `docs/BERICHT-2026-11-04-PR278-LOKALTEST.md`, `git merge-tree` Exit 0 |
| #234  | ersetzt und schließen (0.25 h): Code und Tests auf `main`, dort weiterentwickelt; 9 Konfliktdateien                             | PR 269, PR 272, PR 273; Dateivergleich 16 von 26 identisch                              |
| #233  | ersetzt und schließen (0.25 h): Draft hat noch den UTC-Stichtag, `main` hat `berlinDate`                                        | PR 266, PR 267; `management-cockpit-avkk-adapter.ts`                                    |
| #231  | ersetzt und schließen (0.25 h): Commit `f8199b7` patch-gleich auf `main`                                                        | PR 264; `git cherry` mit `-`                                                            |
| #226  | ersetzt und schließen (0.1 h): Commit `53a81f1` patch-gleich auf `main`                                                         | PR 262; `git cherry` mit `-`                                                            |
| #222  | ersetzt und schließen (0.1 h): Merge-Ergebnis hat denselben Tree wie `main` (`5a39cac`)                                         | PR 273; `git merge-tree --write-tree`                                                   |
| #155  | Entscheidung des Owners nötig (3 h aktualisieren, 0.1 h schließen): kein Draft, 319 hinter `main`, 3 Konflikte, neues Doku-Gate | `ci.yml`, `package.json`, `docs/ENTWICKLUNGSTAGEBUCH.md` im `git merge-tree`            |
| #124  | Entscheidung des Owners nötig (1.5 h aktualisieren, 0.1 h schließen): Draft, 1082 hinter `main`, konfliktfrei, nur neue Dateien | `docs/BSF-CURRENT-PRIORITIES.md` Zeile 265                                              |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: #284 war im Auftrag als offen genannt, ist aber gemergt (2026-11-06T04:14Z). Neue Doku des Tages braucht einen neuen Branch und PR.
- Offen: Planungsdateien P2b und P3 nach `main` übernehmen oder nur auf den Branches belassen?
- Offen: #155 noch gebraucht (nach Kiosk Weg A)? Driftcheck auf aktuellem `main` nicht geprüft.
- Offen: #124 als Idee nach `main`, offen lassen oder schließen?
- Offen: Reihenfolge #282 und #283 (#283 enthält den Commit von #282).
- Risiko: #278 ist nur lokal geprüft; der Fehler `reading 'devSourcemap'` ist lokal nicht nachstellbar. Konto und PDF mit Formularfeldern für die Vorschau sind nicht benannt.
- Das Schließen der PRs ist nicht Teil dieses Leseauftrags und erfolgt durch den Owner.

## Hygiene

Gemergte Remote-Branches: 0 (laut `node scripts/git-hygiene.mjs`, ohne `--fix`; lokal löschbar: `docs/2026-11-06-aufraeumen`) · offene PRs: 10 · Drafts: 9.

```yaml
Reifegrad: "Golden Gate in Testphase; L2 U1 bis U7 auf main, L2-12 (PR 282) und QS6-5 (PR 283) als Draft offen"
Projektstatus: "Publish No-Go (R-07); PR-Bestand bewertet, 5 PRs als ersetzt erkannt, 1 PR mergefähig nach Vorschau-Prüfung, 2 PRs zur Entscheidung"
Offene_Fragen:
  - "Planungsdateien P2b und P3 nach main übernehmen?"
  - "PR 155 weiterführen oder schließen?"
  - "PR 124 nach main, offen lassen oder schließen?"
  - "Reihenfolge PR 282 und PR 283?"
  - "Konto und PDF mit Formularfeldern für die Vorschau-Prüfung von PR 278?"
Roadmap:
  Sprints_bis_BSF: "nicht neu bewertet"
  Sprints_bis_MVP: "nicht neu bewertet"
```
