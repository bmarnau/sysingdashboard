---
id: A11
titel: "Datenauftrag-Vorlage: Live-Demodaten monatlich nachführen (2c)"
status: erledigt
start: 2026-11-05T07:55+01:00
ende: 2026-11-05T06:08+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: fed4dc22
ci: "nicht gelaufen (kein PR), Head-SHA fed4dc22; docs:check und docs:project lokal grün"
---

# A11 Bericht

## Ergebnis

Die Vorlage `docs/DATENAUFTRAG-DEMODATEN-MONAT.md` liegt vor, nach dem Muster TD-01 Stufe b. Sie hat zwei Parameter (`s_alt`, `s_neu`) und die festen 61 Demo-IDs mit Versatz, maschinell aus TD-01 übernommen.
Die Verschiebung muss ein Vielfaches von 7 Tagen sein, damit die Wochentage erhalten bleiben. Der Stichtag gilt in Europe/Berlin und darf nicht in der Zukunft liegen. `audit_log` wird nur gezählt. Preflight, Schreibblock, Postflight und Rückbau sind enthalten, die zwei Freigaben und das Laufprotokoll haben leere Felder.
Lokal getestet gegen PostgreSQL 16.15 (Container) und PGlite 0.2.17 (PostgreSQL 16.4): T1 bis T8 wie erwartet, also Lauf, erkannter Doppellauf, Abbrüche ohne Änderung und Rückbau.
Erster Lauf: bis 2026-11-30 mit `s_neu = 2026-11-25`. Nichts ausgeführt, kein Zugriff auf das Live-System.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| IDs | 14 Arbeitspakete, 47 Tätigkeiten, aus TD-01 Zeilen 245-258 und 270-316 übernommen | Extraktion per Skript, Zählung 14/47 |
| Test PG 16.15 | T1 14/47/0/keine/0; T2 ok, audit_log 329; T4, T5, T6, T8 Abbruch (RAISE Zeile 43, 12, 15, 18), Stand unverändert; T7 Stand wie vorher | `docker run postgres:16 --network none`, `psql` |
| Test PGlite | gleiche Ergebnisse | `reports/A11-PGLITE-PROTOKOLL.txt` |
| Doku | Verweise in `docs/BACKLOG.md` und Tracker `fortschritt` 2026-11-05 | Commit fed4dc22 |
| Prüfungen | docs:check, docs:project, Prettier grün | lokal |

## Offene Fragen, Risiken, Abweichungen

- Offene Entscheidungen des Owners: E-2c-1 (Vielfaches von 7 oder Ausführungstag), E-2c-2 (ZP-02/ZP-03 für den Live-Mandanten nicht erfüllbar, weil Tätigkeiten immer vor dem Stichtag liegen), E-2c-3 (erledigte Pakete unverändert).
- Risiko: Die Freigabe 2 braucht nach ADR-0037 eine zweite Person (R-04, Bus-Faktor 1).
- Risiko: Trigger und RLS des Live-Systems sind im Test nicht nachgebaut. Laut TD-01 Stufe 0 berühren sie `due` und `activity_date` nicht.
- Abweichung: Der Auftrag nennt „Prüfpunkte 30.11. 23:59 und 01.12. 00:00 übernehmen“. Sie sind übernommen, aber ZP-02 ist für 2c als nicht erfüllbar gekennzeichnet (siehe E-2c-2).
- Abweichung: Damit `docs:project` grün bleibt, sind `CURRENT-STATUS.md` und `ENTWICKLUNGSTAGEBUCH.md` schon in A11 auf 2026-11-05 gesetzt. A12 ergänzt die Entscheidungen.
- Hinweis: Docker wurde vom Owner während des Auftrags gestartet. Der Testcontainer lief ohne Netzwerk und wurde danach entfernt.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Vorlage 2c getestet, nicht freigegeben
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - E-2c-1 bis E-2c-3?
  - Zweite Person für Freigabe 2?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
