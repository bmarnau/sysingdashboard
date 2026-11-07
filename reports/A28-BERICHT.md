---
id: A28
titel: Publish-Runbook und Owner-Entscheidungen D3, D4, D5 dokumentieren
status: erledigt
start: 2026-11-07T06:35+01:00
ende: 2026-11-07T06:55+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286
commit: bdc9dc09 (Tagesbündel)
ci: läuft am Head bdc9dc09, Stand im Kommentar zu PR 286
---

# A28 Bericht

## Ergebnis

1. `docs/PUBLISH-PLAN.md` neu: Phasen P0 bis P5, 14 Muss-Gates, Anforderungen PP-01 bis PP-10, Terminlage (Go frühestens KW 48, nicht in der Nacht zum 01.12.), Rollen, Rücknahme mit Verweis auf N1a und Merge-Checkliste Abschnitt 5, Ablauf als Mermaid.
2. D3, D4 und D5 sind mit Datum 2026-11-06 und dem Owner als Quelle (Planer-Auftrag A28) abgelegt: RA-01 im Risikoregister, QS6-4 als „kein Serverbefund“ in QS-06, Go-Ausnahme `types.ts` in der Publish-Prüfung.
3. Bei R-07 und R-10 ist der Stand der Support-Antwort vom 2026-11-06 eingetragen (EV-0008). Die Bewertung bleibt unverändert.
4. Der Lese-Prompt hat zwei neue Fragen: Frage 6 zu Migrationen beim Publish oder Sync (mit dem Risiko `20260917182000`), Frage 7 zu Erreichbarkeit und Selbstregistrierung. Die Merge-Checkliste hat N4a (Netzwerkprüfung mit Viewer-Konto).
5. Gate-Bericht: G02, G06 und G13 sind erfüllt (Entscheidung des Owners 2026-11-06). Neue Zählung: 6 erfüllt, 2 in PR, 1 extern, 13 offen.

| Punkt        | Beobachtung                                                                                                                                                               | Beleg                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Publish-Plan | P0 bis P5, Muss-Gates G01 bis G10, G13, G15, G17, G19; PP-01 bis PP-10; Mermaid-Ablauf; G23 nur als Vorschlag                                                             | `docs/PUBLISH-PLAN.md` (neu, nicht versioniert)                                      |
| D3 zod 3     | RA-01 „akzeptiert“, befristet bis nach dem Publish 1.70.0, Migration auf 4.6.6 danach (8 bis 16 h)                                                                        | `docs/RISIKOREGISTER.yaml` `risikoakzeptanzen`, `docs/RISIKOREGISTER.md` Abschnitt 5 |
| R-07, R-10   | Feld `stand_support` (YAML) und Hinweis 2026-11-06 (MD); w, a, score und stufe unverändert                                                                                | `docs/RISIKOREGISTER.yaml`, `docs/RISIKOREGISTER.md` Abschnitt 4                     |
| D4 QS6-4     | Entscheidung in Abschnitt 5, Kopfzeile auf „QS6-4 geschlossen“                                                                                                            | `docs/QS-06-VIEWER-ABRECHNUNG.md`                                                    |
| Smoke-Test   | N4a: Projektionsantwort ohne Satz- und Betragsfelder (`hourly`, `rate`, `amount`), Screenshot nur mit Feldnamen                                                           | `docs/MERGE-CHECKLISTE-GOLDEN-GATE.md` Abschnitt 4                                   |
| D5 types.ts  | Abschnitt „Go-Ausnahme types.ts“: nur +5 Zeilen `__InternalSupabase`, `PostgrestVersion` "14.5"; jede andere Abweichung No-Go                                             | `docs/LOVABLE-PUBLISH-PRUEFUNG.md`                                                   |
| Lese-Prompt  | Fragen 6 und 7, zwei neue Zeilen in den Go-Kriterien, Hinweis A29 zu `20260917182000`                                                                                     | `docs/LOVABLE-PUBLISH-PRUEFUNG.md`                                                   |
| Gate-Bericht | Ergänzung A28 im Nachtrag; Zeilen und YAML von G02, G06 und G13 auf „erfüllt“; `zaehlung_nachtrag_2026_11_07`                                                             | `docs/PUBLISH-GATE-BERICHT.md`                                                       |
| Prüfungen    | `docs:check` und `docs:project` grün im Worktree (node_modules als temporäre Junction, danach entfernt); Prettier `--check` grün auf 7 Dateien; RISIKOREGISTER.yaml parst | Ausgabe der Sitzung 2026-11-07                                                       |

## Offene Fragen

1. Abweichung: Die Akzeptanz zu D3 steht nicht als neue Risiko-ID unter `risiken`. Sie steht als eigene Liste `risikoakzeptanzen` (RA-01), weil die Texte zu den Risiken im Tracker stehen und der Tracker für mich gesperrt war. Soll RA-01 als Risiko R-15 in den Tracker (`risiken`) übernommen werden?
2. Abweichung: Den Auftragsschritt „Tracker, CURRENT-STATUS, ENTWICKLUNGSTAGEBUCH, BACKLOG nachziehen“ habe ich nicht in den Dateien ausgeführt. Die Texte dazu liegen in `A28-TEXTE.md`, die Übernahme macht die Hauptsitzung. Commit, Push und CI sind offen (der Nachweis „CI 15/15“ fehlt noch).
3. Abweichung: Den Bericht habe ich nach `out/A28-BERICHT.md` geschrieben, nicht nach `reports/A28-BERICHT.md` (Vorgabe der Hauptsitzung).
4. `docs/PUBLISH-PLAN.md` ist neu und nicht versioniert. Damit es im Diff erscheint, braucht es `git add`.
5. N4a nennt als Ziel die Server-Funktion zum Lesen der Projektion (`shared-projection.functions.ts`). Den Namen der Netzwerkanfrage in der veröffentlichten App habe ich nicht geprüft.
6. Die Anforderung „Datenexport höchstens 24 Stunden alt“ (PP-04) setzt einen belegten Exportweg voraus. Der ist offen (R-10, Gate-Bericht „Nicht ermittelbar“).
7. Die Offenen Fragen 3 bis 5 im Gate-Bericht stehen noch im Text. Beantwortet sind sie im Nachtrag, entfernt sind sie nicht.

## Eigene Ideen

- `docs/PUBLISH-PLAN.md` sollte in `docs/ARTEFAKTE.yaml` stehen (Eintrag `publish-plan`), damit der Arbeitsplan das Runbook findet.
- Ein Protokollbogen für den Go-Tag (Zeitpunkte für Schreibpause, Export, Bookmark, Publish, t0, N1 bis N5, N4a) als Vorlage in `docs/PUBLISH-PLAN.md` würde PP-03, PP-04 und PP-07 prüfbar machen.
- Nach der Antwort auf Frage 6 sollte der Owner über G23 entscheiden. Ist die Antwort „ja“, gehört ein Datenauftrag nach ADR-0037 zur Angleichung der Migrationshistorie (`20260917182000`) vor das Go.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 6 offene PRs, davon 5 Drafts.

```yaml
Reifegrad: "Publish-Vorbereitung dokumentiert; 6 von 22 Gates erfüllt, kritischer Pfad R-14 (G03, G05) unverändert"
Projektstatus: "Golden Gate vor Publish 1.70.0; Publish No-Go (R-07); Go frühestens KW 48"
Offene_Fragen:
  - "RA-01 als Risiko R-15 in den Tracker übernehmen?"
  - "Antwort Lovable-Support zu R-10 (EV-0008) und Frage 6 im Lese-Prompt (Migrationen beim Publish)"
  - "Entscheidung G23 (Vorschlag A29)"
  - "Exportweg für PP-04 (Datenexport höchstens 24 h alt)"
Roadmap:
  Sprints_bis_BSF: "unverändert laut A26 (Tracker, Abschnitt Roadmap; keine Neubewertung in A28)"
  Sprints_bis_MVP: "unverändert laut A26 (Tracker, Abschnitt Roadmap; keine Neubewertung in A28)"
```
