---
id: A40
titel: "Entscheidungen 2026-11-07 ins Git: Gate G24, bm@-Restrisiko, R-04, Folgepunkte"
status: erledigt
start: 2026-11-07T07:52+01:00
ende: 2026-11-07T08:12+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286
commit: b7c42a76
ci: docs:check/docs:project grün; Draft 286
---

# A40-Bericht

Grundlage: Auftrag `queue/A40.yaml` (`origin/ops/queue`), Anlage `queue/anlagen/RP-02-ergebnis-2026-11-07.md` (Teile G und H selbst geprüft), `reports/A38-BERICHT.md` (`origin/ops/reports`), Worktree `wt-a40` auf Tagesbündel `0abc7662`. Nur Doku, nichts committet. Quelle aller Entscheidungen: Owner 2026-11-07, Planer-Auftrag A40.

## Ergebnis

1. G24 „RLS-Invariante vor Publish belegt“ ist als Muss-Gate in Gate-Bericht (Nachtrag, Tabelle, YAML) und Publish-Plan (D6, P4, PP-11, `muss_gates`) eingetragen, Stand **erfüllt** laut RP-02 vom 2026-11-07, **gültig bis 2026-11-14**.
2. G20 ist Folgepunkt nach dem Publish; Restrisiko bm@ als RA-02 (Nachfrist 30 Tage nach dem Publish) in `RISIKOREGISTER.yaml` und `.md`.
3. Neue Zählung: 23 geführte Gates, davon 22 vor dem Publish: **7 erfüllt, 2 in PR, 1 extern, 12 offen**; 1 Folgepunkt (G20); G23 Vorschlag, nicht gezählt. Muss-Gates im Publish-Plan: 15, davon 4 erfüllt, 2 in PR, 9 offen.
4. R-04: zweite Vertrauensperson als Rolle Familie/Lebenspartner in Zugangsübersicht, Notfallhandbuch (Lücke 2, Kontenregel 1) und Risikoregister; kein Name, Umschlag und Zugang offen, ZN-18 (kiosk@) offen.
5. Backlog: QS-01 C′ vor L8 (kein Gate), PR 155 und PR 124 nach dem Publish, A07 nach A39, Abschnitt „Ergänzung 2026-11-07“; R-07/R-10 unverändert.

| Punkt                     | Beobachtung                                                                                                                                                                                         | Beleg                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Prüfung RP-02 für G24     | Teil H: „RLS ist auf allen 25 Tabellen aktiv“; `anon` nur auf den 9 Tabellen der Liste (SELECT/INSERT/UPDATE/DELETE). Teil G: 65 Policies, „Rollen sind durchgehend `{authenticated}`“; J2 nennt 25 Tabellen | Anlage Teil G (Kopf, 65 Zeilen), Teil H (Kopf und Tabellenzeile `anon`), Teil J2                                     |
| Herleitung Zählung        | A28: 22 Gates, 6/2/1/13. G20 offen → Folgepunkt (offen 12). G24 neu erfüllt (erfüllt 7, Gates 23). G23 nicht in Tabelle                                                                              | `docs/PUBLISH-GATE-BERICHT.md` Nachtrag „Ergänzung A40“, YAML `zaehlung_nachtrag_a40_2026_11_07`                      |
| Muss-Gates Publish-Plan   | Liste vorher 14 (G20 war nie Muss-Gate im Plan), jetzt 15 mit G24; `folgepunkte_nach_publish` mit G20                                                                                                | `docs/PUBLISH-PLAN.md` Abschnitt 3                                                                                   |
| RA-02                     | Owner, 2026-11-07, Gate G20, Befristung 30 Tage nach dem Publish, Ende mit Weg B oder neuer Entscheidung                                                                                            | `docs/RISIKOREGISTER.yaml` `risikoakzeptanzen`, `docs/RISIKOREGISTER.md` Abschnitt 5                                 |
| R-04                      | Rolle benannt, Umschlag und Zugang offen; YAML-Block `zweite_vertrauensperson`; ZN-03, ZN-18 mit Stand                                                                                              | `docs/ZUGAENGE-UND-NOTFALLKONTO.md` Abschnitte 3, 5, 6; `docs/NOTFALL-HANDBUCH.md` Abschnitt 6 Lücke 2, Abschnitt 7 |
| Backlog                   | QS-01 C′, G24, Anzeigemodus bm@, PR-Bestand ergänzt; neuer Abschnitt; fehlerhafte Strichzeile aus A38 entfernt                                                                                      | `docs/BACKLOG.md`                                                                                                    |
| Prettier                  | `--write` und `--check` auf allen 7 Dateien ohne Befund (über `node C:/dev/sysingdashboard/node_modules/prettier/bin/prettier.cjs`)                                                                | Lauf 2026-11-07 08:10 +01:00                                                                                         |
| YAML                      | `RISIKOREGISTER.yaml` und YAML-Blöcke in Gate-Bericht, Publish-Plan, Zugangsübersicht mit `js-yaml` geladen                                                                                         | Lauf 2026-11-07 08:11 +01:00                                                                                         |

## Offene Fragen

- G24 verfällt am 2026-11-14; der Publish liegt laut Plan frühestens in KW 48. RP-02 G und H muss daher in P4 wiederholt werden (Owner, ca. 0,5 h). Ein eigener Kurz-Datenauftrag nur für G und H wäre handlicher als die volle RP-02 (siehe Eigene Ideen).
- RP-02 H fragt nur vier Tabellenrechte ab; TRUNCATE, REFERENCES, TRIGGER sind für G24 nicht Kriterium (A38 B5, RP-02b).
- Abweichung: Der Auftrag nennt „G20 von Muss auf Folgepunkt“. Im Publish-Plan stand G20 nie in `muss_gates`; im Gate-Bericht gab es keine Muss-Spalte. Umgesetzt als neuer Stand „Folgepunkt“ im Gate-Bericht und als `folgepunkte_nach_publish` im Plan.
- Abweichung: `npx --prefix C:/dev/sysingdashboard prettier` fand Prettier nicht (Windows); Prettier stattdessen direkt über `node …/prettier.cjs` aus dem Hauptrepo aufgerufen, ohne Junction.
- Abweichung: In `docs/BACKLOG.md` stand eine Zeile aus A38, die nur aus Strichen bestand (vermutlich eine versehentlich übernommene Tabellen-Trennzeile); sie ist entfernt.
- Tracker, CURRENT-STATUS und Entwicklungstagebuch nicht geändert (Vorgabe); Texte in `A40-TEXTE.md`. `docs:check` und `docs:project` laufen in der Hauptsitzung.
- R-07/R-10 (`stand_support`) unverändert; Support-Antwort zu den leeren Migrations-Statements offen, Owner wartet bis Montag 2026-11-09.

## Eigene Ideen

- RP-02-GH als festen Kurz-Datenauftrag (nur Teile G und H, drei SELECT-Abfragen) in `docs/DATENAUFTRAG-RESTORE-PROBE.md` oder einer eigenen Datei ablegen, damit die Wiederholung für G24 in P4 in wenigen Minuten läuft und das Ergebnis maschinell gegen die 9er-Liste geprüft werden kann.
- `gueltig_bis` als Feld im YAML-Block des Gate-Berichts generell einführen und in `docs:check` prüfen (abgelaufener Beleg ⇒ Stand nicht „erfüllt“). Passt zum Backlog-Punkt „Gate-Zählung aus dem YAML-Block in docs:check“ (A26).
- Den CI-Vertragstest „RLS 25/25, keine Policy ohne `TO authenticated`“ gegen `supabase/schema/public-schema.sql` vor C′ einführen; er ersetzt den Live-Beleg nicht, verhindert aber, dass eine neue Migration die Invariante bricht.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 4 offene PRs, davon 3 Drafts.

```yaml
Reifegrad: Doku-Stand der Owner-Entscheidungen 2026-11-07 vollständig im Worktree; G24 belegt bis 2026-11-14
Projektstatus: Publish weiterhin No-Go (R-07); 22 Gates vor dem Publish, 7 erfüllt, 2 in PR, 1 extern, 12 offen; G20 Folgepunkt
Offene_Fragen:
  - Wiederholung RP-02 G und H in P4 (Beleg verfällt 2026-11-14)
  - Support-Antwort R-07/R-10 (Owner wartet bis 2026-11-09)
  - Notfallumschlag und Zugang der Vertrauensperson, Bestätigung ZN-18
  - G23 (A29) weiter ohne Owner-Entscheidung
Roadmap:
  Sprints_bis_BSF: unbekannt
  Sprints_bis_MVP: unbekannt
```

## Nachtrag 2 (2026-11-07, nach dem Merge von PR 283)

Grundlage: Auftrag `queue/A40.yaml` (`origin/ops/queue`, Schritte 7 und 8), detached Worktree `wt-a40b` auf Tagesbündel `9c502c30` (enthält `origin/main` `be712548`), `gh` und `git` nur lesend. Nur Doku, nichts committet. Quelle der Invariante: Owner 2026-11-07, Planer-Auftrag A40.

### Ergebnis

1. PR 283 ist gemergt (2026-11-07T07:08:08Z, `be712548`, Merge durch den Owner), 15 von 15 Checks am Head `9c60a92f`; CI und Security auf `main` `be712548` grün. G07 und G09 sind damit **erfüllt**.
2. G08 bleibt **offen, teilweise belegt**: Satz und Betrag sind ausgeblendet, Schalter „abrechenbar“ und Abrechnungsstatus sieht und setzt der Engineer weiter (Frage 1 ohne Antwort). G15 wechselt von „in PR“ zu **offen**: CHANGELOG 1.70.0 ohne K1/K2 und PR 278.
3. Neue Zählung: 23 Gates, 22 vor dem Publish: **9 erfüllt, 0 in PR, 1 extern, 12 offen**; 1 Folgepunkt (G20). Muss-Gates 15: **6 erfüllt, 0 in PR, 9 offen**. Gate-Bericht (Nachtrag, Tabelle, YAML), Publish-Plan (Text, `muss_gates`) und CURRENT-STATUS stimmen überein (maschinell gezählt).
4. Annahme **AN-01** in `docs/RISIKOREGISTER.yaml` (neuer Abschnitt `annahmen`, Verweis in R-14) und `.md` (Abschnitt 5a): ZIP-Backup 2.0 enthält `hourlyRate` immer, zulässig nur, solange jede Rolle mit `backup.restore` auch `billing.view` hat. Vertragstest als A42, Draft-PR folgt.
5. PR 282 ist laut `gh` `MERGED`, nicht nur geschlossen; Abweichung zur Planer-Aussage, siehe Offene Fragen.

| Punkt                     | Beobachtung                                                                                                                                                                                                       | Beleg                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CI PR 283                 | 15 Checks, alle `COMPLETED`/`SUCCESS` (Setup bis Quality Gate), Head `9c60a92f`                                                                                                                                   | `gh pr view 283 --json statusCheckRollup,headRefOid`; Läufe CI `42344220137`, Security `42344220105`                                             |
| CI `main` nach Merge      | Push-Läufe auf `be712548` `success`                                                                                                                                                                               | `gh run list --commit be712548…` (CI `42349983730`, Security `42349983737`)                                                                      |
| PR 282                    | `state: MERGED`, `mergedAt 2026-11-07T07:08:10Z`, `mergeCommit be712548`, `mergedBy: null`; Head `92bf1d3b` ist Vorfahr von `be712548` (über `34fc41a6` in PR 283)                                             | `gh pr view 282 --json state,mergedAt,mergeCommit,mergedBy,headRefOid`; `git merge-base --is-ancestor 92bf1d3b be712548`                         |
| G07                       | QS6-5 auf `main`, Tests je Exportweg mit und ohne Recht                                                                                                                                                           | `src/__tests__/security/qs6-5-export-billing.test.ts`                                                                                            |
| G08                       | Satz (`:146`) und Betrag (`:221`) hinter `canViewBilling`; Schalter und Status (`:168-199`) ohne Prüfung                                                                                                          | `src/components/dashboard/dialogs/ActivityDialog.tsx`; `docs/QS-06-VIEWER-ABRECHNUNG.md` Frage 1                                                 |
| G09                       | `buildJsonBackupPayload(…, { includeBilling: canViewBilling })`                                                                                                                                                   | `src/routes/_authenticated/dashboard.tsx:336-341`; `src/__tests__/security/qs6-ga09-json-backup.test.ts`                                         |
| G15                       | CHANGELOG 1.70.0 auf `be712548` mit QS6-5 und F-QS6-ENG, ohne K1/K2 (PR 287) und PR 278                                                                                                                           | `git show be712548:CHANGELOG.md`                                                                                                                 |
| G17                       | Neuer Sync-Branch `lovable-sync-1793985842` (`436ce690`, 2026-11-06T17:23:53Z, Basis `7dc4699d`, nur `north-star.md` und `types.ts` +5), nicht in der Doku; enthält `be712548` nicht                              | `git ls-remote --heads origin 'lovable-sync-*'`; `git diff --stat 7dc4699d 436ce690`                                                             |
| AN-01 Rollenmatrix        | `backup.restore` nur `systemadministrator` (`:131`) und `administrator` (`:156`); beide `billing.view` (`:143`, `:167`)                                                                                            | `src/lib/rbac/permissions.ts`                                                                                                                    |
| AN-01 Test                | Für jede Rolle in `ROLE_PERMISSIONS` mit `backup.restore` (und `azure.export`) wird `billing.view` erwartet; läuft in `test:security` (CI-Job 7)                                                                   | `src/__tests__/security/qs6-5-export-billing.test.ts:179-191`; `package.json:39`; `.github/workflows/ci.yml:238-258`                             |
| AN-01 Grenze              | Tagessicherung `scheduleDaily` läuft für jede angemeldete Rolle und legt das ZIP im IndexedDB ab; Download und Restore nur mit `backup.restore` (Backup-Dialog) bzw. `azure.import`/`backup.restore` (Azure-Import) | `src/routes/_authenticated/dashboard.tsx:309`; `src/lib/backup/create-backup.ts:115`; `ServiceMenu.tsx:174`; `AzureActionsPanel.tsx:98`          |
| Prettier                  | `--write` und `--check` der 5 geänderten Dateien ohne Befund                                                                                                                                                      | Lauf 2026-11-07, `node C:/dev/sysingdashboard/node_modules/prettier/bin/prettier.cjs`                                                            |
| YAML und Doku-Prüfungen   | `RISIKOREGISTER.yaml` und YAML-Blöcke in Gate-Bericht und Publish-Plan mit `js-yaml` geladen; `docs:check` „Doku ist synchron“; `docs:project` „Projektdoku konsistent“                                           | Lauf 2026-11-07 im Worktree (`docs:project` über eine temporäre Junction auf `node_modules`, danach entfernt)                                      |

### Offene Fragen

- **Befund PR 282:** Der Planer schreibt „PR 282 ist geschlossen“. `gh` zeigt `MERGED` mit `mergeCommit` `be712548` und leerem `mergedBy`. GitHub hat PR 282 als gemergt markiert, weil sein Head in PR 283 enthalten war. Inhaltlich ist PR 282 auf `main`; ein eigener Merge fand nicht statt. Beides ist so dokumentiert, nichts geraten.
- **G08, Frage 1 an den Owner:** Darf der Engineer im Tätigkeitsdialog den Schalter „abrechenbar“ und den Abrechnungsstatus weiter sehen und setzen? Bei „ja“ ist G08 erfüllt; bei „nein“ ist ein kleiner Fix nötig (ca. 1 h).
- **G09, Frage 2:** Durch die gemergte Umsetzung beantwortet (Export, Satz entfernen); eine ausdrückliche Aussage des Owners ist nicht abgelegt. Eine Bestätigung im nächsten Fragenblock wäre sauber.
- **G15:** Gehören K1/K2 (Paket-Updates `dompurify`, `shell-quote`) und PR 278 (PDF-Vorschau) als nutzersichtbar in den CHANGELOG 1.70.0? Entscheidung offen.
- **Befund AN-01:** Der Kommentar in `src/lib/backup/zip.ts:114-115` („Sicherungen erstellen nur Rollen mit `backup.restore`“) stimmt für die automatische Tagessicherung nicht: Sie läuft für jede Rolle. Der Inhalt stammt aus dem `localStorage` desselben Browsers, eine neue Datenquelle entsteht nicht; abrufbar ist das ZIP nur über Einstiege mit `backup.restore`. Der bestehende Test belegt die Rollenmatrix, nicht die Einstiegspunkte. A42 sollte beides abdecken.
- **AN-01, Server:** `billing.view` gibt es nur im Client; `supabase/schema/public-schema.sql` kennt das Recht nicht. Die Annahme gilt deshalb nur für die Client-Matrix.
- **Hinweis für A36:** Der Auftrag verlangt einen Verweis im Bericht A36 (`reports/A36-BERICHT.md`, `origin/ops/reports`). Dieser Worktree enthält `ops/reports` nicht; die Hauptsitzung sollte dort einen Satz ergänzen, z. B.: „Hinweis (2026-11-07): Das ZIP-Backup 2.0 enthält `hourlyRate` weiter; zulässig nur unter Annahme AN-01 (`docs/RISIKOREGISTER.yaml`). Option A berührt das ZIP-Backup nicht.“
- **Abweichung:** Tracker und Entwicklungstagebuch nicht geändert (Vorgabe); Texte in `A40N-TEXTE.md`. `docs:project` lief nur über eine temporäre Junction auf `C:/dev/sysingdashboard/node_modules`, die danach entfernt wurde.
- **G17:** Nach dem Merge `be712548` braucht es einen neuen Lovable-Sync; der neueste Sync-Branch basiert auf `7dc4699d`.

### Eigene Ideen

- A42 in zwei Teile schneiden: (a) Negativfall mit manipulierter Matrix (Rolle mit `backup.restore` ohne `billing.view` macht den Test rot), (b) statischer Test „jeder Aufruf von `BackupService.get`/`list` liegt hinter `backup.restore`“ (Grep über `src/` wie in `scripts/check-rbac.mjs`). Teil (b) schützt den Einstieg, den der heutige Test nicht prüft.
- Den Kommentar in `zip.ts:114-115` in A42 berichtigen: „Abrufen und Wiederherstellen nur mit `backup.restore`; die Tagessicherung läuft für jede Rolle (Inhalt = lokaler Browserstand)“.
- Die Tagessicherung nur für Rollen mit `backup.restore` starten (`scheduleDaily` hinter `can(...)`). Dann stimmt die Annahme wörtlich und im IndexedDB anderer Rollen liegen keine ZIPs. Folgepunkt, kein Gate; Owner-Entscheidung nötig, weil Engineers dann keine automatische Sicherung mehr haben.
- Invariante zusätzlich in `scripts/check-rbac.mjs` aufnehmen („Träger(`backup.restore`) ⊆ Träger(`billing.view`)“), analog zur bestehenden Regel `azure.import` ⊆ `azure.export`. Dann prüft sie auch `rbac:check` ohne Vitest.

### Abschluss

Hygiene: nicht ausgeführt (Worktree detached, kein Commit); laut `gh` 4 offene PRs (286, 288, 155, 124), davon 3 Drafts.

```yaml
Reifegrad: Gate-Stand nach dem Merge von PR 283 belegt und in Gate-Bericht, Publish-Plan und CURRENT-STATUS konsistent; AN-01 dokumentiert, Vertragstest A42 offen
Projektstatus: Publish weiterhin No-Go (R-07); 22 Gates vor dem Publish, 9 erfüllt, 0 in PR, 1 extern, 12 offen; Muss-Gates 6 von 15; kritischer Pfad R-14 (G03, G05)
Offene_Fragen:
  - G08 Frage 1 (Abrechnungsstatus für den Engineer)
  - G15 CHANGELOG-Einträge K1/K2 und PR 278
  - Bestätigung Frage 2 (G09) durch den Owner
  - Tagessicherung für alle Rollen (Folgepunkt zu AN-01)
  - Lovable-Sync auf be712548 (G17)
  - Support-Antwort R-07/R-10 (Owner wartet bis 2026-11-09)
Roadmap:
  Sprints_bis_BSF: unbekannt
  Sprints_bis_MVP: unbekannt
```
