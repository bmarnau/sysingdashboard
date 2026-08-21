# Rollen- und Oberflächenabnahme (F-11)

Sprint 09C · Release Candidate v1.59.4 · Stand 2026-08-21

Diese Checkliste schließt den Befund F-11 aus dem MVP-Abnahmebericht. Sie trennt
zwei Dinge sauber:

- **automatisiert nachgewiesen** — durch Tests, Gates oder direkte Datenzugriffe
  belegt; hier ist keine Unterschrift nötig,
- **fachlich abzuzeichnen** — muss von einer Person je Rolle in der Oberfläche
  gesichtet und mit Datum und Namen bestätigt werden.

Vorbedingung für die Durchführung: Demo-Datensatz über Servicemenü →
„Demo-Datensatz…" eingespielt (nur auf einer Test- oder Preview-Instanz,
niemals produktiv). Für den Mehrbenutzer-Nachweis (Abschnitt 2.6) zusätzlich
die vier Demo-Konten nach `docs/DEMO-USERS.md` anlegen und im Dialog zuordnen.

## 1. Automatisiert nachgewiesen (Stand v1.59.4)

| Nachweis                                                 | Ergebnis                                            | Quelle                                               |
| -------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Rollen-/Rechtematrix vollständig und widerspruchsfrei    | bestanden                                           | `bun run rbac:check`, `docs/RBAC-MATRIX.md`          |
| Route-Guard: nicht angemeldeter Zugriff auf `/dashboard` | Weiterleitung nach `/auth`                          | `src/__tests__/routes/authenticated-guard.test.ts`   |
| Datenzugriff ohne Anmeldung (Lesen und Schreiben)        | serverseitig abgewiesen (401/403), nicht nur UI     | Security-Suite, direkte Anfragen gegen die Datenbank |
| Manipulation der Rolle im Browser wirkt nicht            | Rolle kommt aus `user_roles`, nicht aus dem Browser | `src/hooks/useCurrentUser.ts`, Security-Suite        |
| Role Preview verändert ausschließlich die Darstellung    | keine Rechteerweiterung                             | RBAC-Suite, ADR-0007/0008                            |
| Gesamte Testsuite                                        | 572 Tests grün, 4 todo (68 Dateien)                 | F-18-Restfix-Abschlussbericht v1.59.4                |

## 2. Fachlich abzuzeichnen

Bewertung je Zeile: _erfüllt / teilweise / nicht erfüllt_. Abweichungen mit
Screenshot und Uhrzeit festhalten.

### 2.1 Systemingenieur

| #   | Schritt                 | Erwartetes Ergebnis                                                            | Bewertung |
| --- | ----------------------- | ------------------------------------------------------------------------------ | --------- |
| 1   | Anmelden                | Dashboard öffnet mit eigenen Projekten, Arbeitspaketen, Tätigkeiten und Zeiten |           |
| 2   | Tab „Mein AVKK"         | sichtbar; eigene Fälle, Kennzahlen und Frühindikatoren plausibel               |           |
| 3   | AVKK-Eintrag bearbeiten | Verantwortung, Kompetenz und Konsequenz speichern; nach Neuladen vorhanden     |           |
| 4   | Management-Cockpit      | **nicht** sichtbar                                                             |           |
| 5   | Bericht „persönlich"    | erzeugbar als PDF, Druck, Word, JSON, CSV                                      |           |

### 2.2 Projektmanager

| #   | Schritt            | Erwartetes Ergebnis                                                       | Bewertung |
| --- | ------------------ | ------------------------------------------------------------------------- | --------- |
| 1   | Projektsicht       | eigene Projekte mit Lage „im Plan", „gefährdet", „kritisch", „überfällig" |           |
| 2   | Drill-down         | Kachel → Filter → Zeilenmenge → Detail bleiben konsistent                 |           |
| 3   | AVKK-Lücken        | fehlende Voraussetzungen und Konsequenzen je Arbeitspaket sichtbar        |           |
| 4   | Projektbericht     | erzeugbar; Werte entsprechen der Oberfläche                               |           |
| 5   | Benutzerverwaltung | **nicht** aufrufbar                                                       |           |

### 2.3 Geschäftsführer

| #   | Schritt            | Erwartetes Ergebnis                                                 | Bewertung |
| --- | ------------------ | ------------------------------------------------------------------- | --------- |
| 1   | Management-Cockpit | Portfoliolage, Handlungsbedarf, Konsequenzen, Verteilungen sichtbar |           |
| 2   | Keine Rangliste    | keine personenbezogene Bewertung oder Rangfolge (ADR-0027)          |           |
| 3   | Managementbericht  | erzeugbar; Kennzahlen stimmen mit dem Cockpit überein               |           |
| 4   | Detailbearbeitung  | keine Schreibaktionen auf fremden AVKK-Daten möglich                |           |

### 2.4 Administrator / App-Entwickler

| #   | Schritt                 | Erwartetes Ergebnis                                          | Bewertung |
| --- | ----------------------- | ------------------------------------------------------------ | --------- |
| 1   | Benutzerverwaltung      | Benutzer und Rollen sichtbar und änderbar                    |           |
| 2   | Role Preview            | Darstellung wechselt; eigene Rechte bleiben unverändert      |           |
| 3   | Systemstatus            | Version, Build, Datenbank- und Sicherheitsstatus vollständig |           |
| 4   | Backup und Prüfberichte | Backup erzeugbar, Downloadbereich und Log Viewer erreichbar  |           |

### 2.5 Negativtest ohne Berechtigung (Viewer / Customer)

| #   | Schritt                           | Erwartetes Ergebnis                                       | Bewertung |
| --- | --------------------------------- | --------------------------------------------------------- | --------- |
| 1   | AVKK-Bearbeitung versuchen        | Eingaben gesperrt, Hinweis auf Leserecht                  |           |
| 2   | Management-Cockpit aufrufen       | nicht sichtbar                                            |           |
| 3   | Benutzerverwaltung aufrufen       | nicht sichtbar                                            |           |
| 4   | Direkter Datenzugriff (Schreiben) | von der Datenbank abgewiesen, nicht nur in der Oberfläche |           |

### 2.6 Mehrbenutzer-Demoszenario (Scope-Trennung)

Voraussetzung: vier Demo-Konten nach `docs/DEMO-USERS.md`, Zuordnung im
Demo-Dialog gesetzt, Datensatzversion 2.1.0. Referenzwerte gelten für den
vollständig eingespielten Datensatz; sie sind maschinell abgesichert
(`src/__tests__/lib/demo-data/personas.test.ts`) und werden aus dem Datensatz
abgeleitet, nicht gepflegt.

| #   | Anmeldung / Rolle                      | Erwartetes Ergebnis                                                                                        | Bewertung |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Alex (`engineer`), Mein AVKK           | 2 eigene Sachverhalte (Fälle A, C), davon 1 mit Handlungsbedarf, 1 fehlende Voraussetzung, 2 Arbeitspakete |           |
| 2   | Sam (`engineer`), Mein AVKK            | 3 eigene Sachverhalte (Fälle B, D, E), alle mit Handlungsbedarf, 1 kritische Konsequenz, 3 Arbeitspakete   |           |
| 3   | Alex vs. Sam                           | keine gemeinsamen Sachverhalte in „Mein AVKK"; Kennzahlen unterscheiden sich sichtbar                     |           |
| 4   | Sam schreibt auf einen Fall von Alex   | Speichern wird von der Datenbank abgewiesen (`avkk_can_write`), nicht nur in der Oberfläche gesperrt       |           |
| 5   | Petra (`projectmanager`), Projektsicht | Projekte Netzwerk und Microsoft 365; Arbeitspakete von Alex **und** Sam sichtbar und verdichtet            |           |
| 6   | Georg (`teamlead`), Management-Cockpit | alle 3 Demo-Projekte und 8 Sachverhalte im Portfolio; keine personenbezogene Rangfolge (ADR-0027)          |           |
| 7   | Georg, Managementbericht               | Kennzahlen stimmen mit dem Cockpit überein; Personen erscheinen nur als Zuordnung, nicht als Bewertung     |           |
| 8   | Beliebige Rolle, Role Preview          | Darstellung wechselt, Datenumfang und Schreibrechte bleiben unverändert                                    |           |

**Bekannte, bewusste Grenze dieses Tests:** Schritt 3 prüft die persönliche
Sicht, nicht die Datenbank. Die Leseregeln erlauben jedem Konto mit `avkk.view`
den Zugriff auf alle Sachverhalte; die Trennung entsteht durch Filterung auf die
eigene Verantwortung. Wer Lesetrennung fordert, braucht zeilenbezogene
Leseregeln — das ist eine Produktentscheidung, kein Fehler dieses Tests, und im
Abnahmebericht als Befund geführt.

Ebenso bewusst: Projekte, Arbeitspakete und Tätigkeiten liegen lokal im Browser.
Jedes Demo-Konto spielt den lokalen Bestand einmal selbst ein; eine
gerätübergreifende oder personenbezogene Trennung existiert dort nicht.

## 3. Abzeichnung

| Rolle                  | Prüfer/in | Datum      | Ergebnis | Bemerkung |
| ---------------------- | --------- | ---------- | -------- | --------- |
| Systemingenieur        |           |            | offen    | Noch kein vollständiger manueller Rollenlauf dokumentiert. |
| Projektmanager         | Betreiber | 2026-08-21 | teilweise | Petra: Projektsicht und persönliche AVKK-Zuordnung plausibel; Benutzerverwaltung nicht sichtbar. Projektbericht und vollständiger Drill-down noch nicht als kompletter Rollenlauf dokumentiert. |
| Geschäftsführer        | Betreiber | 2026-08-21 | teilweise | Georg: Management-Cockpit mit 3 Demo-Projekten und 8 AVKK-Sachverhalten geprüft; keine personenbezogene Rangliste. Managementbericht und Detailbearbeitung noch nicht vollständig dokumentiert. |
| Administrator          |           |            | offen    | Vollständiger manueller Rollenlauf noch nicht dokumentiert. |
| Negativtest ohne Recht | Betreiber | 2026-08-21 | erfüllt  | Alexa/viewer: F-18-Retest vollständig bestanden; keine CRUD-Aktionen, Abrechnung ohne Edit-Stift, globale Suche ohne Editor, AVKK read-only. Serverseitige Schreibgrenze automatisiert nachgewiesen. |
| Mehrbenutzerszenario   | Betreiber | 2026-08-21 | teilweise | Petra und Georg als Teilnachweise vorhanden; Alex/Sam, Fremdschreibversuch und Role Preview noch nicht vollständig manuell dokumentiert. |

Solange Abschnitt 3 nicht vollständig mit `erfüllt` abgeschlossen ist, bleibt
F-11 im Abnahmebericht als **MANUAL VERIFICATION REQUIRED** geführt. Die
Freigabeentscheidung wird davon nicht blockiert, weil alle sicherheitsrelevanten
Zugriffsgrenzen bereits automatisiert und serverseitig nachgewiesen sind. Eine
formale `MVP 100 % / BASELINE`-Kennzeichnung erfolgt jedoch erst nach vollständiger
fachlicher Abzeichnung.

## 4. Manueller Evidenzstand 2026-08-21

Die bis zu diesem Stand im Betreiber-Test tatsächlich belegten manuellen
Nachweise werden getrennt von noch offenen Prüfschritten festgehalten:

- **Petra / projectmanager:** erfolgreicher Login; persönliche AVKK-Sicht plausibel;
  zwei eigene Verantwortungen sichtbar; Benutzerverwaltung nicht aufrufbar.
- **Georg / teamlead:** erfolgreicher Login; Management-Cockpit mit allen drei
  Demo-Projekten und acht AVKK-Sachverhalten sichtbar; sieben gefährdete und ein
  unauffälliger Fall; keine personenbezogene Rangliste.
- **Alexa / viewer:** erfolgreicher Login; AVKK read-only; Management- und
  Benutzerverwaltungsfunktionen nicht verfügbar; nach v1.59.4 kein `+ Neu`, keine
  Neu-/Bearbeiten-/Löschen-Aktionen in Projekte, Arbeitspakete, Tätigkeiten oder
  Abrechnung; globale Suche navigiert ohne Edit-Dialog. **F-18 manuell PASS.**

Noch nicht vollständig als manueller Rollenlauf dokumentiert sind insbesondere:

- Systemingenieur einschließlich persönlichem Bericht und AVKK-Schreibtest,
- Administrator/App-Entwickler einschließlich Role Preview, Systemstatus,
  Backup und Prüfberichten,
- die vollständigen Projektmanager-/Geschäftsführer-Berichte,
- Alex/Sam im Mehrbenutzerszenario einschließlich Fremdschreibversuch und
  abschließendem Role-Preview-Nachweis.

## Nachtrag F-18 (v1.59.3)

Bei der manuellen Abnahme wurde festgestellt, dass die Rolle `viewer` über das
globale Menü „+ Neu" Tätigkeiten erfassen konnte. Ursache war die fehlende
Verbindung des lokalen CRUD mit der bestehenden Berechtigungsmatrix. Seit
v1.59.3 werden Anlegen, Bearbeiten und Löschen von Projekten, Arbeitspaketen
und Tätigkeiten nur bei `project.edit`, `workpackage.edit` bzw. `activity.edit`
angeboten und zusätzlich unmittelbar vor der Änderung geprüft.

Der erste Wiederholungstest deckte weitere UI-Pfade in Abrechnung und globaler
Suche auf; diese wurden dem bestehenden Befund F-18 zugeordnet und nicht als
neuer Befund geführt.

## Nachtrag F-18 Restfix (v1.59.4)

Der Retest zu v1.59.3 war teilweise negativ: in „Abrechnung" war der
Bearbeiten-Stift weiterhin sichtbar, und die globale Suche öffnete Editoren.
Beides ist in v1.59.4 geschlossen.

Der erneute manuelle Viewer-Test mit Alexa wurde am 2026-08-21 vollständig
bestanden:

1. „+ Neu" nicht sichtbar — PASS.
2. Projekte: kein Neu, Bearbeiten oder Löschen — PASS.
3. Arbeitspakete: kein Neu, Bearbeiten oder Löschen — PASS.
4. Tätigkeiten: kein Neu, Bearbeiten oder Löschen — PASS.
5. Abrechnung: kein Bearbeiten-Stift — PASS.
6. Globale Suche, Tätigkeit: Navigation ohne Editmaske — PASS.
7. Stichprobe Projekt und Arbeitspaket: Navigation ohne Editmaske — PASS.
8. Inhalte und Kennzahlen lesbar; „Mein AVKK" read-only — PASS.

Destruktive Schreibversuche waren nicht erforderlich; die Handler-Grenzen sind
automatisiert abgedeckt. **F-18 ist damit technisch und manuell bestätigt und
für den MVP geschlossen.**
