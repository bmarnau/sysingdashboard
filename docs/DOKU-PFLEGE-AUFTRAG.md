# Dokumentationspflege – Dauerauftrag und Prüfung

Zweck: Projektdokumente bleiben ohne Sonderaktion aktuell. Git ist die führende Quelle (Single Source of Truth).

## 1 Automatische Prüfung

| Prüfung                | Befehl                 | Was sie sicherstellt                                                                                                                                                                        |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handbuch-Sync          | `npm run docs:check`   | CHANGELOG, Version und Handbuchthemen passen zusammen.                                                                                                                                      |
| Projektdoku-Aktualität | `npm run docs:project` | Tracker ist gültiges YAML, keine toten `docs/…`-Verweise, Stand in `CURRENT-STATUS.md` und Tagebuch nicht älter als der jüngste Tracker-Eintrag, Tagebuch-Version gleich CHANGELOG-Version. |

Beide laufen in der CI (Schritt „Docs sync check“ und „Project docs freshness check“).

## 2 Pflichten (SMART)

| ID   | Anforderung                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| DP-1 | Jede Änderung mit Nutzersichtbarkeit muss in `CHANGELOG.md` einen Eintrag erhalten (bestehende Regel).                                        |
| DP-2 | Jeder neue Tracker-Fortschrittseintrag muss am selben Tag `Stand:` in `docs/CURRENT-STATUS.md` und `docs/ENTWICKLUNGSTAGEBUCH.md` nachziehen. |
| DP-3 | Neue Entscheidungen, Befunde und Pakete müssen im Tracker (`fortschritt`, Paket oder `nach_golden_gate`) stehen, bevor die Sitzung endet.     |
| DP-4 | Jeder Pull Request muss `npm run docs:check` und `npm run docs:project` bestehen.                                                             |
| DP-5 | Dokumente sollten Verweise auf andere Dokumente als Pfad in Backticks führen, damit die Prüfung tote Links findet.                            |

## 3 Dauerauftrag an Claude (Prompt)

```text
Rolle: Senior-Systemingenieur im Projekt SysIng Dashboard (Golden Gate).
Auftrag bei jeder Sitzung und vor jedem Abschluss:
1. Lies docs/DOKU-PFLEGE-AUFTRAG.md und docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml.
2. Trage neue Entscheidungen, Befunde, Testergebnisse und PR-Stände im Tracker ein
   (fortschritt mit datum, ereignis, beleg).
3. Ziehe "Stand:" und den Wiederanlaufpunkt in docs/CURRENT-STATUS.md und einen Eintrag in
   docs/ENTWICKLUNGSTAGEBUCH.md nach. Ergänze docs/BACKLOG.md bei neuen Nach-Golden-Gate-Punkten.
4. Bei nutzersichtbaren Änderungen: CHANGELOG.md und, falls nötig, src/lib/help-documentation.ts.
5. Führe aus: npm run docs:check, npm run docs:project, Prettier-Prüfung der geänderten Dateien.
6. Committe mit Klartext-Nachricht, pushe auf den Arbeitsbranch und prüfe mit
   `git ls-remote --heads origin <branch>`, dass der Remote-Stand dem lokalen Commit entspricht.
7. Regeln: Keine Merges, während Lovable schreibende Aufträge ausführt (R-07). Keine Zugangsdaten.
   Aussagen wie "bestanden" nur mit Beleg (PR, Commit, Testprotokoll).
8. Schließe mit einer kurzen Zusammenfassung und dem YAML-Block (Reifegrad, Projektstatus,
   Offene_Fragen, Roadmap).
```

Die Kurzfassung dieser Regeln steht in `CLAUDE.md` und gilt damit in jeder Claude-Code-Sitzung automatisch.

## 4 Grenzen

- Die Prüfung erkennt veraltete Stände, aber keine inhaltlich falschen Aussagen. Dafür bleibt der Abschnitt „Prüfen der Arbeit“ im Auftrag.
- Das Handbuch im Produkt (`help-documentation.ts`) wird nur über `docs:check` mit dem CHANGELOG abgeglichen.
