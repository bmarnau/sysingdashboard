# Git aufräumen: gemergte Branches

Stand: 2026-10-26. Zweck: Das Repository enthält viele Branches, die vollständig in `main` enthalten sind. Sie verdecken die offenen Arbeitsstände und erschweren die Prüfung gegen Lovable (R-07).

## 1 Ausgangslage

- Remote-Branches gesamt: 153 (Stand 2026-10-26 nach `git fetch --prune`), davon 46 vollständig in `origin/main` enthalten.
- Offene Pull Requests: #219 (Doku), #220 (Fix, Entwurf), #221 (Hilfetext, Entwurf), #155 (Kiosk-TDF), #124 (Wallboard-Idee, Entwurf).
- Löschen über die GitHub-Schnittstelle und per `git push --delete` ist in der Cloud-Sitzung gesperrt (HTTP 403 vom Proxy). Das Aufräumen muss lokal oder über GitHub (Schaltfläche „Delete branch“ bzw. Einstellung „Automatically delete head branches“) erfolgen.

## 2 Regeln (muss)

| ID   | Regel                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GA-1 | Es dürfen nur Branches gelöscht werden, die vollständig in `origin/main` enthalten sind (`git branch -r --merged origin/main`).               |
| GA-2 | Branches mit offenem Pull Request (`#219`, `#220`, `#221`, `#155`, `#124`) dürfen nicht gelöscht werden.                                      |
| GA-3 | Branches mit Präfix `backup/`, `audit/` und der Branch `aqgs-pilot` bleiben erhalten (Evidenz).                                               |
| GA-4 | Lovable-verwaltete Branches (`lovable-sync-*`, `merge/lovable-sync-*`, `lovable/*`) dürfen nur nach Rückfrage beim Betreiber gelöscht werden. |
| GA-5 | Vor dem Löschen muss die Liste mit Commit-Kennung vorliegen (Abschnitt 3), damit jeder Branch aus `main` rekonstruierbar bleibt.              |

## 3 Zum Löschen vorgesehen (gemergt, ohne offenen PR): 40 Branches

| Branch                                                       | Letzter Commit |
| ------------------------------------------------------------ | -------------- |
| `chore/ignore-lovable-preview-auth`                          | `51d9017`      |
| `chore/qs03-release-1.69.0`                                  | `3732df2`      |
| `chore/revert-preview-auth-ignore`                           | `7c681d4`      |
| `diag/kiosk-prettier`                                        | `528b5bc`      |
| `docs/adr-0037-datenauftraege-tracker`                       | `3dd1019`      |
| `docs/bsf03e-p3b-ap-views`                                   | `00dc063`      |
| `docs/golden-gate-execution-tracker`                         | `b9172d6`      |
| `docs/l0-nutzerpfade-inventar`                               | `16731aa`      |
| `docs/publish-pruefung-go-no-go`                             | `33bb0fa`      |
| `docs/qs01-adr-0036`                                         | `da9568d`      |
| `docs/qs01-variant-ausnahme`                                 | `1c181e0`      |
| `docs/qs01-variant-ausnahme-types`                           | `989e05e`      |
| `docs/tracker-l0-und-veroeffentlichungsweg`                  | `ba0fb0f`      |
| `docs/tracker-l0b-code-merged`                               | `668cb86`      |
| `docs/tracker-l0c-demo-mandant`                              | `253108f`      |
| `docs/tracker-migration-a-live-und-testbasis`                | `6183bb7`      |
| `docs/tracker-sprint0-stand`                                 | `783596f`      |
| `docs/tracker-stand-pause-2026-10-21`                        | `72aa31e`      |
| `feat/bsf-03a-project-controlling`                           | `763cf87`      |
| `feat/bsf-03e-p3a-person-view-ui`                            | `2437728`      |
| `feat/bsf-03e-p3b0-due-projection`                           | `5cb4123`      |
| `feat/bsf-03e-p3b1-work-package-read`                        | `fe4bf15`      |
| `feat/bsf-03e-p3b2-work-package-ui`                          | `8d71692`      |
| `feat/bsf-kiosk-02-internal-read`                            | `f746e6b`      |
| `feat/db-fk-reference-value-history`                         | `667e270`      |
| `feat/l0b-an-team-veroeffentlichen`                          | `e0bc2e2`      |
| `feat/publish-default-engineer`                              | `928f271`      |
| `feat/qs01-migration-a-profile-guard`                        | `046c7df`      |
| `feat/td01-demo-dataset-erweitert`                           | `6ff9c46`      |
| `feat/version-display-1.65.1`                                | `827a388`      |
| `fix/bsf-03e-p3b1-timestamptz-hardening`                     | `2ba5ebc`      |
| `fix/due-drop-controlling-filter`                            | `f7fe2ec`      |
| `fix/github-status-reason`                                   | `439f7ad`      |
| `fix/kiosk-demo-dataset-version`                             | `4d9acba`      |
| `fix/qs01-audit-errors`                                      | `9df04c8`      |
| `governance/db-change-cli-fallback-2026-10-12`               | `3621b11`      |
| `governance/lovable-connector-fallback-signed-v2-2026-10-14` | `e6c86a2`      |
| `restack/bsf-03e-p0-scope-hardening`                         | `4509cfe`      |
| `restack/bsf-03e-p1-person-view`                             | `4a23391`      |
| `restack/bsf-03e-p2-responsibility-mutations`                | `c84c506`      |

## 4 Nur nach Rückfrage (Lovable-verwaltet, gemergt)

- `lovable-sync-1792495837`
- `lovable-sync-1792496228`
- `lovable-sync-1792500399`
- `lovable-sync-1792520819`
- `merge/lovable-sync-1792520819`
- `lovable/sec-02-reference-data-grants-2026-08-26`

Zusätzlich existieren weitere `lovable-sync-*`-Branches, die nicht in `main` enthalten sind (nicht mergen, siehe R-07). Sie gehören zur Klärung mit dem Lovable-Team.

## 5 Auftragstext für Claude Code (lokal, nur mit Freigabe des Betreibers)

```text
Aufgabe: Gemergte Remote-Branches aufräumen, Regeln GA-1 bis GA-5 aus docs/GIT-AUFRAEUMEN.md.
1. git fetch origin --prune; git checkout main; git pull --ff-only.
2. Liste: git branch -r --merged origin/main, ohne main, backup/*, audit/*, aqgs-pilot, lovable*, merge/lovable*.
3. Schnittmenge mit den Branches offener Pull Requests muss leer sein (gh pr list --state open).
4. Zeige mir die Liste und warte auf mein "OK".
5. Nach OK: git push origin --delete <Branch> je Eintrag; danach git remote prune origin und
   git branch --merged main | grep -v main | xargs git branch -d.
6. Bericht: gelöschte Anzahl, verbleibende Branches, Fehler im Wortlaut. Nichts anderes löschen.
```

## 6 Ergebnis 2026-10-26 (lokal, Claude Code, mit Freigabe des Betreibers)

| Schritt                                                        | Umfang | Ergebnis                                                                                                             |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Gemergte Branches ohne offenen PR (Abschnitt 3)                | 40     | gelöscht, keine Fehler                                                                                               |
| Gemergte Lovable-Branches, risikoarm (GA-4, Rückfrage erfolgt) | 2      | gelöscht: `merge/lovable-sync-1792520819` (`3b1c826`), `lovable/sec-02-reference-data-grants-2026-08-26` (`830eba4`) |
| `diag/*` und `tmp/*` (nicht gemergt, ohne Verweis auf `main`)  | 27     | als Tag `archive/<branch>` gesichert und geprüft, danach gelöscht                                                    |

- Remote-Branches: 152 vorher, 83 nachher. Offene PRs #219, #220, #221, #155 und #124 unberührt.
- Wiederherstellen eines archivierten Branches: `git push origin archive/<branch>^{commit}:refs/heads/<branch>`.
- Behalten bis zur Klärung mit dem Lovable-Team (R-07): 4 gemergte `lovable-sync-*` (`1792495837`, `1792496228`, `1792500399`, `1792520819`) und 20 nicht gemergte Lovable-Branches (Inventar unten).

### 6.1 Inventar nicht gemergter Lovable-Branches (Basis `origin/main` 22af893)

Nicht löschen, nicht mergen. Spalte „Eigen“: Patches, die nicht in `main` enthalten sind (`git cherry`). `lovable-sync-1792847779` ist der neueste Lovable-Stand (zu Beginn des Aufräumens 0 Commits hinter `main`) und wahrscheinlich das aktive Sync-Ziel.

| Branch                           | Commit    | Datum      | Hinter main | Eigen |
| -------------------------------- | --------- | ---------- | ----------- | ----- |
| `lovable-backup-main-1788412232` | `76e75e1` | 2026-09-03 | 946         | 3     |
| `lovable-sync`                   | `1b49dc4` | 2026-09-17 | 552         | 12    |
| `lovable-sync-1791775331`        | `bf1d4fa` | 2026-10-12 | 135         | 2     |
| `lovable-sync-1791864423`        | `f4d14dd` | 2026-10-13 | 131         | 2     |
| `lovable-sync-1791948369`        | `c72bd0c` | 2026-10-14 | 129         | 2     |
| `lovable-sync-1792581246`        | `4bad000` | 2026-10-21 | 101         | 1     |
| `lovable-sync-1792585437`        | `739bb0d` | 2026-10-21 | 93          | 1     |
| `lovable-sync-1792655070`        | `1843b1b` | 2026-10-22 | 76          | 1     |
| `lovable-sync-1792661766`        | `c9ae103` | 2026-10-22 | 74          | 1     |
| `lovable-sync-1792668953`        | `77d10fc` | 2026-10-22 | 74          | 2     |
| `lovable-sync-1792669255`        | `e0cb03c` | 2026-10-22 | 74          | 3     |
| `lovable-sync-1792669534`        | `dfad625` | 2026-10-22 | 74          | 6     |
| `lovable-sync-1792669559`        | `3b8cf14` | 2026-10-22 | 74          | 8     |
| `lovable-sync-1792672165`        | `c1e339b` | 2026-10-22 | 71          | 1     |
| `lovable-sync-1792672318`        | `51f3e0d` | 2026-10-22 | 71          | 2     |
| `lovable-sync-1792672436`        | `fa0af9d` | 2026-10-22 | 71          | 3     |
| `lovable-sync-1792674265`        | `a30c1af` | 2026-10-22 | 67          | 1     |
| `lovable-sync-1792841478`        | `2b6efe9` | 2026-10-24 | 38          | 1     |
| `lovable-sync-1792847299`        | `1faabb2` | 2026-10-24 | 38          | 3     |
| `lovable-sync-1792847779`        | `d510e85` | 2026-10-24 | 35          | 1     |
