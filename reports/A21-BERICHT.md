---
id: A21
titel: "Publish-Gate-Bericht: alle Bedingungen vor dem ersten Publish mit Beleg"
status: erledigt
start: 2026-11-06T06:34+01:00
ende: 2026-11-06T06:43+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: 5d40ff32
ci: "läuft (Head 5d40ff32)"
---

# Bericht A21


Stand: 2026-11-06T06:38+01:00 · nur lesen, keine Freigabe · Grundlage: origin/main 02cb3d28

## Ergebnis

1. Von 22 Gates ist 1 erfüllt, 4 liegen in PRs, 1 ist extern, 16 sind offen.
2. Kritischer Pfad: R-14 (zweite Umgebung, Export, Restore-Probe), dann Rücknahme-Beleg, Go, Publish, N1–N5 und Tag v1.70.0.
3. Neu vor dem Publish: F-QS6-ENG-01/02 sind in keinem PR behoben. Der CHANGELOG 1.70.0 auf `main` widerspricht F-QS6-ENG-01.
4. PR 282 und 283 haben einen Konflikt (`docs/CURRENT-STATUS.md`), PR 285 und 287 sind mergebar, beide mit CI 15/15.
5. Dauer (Schätzung): Claude Code 16/25/40 h, Owner 11/21/40 h, Kalender 1/3/6 Wochen.

| Punkt         | Beobachtung                                                                                      | Beleg                                  |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| main          | `02cb3d28` = Merge PR 278, CI und Security success                                               | `gh run list` 42166954669, 42166954701 |
| Tags          | letzter Tag v1.65.0, v1.66 bis v1.70 fehlen                                                      | `git ls-remote --tags origin`          |
| PR 282 / 283  | Draft, CI 15/15, `CONFLICTING` nur `docs/CURRENT-STATUS.md`                                      | `gh pr view`, `git merge-tree`         |
| PR 285 / 287  | Draft, `MERGEABLE`, `BEHIND`, CI 15/15                                                           | `gh pr view`, `gh pr checks`           |
| PR 286        | Draft, `MERGEABLE`, CI 2 pass, 1 pending                                                         | `gh pr checks 286`                     |
| PR 155 / 124  | 155 `CONFLICTING`, 124 `MERGEABLE`; kein Publish-Bezug                                           | `gh pr view`                           |
| Lovable-Stand | neuester Sync-Branch `lovable-sync-1793857259` (Basis `fd7878f9`) nur `types.ts` +5, kein Broker | `git diff`, `client.ts:63`             |
| R-14          | EV-0004 nicht bestanden, keine Testumgebung                                                      | `docs/NACHWEISE.yaml:45-55`            |
| Rücknahme     | Lovable-Versionsrücksetzung „zu belegen“                                                         | `docs/NOTFALL-HANDBUCH.md:53`          |
| PR 278        | gemergt, Vorschauprüfung ohne Nachweis                                                           | `docs/NACHWEISE.yaml` (kein EV)        |
| TD-01         | Sichtprüfung 28.10. belegt, Paket `preview_verified: no`                                         | Tracker `:1111`, `:298`                |

## Abweichungen und Fragen

- Der Auftrag nennt für den Checkout `origin/main` 34f20a3. Inzwischen steht `origin/main` auf `02cb3d28` (PR 278), der Tagesbündel-Branch liegt dahinter.
- Widerspruch im Standard: `STANDARD-WIEDERHERSTELLBARKEIT.md:59` verlangt S1 bis S6 vor dem Publish, `:194` nur mindestens S4.
- Die Merge-Checkliste auf `main` nennt Tag v1.69.0, die Änderung auf v1.70.0 liegt nur in PR 282.
- Für K1/K2 und den Kiosk-Datenauftrag ist keine Gate-Entscheidung des Owners belegt.
- Die Nachfrage beim Lovable-Support vom 05.11. ist nicht belegt.
- Fragen an den Owner: Umfang R-14, F-QS6-ENG Fragen 1–5, QS6-4 schließen, zod, `types.ts`-Ausnahme, Gate-Charakter von K1/K2 und Kiosk, TD-01, Nachweis PR 278, Erwartung N4.

## Abschluss

- Stichprobe durch Claude Code: kein Tag nach v1.65.0 (`git tag --list`); `CHANGELOG.md:18` (main) und `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:59` gegen `:194` wie beschrieben.
- Grenze eingehalten: keine Freigabe, kein Tag, kein Publish.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: Publish-Gates vollständig erfasst
Projektstatus: Publish No-Go; 16 von 22 Gates offen, kritischer Pfad R-14
Offene_Fragen:
  - Umfang R-14 (S1 bis S6 oder S1 bis S4), zweite Umgebung, TeamDrive
  - F-QS6-ENG-01/02 in PR 283 oder eigenes Paket
  - QS6-4 schließen, zod-Entscheidung, Ausnahme types.ts +5
  - Sind K1/K2 und der Kiosk-Datenauftrag Gates?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
