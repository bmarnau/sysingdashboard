---
id: A42
titel: "Vertragstest: jede Rolle mit backup.restore hat billing.view"
status: erledigt
start: 2026-11-07T08:05+01:00
ende: 2026-11-07T09:00+01:00
branch: test/a42-backup-restore-billing-view
pr: "#289 (Draft)"
commit: dcf2b23a
ci: PR 289 CI 15/15
---

# A42 Bericht: Vertragstest `backup.restore` ⇒ `billing.view`

## Ergebnis

Der Draft-PR #289 fügt nur einen Test hinzu: `src/__tests__/security/backup-restore-billing-view.contract.test.ts`.
Die Invariante war bereits **direkt** geprüft, nämlich in `src/__tests__/security/qs6-5-export-billing.test.ts` Z. 179–192 (`it.each(["azure.export", "backup.restore"])` über `Object.keys(ROLE_PERMISSIONS)`). `src/lib/backup/zip.ts` Z. 114–116 verweist im Kommentar auf genau diesen Test.
Der bestehende Test hat vier Lücken: Die Fehlermeldung nennt weder die Rolle noch `zip.ts`. Er läuft auch ohne Fehler durch, wenn keine Rolle `backup.restore` hat. Die Backend-Matrix prüft er nicht. Einen Negativfall gibt es nicht.
Der neue Vertragstest schließt diese Lücken. Die Prüffunktion ist parametrierbar, die Rollen- und Rechtematrix bleibt unverändert, eine Migration gibt es nicht.
**Befund DB:** In `public.has_permission` fehlt `billing.view` für administrator, teamlead und projectmanager. DB-seitig ist die Invariante damit für administrator verletzt.

| Punkt                                    | Beobachtung                                                                                                                                                                                                                                                                                                | Beleg                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Frontend-Matrix                          | `backup.restore` haben systemadministrator und administrator, beide haben `billing.view`                                                                                                                                                                                                                   | `src/lib/rbac/permissions.ts` Z. 119–203         |
| Bestehende Prüfung                       | direkt, aber ohne Meldung, Nicht-Leerlauf, Backend und Negativfall                                                                                                                                                                                                                                         | `qs6-5-export-billing.test.ts` Z. 179–192        |
| Neuer Test (7 Fälle)                     | Frontend-Matrix, Nicht-Leerlauf, Backend-Matrix (`backend/services/rbac.mjs`), gleiche `backup.restore`-Träger in Frontend und Backend, Negativfall (künstliche Matrix → `["administrator","kuenstlich"]`, Meldung enthält `src/lib/backup/zip.ts`), Positivfall, Anker `includeBilling: true` in `zip.ts` | PR #289                                          |
| Meldung                                  | „QS-06: Rollen mit backup.restore müssen billing.view haben, weil src/lib/backup/zip.ts (buildZip, includeBilling: true) hourlyRate immer in die Sicherung schreibt …“ plus Liste der verletzenden Rollen                                                                                                  | Testdatei                                        |
| Backend-Matrix                           | stimmt mit dem Frontend überein (wird zusätzlich von `scripts/check-rbac.mjs` geprüft)                                                                                                                                                                                                                     | lokaler Abgleich                                 |
| DB-Matrix                                | Letzte Fassung von `has_permission`: `20260921095742_bsf03b_performance_statement.sql`. `billing.view` fehlt bei administrator, teamlead und projectmanager; systemadministrator erhält es implizit (`_perm <> 'kiosk.view'`). Sonst keine Abweichung. In `supabase/` nutzt keine Stelle `billing.view`.   | Skriptabgleich gegen `backend/services/rbac.mjs` |
| Security-Tests                           | 23 Dateien, 190 Tests grün                                                                                                                                                                                                                                                                                 | `npx vitest run src/__tests__/security`          |
| lint / typecheck / docs:check / Prettier | 0 Fehler (20 bestehende Warnungen) / ok / synchron / unverändert                                                                                                                                                                                                                                           | lokaler Lauf                                     |
| Gesamtlauf lokal                         | Lauf 1: 1318 grün, 4 rot. Lauf 2 unter Last: 1292 grün, 18 rot. Ursache: Zeitüberschreitungen 5000 ms und Folgefehler (`runner.test.ts`, `backup/create.test.ts`, Dialogtests, `compose.test.ts` 100 ms). Auch einzeln laufen diese Tests in Timeouts. Der PR ändert diese Dateien nicht.                  | in der CI grün                                   |
| CI                                       | 15/15 pass                                                                                                                                                                                                                                                                                                 | `gh pr checks 289`, Head `dcf2b23a`              |
| Remote                                   | `git ls-remote` = `dcf2b23a45a85445eeb3314204ad21651fd1b84e`                                                                                                                                                                                                                                               | Push 2026-11-07                                  |

## Offene Fragen

- **DB-Abweichung (`billing.view`):** Die Frontend-Matrix ist laut `scripts/check-rbac.mjs` die Single Source of Truth. Die DB-Funktion `has_permission` kennt `billing.view` aber nur für den systemadministrator. Solange keine RLS-Policy und kein RPC `billing.view` prüft, hat das keine Wirkung. Wird `billing.view` serverseitig genutzt, sehen administrator, teamlead und projectmanager keine Beträge mehr. Owner-Entscheid nötig: als Migration nachziehen (Datenauftrag nach ADR-0037) oder als bewusste Abweichung dokumentieren.
- Soll der alte Invariantenfall in `qs6-5-export-billing.test.ts` bleiben oder durch den Vertragstest ersetzt werden? Er ist jetzt redundant, schadet aber nicht. Der Kommentar in `zip.ts` Z. 115 verweist weiter auf die alte Datei.
- Tracker, CURRENT-STATUS und BACKLOG sind nicht im Code-PR geändert. Die Texte stehen in `A42-TEXTE.md` für das Tagesbündel.
- Kein CHANGELOG-Eintrag, weil die Änderung für Nutzer nicht sichtbar ist.

## Eigene Ideen

- Einen statischen Vertragstest „Frontend-Matrix ↔ `has_permission`“ ergänzen, der das SQL der letzten Migration parst (wie das Abgleichskript in diesem Auftrag). Bekannte Abweichungen kommen in eine Ausnahmeliste, dann fällt jede neue Abweichung auf.
- Den Kommentar in `zip.ts` Z. 115 bei der nächsten Codeänderung auf die neue Vertragstestdatei umstellen.
- Langfristig `includeBilling` in `buildZip` aus `can(user, "billing.view")` ableiten statt fest auf `true` zu setzen. Dann wird der Vertrag zur Absicherung und ist keine Voraussetzung mehr.
- Die lokalen Timeouts (5 s in `runner.test.ts` und `backup/create.test.ts`, 100 ms in `compose.test.ts`) treten unter Last wiederholt auf. Abhilfe: Timeouts gezielt erhöhen oder `--pool` begrenzen.

## Abschluss

HYGIENE: _Platzhalter, wird vom Planer nach `npm run git:hygiene` gefüllt._

```yaml
Reifegrad: "Vertragstest fertig (Draft-PR #289, CI 15/15 auf dcf2b23a); nicht gemergt"
Projektstatus: "Golden Gate: Publish No-Go (R-07); QS-06-Annahme des ZIP-Backups jetzt per Vertragstest abgesichert, DB-Matrix weicht bei billing.view ab"
Offene_Fragen:
  - "Owner: DB-Funktion has_permission um billing.view ergänzen (ADR-0037) oder Abweichung dokumentieren"
  - "Alten Invariantenfall in qs6-5-export-billing.test.ts behalten oder entfernen"
  - "Merge von #289 erst, wenn Lovable nicht schreibt"
Roadmap:
  Sprints_bis_BSF: "zu belegen (laut Tracker)"
  Sprints_bis_MVP: "zu belegen (laut Tracker)"
```
