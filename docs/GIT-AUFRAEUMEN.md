# Git aufräumen: gemergte Branches

Stand: 2026-10-31. Zweck: Das Repository enthält viele Branches, die vollständig in `main` enthalten sind. Sie verdecken die offenen Arbeitsstände und erschweren die Prüfung gegen Lovable (R-07).

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
- Danach: Einstellung „Automatically delete head branches“ aktiviert (`delete_branch_on_merge=true`). Nach dem Merge von #221, #224 und #223 `fix/arbeitssicht-erledigt-nicht-ueberfaellig` (`43647cf`) gelöscht; Remote 82, `npm run git:hygiene` meldet 0 gemergte Branches.
- Wiederherstellen eines archivierten Branches: `git push origin archive/<branch>^{commit}:refs/heads/<branch>`.
- Behalten bis zur Klärung mit dem Lovable-Team (R-07): 4 gemergte `lovable-sync-*` (`1792495837`, `1792496228`, `1792500399`, `1792520819`) und 20 nicht gemergte Lovable-Branches (Inventar unten).

### 6.1 Inventar nicht gemergter Lovable-Branches (Basis `origin/main` 22af893)

Nicht löschen, nicht mergen. Spalte „Eigen“: Patches, die nicht in `main` enthalten sind (`git cherry`). `lovable-sync-1792847779` ist der neueste Lovable-Stand (Lovable-Backup mit Auth-Broker laut `docs/CURRENT-STATUS.md`) und wird nicht gemergt.

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

## 7 Durchführung 2026-10-28 (lokal, Claude Code, Freigabe des Betreibers 2026-10-28)

Prüfung je Kandidat: kein offener PR (Head oder Basis), `git rev-list --count origin/main..origin/<branch>`, PR-Nummer und Merge-Commit.
Alle 13 Kandidaten hatten Commits außerhalb von `main` (Squash-Merges). Gelöscht wurden nur die 11 Fälle, deren Dateistand an der Branch-Spitze dem Merge-Commit des PR entspricht (Merge-Commit in `main`, bei gestapelten PRs über den Folge-PR), nach ausdrücklicher Freigabe. Gelöscht wurde einzeln per `git push --force-with-lease=<sha> origin :<branch>`.

| Branch                                             | Kurz-SHA   | Commits nicht in main | PR (Merge-Commit)            | Entscheidung                        |
| -------------------------------------------------- | ---------- | --------------------- | ---------------------------- | ----------------------------------- |
| `chore/repository-line-endings`                    | `ed1eac46` | 1                     | #158 (`a1bbaf1f`)            | gelöscht                            |
| `docs/bsf-03e-main-baseline-2026-09-22`            | `2c6ec7f3` | 6                     | #151 (`00dc0637`)            | gelöscht                            |
| `docs/bsf03e-p5-closure-2026-10-15`                | `c15eb3f0` | 1                     | #186 (`7affeeb6`), dann #187 | gelöscht                            |
| `feat/bsf-03b-performance-statement`               | `92712927` | 157                   | #149 (`12b37be8`)            | gelöscht                            |
| `fix/bsf03b-e2e-reference-date`                    | `b207f238` | 1                     | #152 (`1ca8f093`)            | gelöscht                            |
| `governance/lovable-connector-fallback-2026-10-13` | `dfa6cfed` | 7                     | #180, #182 (`e6c86a29`)      | gelöscht                            |
| `restack/bsf-03e-p3b-docs-2026-10-14`              | `fa1d3aa4` | 1                     | #184 (`430e7737`), dann #185 | gelöscht                            |
| `signed/bsf-03e-p3b-work-view-2026-10-15`          | `430e7737` | 1                     | #185 (`008c798a`)            | gelöscht                            |
| `signed/bsf-07-p0-contract-2026-10-16`             | `c83b33ce` | 2                     | #190 (`fd8aa71b`)            | gelöscht                            |
| `signed/bsf03e-p5-closure-2026-10-15`              | `7affeeb6` | 1                     | #187 (`601874ec`)            | gelöscht                            |
| `signed/gg-delivery-plan-2026-10-16`               | `d4708c62` | 1                     | #189 (`fb55000c`)            | gelöscht                            |
| `aqgs-pilot`                                       | `d9ec5101` | 6                     | #146 (`c4c225f6`)            | erhalten (GA-3, Evidenz)            |
| `docs/tracker-lovable-broker-ruecksetzung`         | `28bcd15b` | 1                     | #219 (`22af8935`)            | erhalten, Commit nach Merge, prüfen |

Lokal: Der gemergte Branch `docs/stand-2026-10-26-merge-abschluss` ist im Worktree `sysingdashboard-gg-docs` ausgecheckt und blieb erhalten (`git branch -d` nicht möglich). Remote-Branches: 88 vorher, 77 nachher.

## 8 Durchführung 2026-10-29 (lokal, Claude Code, Freigabe des Betreibers 2026-10-29)

Der Branch `docs/tracker-lovable-broker-ruecksetzung` ist verworfen, nicht gemergt.

| Branch                                     | SHA        | Archiv-Tag                                         | Entscheidung                       |
| ------------------------------------------ | ---------- | -------------------------------------------------- | ---------------------------------- |
| `docs/tracker-lovable-broker-ruecksetzung` | `28bcd15b` | `archive/docs-tracker-lovable-broker-ruecksetzung` | Remote gelöscht, als Tag gesichert |

- Prüfung: kein offener PR (Head oder Basis); einziger Commit außerhalb von `main` ist `28bcd15b` (2026-10-26 05:54).
- Begründung: Der Inhalt steht auf `main` (Abschnitte 6 und 6.1, Tracker-Eintrag vom 2026-10-26). Die einzige abweichende Zeile (Beschreibung von `lovable-sync-1792847779` in 6.1) wurde auf `main` mit `12c8fada` (2026-10-26 06:30) bewusst ersetzt („Lovable-Backup mit Auth-Broker“, passend zu R-07). Der Tracker-Eintrag unterscheidet sich nur redaktionell.
- Gelöscht mit `git push --force-with-lease=refs/heads/<branch>:28bcd15b… origin --delete <branch>` nach Prüfung des SHA gegen `origin/<branch>`. Remote-Branches danach: 75.
- Wiederherstellen: `git push origin archive/docs-tracker-lovable-broker-ruecksetzung^{commit}:refs/heads/docs/tracker-lovable-broker-ruecksetzung`.
- Lokal: Der Branch gleichen Namens (`28bcd15b`) bleibt bestehen; `git branch -d` verweigert, weil der Commit nicht in `main` ist. `-D` wurde nicht verwendet; Entscheidung des Betreibers offen.
- Worktree `sysingdashboard-gg-docs` entfernt (Stand sauber, nichts ungepusht); dessen Branch `docs/stand-2026-10-26-merge-abschluss` (`12c8fada`, PR #225, Vorfahre von `main`) mit `git branch -d` gelöscht.

## 9 Durchführung 2026-10-31 (lokal, Claude Code, Freigabe des Betreibers 2026-10-31)

Arbeitsklone unter `C:\Users\bmarn\OneDrive\Dokumente\Dashboard` entfernt; kein Remote-Branch gelöscht.

| Ordner                  | Art                                  | Vorprüfung                                                   | Entscheidung          |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------ | --------------------- |
| `sysingdashboard-s0-05` | Worktree von `sysingdashboard-codex` | sauber, `main` auf `d9996906`                                | `git worktree remove` |
| `sysingdashboard-codex` | Klon                                 | 3 Branches auf `origin`, keine Stashes, sauber               | gelöscht              |
| `sysingdashboard-bsf03` | Klon                                 | 1 Branch auf `origin` (PR #128), nur Zeilenumbruch und Cache | gelöscht              |

- Erhalten: `backup/codex-2026-10-31` (`2a0cf1d9`) und `C:\dev\_sicherung_sysingdashboard-codex`.
- Festlegung: Arbeitsklone nur unter `C:\dev`.
- Bericht: `docs/BERICHT-2026-10-31-AUFRAEUMEN-ONEDRIVE.md`.
