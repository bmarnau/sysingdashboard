# Rollen- und Oberflächenabnahme (F-11)

Sprint 09C · Release Candidate v1.59.5 · Stand 2026-08-22

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

Hinweis zur Rollenlogik: `engineer` besitzt `avkk.edit`, aber nicht
`avkk.responsibility.assign`. Daher darf ein Systemingenieur eigene AVKK-
Bewertungen im zulässigen Scope bearbeiten, jedoch keine Verantwortung neu
zuweisen oder bestehende Verantwortungszuordnungen verändern.

| #   | Schritt                 | Erwartetes Ergebnis                                                                                                            | Bewertung |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Anmelden                | Dashboard öffnet mit eigenen Projekten, Arbeitspaketen, Tätigkeiten und Zeiten                                                 | erfüllt   |
| 2   | Tab „Mein AVKK"         | sichtbar; eigene Fälle, Kennzahlen und Frühindikatoren plausibel                                                               | erfüllt   |
| 3   | AVKK-Eintrag bearbeiten | Eigene AVKK-Bewertung im zulässigen Scope speichern; nach Neuladen vorhanden; Verantwortung bleibt ohne Assign-Recht read-only | erfüllt   |
| 4   | Management-Cockpit      | **nicht** sichtbar                                                                                                             | erfüllt   |
| 5   | Bericht „persönlich"    | erzeugbar als PDF, Druck, Word, JSON, CSV                                                                                      | erfüllt   |

### 2.2 Projektmanager

Projektmanager besitzen `avkk.responsibility.assign`. Das ist fachlich
beabsichtigt: Projektverantwortung schließt die Möglichkeit ein, Verantwortung
für Aufgaben und Arbeitspakete zu delegieren bzw. neu zuzuweisen.

| #   | Schritt              | Erwartetes Ergebnis                                                                 | Bewertung |
| --- | -------------------- | ----------------------------------------------------------------------------------- | --------- |
| 1   | Projektsicht         | eigene Projekte mit Lage „im Plan", „gefährdet", „kritisch", „überfällig"           | erfüllt   |
| 2   | Drill-down           | Projekt → Arbeitspakete → Tätigkeiten → AVKK bleiben konsistent                     | erfüllt   |
| 3   | AVKK-Lücken          | fehlende Voraussetzungen und Konsequenzen je Arbeitspaket sichtbar                  | erfüllt   |
| 4   | Projektbericht       | erzeugbar; Werte entsprechen der Oberfläche                                         | erfüllt   |
| 5   | Verantwortung        | Verantwortung auf einem geeigneten AVKK-Sachverhalt delegierbar/neu zuweisbar       |           |
| 6   | Benutzerverwaltung   | **nicht** aufrufbar                                                                 | erfüllt   |

### 2.3 Teamleiter / Managementsicht

Teamleiter besitzen `avkk.responsibility.assign`. Das ist fachlich beabsichtigt:
Teamleitung muss Verantwortung delegieren und neu zuordnen können. Eine solche
Delegation ist keine Personenbewertung und ändert nichts am Verbot von
Ranglisten oder automatisierten Leistungsbewertungen nach ADR-0027.

| #   | Schritt               | Erwartetes Ergebnis                                                                 | Bewertung |
| --- | --------------------- | ----------------------------------------------------------------------------------- | --------- |
| 1   | Management-Cockpit    | Portfoliolage, Handlungsbedarf, Konsequenzen, Verteilungen sichtbar                 | erfüllt   |
| 2   | Keine Rangliste       | keine personenbezogene Bewertung oder Rangfolge (ADR-0027)                          | erfüllt   |
| 3   | Managementbericht     | erzeugbar; Kennzahlen stimmen mit dem Cockpit überein                               | erfüllt   |
| 4   | Verantwortung         | Verantwortung auf einem geeigneten AVKK-Sachverhalt delegierbar/neu zuweisbar       |           |

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
| 1   | AVKK-Bearbeitung versuchen        | Eingaben gesperrt, Hinweis auf Leserecht                  | erfüllt   |
| 2   | Management-Cockpit aufrufen       | nicht sichtbar                                            | erfüllt   |
| 3   | Benutzerverwaltung aufrufen       | nicht sichtbar                                            | erfüllt   |
| 4   | Direkter Datenzugriff (Schreiben) | von der Datenbank abgewiesen, nicht nur in der Oberfläche | erfüllt   |

### 2.6 Mehrbenutzer-Demoszenario (Scope-Trennung)

Voraussetzung: vier Demo-Konten nach `docs/DEMO-USERS.md`, Zuordnung im
Demo-Dialog gesetzt, Datensatzversion 2.1.0. Referenzwerte gelten für den
vollständig eingespielten Datensatz; sie sind maschinell abgesichert
(`src/__tests__/lib/demo-data/personas.test.ts`) und werden aus dem Datensatz
abgeleitet, nicht gepflegt.

| #  | Anmeldung / Rolle                         | Erwartetes Ergebnis                                                                                         | Bewertung |
| -- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 1  | Alex (`engineer`), Mein AVKK              | 2 eigene Sachverhalte (Fälle A, C), davon 1 mit Handlungsbedarf, 1 fehlende Voraussetzung, 2 Arbeitspakete  | erfüllt   |
| 2  | Sam (`engineer`), Mein AVKK               | 3 eigene Sachverhalte (Fälle B, D, E), alle mit Handlungsbedarf, 1 kritische Konsequenz, 3 Arbeitspakete    | erfüllt   |
| 3  | Alex vs. Sam                              | keine gemeinsamen Sachverhalte in „Mein AVKK"; Kennzahlen unterscheiden sich sichtbar                       | erfüllt   |
| 4  | Sam schreibt auf einen Fall von Alex      | Speichern wird von der Datenbank abgewiesen (`avkk_can_write`), nicht nur in der Oberfläche gesperrt        | erfüllt   |
| 5  | Petra (`projectmanager`), Projektsicht    | Projektcockpit Netzwerk mit zugehörigen Arbeitspaketen, Tätigkeiten, AVKK und Projektbericht konsistent     | erfüllt   |
| 6  | Petra (`projectmanager`), Delegation      | Verantwortung auf geeignetem AVKK-Sachverhalt neu zuweisbar; Engineer bleibt ohne Assign-Recht              |           |
| 7  | Georg (`teamlead`), Management-Cockpit    | alle 3 Demo-Projekte und 8 Sachverhalte im Portfolio; keine personenbezogene Rangfolge (ADR-0027)           | erfüllt   |
| 8  | Georg, Managementbericht                  | Kennzahlen stimmen mit dem Cockpit überein; keine personenbezogene Rangliste oder Leistungsbewertung       | erfüllt   |
| 9  | Georg (`teamlead`), Delegation            | Verantwortung auf geeignetem AVKK-Sachverhalt neu zuweisbar                                                |           |
| 10 | Beliebige Rolle, Role Preview             | Darstellung wechselt, Datenumfang und Schreibrechte bleiben unverändert                                    |           |

**Fachentscheidung Delegation, 2026-08-22:** Projektmanager und Teamleiter
müssen delegieren können. `avkk.responsibility.assign` ist für beide Rollen
daher ausdrücklich beabsichtigt und kein Berechtigungsfehler.

**Bekannte, bewusste Grenze des MVP:** Die v1-Berechtigungsmatrix ist für AVKK
rollenbasiert und noch nicht auf Projekt-/Team-Scopes eingeschränkt. Damit ist
das Delegationsrecht technisch breiter als die spätere Zielarchitektur. Die
geplante v2-Scope-Auswertung aus ADR-0007 muss Projektmanager auf ihren
Projektkontext und Teamleiter auf ihren Führungs-/Portfoliokontext begrenzen.
Diese Grenze wird als Architektur-/Produktfinding geführt; sie ändert nicht die
fachliche Entscheidung, dass Delegation zu beiden Führungsrollen gehört.

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

| Rolle                  | Prüfer/in | Datum      | Ergebnis  | Bemerkung |
| ---------------------- | --------- | ---------- | --------- | --------- |
| Systemingenieur        | Betreiber | 2026-08-21 | erfüllt   | Alex: Login, persönlicher AVKK-Scope A/C, Kompetenz-Schreib- und Persistenztest, Managementsicht gesperrt sowie persönlicher Bericht in PDF, Druck, Word, JSON und CSV geprüft. Verantwortung korrekt read-only, da `avkk.responsibility.assign` fehlt. |
| Projektmanager         | Betreiber | 2026-08-22 | teilweise | Petra: Projektcockpit für Netzwerkmodernisierung vollständig geprüft: Projektkopf/KPIs, zwei Arbeitspakete, projektspezifische Tätigkeiten, AVKK-Projektkontext, vorausgewählter SYSING-102 und Rücknavigation PASS. Benutzerverwaltung nicht sichtbar. Offen ist nur noch der explizite Delegationsnachweis. |
| Teamleiter             | Betreiber | 2026-08-22 | teilweise | Georg: Management-Cockpit mit 3 Demo-Projekten und 8 AVKK-Sachverhalten geprüft; keine personenbezogene Rangliste. SYSING-103 fachlich PASS. Offen ist der explizite Delegationsnachweis. |
| Administrator          |           |            | offen     | Vollständiger manueller Rollenlauf noch nicht dokumentiert. |
| Negativtest ohne Recht | Betreiber | 2026-08-22 | erfüllt   | Alexa/viewer: allgemeiner F-18-Retest und zusätzlicher Projektcockpit-Negativtest PASS; Projektdetail/AVKK lesbar, keine Projekt- oder AVKK-Schreibaktionen sichtbar. Serverseitige Schreibgrenze automatisiert nachgewiesen. |
| Mehrbenutzerszenario   | Betreiber | 2026-08-22 | teilweise | Alex und Sam vollständig für persönliche Scope-Trennung geprüft; Sam→Alex-Schreibversuch abgewiesen. Petra-Projektcockpit und Georg-Managementbericht bestätigt. Offen: Delegationsnachweise Petra/Georg und abschließender Role-Preview-Nachweis. |

Solange Abschnitt 3 nicht vollständig mit `erfüllt` abgeschlossen ist, bleibt
F-11 im Abnahmebericht als **MANUAL VERIFICATION REQUIRED** geführt. Die
Freigabeentscheidung wird davon nicht blockiert, weil alle sicherheitsrelevanten
Zugriffsgrenzen bereits automatisiert und serverseitig nachgewiesen sind. Eine
formale `MVP 100 % / BASELINE`-Kennzeichnung erfolgt jedoch erst nach vollständiger
fachlicher Abzeichnung.

## 4. Manueller Evidenzstand 2026-08-22

Die bis zu diesem Stand im Betreiber-Test tatsächlich belegten manuellen
Nachweise werden getrennt von noch offenen Prüfschritten festgehalten:

- **Alex / engineer:** erfolgreicher Login; „Mein AVKK" zeigt genau zwei eigene
  Arbeitspakete (Fälle A/C), davon einen gefährdeten Fall und eine fehlende
  Voraussetzung. Eine Kompetenznotiz wurde gespeichert und nach Hard Reload
  persistent wieder angezeigt. Verantwortung ist erwartungsgemäß read-only,
  weil `engineer` kein `avkk.responsibility.assign` besitzt. Management-Cockpit
  ist nicht verfügbar. Der persönliche Bericht SYSING-101 wurde als PDF,
  Druck, Word, JSON und CSV erfolgreich erzeugt; die finale PDF-Stichprobe mit
  normalisiertem Anzeigenamen `Alex Marnau` ist PASS.
- **Sam / engineer:** erfolgreicher Login; „Mein AVKK" zeigt genau drei eigene
  Arbeitspakete (Fälle B/D/E), alle drei mit Handlungsbedarf und genau einen Fall
  mit kritischer Konsequenz. Die persönliche Sicht überschneidet sich nicht mit
  Alex' Fällen A/C. Sam konnte Alex' Fall „Netzplanung und Segmentierung" lesen,
  der Schreibversuch auf die Kompetenznotiz wurde jedoch mit „Speichern nicht
  möglich" abgewiesen; nach Hard Reload blieb Alex' ursprüngliche Notiz
  unverändert. Damit ist die Schreibgrenze im manuellen Mehrbenutzertest
  bestätigt. Nicht blockierende UI-Beobachtung: In Sams Ansicht wurde der
  Verantwortliche des fremden Falls als technische UUID statt Anzeigename
  dargestellt; dies wird als LOW-UI-Finding für die spätere Bereinigung geführt.
- **Petra / projectmanager:** Projektcockpit „Netzwerkmodernisierung
  Verwaltungsstandort" vollständig geprüft. Projektkopf und KPIs, genau zwei
  Arbeitspakete, drei projektspezifische Tätigkeiten, AVKK-Projektkontext,
  vorausgewählter SYSING-102 und Rücknavigation sind PASS. SYSING-102 ist auch
  als finales 3-Seiten-PDF fachlich und visuell abgenommen. Offen bleibt der
  gezielte Delegationsnachweis.
- **Georg / teamlead:** erfolgreicher Login; Management-Cockpit mit allen drei
  Demo-Projekten und acht AVKK-Sachverhalten sichtbar; sieben gefährdete und ein
  unauffälliger Fall; keine personenbezogene Rangliste. SYSING-103 wurde am
  2026-08-22 als 3-Seiten-PDF geprüft: Kennzahlen und Projektaggregation sind
  plausibel, keine Personenrangliste/Leistungsbewertung. Offen bleibt der
  gezielte Delegationsnachweis.
- **Alexa / viewer:** erfolgreicher Login; AVKK read-only; Management- und
  Benutzerverwaltungsfunktionen nicht verfügbar; nach v1.59.4 kein `+ Neu`, keine
  Neu-/Bearbeiten-/Löschen-Aktionen in Projekte, Arbeitspakete, Tätigkeiten oder
  Abrechnung; globale Suche navigiert ohne Edit-Dialog. Zusätzlich wurde das neue
  Projektcockpit geprüft: Projektdetail und AVKK-Projektkontext sind lesbar,
  `Projekt bearbeiten` und AVKK-Schreibaktionen fehlen. **F-18 und
  Projektcockpit-Negativtest manuell PASS.**

Noch nicht vollständig als manueller Rollenlauf dokumentiert sind insbesondere:

- Administrator/App-Entwickler einschließlich Role Preview, Systemstatus,
  Backup und Prüfberichten,
- Delegation/Verantwortungszuweisung mit Petra (`projectmanager`) und Georg
  (`teamlead`),
- abschließender Role-Preview-Nachweis.

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
