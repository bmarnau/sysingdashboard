# Projektmanager — Projektcockpit / Projektdetail

Stand: 2026-08-21  
Status: fachliche MVP-Lücke aus manueller F-11-Abnahme

## 1. Beobachtung

In der aktuellen Dashboard-Version 1.59.4 kann ein Projektmanager ein Projekt in der Projektsicht sehen und bearbeiten. Ein konsolidiertes Projektdetail, das alle fachlich zugehörigen Informationen eines Projekts in einer zusammenhängenden Sicht zeigt, existiert jedoch nicht.

Aktuell verteilt sich die Information auf mehrere Tabs:

- **Projekte:** Stammdaten, Status, Budget/Aufwand, Team, Deadline; der Stift öffnet den Bearbeitungsdialog.
- **Arbeitspakete:** können über den vorhandenen Projektfilter auf ein Projekt eingeschränkt werden.
- **Tätigkeiten:** zeigen die Projektzuordnung über Arbeitspaket → Projekt, besitzen aber derzeit keinen direkten Projektfilter bzw. keinen Projekt-Drill-down aus der Projektkarte.
- **AVKK:** projektrelevante Informationen können über Projekt-/AVKK-Berichte bzw. Managementsichten ausgewertet werden, sind aber nicht Teil eines allgemeinen Projektdetails.

Damit ist der in F-11 erwartete Drill-down `Projekt → Arbeitspakete → Tätigkeiten → Detail` aktuell nur über manuelles Wechseln und Filtern zwischen Tabs möglich und nicht als durchgängiger Projektkontext umgesetzt.

## 2. Fachliche Zielanforderung

Ein Projektmanager soll ein Projekt öffnen können und in einer einzigen, projektbezogenen Sicht mindestens Folgendes erhalten:

1. **Projektkopf / Stammdaten**
   - Projektname und ID
   - Kunde
   - Projektleitung
   - Status
   - Start / Deadline
   - Budget / Sollstunden
   - Team
   - Beschreibung

2. **Projektkennzahlen**
   - Ist-Aufwand aus Tätigkeiten
   - Budget-/Stundenverbrauch
   - offene/überfällige Arbeitspakete
   - Anzahl Tätigkeiten
   - abrechenbare Stunden/Beträge als Information, ohne die spätere Kundenabrechnung vorwegzunehmen

3. **Arbeitspakete des Projekts**
   - vollständige Liste
   - Status, Priorität, Fälligkeit, Verantwortliche
   - Aufwand Soll/Ist
   - direkter Drill-down zum Arbeitspaket

4. **Tätigkeiten des Projekts**
   - alle Tätigkeiten, die direkt oder über ein Arbeitspaket zum Projekt gehören
   - Datum, Person, Dauer, abrechenbar/nicht abrechenbar, Abrechnungsstatus
   - direkter Drill-down zur Tätigkeit

5. **AVKK im Projektkontext**
   - gefährdete und unvollständige AVKK-Sachverhalte
   - fehlende Voraussetzungen / Kompetenzlücken
   - Konsequenzen und Frühindikatoren
   - keine personenbezogene Rangliste

6. **Reporting**
   - Projektbericht aus genau demselben Projektkontext
   - Werte müssen mit Projektdetail, Arbeitspaketen und Tätigkeiten konsistent sein

## 3. Rollen- und Sicherheitsregeln

- Die Sicht darf keine neue Berechtigungslogik einführen.
- Bestehende Permissions `project.edit`, `workpackage.edit`, `activity.edit`, `avkk.view`, `avkk.edit` und ggf. `avkk.responsibility.assign` bleiben maßgeblich.
- Lesen und Bearbeiten sind getrennt zu behandeln.
- Projektmanager dürfen im zulässigen Scope bearbeiten; Viewer/Customer bleiben read-only.
- RLS-/Provider-Grenzen bleiben unverändert maßgeblich.
- Kein Rollen-String-basiertes Sonderverhalten in der Projektdetail-Komponente.

## 4. Technische Leitidee

Das Projektdetail sollte kein zweiter Datenbestand und keine neue Fachlogik werden. Es soll vorhandene Projekte, Arbeitspakete, Tätigkeiten und AVKK-Daten anhand einer stabilen `projectId` zusammenführen.

Empfohlener Navigationsfluss:

`Projekte → Projektkarte/Projektname öffnen → Projektdetail → Arbeitspaket/Tätigkeit/AVKK öffnen → zurück zum selben Projektkontext`

Der vorhandene Bearbeitungsstift bleibt ausschließlich für die Änderung der Projektstammdaten zuständig.

## 5. MVP-Einordnung

Die Lücke wurde während der manuellen F-11-Projektmanager-Abnahme entdeckt. Da F-11 ausdrücklich einen konsistenten Projekt-Drill-down verlangt, ist der Punkt vor der formalen `MVP 100 % / BASELINE`-Kennzeichnung zu bewerten.

Bis zur technischen Umsetzung gilt:

- Projektmanager-Projektsicht: **teilweise erfüllt**
- Projektmanager-Drill-down: **nicht vollständig erfüllt**
- F-11 bleibt **MANUAL VERIFICATION REQUIRED / funktionale Lücke vorhanden**

## 6. Abnahmekriterien

1. Klick auf Projektname/-karte öffnet eine echte Projektdetailansicht; Bearbeitungsstift bleibt separat.
2. Stammdaten und Kennzahlen sind sichtbar und konsistent.
3. Nur Arbeitspakete des gewählten Projekts werden angezeigt.
4. Nur Tätigkeiten des gewählten Projekts werden angezeigt, auch wenn die Zuordnung über ein Arbeitspaket erfolgt.
5. AVKK-Sachverhalte sind auf das Projekt begrenzt.
6. Drill-down zu Arbeitspaket und Tätigkeit funktioniert und kehrt in den Projektkontext zurück.
7. Projektbericht verwendet denselben Projektscope.
8. RBAC-Verhalten bleibt unverändert und wird getestet.
9. Viewer/Customer erhalten keine zusätzlichen Schreibrechte.
10. Bestehende Tests und reguläre Quality Gates bleiben grün.
