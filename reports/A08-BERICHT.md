---
id: A08
titel: "R-14 Teil 1: ADR zu RTO, RPO und Schutzklassen (Entwurf)"
status: erledigt
start: 2026-11-06T06:43+01:00
ende: 2026-11-06T06:50+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: e5a33785
ci: "läuft (Head e5a33785)"
---

# Bericht A08


## Ergebnis

- ADR-Entwurf `0042-rto-rpo-schutzklassen.md` mit Status `Proposed`, Datum 2026-11-06; Nummer 0042 ist frei (kein Treffer in `docs/ADR/` und in der Git-Historie aller Refs).
- Je Schutzklasse drei Optionen (N-A bis N-C, H-A bis H-C, K-A bis K-C) als Tabelle und YAML; Kosten als Schätzspanne, PITR-, Lovable-Cloud- und TeamDrive-Preise als „nicht ermittelt“.
- Empfehlung (nicht beschlossen): normal N-B, hoch H-B (ereignisgesteuerter Dump vor Datenauftrag, Migration, Publish), kritisch K-A, K-B nach Klärung von W4; RTO unter Vorbehalt „Arbeitstage des Owners“.
- Zehn leere Entscheidungsfelder D1 bis D10; neun offene Fragen, darunter der Widerspruch S1–S6 (`:59`) gegen „mindestens S4“ (`:194`).

## Beobachtungen

| Punkt                   | Beobachtung                                                                                                                   | Beleg                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ADR-Nummer              | 0042 frei; Index endet bei 0041                                                                                               | `docs/ADR/README.md:9`, `:56`                                                                |
| Statuswert              | „vorgeschlagen“ = `Proposed`                                                                                                  | `docs/ADR/README.md:71`; `docs/ADR/0036-qs01-konto-und-berechtigungsschutz.md:3`             |
| Probe-Umfang            | Widerspruch S1–S6 vor Publish gegen „mindestens bis S4“                                                                       | `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:59`, `:194`; `PUBLISH-GATE-BERICHT.md:224` |
| Skala                   | Szenarien 1–3 „wie im Risikoregister“, Register nutzt 1–5 (Schwellen 15/8); REST-16 verlangt gleiche Skala                    | `STANDARD-WIEDERHERSTELLBARKEIT.md:36`, `:221`; `docs/RISIKOREGISTER.md:7`                   |
| Wege                    | Auftrag nennt W1 bis W4, Standard kennt W1 bis W6 (W5 lokale Kopie, W6 Neuaufbau); ADR nutzt W1 bis W6                        | `STANDARD-WIEDERHERSTELLBARKEIT.md:63-91`                                                    |
| EV-0004                 | „nicht bestanden“, Abbruch wegen fehlender Testumgebung, Datum und Prüfer offen                                               | `docs/NACHWEISE.yaml:45-55`                                                                  |
| Sicherungsbericht       | Nur Code gesichert (Bundle, Dateikopie, SHA-256), kein Datendump                                                              | `docs/BERICHT-2026-10-31-SICHERUNG.md:9`, `:52-61`                                           |
| R-14                    | Score 15, SPoF, FuSi; Owner-Entscheidung 2026-11-02: Export und Probe Gate vor Publish                                        | `docs/RISIKOREGISTER.yaml:198-211`; Tracker `:660-669`                                       |
| R-10                    | Register: Migrationslücken; Standard und Handbuch verweisen für Lovable Cloud und Umgebungstrennung auf R-10                  | `RISIKOREGISTER.md:30`; `STANDARD-WIEDERHERSTELLBARKEIT.md:196`; `NOTFALL-HANDBUCH.md:194`   |
| R-04, R-11              | Bus-Faktor 1 und knappe Kapazität begrenzen jede RTO-Zusage und den Übungsrhythmus                                            | `docs/RISIKOREGISTER.md:16-17`                                                               |
| Aufwand                 | G03 8–32 h; Owner 17 h, Claude Code 15 h (Erwartungswerte)                                                                    | `docs/PUBLISH-GATE-BERICHT.md:23`, `:241`, `:248`                                            |
| Grundlagenname Handbuch | Handbuch nennt `STANDARD-ENTWURF-WIEDERHERSTELLBARKEIT.md`, Datei heißt `STANDARD-WIEDERHERSTELLBARKEIT.md` (bekannt aus A19) | `docs/NOTFALL-HANDBUCH.md:3`                                                                 |

## Abweichungen und Fragen

- Kosten und Aufwand sind Schätzungen von Claude Code, keine Angebote; Plattformpreise sind im Repo nicht belegt und wurden nicht recherchiert (kein Zugriff auf Live-Backends, keine Herstellerprüfung).
- Ob die Live-Datenbank echte Kundendaten enthält, ist im Repo nicht belegt; davon hängt die Dringlichkeit der Klasse kritisch ab.
- Die Empfehlung H-B setzt eine Ergänzung des Ablaufs nach ADR-0037 voraus (Dump vor „Go“); das ist eine eigene Entscheidung.
- Keine Repo-Datei geändert; Übernahme ins Repo (ADR-Datei, README-Zeile, Tracker, CURRENT-STATUS, Tagebuch) steht aus.

## Abschluss

- Abgelegt als `docs/ADR/0042-rto-rpo-schutzklassen.md` (Status `Proposed`, Konvention `docs/ADR/README.md`); der Auftrag nannte `docs/adr/ADR-00xx-rto-rpo.md`, die Repo-Konvention ist `docs/ADR/NNNN-slug.md`. Index ergänzt.
- Prettier hat nur YAML-Listen umgebrochen; Inhalt unverändert. Keine Entscheidung getroffen.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: ADR-0042 als Entwurf, Entscheidungsfelder offen
Projektstatus: Publish No-Go; R-14 wartet auf D1 bis D10
Offene_Fragen:
  - Probe-Umfang vor Publish S1 bis S6 oder mindestens S4 (D7)?
  - Skala der Szenario-Bewertung 1 bis 3 oder 1 bis 5 (D6)?
  - Enthält die Live-Datenbank echte Kundendaten?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
