---
id: A13
titel: "Zwei QA-Befunde von Lovable klären (Fällig-Datum, Kiosk Infrastruktur)"
status: erledigt
start: 2026-11-05T08:45+01:00
ende: 2026-11-05T06:12+01:00
branch: keiner (nur lesen)
pr: keiner
commit: keiner im Projekt; Bericht auf ops/reports
ci: entfällt
---

# A13 Bericht

## Ergebnis

Der Wortlaut beider QA-Befunde ist in Git nicht auffindbar: weder in `docs/` (kein Treffer für „QA“), noch in Backlog, Tracker oder CURRENT-STATUS, noch in den letzten vier `lovable-sync-*`-Branches (nur gelesen). Quelle und Datum muss der Owner nennen.
„Kiosk Infrastruktur“ entspricht sehr wahrscheinlich TB-6 („Infrastruktur-Spalte leer“, 2026-10-26). Die Ursache ist im Code belegt: Die Spalte kommt aus dem lokalen Kiosk-Demodatensatz des Geräts, nicht aus der Datenbank. Das ist kein Fehler, sondern gewollte Regel mit Doku-Lücke.
„Fällig-Datum“ lässt sich keinem Befund eindeutig zuordnen. Es gibt vier Kandidaten, drei davon sind behoben, der vierte ist F-U7-03 (offen).
Gemeinsame Ursache mit F-U7-04 und der Demodaten-Analyse: Demodaten liegen je Gerät und Browser und altern.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Suche Doku | kein Befund mit „QA“ in `docs/*.md`, `docs/*.yaml` | `grep -rniE '\bQA\b' docs` → leer |
| Suche Lovable | `lovable-sync-1793852674`, `…767407`, `…765195`: nur +5 Zeilen `types.ts`; `…685568`: Vite-Absicherung | `git diff --stat origin/main...<branch>` |
| TB-6 Definition | „Kiosk-Befund Infrastruktur-Spalte leer: Ursache Datenstand oder Anzeige“ | `docs/TD-01-STUFE-B-KONZEPT.md:24` |
| TB-6 Ursache | Domänen availability, infrastructure, support nur aus Gerätedatensatz; ohne geladenen Datensatz Meldung „Demo-Daten sind auf diesem Gerät nicht geladen.“ | `src/lib/kiosk/internal-kiosk-provider.ts:12`, `:52-64` |
| TB-6 Korrektur | Kiosk-Demodatensatz 1.1.0 (Infrastrukturspalte), Commit 4d9acba2, im Release-Commit 1.69.0 enthalten | `src/lib/kiosk/kiosk-demo-dataset.ts:3`, `git merge-base --is-ancestor 4d9acba2 3732df26` |
| Kandidat Fällig 1 | M1 „Erledigte Arbeitspakete als überfällig“, behoben mit PR 220 (gemergt 2026-10-26) | `docs/GOLDEN-GATE-TESTPROTOKOLL-2026-10-25.md:25`, `gh pr view 220` |
| Kandidat Fällig 2 | U-2 „Ohne Fälligkeitsdatum“ oben bei absteigender Sortierung, behoben | `docs/BSF-03E-P3B-2-LOVABLE-UI-REVIEW-2026-10-10.md:18` |
| Kandidat Fällig 3 | Fälligkeitsdatum fehlte in der geteilten Projektion (DUE-DROP), behoben in PR 192 | `docs/L0-NUTZERPFADE-INVENTAR-2026-10-21.md:61` |
| Kandidat Fällig 4 | F-U7-03 Status „Im Plan“ trotz überschrittener Deadline, offen | `docs/BERICHT-F-U7-03-04.md` |

## Bewertung je Befund

| Befund | Einordnung | Vorschlag | Aufwand |
| --- | --- | --- | --- |
| Kiosk Infrastruktur (= TB-6, angenommen) | gewollte Regel und Doku-Lücke; Folgefehler, wenn der Gerätedatensatz fehlt oder alt ist | Handbuch „Bei Störungen“ prüfen (seit 1.70.0 beschrieben); Backlog „gemeinsamer Ladeweg“ (nach dem Publish) löst die Ursache; Kiosk-Datensatzversion anzeigen | 0 h (Doku vorhanden) bis 1–2 h (Versionsanzeige) |
| Fällig-Datum | nicht zuordenbar | Owner nennt Wortlaut und Ort; bei F-U7-03 gilt der Vorschlag aus A03 (Variante A, 3–5 h) | offen |

## Offene Fragen, Risiken, Abweichungen

- **Offene Frage an den Owner:** Wo und wann hat Lovable die zwei QA-Befunde gemeldet (Lovable-Chat, Datum, Wortlaut)? Ohne Wortlaut bleibt „Fällig-Datum“ unklar. Vorschlag: Wortlaut in `docs/BACKLOG.md` übernehmen (ART-09).
- Offene Frage: Ist „Kiosk Infrastruktur“ TB-6 oder ein neuer Befund nach dem 2026-10-26?
- Risiko: Ob die veröffentlichte App 1.69.0 den Kiosk-Datensatz 1.1.0 enthält, ist nicht belegbar (Publish-Quelle R-07). Der Release-Commit enthält ihn.
- Abweichung: keine Code- oder Doku-Änderung, Bericht nur hier (wie im Auftrag).

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Befunde eingeordnet, Wortlaut fehlt
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - Wortlaut und Quelle der zwei QA-Befunde?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
