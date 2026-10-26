# Arbeitsregeln für Claude Code im Projekt SysIng Dashboard (Golden Gate)

Sprache: Deutsch. Ton sachlich und präzise. Anforderungen mit „muss/sollte“. Daten als JSON oder YAML, Diagramme als Mermaid.
Git ist die führende Quelle (Single Source of Truth). Vollständiger Dauerauftrag: `docs/DOKU-PFLEGE-AUFTRAG.md`.

## Wiederanlauf

Zu Beginn lesen: `docs/CURRENT-STATUS.md`, `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml`, `docs/MERGE-CHECKLISTE-GOLDEN-GATE.md`.

## Verbindliche Regeln

- Publish bleibt No-Go, bis die Auth-Broker-Abweichung und die Publish-Quelle geklärt sind (R-07, `docs/LOVABLE-PUBLISH-PRUEFUNG.md`).
- Nichts nach `main` mergen, solange Lovable schreibende Aufträge ausführt. Keine `lovable-sync-*`-Branches mergen.
- Merge nur per REST: `gh api -X PUT repos/bmarnau/sysingdashboard/pulls/N/merge -f merge_method=merge` (GraphQL ist blockiert). Vorher `update-branch` und alle CI-Checks abwarten.
- Datenänderungen am Live-System nur als Datenauftrag nach ADR-0037 (zwei Freigaben, feste IDs, Rollback). `audit_log` nie löschen.
- Keine Zugangsdaten in Dateien oder Commits.
- Aussagen wie „bestanden“ nur mit Beleg (PR, Commit, Testprotokoll, CI-Lauf).

## Dokupflege vor jedem Abschluss

1. Entscheidungen, Befunde, Tests und PR-Stände in den Tracker (`fortschritt`: datum, ereignis, beleg).
2. `Stand:` und Wiederanlaufpunkt in `docs/CURRENT-STATUS.md`, Eintrag in `docs/ENTWICKLUNGSTAGEBUCH.md`, Nach-Golden-Gate-Punkte in `docs/BACKLOG.md`.
3. Bei nutzersichtbaren Änderungen: `CHANGELOG.md` und ggf. `src/lib/help-documentation.ts`.
4. Ausführen: `npm run docs:check`, `npm run docs:project`, Prettier-Prüfung der geänderten Dateien.
5. Committen, pushen und mit `git ls-remote --heads origin <branch>` prüfen, dass der Remote-Stand dem lokalen Commit entspricht.
6. Nach jedem Merge: lokalen Branch löschen. Zum Abschluss `npm run git:hygiene` ausführen und die Zahl gemergter Remote-Branches, offener PRs und Drafts in einer Zeile melden. Bei mehr als 10 gemergten Remote-Branches den lokalen Aufräumauftrag (`docs/GIT-AUFRAEUMEN.md`) anbieten. Branches `lovable*`, `backup/*`, `audit/*` nie löschen. Das Löschen von Remote-Branches ist in der Cloud-Sitzung gesperrt und erfolgt lokal durch den Nutzer.
7. Doku-Änderungen eines Tages in einem PR bündeln, statt pro Kleinigkeit einen Branch zu öffnen.

## Abschluss jeder komplexen Antwort

YAML-Block mit `Reifegrad`, `Projektstatus`, `Offene_Fragen`, `Roadmap` (`Sprints_bis_BSF`, `Sprints_bis_MVP`).
