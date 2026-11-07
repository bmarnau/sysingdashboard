---
auftrag: A27
datum: 2026-11-07T07:20:00+01:00
branch: fix/qs6-5-export-billing-view
pr: 283
commit: 9c60a92f (PR 283)
ci: 15/15 grün, Head 9c60a92f
status: erledigt (Draft, kein Merge)
---

# A27: QS-06 G08/G09 in PR 283

## Befund
- Ausgangslage per REST: PR 283 war Draft, `mergeable: false`, `dirty`, Head 4b82a0a1. PR 282 war Draft, Head 92bf1d3b und ist in 283 enthalten. PR 282 wurde nicht verändert.
- Der Konflikt betraf nur `docs/CURRENT-STATUS.md`, Wiederanlaufpunkt: Auf main kam der Eintrag „Startroutine 2026-11-06“ hinzu, auf dem Branch der Eintrag „L2-12/QS6-5 2026-11-05“.
- F-QS6-ENG-01: `ActivityDialog.tsx` zeigte allen Rollen Stundensatz und Betrag.
- F-QS6-ENG-02: Das JSON-Backup (`exportData` in `dashboard.tsx`) schrieb `activities` ungefiltert, also mit `hourlyRate`.
- Speicherrisiko im Dialog: Ohne Feld hätte Ab- und Wiederanwählen von „Abrechenbar“ den Satz auf 0 gesetzt (`hourlyRate: next ? form.hourlyRate : 0`).
- Hinweis A37 geprüft:
  - ZIP 2.0 (`buildZip`) enthält die Rohdaten aus localStorage und `dashboard.json` mit `includeBilling: true`, also in beiden Teilen `hourlyRate`. Das gilt auch für den automatischen Tageslauf in jeder Rolle.
  - Das JSON-Backup aus „Export…“ hat keinen Importweg.
  - Der Schema-v1-Import verlangt `hourlyRate`.
- Nebenbefund: Im Worktree fehlte `node_modules` mitten im Lauf (Ursache unbekannt). Neu installiert mit `bun install --frozen-lockfile`.

## Änderung
- Merge `origin/main` (7dc4699d) in den Branch, Commit 7835edc7. In CURRENT-STATUS stehen beide Einträge chronologisch, dazu ein A27-Satz, dass 278 und 287 gemergt sind. `Stand:` steht auf 2026-11-07.
- `src/components/dashboard/dialogs/ActivityDialog.tsx`:
  - `usePermission("billing.view")` blendet Stundensatz und Betrag aus.
  - `toSave()` setzt ohne Recht `hourlyRate` beim Speichern auf den ursprünglichen Wert, wenn die Tätigkeit abrechenbar ist, sonst auf die Invariante 0.
  - Mit Recht ändert sich nichts.
- `src/lib/export-data.ts`: neu `buildJsonBackupPayload(input, scope)` auf Basis von `toExportActivity`.
- `src/routes/_authenticated/dashboard.tsx`: `exportData` nutzt diese Funktion mit `canViewBilling`.
- ZIP 2.0 bleibt bewusst unverändert und enthält `hourlyRate` vollständig, weil es die einzige Sicherung des Werts ist.
- CHANGELOG 1.70.0 hat einen neuen Punkt. Das Handbuch (QS-06 und Abschnitt Tätigkeiten) beschreibt jetzt das Verhalten für Engineer und Beträge. Damit ist der Widerspruch zu CHANGELOG:18 aufgelöst.
- Tracker (`fortschritt` 2026-11-07), Tagebuch und Backlog (A27-Nacharbeit) sind fortgeschrieben. Commit 9c60a92f.

## Tests
- Neu: `src/__tests__/components/ActivityDialog.billing-view.test.tsx` mit 18 Fällen.
  - Ohne Recht (Engineer, Viewer, Customer, Kiosk): keine Felder, kein €-Text, Satz bleibt beim Speichern erhalten, auch nach Ab- und Wiederanwählen.
  - Mit Recht (Systemadministrator, Administrator, Teamlead, Projektmanager): Felder sichtbar.
  - Dazu: nicht abrechenbar ergibt 0; ein Admin kann den Satz ändern.
  - Gegen den alten Dialog: 8 Fälle rot.
- Neu: `src/__tests__/security/qs6-ga09-json-backup.test.ts` mit 12 Fällen:
  - Backup ohne `hourlyRate` je verweigerter Rolle, mit `hourlyRate` je berechtigter Rolle.
  - Eingabedaten bleiben unverändert.
  - Der Import liest `hourlyRate`.
  - ZIP 2.0 (Tageslauf `manual: false`) enthält `hourlyRate` in den Rohdaten und in `dashboard.json`.
  - Ein Import ohne `hourlyRate` wird abgewiesen, gespeicherte Sätze bleiben.
- Lokal grün: typecheck, lint (0 Fehler, 20 Warnungen wie bisher), docs:check, docs:project, Prettier der geänderten Dateien.
- Lokaler Gesamtlauf `npm test`: 1275 bestanden, 34 fehlgeschlagen, 4 todo.
  - Alle Fehler gehen auf die überlastete Maschine zurück: Zeitlimits, die Leistungsgrenze in `compose.test.ts` (425 ms statt unter 100 ms) und ein Testprozess, der nicht startete.
  - Damit ist der lokale Lauf nicht aussagekräftig.
- CI auf Head 9c60a92f: 15 von 15 grün. Unit & Components: 183 Dateien, 1315 bestanden, 4 todo (Lauf 42344220137).
- PR 283 hat jetzt `mergeable: true`; `mergeable_state` ist `blocked`, weil der PR Draft ist und die Freigabe fehlt.
- PR-Kommentar: https://github.com/bmarnau/sysingdashboard/pull/283#issuecomment-6703167328

## Risiken
- R-A27-1: `hourlyRate` hat keine Datenbankspalte (A37). ZIP 2.0 sichert den Satz deshalb rollenunabhängig. Der Backup-Dialog ist nur mit `backup.restore` erreichbar, aber die Blobs liegen in IndexedDB im Browser jedes Kontos (wie localStorage).
- R-A27-2: Ein Restore aus einer fremden oder alten ZIP ohne `hourlyRate` würde Speicherschlüssel ganz zurückschreiben und Sätze verlieren. Die App erzeugt solche ZIPs nicht. Steht im Backlog.

## Eigene Ideen
- Ein Restore vergleicht vor dem Schreiben, ob die Sätze fehlen, und behält in dem Fall die vorhandenen. Damit wäre R-A27-2 abgedeckt.
- `hourlyRate` mittelfristig serverseitig mit RLS über `billing.view` speichern. Dann wäre das Browser-Backup nicht mehr die einzige Quelle.
- Abrechnungsstatus im Dialog ohne Recht einheitlich zur Tabelle behandeln (Entscheidung des Owners).
- Einen Vitest-Lauf mit begrenzten Workern (`--maxWorkers`) für lokale Abnahmen auf belasteten Maschinen festlegen.

## Abschluss
Hygiene: 0 gemergte Remote-Branches, 6 offene PRs, davon 5 Drafts.

```yaml
Reifegrad: "QS-06 G08/G09 im Code umgesetzt und durch CI belegt (15/15); G10 Engineer-Abnahme offen"
Projektstatus: "PR 283 Draft, mergeable, CI grün auf 9c60a92f; enthält PR 282; kein Merge, Publish No-Go (R-07)"
Offene_Fragen:
  - "G10: Abnahme mit Engineer-Konto in der Vorschau"
  - "Abrechenbar und Abrechnungsstatus im Dialog ohne billing.view weiter zeigen?"
  - "ZIP 2.0 sichert hourlyRate rollenunabhängig: akzeptiert?"
  - "Restore-Schutz gegen ZIP ohne hourlyRate einplanen?"
  - "Merge-Reihenfolge 282 vor 283 bestätigen"
Roadmap:
  Sprints_bis_BSF: 1
  Sprints_bis_MVP: 3
```
