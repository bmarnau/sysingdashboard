# Reporting-Layout — Abnahmeregel für PDF, Druck und Word

Stand: 2026-08-21  
Status: verbindliche Layout- und Abnahmeregel für Sysing Dashboard Reporting

## 1. Ziel

Berichte sollen fachlich vollständig, gut lesbar und zugleich platzsparend paginiert werden. Große ungenutzte Leerbereiche sind zu vermeiden, insbesondere bei PDF- und Druckausgabe.

Die Regel gilt formatübergreifend für die Reporting-Schicht nach ADR-0028 und insbesondere für die AVKK-Berichte SYSING-101 bis SYSING-103.

## 2. Verbindliche Layout-Regeln

1. Ein neuer fachlicher Abschnitt erzeugt **nicht automatisch** eine neue Seite.
2. Abschnitte fließen auf der aktuellen Seite weiter, solange ausreichend nutzbarer Platz vorhanden ist.
3. Ein Seitenumbruch erfolgt nur, wenn der folgende Inhalt nicht sinnvoll auf die aktuelle Seite passt oder wenn Lesbarkeit/Tabellenintegrität dies erfordern.
4. Tabellenzeilen sollen nicht unnötig geteilt werden; Tabellenköpfe werden auf Folgeseiten wiederholt.
5. Überschrift und unmittelbar folgender Inhalt sollen möglichst zusammenbleiben.
6. Große Leerflächen durch `page-break-before`, `break-before`, `page-break-inside: avoid` oder vergleichbare pauschale Regeln sind zu vermeiden.
7. Kopf- und Fußzeilen sowie Seitenzahlen dürfen den nutzbaren Inhaltsbereich nicht unnötig verkleinern.
8. Spaltenbreiten und Textumbrüche sind so zu wählen, dass Begriffe nicht unnötig in einzelne Silben oder Buchstaben zerfallen.
9. Word, PDF und Druck dürfen im Detail unterschiedlich umbrechen, sollen aber denselben fachlichen Inhalt und eine vergleichbar kompakte Seitennutzung aufweisen.
10. Leere Abschlussseiten oder Seiten, die überwiegend nur einen kleinen Einzelabschnitt enthalten, sind zu vermeiden, sofern eine fachlich saubere Zusammenlegung möglich ist.

## 3. Beobachtung aus manueller Abnahme SYSING-101

Beim persönlichen AVKK-Bericht für Alex am 2026-08-21 wurde festgestellt:

- PDF: 6 Seiten mit großen ungenutzten Flächen, da fachliche Abschnitte jeweils auf einer neuen Seite beginnen.
- Word: 2 Seiten und deutlich kompakter; die Ausgabe zeigt, dass derselbe Inhalt ohne Abschnitt-pro-Seite-Strategie wesentlich platzsparender darstellbar ist.
- In breiten Tabellen treten zusätzlich ungünstige Umbrüche einzelner Überschriften und Begriffe auf.

Die fachlichen Werte des Berichts waren plausibel; das Finding betrifft Layout/Paginierung, nicht Daten oder Berechtigungen.

## 4. Technisch bestätigte Ursachen im aktuellen Renderer

### PDF

`src/lib/report/renderers/pdf.ts` ruft vor jedem `ReportSection` pauschal `doc.addPage()` auf. Dadurch beginnt jeder Abschnitt zwingend auf einer neuen Seite, unabhängig vom noch freien Platz.

Zielzustand:

- Cursor über Abschnitte hinweg weiterführen,
- `doc.lastAutoTable.finalY` für den tatsächlichen Tabellenabschluss verwenden,
- neue Seite nur bei unzureichendem Restplatz erzeugen,
- AutoTable für mehrseitige Tabellen weiter selbst paginieren lassen,
- Header/Footer bei tatsächlich erzeugten Folgeseiten beibehalten.

### Druck

`src/lib/report/renderers/print.ts` setzt für jeden kompletten Abschnitt `.block { page-break-inside: avoid; }`. Dadurch kann ein größerer Abschnitt vollständig auf die nächste Seite verschoben werden und auf der vorherigen Seite unnötig viel Leerraum hinterlassen.

Zielzustand:

- Abschnitt als Ganzes nicht pauschal gegen Umbruch sperren,
- Überschrift möglichst mit dem ersten Inhalt zusammenhalten,
- Tabellenzeilen weiterhin gegen ungünstige Teilung schützen,
- Browser-Paginierung für längere Tabellen zulassen,
- Abstände zwischen Abschnitten kompakt halten.

## 5. Abnahmekriterien

Eine Reporting-Layout-Änderung ist erst abgenommen, wenn:

1. SYSING-101 PDF fachlich unverändert vollständig ist.
2. PDF nicht mehr automatisch einen Abschnitt pro Seite erzeugt.
3. Deutlich große Leerflächen aus künstlichen Abschnittsseitenumbrüchen entfallen.
4. Druckvorschau zeigt ebenfalls einen kontinuierlichen Inhaltsfluss.
5. Tabellenköpfe und Zeilen lesbar bleiben.
6. Keine Tabellen oder Inhalte am Seitenrand abgeschnitten werden.
7. Kopf-/Fußzeilen und Seitenzahlen korrekt bleiben.
8. PDF, Druck und Word enthalten dieselben fachlichen Werte.
9. Bestehende Report-Renderer-Tests bleiben grün und werden um Paginierungs-/Layoutregressionen ergänzt, soweit automatisiert sinnvoll.
10. Mindestens SYSING-101 wird nach Änderung einmal manuell als PDF und Druck geprüft; SYSING-102/SYSING-103 werden stichprobenartig kontrolliert, weil sie denselben Renderer verwenden.

## 6. Einordnung zum MVP-Abschluss

Das Layout-Finding ist kein RBAC-/RLS-/Datenintegritätsfehler. Es soll jedoch möglichst vor Festschreibung der endgültigen MVP-Baseline bereinigt werden, sofern dies als kleiner, isolierter Renderer-Fix ohne neue Fachlogik möglich ist.

Die Änderung darf die laufende F-11-Rollenabnahme nicht vermischen oder zurücksetzen. Erst nach Abschluss der manuellen Rollenprüfung wird entschieden, ob der Renderer-Fix noch in die MVP-Baseline aufgenommen oder als unmittelbar nachgelagerter Qualitätsfix umgesetzt wird.
