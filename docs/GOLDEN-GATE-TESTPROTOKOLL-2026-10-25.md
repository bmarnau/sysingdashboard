# Golden Gate: Testprotokoll Demo-Test (2026-10-24 und 2026-10-25)

Zweck: Belege für den realistischen Test mit Demodaten (L0b, L0c, TD-01). Stand: 2026-10-25, 14:55 Uhr (Europe/Berlin).
Datensatz 2.2.0, Version 1.69.0 (Datum 21.10.2026). Mandant: synthetischer Demo-Mandant (ADR-0037).

## Ergebnisse

| Nr  | Konto | Umgebung            | Schritt                                                                     | Erwartet                                                                                          | Ergebnis                                                                    | Status    |
| --- | ----- | ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------- |
| T1  | Bernd | Lovable-Vorschau    | Veröffentlichen-Dialog öffnen                                               | Zielkunde „DEMO – Kunde A (synthetisch)“, lokale Namen als Auswahl, nichts automatisch zugeordnet | wie erwartet, Hinweis zur Zuordnung des Veröffentlichenden sichtbar         | bestanden |
| T2  | Bernd | Lovable-Vorschau    | Vorschau mit „Beispiel Handel GmbH“ und „Musterstadt Verwaltung“            | 3 Projekte, 12 Arbeitspakete, 27 Tätigkeiten, Rest bleibt lokal                                   | 3 / 12 / 27, 60 Objekte nicht zugeordnet, 1 ohne Kunde                      | bestanden |
| T3  | Bernd | Lovable-Vorschau    | Veröffentlichen                                                             | Erfolg ohne `engineer_mismatch`                                                                   | 3 / 12 / 27 veröffentlicht, 0 zurückgezogen                                 | bestanden |
| T4  | Bernd | Lovable-Vorschau    | Arbeitssicht (Verantwortungen → Arbeitspakete)                              | 12 Pakete mit Fälligkeiten                                                                        | 12 von 12, Fälligkeiten sichtbar; Mängel M1 und M2                          | bestanden |
| T5  | Petra | veröffentlichte App | Demodaten einspielen                                                        | Datensatz 2.2.0, 10 Projekte, 30 Arbeitspakete, 25/63 Tätigkeiten                                 | wie erwartet                                                                | bestanden |
| T6  | Petra | veröffentlichte App | Veröffentlichen für „DEMO – Kunde B (synthetisch)“ (Beispiel Produktion AG) | Erfolg ohne `engineer_mismatch`                                                                   | 2 Projekte, 8 Arbeitspakete, 20 Tätigkeiten veröffentlicht, 0 zurückgezogen | bestanden |
| T7  | Bernd | Vorschau            | Arbeitssicht nach Datenauftrag (7 Verantwortliche, 5 ohne)                  | Namen sichtbar                                                                                    | offen                                                                       | offen     |
| T8  | Alex  | beliebig            | Veröffentlichen-Dialog (keine Mitgliedschaft)                               | kein Kunde mit Schreibrecht                                                                       | offen                                                                       | offen     |
| T9  | Alexa | beliebig            | Rolle Viewer                                                                | nur Leserechte, kein Veröffentlichen                                                              | offen                                                                       | offen     |

## Mängel

| Nr  | Befund                                                                                                                            | Maßnahme                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M1  | Erledigte Arbeitspakete erscheinen in der Arbeitssicht als „Überfällig“.                                                          | Fix in Entwurfs-PR 220 (neue Fälligkeitsgruppe DONE), CI grün, Merge nach Lovable-Klärung. |
| M2  | Verantwortliche je Arbeitspaket fehlten in den Demodaten („Nicht zugeordnet“).                                                    | Datenauftrag Kunde A ausgeführt (2026-10-25, 12:25); Kunde B folgt (offen, Work-Guthaben). |
| M3  | Veröffentlichte App und Lovable-Arbeitskopie weichen ab: Lovable legt den verbotenen Auth-Broker bei jedem Schritt neu an (R-07). | Support-Anfrage an Lovable am 2026-10-24 gestellt; Publish bleibt No-Go bis zur Klärung.   |

## Hinweise

- Test auf der veröffentlichten App (T5, T6) belegt, dass Veröffentlichen mit Datensatz 2.2.0 dort funktioniert. Die Quelle des Publish (Arbeitskopie oder GitHub) ist weiter ungeklärt.
- Die Demodaten in der Datenbank (Fälligkeiten) altern; ein wiederholbarer Auffrischungsauftrag ist als TD-01 Stufe b vorgesehen.
- Belege: Bildschirmfotos des Nutzers vom 2026-10-24 und 2026-10-25; Work-Berichte (Vorprüfung 12:18, Datenauftrag 12:25).
