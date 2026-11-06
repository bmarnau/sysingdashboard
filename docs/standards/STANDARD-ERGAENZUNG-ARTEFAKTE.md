# Standardergänzung: Artefaktverzeichnis in der Planungsseite (Reiter „Artefakte“)

> **Status: Entwurf, Ursprungsfassung.** Maßgeblich ist seit 2026-11-03 TDF Modul M-9 ([docs/artifact-register.md](https://github.com/bmarnau-standards/technical-documentation-framework/blob/main/docs/artifact-register.md), PR 46, Merge 61443174). Abweichungen dort: ART-02 (Plattformprojekt), ART-17 („zum Beispiel“). Abgelegt am 2026-11-05 (Auftrag A07).
>
> **Offene Punkte (Kopf):** RTO und RPO · TeamDrive-Eignungsnachweis · zweite berechtigte Person · Zuordnung REST zu Grundschutz++ am Volltext (siehe [STANDARD-WIEDERHERSTELLBARKEIT.md](STANDARD-WIEDERHERSTELLBARKEIT.md)).

Status: Entwurf 2026-11-03 · Herkunft: Projekt sysingdashboard · Geltung: Projekte, die eine Planungsseite oder ein Dashboard zur Steuerung führen · Zielort: Standard zum Projektmanagement in `bmarnau-standards` (Repo noch festzulegen)

## 1 Zweck

Wer ein Projekt übernimmt, vertritt oder nach einem Ausfall wiederanlaufen lässt, muss alle Arbeitsmittel an einer Stelle finden. Die Planungsseite führt deshalb einen Reiter „Artefakte“ als Einstiegspunkt. Er ersetzt nicht Git als führende Quelle, sondern verweist darauf.

## 2 Anforderungen

| ID     | Anforderung                                                                                                                                                                                                                                                                                            | Bezug                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| ART-01 | Die Planungsseite muss einen Reiter „Artefakte“ enthalten, der direkt über einen Anker aufrufbar ist (`#artefakte`).                                                                                                                                                                                   | Auffindbarkeit         |
| ART-02 | Der Reiter muss mindestens führen: Repository, Ziel-Issue, Tracker, Statusdatei, Merge-Checkliste, Risikoregister, Notfall- und Betreiberdokumente, Liste der gemergten Pull Requests, Adressen von Vorschau und Produktion, Lovable-Projekt (falls verwendet), Standardfamilie.                       | Vollständigkeit        |
| ART-03 | Jeder Eintrag muss Titel, Zweck, Ort (Git-Pfad oder Adresse) und Stand (Datum oder Commit) tragen.                                                                                                                                                                                                     | Nachvollziehbarkeit    |
| ART-04 | Der Reiter muss zwischen Git-Verweisen (maßgeblich) und Kopien (Anzeige) unterscheiden und Kopien mit Datum als Kopie kennzeichnen.                                                                                                                                                                    | Single Source of Truth |
| ART-05 | Die Liste der Artefakte muss als maschinenlesbare Datei in Git geführt werden (zum Beispiel `docs/ARTEFAKTE.yaml`). Die Seite sollte daraus erzeugt oder dagegen geprüft werden.                                                                                                                       | REST-14, Git-driven    |
| ART-06 | Einträge dürfen keine Zugangsdaten, Tokens, Einmal-Links oder Adressen mit Geheimnissen enthalten.                                                                                                                                                                                                     | Sicherheit             |
| ART-07 | Das Projekt muss die Links der Artefaktliste mindestens vor jedem Tagesabschluss und vor jedem Release prüfen. Tote Links gelten als Befund und gehören in den Tracker.                                                                                                                                | Qualität               |
| ART-08 | Der Reiter muss neue Dokumente aufnehmen, sobald sie in Git liegen, spätestens im selben Pull Request.                                                                                                                                                                                                 | Pflege                 |
| ART-09 | Artefakte, die nur außerhalb von Git existieren (zum Beispiel die Planungsseite selbst, Auftragstexte, Startdateien), müssen im Reiter als „nicht in Git“ gekennzeichnet und in den Backlog aufgenommen werden.                                                                                        | REST-14                |
| ART-10 | Jede Nennung eines Dokuments, Pfads, Pull Requests oder Issues in der Planungsseite muss als Link ausgeführt sein. Das Projekt sollte Pfade (`docs/…`) und Nummern (`#123`) automatisch verlinken oder die Seite dagegen prüfen. Ein fehlender Link gilt als Befund.                                   | Verweise               |
| ART-11 | Die Seite muss bei den Fensterbreiten 320, 375, 768, 1024, 1440 und 1920 Pixel ohne horizontales Scrollen der Seite lesbar sein. Raster müssen mit einer Mindestbreite von höchstens 100 Prozent der Fensterbreite aufgebaut sein; Spalten müssen umbrechen, statt zu überlaufen.                      | Darstellung            |
| ART-12 | Lange Wörter, Pfade und Adressen müssen umbrechen (Zeilenumbruch an beliebiger Stelle für Links, Silbentrennung für Fließtext in der Dokumentsprache). Wörter dürfen keine Elemente verbreitern.                                                                                                       | Umbrüche               |
| ART-13 | Tabellen, Diagramme und Codeblöcke dürfen breiter als das Fenster sein, müssen dann aber in einem eigenen Container scrollen. Reiterleisten müssen umbrechen oder scrollen.                                                                                                                            | Darstellung            |
| ART-14 | Das Projekt muss die Darstellung vor jedem Release prüfen: automatisiert (Seitenbreite ≤ Fensterbreite je Breite und je Reiter) und per Sichtprüfung bei mindestens 320 und 1440 Pixel. Abweichungen gehören als Befund in den Tracker.                                                                | Prüfung                |
| ART-15 | Jeder Eintrag der Artefaktliste muss im vorgesehenen Reiter sichtbar sein. Das Projekt muss nach jeder Änderung prüfen, dass Inhalte nicht in einem anderen Reiter landen und dass versteckte Bereiche (`hidden`) wirklich ausgeblendet sind, auch ohne die Grundregeln der Veröffentlichungsumgebung. | Struktur               |
| ART-16 | Links auf mitveröffentlichte Dateien (PDF, Markdown) müssen relative Pfade nutzen und nach jeder Veröffentlichung geöffnet werden; schlägt das fehl, muss die Datei zusätzlich auf anderem Weg (Git, Anhang) bereitgestellt werden.                                                                    | Dateilinks             |
| ART-17 | Das Artefaktverzeichnis muss das Nachweisregister (`docs/NACHWEISE.yaml`, Standard Wiederherstellbarkeit REST-26) und die Quellen des Projekts (Standards, externe Grundlagen) mit Link führen. Hinweise, Links und Quellen sind Teil des Eintrags.                                                    | Evidence               |

## 3 Beispiel `docs/ARTEFAKTE.yaml`

```yaml
stand: 2026-11-03
artefakte:
  - id: repo
    titel: Repository
    zweck: Führende Quelle
    ort: https://github.com/bmarnau/sysingdashboard
    art: git
  - id: standard-restore
    titel: Standard Wiederherstellbarkeit
    zweck: Restore und Notfall
    ort: docs/STANDARD-WIEDERHERSTELLBARKEIT.md
    art: git
    stand: 2026-11-03
  - id: planungsseite
    titel: Arbeitsplan
    zweck: Fortschritt, Notfall, Artefakte
    ort: Claude-Artifact (Kopie)
    art: kopie
    in_git: false
```

## 4 Herkunft der Anforderungen ART-10 bis ART-16 (Lernpunkte aus dem Pilotprojekt)

- Ein Dokumentenblock stand im falschen Reiter und war für den Owner nicht auffindbar (ART-15).
- Pfade und Pull-Request-Nummern im Fließtext waren nicht verlinkt (ART-10).
- Auf schmalen Fenstern lief eine Kachel um wenige Pixel über, weil die Rastermindestbreite größer war als das Fenster (ART-11, ART-13).
- Die lokale Vorschau zeigte versteckte Bereiche an, weil ihr die Grundregel `[hidden]` der Veröffentlichungsumgebung fehlte (ART-15).

## 5 Offene Punkte

- Zielrepo und Abschnitt im Standard zum Projektmanagement klären.
- Entscheidung, ob die Seite aus der YAML erzeugt wird oder nur dagegen geprüft wird.
- Prüfwerkzeug für Links (Skript im Repo) festlegen.
