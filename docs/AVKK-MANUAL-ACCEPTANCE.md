# AVKK — Manueller Abnahmetest (Sprint 08)

Version: 1.53.0 · Bereich: Dashboard → Tab **Mein AVKK**

Jeder Schritt wird mit _erfüllt / teilweise / nicht erfüllt_ bewertet. Abweichungen
bitte mit Screenshot und Uhrzeit notieren.

| #   | Schritt                             | Erwartetes Ergebnis                                                                               | Bewertung |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------- | --------- |
| 1   | Anmelden und Tab „Mein AVKK" öffnen | Tab ist sichtbar (Rolle mit `avkk.view`), Aufgabenliste erscheint                                 |           |
| 2   | Kennzahlen prüfen                   | Aufgaben, Mit AVKK-Stand, Gefährdet, Vollständig, Überfällig, Eigene Verantwortung sind plausibel |           |
| 3   | Suche verwenden                     | Eingabe filtert nach Titel, Kennung und Bezug                                                     |           |
| 4   | Filter durchklicken                 | Jeder Filter verändert die Liste nachvollziehbar; „Alle" stellt sie wieder her                    |           |
| 5   | Aufgabe öffnen                      | Detailansicht zeigt Aufgabe, A/V/K/K-Abschnitte und Kontextblock                                  |           |
| 6   | Verantwortung zuordnen              | Person, Rolle und mindestens eine Verantwortungsart speichern; Erfolgsmeldung; Eintrag erscheint  |           |
| 7   | Kompetenz bewerten                  | Je Dimension Bewertung speichern; erneutes Speichern überschreibt nicht, sondern schreibt fort    |           |
| 8   | Konsequenz erfassen                 | Bereich, Schweregrad, Terminwirkung speichern; Eintrag erscheint                                  |           |
| 9   | Frühindikator prüfen                | Nach „nicht vorhanden" bzw. zwei „teilweise" erscheint „Gefährdet" mit ausgeschriebenen Gründen   |           |
| 10  | Seite neu laden                     | Alle Eingaben sind weiterhin vorhanden (Serverpersistenz)                                         |           |
| 11  | Rolle „viewer" testen               | Eingaben sind gesperrt, Hinweis auf Leserecht erscheint, Werte bleiben lesbar                     |           |
| 12  | Offline testen                      | Speichern meldet sichtbar, dass ohne Verbindung nichts gespeichert wurde                          |           |
| 13  | Tastaturbedienung                   | Liste, Filter und Dialog sind ohne Maus bedienbar, Fokus bleibt sichtbar                          |           |
| 14  | Mobil/Tablet                        | Unter Tablet-Breite Kartenansicht, ab Tablet Tabelle; nichts wird abgeschnitten                   |           |
| 15  | „AVKK verstehen"                    | Öffnet das Handbuch beim Kapitel AVKK                                                             |           |

## Bekannte Grenzen (bewusst, nicht als Fehler melden)

- Weiche Kontextfaktoren (Belastung, Unterstützung, Störungen) werden noch nicht erfasst.
- AVKK-Daten liegen serverseitig und sind nicht Teil des lokalen Backups/JSON-Exports.
- Es gibt keinen Datenbank-Fremdschlüssel auf die lokalen Aufgabenobjekte (ADR-0025).
