---
id: A16
titel: "bun audit K1 und K2: dompurify und shell-quote anheben"
status: erledigt
start: 2026-11-06T05:03+01:00
ende: 2026-11-06T05:58+01:00
branch: "fix/audit-dompurify (PR 1), fix/audit-shell-quote (PR 2)"
pr: "285 (Draft), 287 (Draft)"
commit: "7a01ce95 (PR 285), 46607da8 (PR 287, enthält 7a01ce95 und 2e185e87)"
ci: "PR 285 15/15 am Head 7a01ce95; PR 287 15/15 am Head 46607da8"
---

# Bericht A16

## Ergebnis

Beide kritischen Funde sind per `overrides` behoben: dompurify 3.4.13 → 3.4.17 (PR 285), shell-quote 1.9.0 → 1.12.0 (PR 287).
`bun audit` auf `main` (34f20a3): 60 Funde (2 kritisch, 25 hoch, 24 mittel, 9 niedrig); mit beiden PRs: 54 (0 kritisch, 24 hoch, 24 mittel, 6 niedrig).
Die PRs stören sich in `bun.lock` und `package.json` (gemeinsamer `overrides`-Block); PR 2 ist deshalb auf PR 1 neu aufgesetzt.
Typecheck und Build ohne Fehler, CI 15/15 für beide PRs. Lokale Test- und E2E-Fehler sind Zeitgrenzen und Kaltstarteffekte, die auch auf `main` auftreten.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Änderung PR 285 | `package.json` `overrides.dompurify: 3.4.17`; `bun.lock` nur dompurify und `overrides` (7 Zeilen) | Commit 7a01ce95 |
| Änderung PR 287 | zusätzlich `overrides["shell-quote"]: 1.12.0`; `bun.lock` nur shell-quote | Commit 2e185e87; 46607da8 leer (CI-Auslöser) |
| bun audit nach PR 1 | 55 Funde (1 kritisch, 24 hoch, 24 mittel, 6 niedrig); dompurify nicht mehr gemeldet | lokal, bun 1.4.3 |
| bun audit nach PR 2 | 54 Funde, 0 kritisch | lokal, bun 1.4.3 |
| Konflikt der PRs | unabhängig von `main` aufgesetzt: CONFLICT in `bun.lock` und `package.json` | `git merge-tree` fix/audit-dompurify fix/audit-shell-quote |
| Typecheck, Build | exit 0 auf beiden Branches | lokale Protokolle |
| Unit-Tests | parallel (zwei Suites gleichzeitig): 6 bzw. 14 Fehler, alle Zeitgrenzen (5000 ms, L2-10 100 ms); einzeln wiederholt 7 Dateien, 70 Tests bestanden (PR 2); `BackendAdminDialog.test.tsx` auf PR 1 zweimal 6/6 | bekannter Befund im Backlog (Zeitlimit `BackendAdminDialog`) |
| PDF-Export | `pdf-renderer.test.ts` erzeugt ein PDF über jsPDF, bestanden mit dompurify 3.4.17 | Einzellauf |
| E2E und Dev-Server | PR 2: 127/137 bestanden; wiederholt 3 rot (`a11y` Startseite, `error-states` leerer localStorage, `dashboard` globale Suche). Dieselben 3 Tests rot auf `origin/main` (zwei Läufe: 5 bzw. 3 Fehler). Der Dev-Server mit `@tanstack/devtools-vite` startet | `playwright test`, Vergleichslauf auf 34f20a3 |
| CI | PR 285 15/15; PR 287 15/15 nach Basiswechsel auf `main` | `gh pr checks 285`, `gh pr checks 287` |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: PR 287 hat die Basis `main` statt `fix/audit-dompurify`, weil die CI nur für PRs gegen `main` läuft (`.github/workflows/ci.yml`). Er enthält den Commit von PR 285 (wie 283 und 282). Für den CI-Lauf nach dem Basiswechsel ist ein leerer Commit nötig gewesen (46607da8).
- Abweichung: Die lokalen Tests liefen anfangs parallel auf zwei Worktrees; das erzeugte die Zeitüberschreitungen. Bewertet ist der Einzellauf.
- Befund: Drei E2E-Starttests sind lokal auch auf `main` rot (Kaltstart des Dev-Servers, leere Seite nur mit Toaster). Vorschlag Backlog: Aufwärmschritt oder längere erste Wartezeit.
- Risiko: Nach dem Merge muss Lovable den Stand übernehmen, sonst bleibt der veröffentlichte Stand unverändert (`docs/BERICHT-AUDIT-2026-11-04.md`). Merge-Reihenfolge: 285, dann 287.
- Die 54 übrigen Funde sind nicht Teil von A16 (A20).

Hygiene: 0 gemergte Remote-Branches, 13 offene PRs, davon 12 Drafts.

```yaml
Reifegrad: K1 und K2 in Draft-PRs behoben, CI grün
Projektstatus: Publish No-Go (R-07, R-14); K1/K2 warten auf Merge-Freigabe
Offene_Fragen:
  - Merge-Freigabe für PR 285 und danach PR 287?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
