---
id: A05
titel: "Engineer-Abnahme (QS-06) planen"
status: erledigt
start: 2026-11-06T06:15+01:00
ende: 2026-11-06T06:24+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: e8afbc6b
ci: "läuft (Head e8afbc6b)"
---

# Bericht A05


## Ergebnis

1. Engineer = Rolle `engineer` („Systemingenieur“, Alex und Sam); kein `billing.view`, aber `activity.edit` (`src/lib/rbac/permissions.ts:202-210`).
2. Startseite, Tab-Leiste, Projektdetail, Projektbericht und Tätigkeitsliste sind am Code korrekt gegated; per E2E sind für Engineer nur Kachel und Reiter belegt (`e2e/specs/rbac/qs06-billing-view.spec.ts`, lokal 7/7 bestanden auf `27dbcae3`).
3. Neue Befunde: Tätigkeitsdialog zeigt Stundensatz (145) und Betrag ohne `billing.view` (F-QS6-ENG-01); „Vollständiges JSON-Backup“ exportiert `hourlyRate` für alle Rollen (F-QS6-ENG-02). Beide nicht in PR 273/283.
4. Plan: neue Spec `e2e/specs/rbac/qs06-billing-view-matrix.spec.ts` mit QS6-E2E-01 bis -11 über 7 Rollen; 8 bis 12 h inklusive Fix Dialog und Doku.
5. Handliste QS6-ENG-01 bis -14 für alex@ (Stichprobe sam@) in der Lovable-Vorschau als Nachweis zur Ergänzung von EV-0005.

## Beobachtungen

| Punkt                   | Beobachtung                                                        | Beleg                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rollenname              | `engineer`, Anzeige „Systemingenieur“, Seed-Rolle `engineer`       | `src/lib/user-management.ts:49`, `e2e/fixtures/supabase-e2e.ts:26-34`, `docs/DEMO-USERS.md:17`                                          |
| billing.view Engineer   | nein                                                               | `src/lib/rbac/permissions.ts:202-210`, `docs/RBAC-MATRIX.md:49`                                                                         |
| Startseite / Tab-Leiste | gegated, E2E vorhanden                                             | `src/routes/_authenticated/dashboard.tsx:803`, `:858`; `e2e/specs/rbac/qs06-billing-view.spec.ts:21-31`                                 |
| Projektdetail           | gegated, kein E2E                                                  | `src/components/dashboard/views/ProjectDetailView.tsx:106`, `:212`, `:314`, `:341`                                                      |
| Projektbericht          | Schalter über `avkk.view`, Bericht ohne Betragsfelder, kein E2E    | `ProjectDetailView.tsx:184-192`, `src/lib/report/definitions/avkk.ts`                                                                   |
| Tätigkeitsliste         | gegated, nur Komponententest ohne Rolle                            | `src/components/dashboard/views/ActivitiesView.tsx:108`, `:141`, `:189`; `src/__tests__/components/crud-view-gating.test.tsx`           |
| Tätigkeitsdialog        | **nicht gegated** (Stundensatz, Status, Betrag)                    | `src/components/dashboard/dialogs/ActivityDialog.tsx:133-150`, `:174-195`, `:206-211`; Vorgabe `src/components/dashboard/domain.ts:105` |
| Export CSV/Excel/PDF    | auf `main` offen; PR 283 (Draft, CI 15/15) gated, E2E für EN/VI/TL | PR 283 Head `4b82a0a1`, `src/hooks/useExportDialog.ts`, E2E-Blöcke in `qs06-billing-view.spec.ts`                                       |
| JSON-Backup im Export   | **nicht gegated**, enthält `hourlyRate`                            | `src/routes/_authenticated/dashboard.tsx:335-352`, `:1168`; `src/components/ExportDialog.tsx:261-271`                                   |
| Import / Export… (JSON) | für Engineer nicht erreichbar (kein `azure.export`)                | `src/components/dashboard/header/ServiceMenu.tsx:194`                                                                                   |
| Lokaler E2E-Lauf        | 7/7 bestanden, 1,3 min inklusive Kaltstart                         | `npx playwright test e2e/specs/rbac/qs06-billing-view.spec.ts` am 2026-11-06 auf `27dbcae3`                                             |

## Abweichungen und Fragen

- Abweichung: `docs/BERICHT-QS6-4-ANALYSE.md` führt F-QS6-ENG-01 und -02 nicht; die Pfadtabelle sollte ergänzt werden.
- Abweichung: Rot gemeldete Starttests (`a11y`, `error-states`, `dashboard`) wurden nicht nachgeprüft; der QS-06-Spec lief grün.
- Frage 1: Darf der Engineer im Dialog „abrechenbar“ und Status setzen, nur ohne Satz/Betrag? Woher kommt der Satz?
- Frage 2: JSON-Backup als eigene Sicherung erlaubt oder wie Export filtern?
- Frage 3: Fixes in PR 283 aufnehmen oder eigenes Paket nach Merge?
- Frage 4: sam@ vollständig oder Stichprobe?
- Frage 5: Gilt die E2E-Matrix als Abnahme für QS6-2/QS6-3 („Rollen-Matrix-Test je Rolle“)?

## Abschluss

- Prüfung durch Claude Code: F-QS6-ENG-01 am Code bestätigt (`src/components/dashboard/dialogs/ActivityDialog.tsx:33` berechnet den Betrag, `:134-146` zeigt das Feld Stundensatz, keine Rechteprüfung im Dialog; `src/lib/rbac/permissions.ts:202-210` Engineer mit `activity.edit`, ohne `billing.view`).
- Abweichung: keine Umsetzung, nur Plan (Grenze des Auftrags). Der Befund F-QS6-ENG-01 betrifft das Gate QS-06 vor dem Publish.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: Plan Engineer-Abnahme (Entwurf), Umsetzung nach Freigabe
Projektstatus: Publish No-Go (R-07, R-14); QS-06 mit neuem Befund F-QS6-ENG-01
Offene_Fragen:
  - Darf der Engineer im Tätigkeitsdialog abrechenbar und Status setzen, ohne Satz und Betrag?
  - JSON-Backup als Sicherung oder als Export behandeln?
  - Fix in PR 283 oder eigenes Paket?
  - sam@ vollständig oder Stichprobe?
  - E2E-Matrix als Abnahmekriterium für QS6-2 und QS6-3?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
