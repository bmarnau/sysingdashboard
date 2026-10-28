# ADR-0038: BSF-Umfang und Meilensteindefinition (MVP, Golden Gate, BSF)

- **Status**: Accepted (Owner, 2026-10-28)
- **Datum**: 2026-10-28
- **Entscheider**: Owner (Klärung am 2026-10-28, Fragen 1 bis 5)
- **Ergänzt**: Gesamtplan, Sprintplan MVP/BSF, Golden-Gate-Execution-Tracker

## Kontext

Die Meilensteine MVP, Golden Gate und BSF waren nicht eindeutig gegeneinander abgegrenzt. Die Gesamtschätzung (8 Sprints bis BSF, 3 bis MVP) war nicht aus den Schätzfeldern der Pakete hergeleitet. Der Gesamtplan zählt Azure-/Entra-Migrationsfähigkeit und Reporting zum BSF.

## Entscheidung

1. **MVP** (Transparenz) ist erreicht und formal abgeschlossen: `docs/MVP-CLOSURE-STATUS-2026-08-24.md` führt "MVP 100 % / BASELINE READY", wirksam mit dem Merge von PR #60 (2026-08-24). Der ältere Zwischenstand vom 2026-08-21 ("FORMAL SIGN-OFF PENDING") ist überholt. Der Owner hat den Abschluss am 2026-10-28 in Lanzerath bestätigt. Eine Kennzahl "Sprints bis MVP" entfällt.
2. **Golden Gate** ist der Release-Meilenstein (Lieferpakete L0 bis L8, Publish, Tag v1.69.0, Tests N1 bis N5). Er ist kein Teil des MVP und noch nicht der BSF.
3. **BSF** (Führung) umfasst: Managementcockpit (L2, L3), QS-06, BSF-06 (Betreiberhoheit, Docker, Installierbarkeit) und den Querschnitt aus Tests, Sicherheit und Dokumentation. Gate: `BSF = 100 % / BASELINE`.
4. **Nach dem BSF** liegen: Azure-/Entra-Migrationsfähigkeit, der weitere Reporting-Ausbau und die intelligente Entscheidungsvorbereitung. **L7 (Reporting 2, BSF-09) bleibt im Golden Gate**, weil L8 fachlich davon abhängt.
5. **Sprint-Einheit**: 1 Sprint = 1 abgeschlossenes Arbeitspaket mit eigenem PR (Umsetzung, Tests, Dokumentation, Merge).
6. **Schätzung**: bottom-up aus den `schaetzung`-Feldern. Bis Golden Gate: 9 offene Pakete (L0, L0b, L2 bis L8), 26 bis 43 Arbeitstage. Für die Pakete zwischen Golden Gate und BSF fehlen Schätzfelder; sie sind in einer Planungsrunde zu ergänzen.

## Konsequenzen

- Der Gesamtplan muss nach Annahme dieses ADR angepasst werden (Azure/Entra und weiterer Reporting-Ausbau nach BSF).
- `roadmap_schaetzung` im Tracker führt die Herleitung; die Zahl "bis BSF" bleibt bis zur Planungsrunde unbestimmt.
- Risiko: Das BSF-Gate wird enger gefasst als im Gesamtplan; die Verschiebung ist hiermit bewusst dokumentiert.

## Annahme

Der Owner hat den ADR am 2026-10-28 mit "ADR-0038 annehmen" angenommen.

## Offene Punkte

- Auslegung: Die "Vorbereitung Entra ID / Azure SQL / Azure Storage" in BSF-06 bleibt im BSF; nach dem BSF liegt die vollständige Migrationsfähigkeit. Bei abweichender Auslegung des Owners ist dieser ADR zu korrigieren.
- Umfang von BSF-04, BSF-04A, BSF-DOC-01 bis -03 und BSF-FINAL-INTERNAL relativ zum BSF-Gate.
