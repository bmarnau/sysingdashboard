---
id: A19
titel: "A07 abschließen: Notfallhandbuch und Standard Lovable-Grenzen in docs/ ablegen"
status: erledigt
start: 2026-11-06T06:13+01:00
ende: 2026-11-06T06:15+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: 27dbcae3
ci: "läuft (Head 27dbcae3)"
---

# Bericht A19

## Ergebnis

Beide Entwürfe vom 03.11. liegen in Git: `docs/NOTFALL-HANDBUCH.md` und `docs/standards/STANDARD-LOVABLE-GRENZEN.md`. Die Kopfzeile „Entwurf“ und die offenen Punkte „zu belegen“ sind unverändert.
Der Wortlaut ist unverändert; Prettier hat nur die Formatierung angepasst (Tabellenausrichtung, Leerzeilen vor Listen).
Zugangsdaten: keine. Treffer sind nur Begriffe wie „Passwort-Tresor“, „Secret-Inventar“, „Schlüssel“.
`docs/ARTEFAKTE.yaml`: beide Einträge auf „bereitgestellt (Entwurf)“ mit Pfad, `in_git: true`, Datum 2026-11-06.
Drei Pfadabweichungen im Notfallhandbuch gemeldet, nicht korrigiert (siehe unten).

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Quelle Notfallhandbuch | `Downloads\NOTFALL-HANDBUCH.md`, 15 112 Byte | `wc -c` |
| Quelle Standard | `Downloads\STANDARD-ENTWURF-LOVABLE-GRENZEN.md`, 6 295 Byte | `wc -c` |
| Abgelegt | `docs/NOTFALL-HANDBUCH.md` 16 814 Byte, `docs/standards/STANDARD-LOVABLE-GRENZEN.md` 10 606 Byte (nach Prettier) | Commit 27dbcae3 |
| Wortlaut | Text ohne Leerraum und Tabellenzeichen identisch mit der Quelle | `diff` nach Normalisierung |
| Zugangsdaten | 13 Treffer in der Suche nach Passwort, Token, Secret, Schlüssel, Key, Recovery, E-Mail-Mustern; alle sind Begriffe, keine Werte | `grep -i` |
| Prettier | beide Quellen vorher nicht konform, danach konform | `prettier --check` |
| Verweis Grundlage | Kopf nennt `STANDARD-ENTWURF-WIEDERHERSTELLBARKEIT.md`; im Repo heißt die Datei `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md` | `docs/NOTFALL-HANDBUCH.md` Zeile 3 |
| Verweis Lockfile | N2, N6, N10 nennen `npm ci` und `package-lock.json`; das Repo hat nur `bun.lock` | Abschnitte N2, N6, N10 |
| Verweis Startdatei | `start-sysingboard.ps1` liegt nicht in Git (vom Handbuch selbst so vermerkt) | N6, Abschnitt 6 Punkt 6 |
| Übrige Verweise | `CLAUDE.md`, `docs/CURRENT-STATUS.md`, Tracker, Merge-Checkliste, `docs/DOKU-PFLEGE-AUFTRAG.md`, `docs/L2-UMSETZUNGSPLAN.md`, `docs/AUFTRAG-*.md` (1), `docs/DATENAUFTRAG-*.md` (5), `supabase/migrations/` vorhanden | `test -e` |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: Prettier-Formatierung angewendet, damit die Dateien die Doku-Prüfung bestehen. Inhaltlich nichts geändert.
- Frage an den Owner: Pfad der Grundlage und die npm-Angaben im Notfallhandbuch korrigieren (Backlog-Eintrag)? In einem Notfall führt `npm ci` ohne `package-lock.json` zu einem Fehler.
- Übernahme nach `bmarnau-standards` erst nach der ersten bestandenen Restore-Probe (Grenze des Auftrags).
- Hinweis: PR 278 wurde während A19 vom Owner gemergt (`main` 02cb3d28, 06:11); PR 286 bleibt konfliktfrei.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: Notfallhandbuch und Lovable-Grenzen als Entwurf in Git
Projektstatus: Publish No-Go (R-07, R-14)
Offene_Fragen:
  - Pfadkorrekturen im Notfallhandbuch freigeben?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
