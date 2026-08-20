# BSF — Kundenabrechnungssicht für Teamleiter

Stand: 2026-08-20  
Status: verbindliche fachliche Konkretisierung der BSF-Roadmap  
Geltungsbereich: Kundenmodell, Kundenverantwortung, Abrechnung und kundenbezogenes Reporting

## 1. Ziel

Für den realen Systemhausbetrieb benötigt der Teamleiter eine kundenbezogene Abrechnungssicht. Sie dient der Vorbereitung und fachlichen Prüfung der Abrechnung gegenüber dem Kunden.

Der Teamleiter muss für einen gewählten Kunden und Abrechnungszeitraum alle zugehörigen Tätigkeiten über Projekt- und Arbeitspaketgrenzen hinweg sehen, die Tätigkeiten im Rahmen seiner bestehenden Berechtigung bearbeiten und den geprüften Bestand kundenbezogen als PDF, CSV und JSON ausgeben können.

Verbindliche Fachregel:

> Abgerechnet werden ausschließlich Tätigkeiten. Projekte und Arbeitspakete dienen als Struktur-, Herkunfts- und Kontextinformation, sind aber selbst kein Abrechnungsgegenstand.

Diese Planung konkretisiert insbesondere die BSF-Arbeitspakete Kundenmodell, Kundenverantwortung, Managementcockpit 2 und Reporting 2 der `docs/ROADMAP-MVP-BSF.md`.

## 2. Begriffs- und Rollentrennung

Die folgenden Begriffe sind strikt zu trennen:

- **Kundensicht**: fachliche Sicht auf einen Kunden und die zugehörigen operativen Objekte.
- **Kundenabrechnung**: interne Arbeits- und Prüfsicht für den Teamleiter zur Vorbereitung der Abrechnung.
- **Rolle `teamlead`**: interne Führungsrolle; besitzt gemäß bestehender RBAC-Matrix unter anderem `activity.edit`.
- **Rolle `customer`**: externe bzw. read-only vorgesehene Rolle; sie ist nicht die interne Kundenabrechnungssicht und erhält dadurch keine Bearbeitungsrechte.

Eine reine UI-Filterung darf keine Berechtigung erzeugen. RBAC/RLS bzw. die jeweils gültige Scope-Prüfung bleiben maßgeblich.

## 3. Fachlicher Zielworkflow

Der vorgesehene Ablauf lautet:

1. Teamleiter öffnet **Kundenabrechnung**.
2. Teamleiter wählt einen Kunden.
3. Teamleiter wählt einen Abrechnungszeitraum.
4. Die Anwendung zeigt alle für diesen Kunden relevanten Tätigkeiten über alle Projekte und Arbeitspakete hinweg.
5. Projekt und Arbeitspaket werden je Tätigkeit als Kontext angezeigt.
6. Der Teamleiter prüft Dauer, Stundensatz, Abrechenbarkeit, Abrechnungsstatus, Datum, Beschreibung und Zuordnung.
7. Der Teamleiter kann Tätigkeiten gemäß `activity.edit` korrigieren.
8. Die Anwendung bildet Summen aus den aktuell ausgewählten Tätigkeiten.
9. Der geprüfte kundenbezogene Bestand kann als PDF, CSV und JSON ausgegeben werden.
10. Bereits abgerechnete, offene und nicht abrechenbare Tätigkeiten bleiben eindeutig unterscheidbar.

## 4. Abrechnungsmenge und Filter

Die Kundenabrechnung muss mindestens nach folgenden Dimensionen filterbar sein:

- Kunde,
- Zeitraum,
- Abrechenbarkeit,
- Abrechnungsstatus,
- Projekt,
- Arbeitspaket.

Für die eigentliche Abrechnungsvorbereitung gilt als fachlicher Standardfilter:

- `billable = true`,
- `billingStatus = offen`,
- gewählter Kunde,
- gewählter Zeitraum.

Der Teamleiter muss für die Prüfung optional auch bereits abgerechnete und nicht abrechenbare Tätigkeiten einblenden können. Diese dürfen nicht versehentlich in die Standard-Abrechnungssumme eingehen.

Der Export muss den aktuell fachlich ausgewählten Abrechnungsbestand eindeutig wiedergeben. Filterzustand, Kunde und Zeitraum müssen in der Ausgabe nachvollziehbar sein.

## 5. Anzuzeigende Tätigkeitsinformationen

Mindestens sichtbar und für Export/Prüfung verfügbar:

- Tätigkeits-ID,
- Datum,
- Uhrzeit, soweit vorhanden,
- Tätigkeit/Titel,
- Beschreibung,
- Dauer,
- Stundensatz,
- abrechenbar ja/nein,
- Abrechnungsstatus,
- Betrag der Tätigkeit,
- Kunde mit stabiler Kunden-ID,
- Projekt mit stabiler Projekt-ID, soweit zugeordnet,
- Arbeitspaket mit stabiler Arbeitspaket-ID, soweit zugeordnet,
- zuständiger/buchender Benutzer, soweit im späteren zentralen Datenmodell belastbar vorhanden.

Fehlende Quelldaten dürfen nicht erfunden werden. Für importierte Tätigkeiten gelten die Regeln des Canonical Import Model und der Pipeline `SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`.

## 6. Summen und Plausibilität

Die Kundenabrechnung soll mindestens ausweisen:

- Anzahl ausgewählter Tätigkeiten,
- Summe Stunden,
- Summe abrechenbare Stunden,
- Summe Betrag,
- optional Aufteilung nach Projekt und/oder Arbeitspaket.

Beträge werden ausschließlich aus Tätigkeiten berechnet. Eine Projekt- oder Arbeitspaketsumme ist nur eine Aggregation ihrer Tätigkeiten.

Nicht abrechenbare Tätigkeiten dürfen keinen abrechenbaren Betrag erzeugen.

## 7. Bearbeitungsrechte

Für die Kundenabrechnung gilt:

- `teamlead` darf Tätigkeiten gemäß bestehendem `activity.edit` bearbeiten.
- Die Bearbeitung nutzt denselben fachlichen Tätigkeitseditor wie die übrigen Tätigkeitsansichten; keine parallele zweite CRUD-Logik.
- defensive Permission-Prüfungen vor Mutationen bleiben erforderlich.
- `viewer` und `customer` bleiben read-only und erhalten durch die Kundenabrechnung keine Edit-Rechte.
- zukünftige kundenbezogene Scopes müssen RBAC und RLS gemeinsam berücksichtigen.

Kundenverantwortung und Bearbeitungsrecht bleiben getrennt: Sichtbarkeit eines Kunden erzeugt nicht automatisch `activity.edit`.

## 8. Exportvertrag

Für den kundenbezogenen Abrechnungsbestand sind mindestens folgende Formate verbindlich vorgesehen:

### PDF

Geeignet für Prüfung, Freigabe und Versand als Tätigkeitsnachweis bzw. Abrechnungsbeilage.

Mindestens enthalten:

- Kunde,
- Zeitraum,
- Erstellungsdatum,
- Tätigkeitsliste,
- Projekt-/Arbeitspaketkontext,
- Stunden und Beträge,
- Gesamtsummen,
- eindeutige Kennzeichnung des verwendeten Filters/Status.

### CSV

Maschinenlesbare flache Tätigkeitsliste zur Weiterverarbeitung. Eine Zeile entspricht einer Tätigkeit.

### JSON

Strukturierter, versionierbarer Export mit Kunde, Zeitraum, Filtermetadaten, Summen und Tätigkeitsdatensätzen. Stabile IDs und Provenienz sind beizubehalten, soweit vorhanden.

Die vorhandenen Exportpfade sollen wiederverwendet und konsolidiert werden. Keine zweite unabhängige Exportarchitektur für die Kundenabrechnung aufbauen.

## 9. Abgrenzung zur rechtlichen Faktura

Die Kundenabrechnungssicht erzeugt zunächst die geprüfte Abrechnungsgrundlage bzw. einen Tätigkeitsnachweis.

Nicht automatisch Bestandteil dieses BSF-Arbeitspakets sind Funktionen einer vollständigen rechtlichen Rechnungsstellung, insbesondere:

- Rechnungsnummernkreis,
- Rechnungsadresse und Debitorenstammdaten,
- Umsatzsteuerlogik,
- Netto/Brutto,
- Zahlungsziel,
- Mahnwesen,
- Buchhaltungsübergabe.

Falls Sysing später selbst rechtliche Rechnungen erzeugen soll, ist dies als eigenes Fachmodul mit eigener Daten-, Audit- und Integrationsentscheidung zu planen.

## 10. Datenmodell und Kundenmodell

Die Kundenabrechnung setzt das BSF-Kundenmodell voraus:

- Kunde als eigenständige Entität,
- stabile Kunden-ID,
- eindeutige Zuordnung von Projekten, Arbeitspaketen und Tätigkeiten zum Kunden,
- providerneutrale Identität,
- spätere Übernahme/Zuordnung aus SharePoint und anderen Providern.

Bei widersprüchlichen Kundenzuordnungen zwischen Tätigkeit, Arbeitspaket und Projekt darf keine stille automatische Umdeutung erfolgen. Solche Fälle müssen validiert bzw. zur Prüfung markiert werden.

## 11. UI-Zielbild

Vorgesehen ist eine eigenständige interne Sicht **Kundenabrechnung** für berechtigte Rollen, primär den Teamleiter.

Mindestens:

- Kundenauswahl,
- Zeitraumsauswahl,
- Statusfilter,
- Tabelle aller passenden Tätigkeiten,
- Bearbeiten-Aktion nur bei `activity.edit`,
- Summenbereich,
- Exportaktionen PDF / CSV / JSON,
- klarer Hinweis, dass ausschließlich Tätigkeiten abgerechnet werden.

Die Sicht soll nicht mit der externen Rolle `customer` oder einer späteren Kundenportal-Sicht verwechselt werden.

## 12. Wiederverwendung des heutigen MVP-Stands

Bereits vorhandene Bausteine bilden die technische Grundlage:

- Tätigkeiten tragen Dauer, Stundensatz, `billable` und `billingStatus`.
- Die bestehende Abrechnungssicht aggregiert offene und abgerechnete Tätigkeiten.
- Die bestehende Exportlogik kann nach Kunde und Zeitraum filtern.
- PDF, CSV und JSON sind vorhandene Exportformate.
- `teamlead` besitzt `activity.edit`.

BSF soll diese Bausteine konsolidieren und kundenbezogen fachlich schließen, nicht parallel neu bauen.

## 13. Sicherheit und Audit

Für eine spätere zentrale Datenhaltung gelten zusätzlich:

- Berechtigungsprüfung im Benutzerkontext,
- RLS-/Scope-konforme Kunden- und Tätigkeitsselektion,
- Audit für relevante Änderungen am Abrechnungsstatus und an abrechnungswirksamen Tätigkeitsdaten,
- keine Secrets oder Tokens in Exporten,
- keine Rechteausweitung durch Export oder UI-Filter,
- nachvollziehbare Herkunft importierter Daten.

## 14. Abnahmekriterien BSF

Das Arbeitspaket ist fachlich erst abgenommen, wenn mindestens nachgewiesen ist:

1. Ein Teamleiter kann einen Kunden und Zeitraum auswählen.
2. Alle diesem Kunden zugeordneten Tätigkeiten im Zeitraum werden vollständig und ohne fremde Kundendaten angezeigt.
3. Tätigkeiten aus mehreren Projekten/Arbeitspaketen desselben Kunden erscheinen gemeinsam.
4. Projekt und Arbeitspaket sind nur Kontext; Abrechnungsgegenstand bleibt die Tätigkeit.
5. Der Teamleiter kann Tätigkeiten gemäß `activity.edit` bearbeiten.
6. Viewer/Customer können keine Tätigkeiten über diese Sicht verändern.
7. Standard-Abrechnungsbestand enthält nur abrechenbare offene Tätigkeiten.
8. Bereits abgerechnete und nicht abrechenbare Tätigkeiten können zur Prüfung eingeblendet werden, ohne die Standardsumme zu verfälschen.
9. PDF-, CSV- und JSON-Ausgabe können pro Kunde und Zeitraum erzeugt werden.
10. Summen zwischen UI, PDF, CSV und JSON stimmen überein.
11. Stabile Kunden-/Objekt-IDs und Provenienz bleiben in maschinenlesbaren Ausgaben erhalten, soweit vorhanden.
12. RBAC, RLS/Scopes, Audit, Tests und Dokumentation sind nachgewiesen.

## 15. Einordnung in die BSF-Reihenfolge

Empfohlene Reihenfolge:

1. Kundenmodell und stabile Kunden-ID.
2. Kundenverantwortung und kundenbezogene Sichtberechtigung.
3. zentrale/synchronisierte Datenhaltung und Providergrenze soweit für Mehrbenutzerdaten erforderlich.
4. **Kundenabrechnungssicht Teamleiter**.
5. Reporting 2 / Konsolidierung kunden- und projektbezogener Ausgaben.
6. BSF-Gesamtabnahme.

Grobe Umsetzungsgröße: **1–2 gezielte Prompts**, vorzugsweise gebündelt mit Managementcockpit 2 und Reporting 2, damit keine zweite Reporting-/Exportarchitektur entsteht.

## 16. Verbindlicher Folgepunkt für SYSING-001

Bei der nächsten regulären Fortschreibung von `SYSING-001` ist das Zielbild aufzunehmen:

- Teamleiter als Verantwortlicher für die kundenbezogene Abrechnungsvorbereitung,
- Kundenabrechnung als interne Sicht,
- Tätigkeit als einziger Abrechnungsgegenstand,
- kundenbezogene Bearbeitung der Tätigkeiten,
- PDF-/CSV-/JSON-Ausgabe pro Kunde und Zeitraum,
- klare Abgrenzung zur externen Rolle `customer` und zur vollständigen rechtlichen Faktura.

Bis zur Umsetzung ist dies als **GEPLANT / POST-MVP (BSF)** zu kennzeichnen.
