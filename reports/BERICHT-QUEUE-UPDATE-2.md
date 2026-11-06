---
id: QUEUE-UPDATE-2
titel: "Warteschlange ersetzt (Planer-Stand 2026-11-06 05:15), Pause beendet"
status: erledigt
start: 2026-11-06T05:20+01:00
ende: 2026-11-06T05:30+01:00
branch: ops/queue
pr: keiner
commit: "ops/queue 5e43cba7 (vorher a09f58e7)"
ci: entfällt
---

# Bericht Warteschlangen-Update 2

## Ergebnis

`ops-queue-2026-11-06f.zip` (19 116 Byte, 05:01) wurde in ein leeres Scratch-Verzeichnis entpackt: 22 YAML-Dateien und `README.md`, keine symbolischen Links.
Alle YAML-Dateien sind gültig (strict, uniqueKeys). INDEX listet 21 Aufträge, Index und Einzeldateien haben 0 Statusabweichungen, Zugangsdaten sind keine enthalten.
Der Inhalt von `queue/` ist in einem Commit ersetzt (5e43cba7), ohne Force-Push. Remote und lokaler Commit sind gleich.
Erledigt: A01 bis A04, A06, A10 bis A15. Bereit in INDEX-Reihenfolge: A16, A17, A18, A19, A05, A20, A21, A08, A09. A07 wartet auf Entscheidung.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| YAML | 22/22 gültig; INDEX 21 Aufträge; Statusabweichungen 0 | `yaml`-Parser strict, uniqueKeys |
| Zugangsdaten | keine (Muster: Token-Präfixe, JWT, `password:`, Schlüsselblöcke) | Prüfskript im Scratch-Verzeichnis |
| Änderungen | geändert A05, A06, A08, A09, A15, INDEX; neu A17 bis A21; README und A16 unverändert | `diff -rq` alt/neu |
| Abhängigkeiten | A08 und A09 hängen von A19 ab; A19 steht in der Reihenfolge davor | `queue/INDEX.yaml` |
| ls-remote | `5e43cba778b02226430b55380d3bf443badf9dc4	refs/heads/ops/queue` | gleich lokalem HEAD |
| A16 | war vor dem Update bereits begonnen (Worktree, Ausgangs-`bun audit`); wird fortgesetzt | `reports/STATUS.yaml` 05:03 |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: Claude Code schreibt auf `ops/queue`, was `docs/BETRIEB-TEILAUTOMATIK.md` Abschnitt 2 ausschließt. Grundlage ist der ausdrückliche Auftrag des Owners vom 2026-11-06 (wie beim Update vom 2026-11-05). Vorschlag: Ausnahme „Einspielen eines Planer-ZIP auf Auftrag des Owners“ in Abschnitt 2 aufnehmen.
- Zeitstempel: Die Startzeit von A16 in `STATUS.yaml` war zunächst falsch (09:00) und ist auf 05:03 MEZ korrigiert (Commit ce216bd5).
- Risiko: A17 bis A21, A05, A08 und A09 sind Doku- oder Leseaufträge; die Doku-Änderungen vom 06.11. werden in einem PR gebündelt (Branch `docs/2026-11-06-aufraeumen`, PR 284).

Hygiene: 0 gemergte Remote-Branches, 11 offene PRs, davon 9 Drafts.

```yaml
Reifegrad: Warteschlange auf Planer-Stand 2026-11-06 05:15
Projektstatus: Publish No-Go (R-07, R-14, K1/K2, QS6-5 in PR)
Offene_Fragen:
  - Ausnahme für das Einspielen von Planer-ZIPs in BETRIEB-TEILAUTOMATIK.md aufnehmen?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
