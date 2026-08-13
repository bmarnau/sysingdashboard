# Manueller Abnahmetest — AVKK Management (Sprint 09)

Version: 1.55.0 · Vorbedingung: angemeldeter Benutzer mit dem Recht
`avkk.management.view`; mindestens drei Aufgaben mit AVKK-Stand, davon eine
gefährdete, eine überfällige und eine mit Konsequenz „hoch" oder „kritisch".

Ergebnisspalte: **OK** / **Fehler** (mit Notiz).

## A. Zugriff und Sichtbarkeit

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| A1 | Als Benutzer **ohne** `avkk.management.view` anmelden | Registerkarte „AVKK Management" ist nicht sichtbar | |
| A2 | Als Führungsrolle anmelden | Registerkarte sichtbar, Sicht öffnet ohne Fehler | |
| A3 | Sicht öffnen, Ladezustand beobachten | Klartextmeldung „Führungsdaten werden geladen …", danach Inhalte | |
| A4 | Verbindung trennen und „Aktualisieren" drücken | Verständliche Fehlermeldung, kein leerer Bildschirm | |

## B. Kennzahlen und Drill-down

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| B1 | Kachel „Gefährdet" anklicken | Aufgabenübersicht zeigt ausschließlich gefährdete Aufgaben | |
| B2 | Dieselbe Kachel erneut anklicken | Auswahl wird aufgehoben, alle Aufgaben erscheinen wieder | |
| B3 | Kachel „Überfällig" anklicken | Nur Aufgaben mit überschrittenem Termin | |
| B4 | Kachel „Ohne Verantwortung" anklicken | Nur Aufgaben ohne gültige Zuordnung | |
| B5 | Summe der Kachel mit Zeilenzahl der Übersicht vergleichen | Werte stimmen überein | |

## C. Handlungsbedarf

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| C1 | Abschnitt „Handlungsbedarf" prüfen | Jede Kategorie nennt Anzahl **und** Regel im Klartext | |
| C2 | Kategorie „Kritisch" wählen | Nur Aufgaben mit kritischer Konsequenz und Gefährdung/Überfälligkeit | |
| C3 | Kategorie „Unterstützung erforderlich" wählen | Nur Aufgaben mit gemeldetem Unterstützungsbedarf | |
| C4 | Ohne Treffer filtern (z. B. enger Zeitraum) | Klare Aussage statt leerer Fläche | |

## D. Filter

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| D1 | Suche nach einem Aufgabentitel | Übersicht und alle Auswertungen reagieren gemeinsam | |
| D2 | Projekt/Kontext einschränken | Kennzahlen, Kompetenz- und Konsequenzblöcke passen sich an | |
| D3 | Fälligkeitszeitraum setzen | Nur Aufgaben mit Termin im Zeitraum | |
| D4 | „Filter zurücksetzen" | Ausgangszustand, keine aktive Kachel oder Kategorie | |

## E. Aufgabendetail

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| E1 | Aufgabe in der Übersicht öffnen | AVKK-Detaildialog mit A/V/K/K erscheint | |
| E2 | Detail ändern und speichern (mit Schreibrecht) | Übersicht zeigt den geänderten Stand nach Speichern | |
| E3 | Ohne Schreibrecht öffnen | Nur Lesedarstellung, keine Speicheraktion | |

## F. Auswertungen

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| F1 | Kompetenzblock prüfen | Aggregation je Dimension, **keine** Personennamen | |
| F2 | Kompetenzkarte anklicken | Übersicht zeigt genau die betroffenen Aufgaben | |
| F3 | Konsequenzblock prüfen | Bereiche mit Schweregrad und Terminwirkung | |
| F4 | Verantwortungsblock prüfen | Nur Zuordnungsstatus und Verantwortungsarten, keine Rangliste | |
| F5 | Verteilungsdiagramme prüfen | Jeder Balken hat einen ablesbaren Zahlenwert | |

## G. Erklärung und Kontextebene

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| G1 | Abschnitt „AVKK verstehen" prüfen | A/V/K/K erklärt, Hinweis auf keine Leistungsbewertung | |
| G2 | „Methodik im Handbuch öffnen" | Handbuchkapitel öffnet sich | |
| G3 | Abschnitt „Kontextindikatoren" prüfen | Klarer Hinweis: geplant, aktuell keine Erhebung/Speicherung | |

## H. Bericht, Barrierefreiheit, Darstellung

| Nr. | Schritt | Erwartung | Ergebnis |
| --- | --- | --- | --- |
| H1 | „Bericht (JSON)" auslösen | Datei enthält Version, Zeitstempel, Filter, Kennzahlen, Regeln — keine Personenbezüge | |
| H2 | Bedienung ausschließlich per Tastatur | Alle Kacheln, Filter und Zeilen erreichbar, Fokus sichtbar | |
| H3 | Fenster auf Mobilbreite verkleinern | Kartenansicht statt Tabelle, kein horizontaler Überlauf | |
| H4 | Statusanzeigen prüfen | Status immer Text + Symbol, nie nur Farbe | |

## Abnahmevermerk

- Getestet von: ______________ Datum: __________
- Ergebnis: ☐ angenommen ☐ angenommen mit Auflagen ☐ abgelehnt
- Auflagen/Notizen:
