# Bericht Bestand offener Pull Requests

Stand: 2026-11-06 · Art: nur lesen · Grundlage: origin/main 34f20a346e2b5d9b2cfaa7917a1fb9ba2f12acfb

## Ergebnis

1. Die vier L2-Cockpit-Drafts (#226, #231, #233, #234) und der QS-06-Draft #222 sind inhaltlich vollständig auf `main` (Ersatz-PRs 262, 264, 266, 267, 269, 272, 273); sie sollten als „ersetzt“ geschlossen werden.
2. Nur auf den alten Cockpit-Branches liegen zwei Planungsdateien (`docs/superpowers/plans/2026-10-27-l2-cockpit-p2b.md`, `...-p3.md`) und überholte Doku-Commits; Code und Tests fehlen auf `main` nicht.
3. #278 ist konfliktfrei (23 Commits hinter `main`, CI 15/15 am Head) und sollte nach der Prüfung in der Lovable-Vorschau gemergt werden; das Plugin `sysing:ensure-css-config` ist auf `main` vorhanden.
4. #155 (Kiosk-TDF, kein Draft, 3 Konflikte) und #124 (Wallboard-Vertrag, Draft, konfliktfrei, 1082 Commits hinter `main`) brauchen eine Entscheidung des Owners.
5. Abweichung zum Auftrag: #284 ist bereits gemergt (2026-11-06 05:14 +01:00, Merge-Commit `34f20a3`), nicht offen.

## Stand der aktuellen Arbeit (#282, #283, #284)

Nur Stand, keine Bewertung.

| PR   | Branch                            | Draft | Basis  | Head               | Commits vor / hinter `main` | CI am Head                     | Konflikt mit `main`      | Überschneidungen                                                                                                                                                                                                                                                                |
| ---- | --------------------------------- | ----- | ------ | ------------------ | --------------------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #282 | `docs/2026-11-05-l2-12-abschluss` | ja    | `main` | `92bf1d3` (05.11.) | 1 / 2                       | 15 von 15 erfolgreich (05.11.) | `docs/CURRENT-STATUS.md` | alle 9 Dateien auch in #283; 4 Doku-Dateien auch in #231, #233, #234                                                                                                                                                                                                            |
| #283 | `fix/qs6-5-export-billing-view`   | ja    | `main` | `4b82a0a` (05.11.) | 5 / 2                       | 15 von 15 erfolgreich (05.11.) | `docs/CURRENT-STATUS.md` | enthält den Commit `92bf1d3` von #282 (`git merge-base --is-ancestor` bestätigt); 4 Doku-Dateien auch in #231, #233, #234; `docs/ENTWICKLUNGSTAGEBUCH.md` auch in #155; keine Überschneidung mit #222 und #278 (`src/lib/pdf-export.ts` ≠ `src/components/PdfCanvasViewer.tsx`) |
| #284 | `docs/2026-11-06-aufraeumen`      | –     | `main` | `6d5a34a`          | –                           | –                              | –                        | gemergt 2026-11-06T04:14Z, Merge-Commit `34f20a3` = heutiger `origin/main`                                                                                                                                                                                                      |

Hinweis: Weil #284 gemergt ist, ist der Branch `docs/2026-11-06-aufraeumen` laut `node scripts/git-hygiene.mjs` lokal als gemergt löschbar. Weitere Doku-Änderungen des Tages brauchen einen neuen PR.

## Bewertung je PR

Messverfahren: `git fetch origin`; `git diff --stat origin/main...origin/<branch>`; `git cherry -v origin/main origin/<branch>`; Dateivergleich `git diff --numstat origin/<branch> origin/main -- <datei>`; `git merge-tree --write-tree origin/main origin/<branch>`; `git rev-list --count`; Check-Runs per `gh api repos/bmarnau/sysingdashboard/commits/<sha>/check-runs`; `mergeable_state` per `gh api .../pulls/N`.

```yaml
- id: 278
  titel: "fix(pdf): react-pdf-Stylesheets ohne Tailwind-Verarbeitung laden (Draft)"
  branch: fix/react-pdf-css-url
  status: "Draft, Autor bmarnau, erstellt 2026-11-04 (2 Tage), Head 281c665 vom 2026-11-04, Basis main, 1 Commit vor und 23 hinter main, mergeable_state behind"
  auf_main_enthalten: "nein; neue Dateien public/vendor/react-pdf/AnnotationLayer.css, public/vendor/react-pdf/TextLayer.css, src/lib/react-pdf-styles.ts, src/__tests__/components/PdfCanvasViewer.styles.test.ts fehlen auf main; Änderung an src/components/PdfCanvasViewer.tsx und .prettierignore nicht auf main"
  konflikte: "keine (merge-tree Exit 0)"
  ci: "15 von 15 erfolgreich am Head 281c665 (2026-11-04), aber auf altem Stand von main"
  empfehlung: "mergen nach Prüfung"
  begruendung: "Lokal funktionsfähig mit und ohne Plugin (BERICHT-2026-11-04-PR278-LOKALTEST.md); der Absturz ist nur in der Lovable-Vorschau nachweisbar, deshalb dort prüfen, dann update-branch, CI und Merge per REST nach Owner-Freigabe; Plugin aus PR 277 bleibt."
  aufwand_h: 1.5
  beleg: "Commit 281c665; vite.config.ts auf main Zeilen 42-54 und 70-81; package.json react-pdf ^10.4.1 auf main und Branch gleich; docs/BACKLOG.md Zeile 313"
- id: 234
  titel: "feat(l2): schreibgeschütztes Managementcockpit mit Rollen-Gate"
  branch: feat/l2-cockpit-p3
  status: "Draft, Autor bmarnau, erstellt 2026-10-27 (10 Tage), Head 7a70909 vom 2026-10-27, Basis main, aufgebaut auf P2 1009887, 7 Commits vor und 149 hinter main, mergeable_state dirty"
  auf_main_enthalten: "ja, Code und Tests vollständig: 16 von 26 Dateien identisch auf main; ManagementCockpitView.tsx, management-cockpit-view.test.tsx, management-cockpit.functions.test.ts, management-cockpit.functions.ts, dashboard.tsx auf main weiterentwickelt (PR 266, 269, 272, 273); routeTree.gen.ts neu erzeugt (PR 269). Nur im Draft: docs/superpowers/plans/2026-10-27-l2-cockpit-p3.md und die Doku-Commits 1009887, 7a70909 (überholt)"
  konflikte: "9 Dateien: 4 Doku-Dateien, 4 add/add im Cockpit-Code, routeTree.gen.ts"
  ci: "15 von 15 erfolgreich am Head 7a70909 (2026-10-27)"
  empfehlung: "ersetzt und schließen"
  begruendung: "Mit U4 (PR 269) per Cherry-Pick der Commits a02ab26 und a565a21 neu aufgebaut; main ist Obermenge (Hinweis PARTIAL aus PR 272, billing.view in dashboard.tsx aus PR 273). Mergen würde Rückschritte und Konflikte bringen; docs/BACKLOG.md Zeile 259 legt fest, dass die Drafts nicht gemergt werden."
  aufwand_h: 0.25
  beleg: "PR 269 (2be2d6c); docs/L2-UMSETZUNGSPLAN.md Abschnitt 3 Zeile 55; git cherry: a02ab26, a565a21 als + wegen angepasster Folgeänderungen; Zeilen nur im Draft in ManagementCockpitView.tsx sind die vor PR 272 ungekennzeichnete Zahl"
- id: 233
  titel: "feat(l2): AVKK-Server-Lesepfad für das Management-Cockpit"
  branch: feat/l2-cockpit-p2b
  status: "Draft, Autor bmarnau, erstellt 2026-10-27 (10 Tage), Head 6bcbb1c vom 2026-10-27, Basis main, aufgebaut auf P2 1009887, 9 Commits vor und 149 hinter main, mergeable_state dirty"
  auf_main_enthalten: "ja, Code und Tests vollständig: management-cockpit.functions.ts, compose.ts, index.ts, types.ts, compose.test.ts, work-package-work-view.ts identisch; management-cockpit-avkk-adapter.ts auf main mit berlinDate weiterentwickelt (PR 267); Adapter-Test +32/-1 und Funktionstest +29/-2 auf main erweitert. Nur im Draft: docs/superpowers/plans/2026-10-27-l2-cockpit-p2b.md und Doku-Commits 1009887, 6bcbb1c (überholt)"
  konflikte: "7 Dateien: 4 Doku-Dateien, 3 add/add (Adapter, Adapter-Test, Funktionstest)"
  ci: "15 von 15 erfolgreich am Head 6bcbb1c (2026-10-27)"
  empfehlung: "ersetzt und schließen"
  begruendung: "Mit U3 (PR 266) und U3b (PR 267) neu aufgebaut; der Draft enthält noch den UTC-Stichtag referenceInstant.slice(0, 10), den PR 267 behoben hat. Mergen würde den Befund U3 (1) zurückbringen."
  aufwand_h: 0.25
  beleg: "PR 266 (7ab6313), PR 267 (c24c4a5); git diff origin/feat/l2-cockpit-p2b origin/main -- src/integrations/supabase/management-cockpit-avkk-adapter.ts (Zeile 304 berlinDate)"
- id: 231
  titel: "feat(cockpit): L2 P2 Server-Lesepfad (Draft, auf P1 aufgesetzt, nicht mergen)"
  branch: feat/l2-cockpit-p2
  status: "Draft, Autor bmarnau, erstellt 2026-10-27 (10 Tage), Head 1009887 vom 2026-10-27, Basis main, enthält P1, 4 Commits vor und 149 hinter main, mergeable_state dirty"
  auf_main_enthalten: "ja: Code-Commit f8199b7 patch-gleich auf main (git cherry -); compose.ts, index.ts, types.ts, compose.test.ts, work-package-work-view.ts, L2-COCKPIT-SCHNITT-KONZEPT.md identisch; management-cockpit.functions.ts auf main um AVKK-Adapter erweitert (PR 266); Funktionstest auf main 23 statt 21 Tests. Nur im Draft: Doku-Commit 1009887 (überholt)"
  konflikte: "6 Dateien: 4 Doku-Dateien, 2 add/add (management-cockpit.functions.ts und Test)"
  ci: "15 von 15 erfolgreich am Head 1009887 (2026-10-27)"
  empfehlung: "ersetzt und schließen"
  begruendung: "Mit U2 (PR 264) per Cherry-Pick von f8199b7 neu aufgebaut; der Kommentar AVKK UNAVAILABLE im Draft ist durch PR 266 überholt."
  aufwand_h: 0.25
  beleg: "PR 264 (755614a); git cherry -v origin/main origin/feat/l2-cockpit-p2: f8199b7 mit -"
- id: 226
  titel: "feat(cockpit): L2 P1 reine Domänen-Komposition (Draft, nicht mergen)"
  branch: feat/l2-cockpit-p1
  status: "Draft, Autor bmarnau, erstellt 2026-10-26 (11 Tage), Head 53a81f1 vom 2026-10-26, Basis main, 1 Commit vor und 158 hinter main, mergeable_state dirty"
  auf_main_enthalten: "ja: Commit 53a81f1 patch-gleich auf main (git cherry -); compose.test.ts identisch; compose.ts, index.ts, types.ts auf main um cockpitScopeKey weiterentwickelt (PR 264). Nur im Draft: nichts"
  konflikte: "3 Dateien add/add (compose.ts, index.ts, types.ts)"
  ci: "15 von 15 erfolgreich am Head 53a81f1 (2026-10-26)"
  empfehlung: "ersetzt und schließen"
  begruendung: "Mit U1 (PR 262) per Cherry-Pick von 53a81f1 neu aufgebaut; der Draft hat noch die private Funktion scopeKey statt des gemeinsamen cockpitScopeKey."
  aufwand_h: 0.1
  beleg: "PR 262 (814c9cd), PR 264; docs/L2-UMSETZUNGSPLAN.md Zeile 52"
- id: 222
  titel: "feat(rbac): QS-06 billing.view – Abrechnungsdaten rollenabhängig (Draft, nicht mergen)"
  branch: feat/qs06-billing-view
  status: "Draft, Autor bmarnau, erstellt 2026-10-26 (11 Tage), Head 90d127a vom 2026-10-26, Basis main, 1 Commit vor und 209 hinter main, mergeable_state behind"
  auf_main_enthalten: "ja, vollständig: 7 von 8 Dateien identisch auf main; dashboard.tsx auf main nur um 16 Zeilen aus U4 länger (0 Zeilen nur im Draft); Merge-Ergebnis von merge-tree hat denselben Tree 5a39cac wie origin/main"
  konflikte: "keine (merge-tree Exit 0, Ergebnis ohne Änderung)"
  ci: "15 von 15 erfolgreich am Head 90d127a (2026-10-26)"
  empfehlung: "ersetzt und schließen"
  begruendung: "PR 273 hat Commit 90d127a per cherry-pick -n auf aktuellem main übernommen; ein Merge von #222 würde nichts ändern. Offene Punkte QS6-4 und QS6-5 laufen in #283 und BERICHT-QS6-4-ANALYSE.md."
  aufwand_h: 0.1
  beleg: "PR 273 (2d3299a), Beschreibung PR 273; docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml Zeilen 787-804; git merge-tree --write-tree origin/main origin/feat/qs06-billing-view = 5a39cac = origin/main^{tree}"
- id: 155
  titel: "docs(kiosk): SYSING-KIOSK-001 als TDF-Schnittstellendokument"
  branch: docs/sysing-kiosk-001-tdf
  status: "kein Draft, Autor bmarnau, erstellt 2026-09-23 (44 Tage), Head 3e30fdc vom 2026-09-29, Basis main, 33 Commits vor und 319 hinter main, mergeable_state dirty"
  auf_main_enthalten: "nein: SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.md, docs/examples/README-KIOSK-IMPORT.md, Plan 2026-09-23-sysing-kiosk-001-tdf.md, scripts/docs/build-sysing-kiosk-001.mjs und check-sysing-kiosk-001.mjs fehlen auf main; Änderungen an ci.yml (Kiosk-TDF-Build, DOCX-Artefakt), package.json (docs:check erweitert, docs:kiosk) und DEMO-DATA.md nicht auf main"
  konflikte: "3 Dateien: .github/workflows/ci.yml, package.json, docs/ENTWICKLUNGSTAGEBUCH.md"
  ci: "15 von 15 erfolgreich am Head 3e30fdc (2026-09-29), Stand von main vor 319 Commits"
  empfehlung: "Entscheidung des Owners nötig"
  begruendung: "Eigenständige Doku mit neuem Pflicht-Gate in docs:check und CI; Kiosk-Quellen haben sich seit der Basis e35ae7d nur gering geändert (kiosk-demo-dataset.ts und kiosk-demo-dataset-v1.json je 1 Zeile), ob der Driftcheck auf aktuellem main besteht, ist nicht ermittelt. Ob das Dokument nach Entscheidung Weg A (Kiosk-Konto) noch gebraucht wird, kann nur der Owner sagen. Aufwand Aktualisieren 3 h, Schließen 0.1 h."
  aufwand_h: 3
  beleg: "gh pr view 155; git merge-tree (3 Konflikte); git diff --stat e35ae7d origin/main -- src/lib/kiosk docs/examples; docs/CURRENT-STATUS.md Zeile 64"
- id: 124
  titel: "docs: Management-Wallboard 0.7.1 + externer JSON-Vertrag/Producer-Anforderung"
  branch: docs/idea-management-wallboard-v050
  status: "Draft, Autor bmarnau, erstellt 2026-09-11 (56 Tage), Head c6f3d24 vom 2026-09-11, Basis main, 40 Commits vor und 1082 hinter main, mergeable_state behind"
  auf_main_enthalten: "nein: alle 17 Dateien unter docs/ideas/management-wallboard/ fehlen auf main (TDF 0.6.0 bis 0.7.1, Vertragspaket v0.1-draft mit JSON Schema, Beispielen, Feldkatalog, Producer-Anforderung)"
  konflikte: "keine (merge-tree Exit 0, nur neue Dateien)"
  ci: "14 von 14 erfolgreich am Head c6f3d24 (2026-09-11), älterer CI-Umfang, Stand von main vor 1082 Commits"
  empfehlung: "Entscheidung des Owners nötig"
  begruendung: "Externe Vertragsvorarbeit, laut BSF-CURRENT-PRIORITIES.md Zeile 265 und BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md Zeile 181 bewusst erhalten, aber entkoppelt; keine Implementierungsfreigabe. Owner muss entscheiden, ob der Stand als Idee nach main soll (dann update-branch, CI, Prettier), weiter offen bleibt oder geschlossen wird. Aufwand Aktualisieren 1.5 h, Schließen 0.1 h."
  aufwand_h: 1.5
  beleg: "gh pr view 124; docs/BSF-CURRENT-PRIORITIES.md Zeile 265; docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md Zeile 181"
```

## Abhängigkeiten

```mermaid
flowchart LR
  main[(origin/main 34f20a3)]
  P1["#226 P1"] --> P2["#231 P2"]
  P2 --> P2b["#233 P2b"]
  P2 --> P3["#234 P3"]
  P1 -. ersetzt durch .-> U1["PR 262 U1"]
  P2 -. ersetzt durch .-> U2["PR 264 U2"]
  P2b -. ersetzt durch .-> U3["PR 266 U3 und PR 267 U3b"]
  P3 -. ersetzt durch .-> U4["PR 269 U4, PR 272 U6"]
  Q222["#222 QS-06 alt"] -. ersetzt durch .-> U7["PR 273 U7"]
  U1 --> main
  U2 --> main
  U3 --> main
  U4 --> main
  U7 --> main
  R277["PR 277 Plugin"] --> main
  R278["#278 react-pdf public/vendor"] -. setzt voraus .-> R277
  R278 -. konfliktfrei .-> main
  A282["#282 L2-12 Doku"] --> A283["#283 QS6-5 Export"]
  A283 -. baut fachlich auf .-> U7
  P2 -. 4 Doku-Dateien .- A283
  P2b -. 4 Doku-Dateien .- A283
  P3 -. 4 Doku-Dateien .- A283
  K155["#155 Kiosk-TDF"] -. ENTWICKLUNGSTAGEBUCH.md .- A283
  W124["#124 Wallboard"] -. keine Überschneidung .- main
```

Erläuterung: Durchgezogene Pfeile zwischen Drafts sind Basis-Branches (`git merge-base --is-ancestor`: P1 in P2, P2b und P3; P2 in P2b und P3; P2b und P3 sind Geschwister). #283 enthält den Commit von #282. Die Überschneidungen von #231, #233 und #234 mit #282 und #283 betreffen nur `docs/BACKLOG.md`, `docs/CURRENT-STATUS.md`, `docs/ENTWICKLUNGSTAGEBUCH.md` und `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml`. #278, #226, #222 und #124 haben keine Dateien mit #282 oder #283 gemeinsam.

## #278 Rückfallnetz und Vorschau-Prüfschritte

Rückfallnetz auf `main` (`34f20a3`, Datei `vite.config.ts`, 83 Zeilen):

- Plugin `sysing:ensure-css-config` vorhanden: Definition Zeilen 42 bis 54 (`enforce: "pre"`, `config()` liefert `css.devSourcemap: false`, `configResolved()` ergänzt fehlendes `css`-Objekt), eingebunden in beiden Pluginlisten Zeilen 70 bis 81 (`[ensureCssConfig, visualizer(...)]` bei `ANALYZE=1`, sonst `[ensureCssConfig]`). Eingeführt mit Commit `08780fa` (PR 277, gemergt 2026-11-04, Merge `8efb91d`).
- Zusätzlich `css: { devSourcemap: false }` in Zeile 66 (PR 275, Commit `e074ec9`).
- #278 ändert `vite.config.ts` nicht; das Rückfallnetz bleibt beim Merge erhalten.

Auswertung `docs/BERICHT-2026-11-04-PR278-LOKALTEST.md`:

- Lokal belegt: Fälle A (mit Plugin) und B (ohne Plugin) mit PR 278 funktionieren (Stylesheets aus `/vendor/react-pdf/`, Text markierbar, Link klickbar, Konsole ohne Fehler).
- Nicht belegt: Der Absturz „reading 'devSourcemap'“ ist lokal auch ohne jede Absicherung (Fall C2) nicht nachstellbar; die Wirksamkeit in der Lovable-Vorschau ist offen.
- Bewertung im Bericht: #278 behebt den Fehler bei `src/styles.css` nicht; das Plugin bleibt voraussichtlich nötig.
- Lücken: echter Aufruf über Export und Downloads mit Anmeldung, PDF mit Formularfeldern, kurzzeitig ungestylte Text- und Linkebene (FOUC).
- Seither unverändert: `react-pdf` ist auf `main` und Branch `^10.4.1`; `src/components/PdfCanvasViewer.tsx` ist auf `main` seit der Basis `e948e93` nicht geändert.

Prüfschritte in der Lovable-Vorschau (vor dem Merge; keine Schreibaufträge an Lovable parallel, R-07):

1. Der Vorschau-Stand muss #278 enthalten (Branch-Stand in Lovable mit Commit `281c665` oder nach `update-branch` dem neuen Head); Commit-SHA im Protokoll festhalten.
2. Vorschau neu laden mit offener Browser-Konsole; die Konsole und das Lovable-Fehlerpanel dürfen keinen Fehler `reading 'devSourcemap'` zeigen.
3. Anmelden mit einem Demo-Konto mit Exportrecht (Administrator oder Projektmanager).
4. Weg 1: Export-Dialog (`ExportDialog`) öffnen, PDF-Vorschau starten; das PDF muss erscheinen.
5. Weg 2: Download-Center (`DownloadCenterDialog`) öffnen, ein PDF in der Vorschau öffnen.
6. Im Netzwerk-Reiter müssen `/vendor/react-pdf/AnnotationLayer.css` und `/vendor/react-pdf/TextLayer.css` mit HTTP 200 geladen werden; im `head` muss je Datei genau ein `link[data-react-pdf-css]` stehen, auch nach zweimaligem Öffnen.
7. Text im PDF markieren (Dreifachklick); die Markierung muss sichtbar über dem Text liegen.
8. Einen Link im PDF anklicken (falls im Export vorhanden); er muss reagieren.
9. Beobachten, ob Text- oder Linkebene beim ersten Öffnen kurz ungestylt erscheint (FOUC); Befund notieren.
10. Wenn verfügbar, ein PDF mit Formularfeldern öffnen; sonst als „nicht geprüft“ vermerken.
11. Ergebnis mit Datum, Konto, Commit und Screenshots als Nachweis (EV-Eintrag in `docs/NACHWEISE.yaml`) ablegen; danach `update-branch`, alle CI-Checks abwarten, Merge per REST nach Owner-Freigabe.
12. Das Entfernen des Plugins ist nicht Teil dieser Prüfung; es erfolgt nur in einem eigenen Folge-PR nach einer fehlerfreien Vorschau ohne Plugin.

## Offene Fragen

1. Sollen die Planungsdateien `docs/superpowers/plans/2026-10-27-l2-cockpit-p2b.md` und `docs/superpowers/plans/2026-10-27-l2-cockpit-p3.md` vor dem Schließen von #233 und #234 nach `main` übernommen werden, oder genügt der Erhalt auf den Branches (Branches bleiben beim Schließen bestehen)?
2. #155: Wird das TDF-Schnittstellendokument SYSING-KIOSK-001 nach der Entscheidung Weg A noch gebraucht, und soll das zusätzliche Pflicht-Gate (Driftcheck in `docs:check`, DOCX-Build in CI) eingeführt werden? Ob der Driftcheck auf aktuellem `main` besteht, ist nicht ermittelt.
3. #124: Soll die externe Wallboard-Vertragsvorarbeit als Idee nach `main`, offen bleiben oder geschlossen werden?
4. Wer schließt die als „ersetzt“ bewerteten PRs, und mit welchem Kommentartext (Verweis auf die Ersatz-PRs)? Das Schließen ist nicht Teil dieses Leseauftrags.
5. Reihenfolge #282 und #283: #283 enthält den Commit von #282; ob #282 einzeln vor #283 gemergt oder durch #283 mitgenommen wird, ist nicht festgelegt.
6. Für die Lovable-Vorschau von #278: Welches Demo-Konto mit Export und welches PDF mit Formularfeldern stehen zur Verfügung?
