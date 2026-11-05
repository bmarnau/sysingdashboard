---
id: A15
titel: "QS6-5: Beträge in Exporten nur mit billing.view"
status: erledigt
start: 2026-11-05T07:10+01:00
ende: 2026-11-05T08:03+01:00
branch: fix/qs6-5-export-billing-view
pr: 283 (Draft, enthält PR 282)
commit: 4b82a0a1
ci: "15/15 grün (CI 41983443402, Security 41983443352), Head 4b82a0a1"
---

# Bericht A15

## Ergebnis

1. Ohne `billing.view` enthalten CSV, JSON, Azure-Table, PDF und die Vorschau im Export-Dialog keine Stundensätze, Beträge oder Summen. Die Felder fehlen ganz, die Stunden bleiben.
2. Die Prüfung sitzt zentral am Datenaufbau: `createExportDTO` verlangt den Rechte-Kontext als Pflichtparameter, und `toExportActivity` entfernt `hourlyRate`.
3. „Import / Export…“ (`JsonExportService`) verweigert ohne das Recht den Gesamtexport und die Bereiche mit Beträgen. Grund: Das eigene Schema verlangt `hourlyRate`, eine Datei ohne Satz wäre also nicht wieder importierbar. Heute erreichen nur Rollen mit `billing.view` diesen Weg.
4. Mit `billing.view` bleibt alles unverändert. Rollenmatrix und Datenbank sind nicht geändert.
5. Aufwand etwa 1 h statt der geschätzten 7–11 h.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Datenaufbau | `ExportBillingScope` Pflicht; `amount`/`totalAmount` optional und ohne Recht entfernt | `src/lib/export-data.ts` |
| CSV, JSON, Azure-Table | Spalten `hourlyRate`, `amountEur` bzw. `HourlyRate`, `AmountEur` entfallen | `src/lib/text-export.ts` |
| PDF | Spalte „Betrag“ und „Gesamtbetrag“ entfallen; Tätigkeitstabelle hatte nie Beträge | `src/lib/pdf-export.ts` |
| Vorschau | Beträge im Dialog nur mit Recht | `src/components/export/ExportSummary.tsx`, `src/hooks/useExportDialog.ts` |
| Import / Export, Sicherung | `includeBilling` Pflicht; Sicherung übergibt `true` (nur `backup.restore`) | `src/lib/json-export-service.ts`, `src/lib/backup/zip.ts`, `src/components/ImportExportDialog.tsx` |
| Unit | 19 Fälle je Exportweg mit und ohne Recht, plus Invariante: Rollen mit `azure.export` bzw. `backup.restore` haben `billing.view` | `src/__tests__/security/qs6-5-export-billing.test.ts` |
| E2E | CSV-Export: viewer und engineer ohne Satz und Betrag, teamlead mit | `e2e/specs/rbac/qs06-billing-view.spec.ts`; lokal grün, CI Job 11 grün |
| Unit gesamt lokal | 1280 von 1282 grün; rot nur der Zeitüberlauf in `BackendAdminDialog`, der auch ohne die Änderung auftritt (Backlog) | Lauf ohne A15 in `wt-docs`: dieselben 2 Fälle rot |
| CI | 1. Lauf rot: ESLint `no-irregular-whitespace` (die Shell hat ein echtes BOM-Zeichen in den E2E-Test geschrieben); behoben in 4b82a0a1, danach 15/15 | Lauf 41983056991 (rot), 41983443402 (grün) |
| Doku | CHANGELOG 1.70.0, Handbuch (Rollen & Berechtigungen), Tracker, Status, Tagebuch, Backlog | Commit 435c6e8c |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: PR 283 enthält PR 282 (per Merge), weil beide CHANGELOG, Handbuch und Tracker ändern. Merge-Reihenfolge: erst 282, dann 283.
- Entscheidung des Owners: Soll der JSON-Export für Rollen ohne Recht möglich sein? Dafür müsste `hourlyRate` im Schema optional werden, dazu eine Import-Regel.
- Offen: Der Abrechnungsstatus (`billingStatus`) bleibt in Exporten ohne Recht, obwohl die Oberfläche ihn ausblendet. Er war nicht beauftragt und steht im Backlog.
- Nicht geprüft: Der Leistungsnachweis-Export ist nicht geändert (nur `performance.statement.manage`, diese Rollen haben `billing.view`).
- `Project.budget` wird in der Oberfläche als Stunden angezeigt, die Demodaten enthalten aber Werte wie 96000. Das ist nicht bewertet.
- QS6-4 schließen: Entscheidung des Owners steht aus.
- A16 ist nicht begonnen, weil der Owner eine Pause angeordnet hat.

Hygiene: 0 gemergte Remote-Branches, 10 offene PRs, davon 9 Drafts.

```yaml
Reifegrad: "QS6-5 umgesetzt und getestet (Draft, nicht gemergt)"
Projektstatus: "Golden Gate vor Publish; offen: Merge PR 282 und 283, A16 (Audit K1/K2), R-07"
Offene_Fragen:
  - "Merge-Reihenfolge PR 282, dann PR 283"
  - "JSON-Export für Rollen ohne billing.view (Schemaänderung) ja oder nein"
  - "billingStatus in Exporten ohne Recht entfernen?"
  - "QS6-4 schließen"
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
