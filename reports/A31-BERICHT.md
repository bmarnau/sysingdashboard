---
id: A31
titel: "Notfallhandbuch: offene Lücken schließen (G04, REST-01, REST-05)"
status: erledigt
start: 2026-11-07 06:35 +01:00
ende: 2026-11-07 07:00 +01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286
commit: 545b8a08 (Tagesbündel)
ci: läuft am Head 545b8a08, Stand im Kommentar zu PR 286
---

# A31 Bericht: Notfallhandbuch, offene Lücken

## Ergebnis

Abschnitt 6 ist klassifiziert und als Tabelle neu gefasst: 12 alte und 5 neue Lücken, davon 3 geschlossen (Lücken 3, 16, 17), 6 brauchen einen Beleg, 8 eine Owner-Entscheidung.
Neu im Handbuch: N8a (Rotation je Secret, Inventar S-01 bis S-15 ohne Werte), Abschnitt 3 als Feldtabelle mit Verweis auf `docs/ZUGAENGE-UND-NOTFALLKONTO.md`, Bezugsdokumente (ADR-0042, Plan Restore-Probe, RP-01 bis RP-03).
N3 und N5 sind mit RP-01, RP-02 und A37 abgeglichen („Stand der Datenwege“ als YAML). W4 hat laut öffentlicher Lovable-Doku kein Point-in-Time; der Text sagte vorher „Point-in-Time“. Nachgezogen: Befund A22 in N8.
Weitere Korrekturen: Name der Grundlage und `npm ci` durch `bun install --frozen-lockfile` ersetzt (A19-Abweichungen; `bun.lock`, `.github/workflows/ci.yml:38`). In `docs/ZUGAENGE-UND-NOTFALLKONTO.md` sind 41 Zeilenverweise auf das Handbuch durch Abschnittsverweise ersetzt (sie waren schon seit A32 veraltet).
Prüfungen im Worktree: `docs:check` ✓, `docs:project` ✓ (Tracker-Stand 2026-11-07), Prettier `--check` ✓ für beide Dateien. Kein Commit, kein Push.

| Punkt                     | Beobachtung                                                                                                                                                  | Beleg                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Rotationsanleitung        | 15 Secrets ohne Werte, mit Verbraucher, Neubeschaffung, Folge und Prüfschritt; 7 davon an Lovable Cloud hängend „zu belegen“                                 | `.env.example`, `src/integrations/supabase/client.server.ts:37`, `.github/workflows/`    |
| Kontenübersicht           | Abschnitt 3 enthält Felder und Kurzstand; führend ist die A09-Übersicht. Für keinen kritischen Dienst gibt es einen zweiten Weg                                 | `docs/ZUGAENGE-UND-NOTFALLKONTO.md`, Abschnitt 3                                         |
| W2                        | Erster Export liegt vor (pg_dump Custom, 664586 Bytes, Lovable „Export data“). Inhalt, SHA-256, Verschlüsselung und Auth-Schema sind nicht belegt; EV-0004 weiter „nicht bestanden“ | `queue/A30.yaml` (eingaenge), `docs/NACHWEISE.yaml` EV-0004                              |
| W4                        | täglich, etwa 14 Tage, kein PITR, unumkehrbar; nur aus öffentlicher Doku, am Projekt zu belegen; Wiederherstellung in ein neues Projekt offen                 | docs.lovable.dev/features/database-backups (abgerufen 2026-11-07, über A32)              |
| Live-Stand                | PostgreSQL 17.6, 25 Tabellen, 0,27 GB, Storage leer, auth.users 9, audit_log 336; Soll-Werte RP-02 J2                                                       | RP-01, `queue/anlagen/RP-02-ergebnis-2026-11-07.md` (J2)                                 |
| Kein W2                   | Das App-Backup Format 2.0 ersetzt keinen Dump; `hourlyRate` nur dort gesichert (Lücke 14)                                                                  | A37, Tracker 2026-11-07                                                                  |
| Kontostatus               | Archivieren entzieht keine Rechte bei gültigem Token, daher N8 und S-06 ergänzt (Lücke 13)                                                                  | A22, `supabase/migrations/20260921095742_bsf03b_performance_statement.sql`               |
| Schema bei Lovable-Ausfall | nicht allein aus `supabase/migrations` aufbaubar (10 Einträge ohne `statements`, 4 nur im Repo, 1 nur live); Maßstab ist RP-02                             | RP-01 (Migrationen), N3 Schritt 5                                                        |

### Klassifikation Abschnitt 6

| Nr. | Lücke (Kurz)                                   | Klasse                     | Ergebnis A31                                          |
| --- | ---------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| 1   | Runbook alternatives Hosting                   | braucht Owner-Entscheidung | offen; Daten- und Schemateil in N3 ergänzt            |
| 2   | zweite Person, Notfallkonto                    | braucht Owner-Entscheidung | offen; Abschnitt 3 auf Felder und Verweis umgestellt  |
| 3   | Rotationsanleitung je Secret                   | sofort schließbar          | **geschlossen 2026-11-07** (N8a)                      |
| 4   | Inventar S5                                    | braucht Beleg              | offen                                                 |
| 5   | Offline-Cache, Mirror                          | braucht Owner-Entscheidung | offen; Maßstab `bun.lock` korrigiert                  |
| 6   | Auftragstexte, Planungsseite, Startdatei       | braucht Owner-Entscheidung | offen                                                 |
| 7   | Plattformfunktionen ohne Probe-Protokoll       | braucht Beleg              | offen; um Export und Rotation erweitert               |
| 8   | Planübung                                      | braucht Beleg              | offen                                                 |
| 9   | TeamDrive REST-15                              | braucht Beleg              | offen                                                 |
| 10  | Bewertung, Schutzklassen bestätigen            | braucht Owner-Entscheidung | offen; Verweis ADR-0042                               |
| 11  | Trennung der Umgebungen                        | braucht Beleg              | offen; Restore-Probe S2 liefert den Teilbeleg         |
| 12  | Wiederherstellungsadresse                      | braucht Owner-Entscheidung | offen; Feld vorhanden                                 |
| 13  | Archivieren sperrt nicht (A22), neu            | braucht Owner-Entscheidung | offen                                                 |
| 14  | `hourlyRate` nur im App-Backup (A37), neu      | braucht Owner-Entscheidung | offen                                                 |
| 15  | Erster Export nicht geprüft, neu               | braucht Beleg              | offen                                                 |
| 16  | RTO, RPO nicht verankert, neu                  | sofort schließbar          | **geschlossen 2026-11-07** (Bezugsdokumente)          |
| 17  | Restore-Probe nicht verlinkt, W2/W4 nicht abgeglichen, neu | sofort schließbar | **geschlossen 2026-11-07** (N3, N5)                |

### Frageliste für den Owner (nach Wirkung auf G04 und R-04)

1. **G04:** Kann das Handbuch als Restore-Dokument (REST-01) mit den offenen Lücken als Entwurf freigegeben werden, oder müssen vorher bestimmte Lücken geschlossen sein? Wenn ja, welche (Vorschlag: 2, 7, 12, 15)?
2. **R-04, G04:** Wer ist die zweite berechtigte Person (Rolle steht fest), und für welche Dienste wird zuerst ein Notfallkonto angelegt (Lücke 2, ZN-02 bis ZN-04)?
3. **R-04:** Welche Wiederherstellungsadresse außerhalb des Postfachs info@ und außerhalb der eigenen Domain wird je kritischem Dienst eingetragen (Lücke 12, ZN-06, ZN-07)?
4. **G04, G03:** Werden die ADR-0042-Felder D1 ff. (Schutzklassen, Optionen, RTO, RPO) bestätigt (Lücke 10)?
5. **G03, G04:** Wie wird zu E1, E2, E4 und E7 des Restore-Plans entschieden? Ohne diese Entscheidungen beginnt die Probe nicht (Lücken 7 und 15).
6. **G03:** Führt der Owner `pg_restore --list` (nur Verzeichnis) und SHA-256 für den Export aus? Wird er verschlüsselt abgelegt, und wohin gehört er (lokal oder TeamDrive nach REST-15; Lücken 9 und 15)?
7. **R-04:** Gilt die Ausnahme in N8a (bei Verdacht auf Lovable-Konto oder Tresor diese zuerst erneuern)?
8. **R-04, Lücke 7:** Darf die Rückfrage an den Lovable-Support gebündelt mit R-07 und R-10 gestellt werden? Inhalt: Rotation von Datenbank-Passwort, Service-Schlüssel und Signaturschlüssel (S-01 bis S-04), Beenden von Sitzungen (S-06), zweiter Projektzugang inklusive Lovable Cloud, W4-Wiederherstellung in ein neues Projekt.
9. **Lücke 13:** Soll `has_permission` den Kontostatus prüfen (Codeauftrag), oder genügt ein Verfahren zum Beenden von Sitzungen?
10. **Lücke 14:** Bekommt `hourlyRate` eine Datenbankspalte (A27), oder gehört das App-Backup in die Notfallmappe?
11. **Lücke 1:** Welches Zielhosting wird für das Hosting-Runbook angenommen?
12. **Lücke 6:** Wird die Startdatei `start-sysingboard.ps1` ohne Werte in Git übernommen?
13. **Lücke 8:** Wann findet eine gebündelte Planübung für N1, N3, N5, N7 und N8 statt?
14. **Lücke 5:** Paket-Mirror einrichten oder Verzicht begründen?
15. **S-15:** Werden die `AZURE_*`-Variablen aus `.env.example` im Betrieb genutzt? Wenn nicht: Eintrag als „nicht genutzt“ kennzeichnen.

## Offene Fragen

- Abweichungen vom Auftrag: Statt `reports/A31-BERICHT.md` liegt der Bericht im Ausgabeordner der Hauptsitzung (Vorgabe der Hauptsitzung). Tracker, CURRENT-STATUS und BACKLOG sind nicht geändert; die Texte dazu stehen in `A31-TEXTE.md`. `docs/ZUGAENGE-UND-NOTFALLKONTO.md` ist nur bei den Verweisen und beim `Stand:` geändert.
- Andere Dokumente verweisen weiter mit Zeilennummern auf das Handbuch, die nicht mehr stimmen: `docs/ADR/0042-rto-rpo-schutzklassen.md` (u. a. `:185`, `:192`, `:193`, `:197-212`), `docs/PLAN-RESTORE-PROBE-LOKAL.md` (`:135`, `:187`) und `docs/PUBLISH-GATE-BERICHT.md` (G04 `:182-194`). Die Dateien sind nicht im Auftragsumfang und deshalb nicht geändert.
- Zeitangaben zu RP-01 sind uneinheitlich: `queue/A30.yaml` nennt 18:21 UTC und an anderer Stelle „17:21 UTC“, der Plan nennt 19:21 +01:00. Das Handbuch folgt dem Plan (19:21 +01:00).
- Der Neubeschaffungsweg für alle Lovable-Cloud-Schlüssel ist nicht belegt. N8a nennt nur das Verfahren, die Plattformschritte stehen auf „zu belegen“.
- Risiko: Der einzige Export (W2) ist ungeprüft und nach Stand der Doku nicht verschlüsselt. Fällt Lovable aus, ist er der einzige Datenstand (RPO = 2026-11-06 abends).

## Eigene Ideen

- Das Handbuch und die übrigen Dokumente sollten auf Abschnitte statt auf Zeilen verweisen; Zeilennummern veralten mit jeder Einfügung (gesehen bei A32 und A31). Eine Prüfung in `docs:check` könnte Zeilenverweise auf `NOTFALL-HANDBUCH.md` melden.
- Vor jedem Datenauftrag nach ADR-0037 und vor jedem Publish einen Export nach W2 ziehen, mit SHA-256 und J2-Prüfwerten (ADR-0042, Option H-B). RP-02 Teil J2 ließe sich dafür als fester, lesender Prüfauftrag „RP-J2“ abspalten.
- Die Planübung kann mit der Restore-Probe zusammenfallen: Szenario N5 mit dem echten Export spielen und dabei RTO je Stufe messen. Das ergibt Belege für Lücke 7 und Lücke 8 zugleich.
- Das N8a-Inventar sollte zusätzlich als YAML in `docs/ZUGAENGE-UND-NOTFALLKONTO.md` stehen, damit `docs:project` die Vollständigkeit prüfen kann (Name, Verbraucher, Stand).

## Abschluss

- Geändert im Worktree `wt-a31`: `docs/NOTFALL-HANDBUCH.md`, `docs/ZUGAENGE-UND-NOTFALLKONTO.md`. Kein Commit, kein Push, kein Merge, kein Publish, keine Datenänderung, keine Zugangsdaten. Der Export wurde nicht geöffnet.

Hygiene: 0 gemergte Remote-Branches, 6 offene PRs, davon 5 Drafts.

```yaml
Reifegrad: Notfallhandbuch Entwurf mit Rotationsverfahren, Kontenfeldern und Datenwegestand; 3 von 17 Lücken geschlossen, Plattformschritte nicht belegt
Projektstatus: Publish No-Go (R-07, REST-10); G04 offen (Freigabe Owner), G03 offen (EV-0004 nicht bestanden), R-04 unverändert Bus-Faktor 1
Offene_Fragen:
  - Freigabe des Handbuchs als Restore-Dokument mit offenen Lücken (G04)?
  - Zweite berechtigte Person und erstes Notfallkonto (R-04)?
  - Wiederherstellungsadresse außerhalb von info@ und der eigenen Domain?
  - Entscheidungen ADR-0042 D1 ff. und Restore-Plan E1, E2, E4, E7?
  - Export prüfen (pg_restore --list, SHA-256) und verschlüsselt ablegen?
  - Lovable-Support zu Rotation, Sitzungsende, zweitem Zugang und W4 fragen?
Roadmap:
  Sprints_bis_BSF: 13 bis 17 (A26, nicht neu bewertet)
  Sprints_bis_MVP: nicht neu bewertet
```
