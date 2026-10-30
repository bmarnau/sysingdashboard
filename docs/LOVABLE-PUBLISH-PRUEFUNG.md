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

## Bekannte Plattformabweichung (Stand 2026-10-25)

Lovable legt den Auth-Broker bei jedem Schritt in der Arbeitskopie neu an. Gegenüber GitHub-main
`1dd9c8447230a81c3c14f90689852ee2a78352a7` weichen genau drei Dateien ab (Lovable-Bericht
2026-10-25, Arbeitskopie `d510e85`, Merge aus `1dd9c84` und `6d94013`):

| Datei                                             | Arbeitskopie (SHA-256)                                             | main (SHA-256)                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `src/integrations/supabase/client.ts`             | `f8484c686a271fec973cb843be7cd6efe4ad027ca96ab4b1b3315eff79da26cc` | `d333ca49073b11a766a9e97f3dc80dfb917522dc324efce658ecea8117653214` |
| `src/integrations/supabase/previewAuthStorage.ts` | `5b00130146b77ecd8ed49f118c640d3e75aa7c5e76695f3b9e3f7f8833719f0a` | nicht vorhanden                                                    |
| `src/integrations/supabase/types.ts`              | `ef467ecf24731aa25fc71e51c97e699906832d3ffabac916354507b94e4ed144` | `13f25998d227cf577bf294b8bfadb8ec99fda045cc2628d13c748246b3b23763` |

Die Prüfsummen von `client.ts` und `previewAuthStorage.ts` entsprechen der Allowlist aus ADR-0036
(Stand `3fd8f74`). Neu gegenüber ADR-0036 ist `types.ts` (nur der generierte Block
`__InternalSupabase`, +5 Zeilen). Die ADR-0036-Ausnahme gilt nur für Datenbankanwendung, nicht für
Code-Aufträge, Preview oder Publish.

## Antwort des Lovable-Supports (2026-10-30)

Quelle: E-Mail von Lea (Lovable Support, Mitarbeiterin) im Ticket zu R-07. Die Aussagen sind Angaben des
Supports, keine eigenen Messungen. Zwei Automatik-Antworten (2026-10-29, 2026-10-30) enthielten keine Aussage.

| Frage                      | Antwort des Supports                                                                                                 | Status                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Broker abschaltbar?        | Nein, pro Projekt nicht. Absicht (Plattform-Update); `client.ts` wird nur umgeschrieben, wenn es dem Original ähnelt | Aussage des Supports                        |
| Wirkung in der Produktion? | Keine; nur in der Editor-Preview, veröffentlicht wird normales `localStorage`                                        | nicht gemessen                              |
| Publish-Quelle?            | Immer der aktuelle Lovable-Projektstand inklusive Zusatzdateien; kein Pinning auf Commit oder Branch                 | bestätigt                                   |
| `types.ts` (+5 Zeilen)?    | Standardblock zur API-Version; im Git: `__InternalSupabase` mit `PostgrestVersion` "14.5"                            | im Git geprüft, schon am 2026-10-25 bekannt |
| Sync-Branch umstellen?     | Lovable zieht auf den neuen Branch; Lovable-Änderungen werden nicht übernommen; vorher synchronisieren               | Aussage des Supports                        |
| Migrationsfragen (R-10)?   | Zurückgestellt; Rückfrage des Supports (Lovable Cloud oder eigenes Supabase-Projekt) offen                           | offen                                       |

Workaround des Supports (ungetestet am Projekt): Import in `client.ts` entfernen, die Zeile für den Auth-Speicher so ändern,
dass sie nicht mehr dem generierten Standard entspricht (z. B. `storage: window.localStorage`), `previewAuthStorage.ts`
löschen, eine kleine Änderung in Lovable machen und prüfen, dass die Dateien nicht zurückkommen. Alternative des Supports:
die Hilfsdatei im Vertragstest erlauben.

### Entscheidung des Owners (2026-10-30)

- Weg B zuerst (Helper entfernen), Weg A (Ausnahme im Vertragstest, ADR-0036 ändern) als Rückfall.
- Weg B ist eine Schreiboperation in Lovable und läuft nur nach ausdrücklicher Freigabe und nach vorherigem Sync.
- Der Sync-Branch `lovable-sync-1793295874` (2 Commits vor `main`, enthält genau die drei Dateien) wird nicht gemergt.
- Publish bleibt No-Go, bis Weg B oder A entschieden und nachgewiesen ist (kein Broker im Lovable-Projektstand, oder
  Vertragstest und ADR angepasst und Wirkungslosigkeit in der veröffentlichten App geprüft).
