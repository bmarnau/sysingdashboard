# Rollen- und Oberflächenabnahme (F-11)

Sprint 09C · Release Candidate v1.58.2 · Stand 2026-08-13

Diese Checkliste schließt den Befund F-11 aus dem MVP-Abnahmebericht. Sie trennt
zwei Dinge sauber:

- **automatisiert nachgewiesen** — durch Tests, Gates oder direkte Datenzugriffe
  belegt; hier ist keine Unterschrift nötig,
- **fachlich abzuzeichnen** — muss von einer Person je Rolle in der Oberfläche
  gesichtet und mit Datum und Namen bestätigt werden.

Vorbedingung für die Durchführung: Demo-Datensatz über Servicemenü →
„Demo-Datensatz…" eingespielt (nur auf einer Test- oder Preview-Instanz,
niemals produktiv).

## 1. Automatisiert nachgewiesen (Stand v1.58.2)

| Nachweis                                                       | Ergebnis                                             | Quelle                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Rollen-/Rechtematrix vollständig und widerspruchsfrei          | bestanden                                            | `bun run rbac:check`, `docs/RBAC-MATRIX.md`         |
| Route-Guard: nicht angemeldeter Zugriff auf `/dashboard`       | Weiterleitung nach `/auth`                           | `src/__tests__/routes/authenticated-guard.test.ts`  |
| Datenzugriff ohne Anmeldung (Lesen und Schreiben)              | serverseitig abgewiesen (401/403), nicht nur UI      | Security-Suite, direkte Anfragen gegen die Datenbank |
| Manipulation der Rolle im Browser wirkt nicht                  | Rolle kommt aus `user_roles`, nicht aus dem Browser  | `src/hooks/useCurrentUser.ts`, Security-Suite       |
| Role Preview verändert ausschließlich die Darstellung          | keine Rechteerweiterung                              | RBAC-Suite, ADR-0007/0008                           |
| Gesamte Testsuite                                              | grün                                                 | `bun run test`                                      |

## 2. Fachlich abzuzeichnen

Bewertung je Zeile: _erfüllt / teilweise / nicht erfüllt_. Abweichungen mit
Screenshot und Uhrzeit festhalten.

### 2.1 Systemingenieur

| #   | Schritt                       | Erwartetes Ergebnis                                                              | Bewertung |
| --- | ----------------------------- | -------------------------------------------------------------------------------- | --------- |
| 1   | Anmelden                      | Dashboard öffnet mit eigenen Projekten, Arbeitspaketen, Tätigkeiten und Zeiten   |           |
| 2   | Tab „Mein AVKK"               | sichtbar; eigene Fälle, Kennzahlen und Frühindikatoren plausibel                 |           |
| 3   | AVKK-Eintrag bearbeiten       | Verantwortung, Kompetenz und Konsequenz speichern; nach Neuladen vorhanden        |           |
| 4   | Management-Cockpit            | **nicht** sichtbar                                                                |           |
| 5   | Bericht „persönlich"          | erzeugbar als PDF, Druck, Word, JSON, CSV                                        |           |

### 2.2 Projektmanager

| #   | Schritt                    | Erwartetes Ergebnis                                                          | Bewertung |
| --- | -------------------------- | ------------------------------------------------------------------------------ | --------- |
| 1   | Projektsicht               | eigene Projekte mit Lage „im Plan", „gefährdet", „kritisch", „überfällig"    |           |
| 2   | Drill-down                 | Kachel → Filter → Zeilenmenge → Detail bleiben konsistent                    |           |
| 3   | AVKK-Lücken                | fehlende Voraussetzungen und Konsequenzen je Arbeitspaket sichtbar            |           |
| 4   | Projektbericht             | erzeugbar; Werte entsprechen der Oberfläche                                   |           |
| 5   | Benutzerverwaltung         | **nicht** aufrufbar                                                            |           |

### 2.3 Geschäftsführer

| #   | Schritt                | Erwartetes Ergebnis                                                    | Bewertung |
| --- | ---------------------- | ------------------------------------------------------------------------ | --------- |
| 1   | Management-Cockpit     | Portfoliolage, Handlungsbedarf, Konsequenzen, Verteilungen sichtbar     |           |
| 2   | Keine Rangliste        | keine personenbezogene Bewertung oder Rangfolge (ADR-0027)              |           |
| 3   | Managementbericht      | erzeugbar; Kennzahlen stimmen mit dem Cockpit überein                   |           |
| 4   | Detailbearbeitung      | keine Schreibaktionen auf fremden AVKK-Daten möglich                    |           |

### 2.4 Administrator / App-Entwickler

| #   | Schritt                 | Erwartetes Ergebnis                                                     | Bewertung |
| --- | ----------------------- | ------------------------------------------------------------------------- | --------- |
| 1   | Benutzerverwaltung      | Benutzer und Rollen sichtbar und änderbar                                |           |
| 2   | Role Preview            | Darstellung wechselt; eigene Rechte bleiben unverändert                  |           |
| 3   | Systemstatus            | Version, Build, Datenbank- und Sicherheitsstatus vollständig             |           |
| 4   | Backup und Prüfberichte | Backup erzeugbar, Downloadbereich und Log Viewer erreichbar              |           |

### 2.5 Negativtest ohne Berechtigung (Viewer / Customer)

| #   | Schritt                          | Erwartetes Ergebnis                                              | Bewertung |
| --- | -------------------------------- | ------------------------------------------------------------------ | --------- |
| 1   | AVKK-Bearbeitung versuchen       | Eingaben gesperrt, Hinweis auf Leserecht                          |           |
| 2   | Management-Cockpit aufrufen      | nicht sichtbar                                                    |           |
| 3   | Benutzerverwaltung aufrufen      | nicht sichtbar                                                    |           |
| 4   | Direkter Datenzugriff (Schreiben) | von der Datenbank abgewiesen, nicht nur in der Oberfläche         |           |

## 3. Abzeichnung

| Rolle                  | Prüfer/in | Datum | Ergebnis | Bemerkung |
| ---------------------- | --------- | ----- | -------- | --------- |
| Systemingenieur        |           |       |          |           |
| Projektmanager         |           |       |          |           |
| Geschäftsführer        |           |       |          |           |
| Administrator          |           |       |          |           |
| Negativtest ohne Recht |           |       |          |           |

Solange Abschnitt 3 nicht vollständig ausgefüllt ist, bleibt F-11 im
Abnahmebericht als **MANUAL VERIFICATION REQUIRED** geführt. Die
Freigabeentscheidung wird davon nicht blockiert, weil alle sicherheitsrelevanten
Zugriffsgrenzen bereits automatisiert und serverseitig nachgewiesen sind.
