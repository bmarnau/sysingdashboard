# Lovable-Publish-Prüfung und Go/No-Go (R-07)

Stand: 2026-10-24 · bezieht sich auf `main` 5a32898 · Tracker: R-07, L0b-Testplan, L8

## Zweck

Vor jeder Veröffentlichung klärt eine **read-only Prüfung in Lovable**, was Lovable
tatsächlich veröffentlichen würde. Hintergrund (R-07): Lovable erzeugt bei Arbeitskopien
wiederholt den verbotenen Auth-Storage-Broker (`previewAuthStorage.ts`, Änderung in
`client.ts`). Der Test `supabase-client-contract.test.ts` verbietet ihn; ein Merge nach
`main` ist daher ausgeschlossen. Ob Lovable aus `main` oder aus der eigenen Arbeitskopie
veröffentlicht, ist bisher nicht belegt.

## Ablauf

1. Lovable, Git-Seite: **Re-check**. Erwartet: "In sync with GitHub", kein
   `lovable-sync-*`-Branch. Bei "Lovable ahead" oder Sync-Branch: nichts übernehmen,
   Screenshot an die Projektleitung.
2. Prompt unten in den Lovable-Chat geben. Der Prompt ist rein lesend.
3. Antwort gegen die Kriterien auswerten. Die Entscheidung trifft der Owner.

## Prompt (read-only)

```text
Nur lesen. Nichts ändern, nichts committen, nichts veröffentlichen, keinen Sync auslösen, keine Datenbankänderung.

Erwarteter GitHub-Stand: bmarnau/sysingdashboard, Branch main, Commit <aktueller main-Commit>.

Bitte berichte als kurze Liste:
1. Stand der Arbeitskopie: HEAD-Commit (Hash, Titel), Branch. Entspricht er dem erwarteten Commit? Liegt Lovable vor, gleich oder hinter GitHub?
2. Auth-Storage-Broker: Gibt es src/integrations/supabase/previewAuthStorage.ts oder eine Änderung in src/integrations/supabase/client.ts, die einen Auth-Storage-Broker einführt? ja/nein, mit Dateinamen.
3. Veröffentlichung: Welcher Stand ist aktuell veröffentlicht (Zeitpunkt, Commit oder Version)? Was würde ein Klick auf "Publish" jetzt veröffentlichen: den Stand von GitHub-main oder die Lovable-Arbeitskopie? Bitte konkret mit Commit.
4. Dateien: Existieren src/components/dashboard/dialogs/PublishToTeamDialog.tsx und src/lib/demo-data/dataset.ts? Nenne in dataset.ts den Wert von DEMO_DATASET_VERSION (erwartet 2.2.0) und in src/lib/customer-data/publish-to-team.ts, ob die Funktion effectiveEngineerId vorhanden ist (ja/nein).
5. Offene Lovable-Arbeit: Gibt es nicht übernommene Änderungen oder Branches mit dem Namen lovable-sync-*? Name und Anzahl der Commits.

Keine Schlüssel, Tokens oder Geheimnisse ausgeben. Wenn eine Frage nicht beantwortbar ist, schreibe "nicht ermittelbar" und den Grund.
```

## Auswertung (Go/No-Go-Kriterien)

| Kriterium                                                                  | Go                         | No-Go                                           |
| -------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| Arbeitskopie = erwarteter `main`-Commit                                    | ja                         | Lovable vor oder hinter GitHub                  |
| Auth-Storage-Broker in der Arbeitskopie                                    | nein                       | ja                                              |
| Publish-Quelle                                                             | `main` oder Stand = `main` | eigene Arbeitskopie mit Abweichung              |
| `PublishToTeamDialog`, `dataset.ts` 2.2.0, `effectiveEngineerId` vorhanden | ja                         | fehlt                                           |
| Offene `lovable-sync-*`-Änderungen                                         | keine                      | vorhanden und nicht bewertet                    |
| "nicht ermittelbar" bei Punkt 2 oder 3                                     | -                          | No-Go, bis geklärt (Support-Anfrage an Lovable) |

Ein Go gilt nur für den geprüften Commit. Nach jeder neuen Änderung in Lovable oder auf
`main` ist die Prüfung zu wiederholen. Die Veröffentlichung selbst führt der Owner aus.

## Nach dem Go: Volltest auf der veröffentlichten App

Siehe Tracker, Paket L0b (`testplan`) und `docs/DEMO-USERS.md` (Zuordnung der Testinstanz).
Die Datenbank ist für Preview und veröffentlichte App dieselbe; der Test erzeugt keine
zusätzlichen Schreibrisiken über die in ADR-0037 geregelten Demo-Daten hinaus.
