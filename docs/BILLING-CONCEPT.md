# Abrechnung V1 — kundenbezogener Leistungsnachweis

**Status:** fachliche Vormerkung für spätere Umsetzung  
**Stand:** 22.08.2026  
**Version 1:** ausschließlich Leistungs-/Zeitnachweis, **keine kaufmännische Rechnung**

---

## 1. Verbindliche Abgrenzung für Version 1

Sysing erstellt in Version 1 **keine Rechnung im kaufmännischen oder steuerlichen Sinn**.

Version 1 umfasst ausschließlich:

- Auswahl eines Kunden,
- festen Abrechnungs-/Leistungszeitraum,
- Prüfung der zugehörigen Tätigkeiten,
- Einstufung abrechenbar / nicht abrechenbar,
- Bearbeitung der Tätigkeiten vor Abschluss,
- Summe der abrechenbaren Leistungszeit,
- Finalisierung als schreibgeschützter Leistungsnachweis,
- Report / Export pro Kunde und Zeitraum.

Nicht Bestandteil von Version 1:

- Rechnungsnummer,
- Preise oder Stundensätze,
- Netto-/Bruttobeträge,
- Umsatzsteuer,
- Zahlungsziel,
- Buchungslogik,
- OP-Verwaltung,
- Gutschriften im steuerlichen Sinn,
- vollständige Faktura.

Eine spätere Übergabe an ein kaufmännisches System / ERP / Faktura bleibt möglich.

---

## 2. Rollenmodell

Die Abrechnungsvorbereitung und Finalisierung erfolgt **ausschließlich durch Teamlead**.

Andere Rollen können Tätigkeiten weiterhin in ihrem jeweils erlaubten operativen Scope bearbeiten, führen aber keine Abrechnung aus.

Der Teamlead benötigt für den Leistungsnachweis einen kundenbezogenen Gesamtscope über:

- Projekte,
- Arbeitspakete,
- Tätigkeiten,
- Zeit-/Leistungsdaten.

Die Abrechnungsberechtigung ist ein eigener fachlicher Vorgang und darf nicht allein aus `activity.edit` abgeleitet werden.

---

## 3. Grundlage: Tätigkeiten eines Kunden im festen Zeitraum

Ein Leistungsnachweis bezieht sich immer auf:

- genau einen Kunden,
- einen eindeutig gespeicherten Zeitraum,
- alle fachlich zu diesem Kunden gehörenden Tätigkeiten innerhalb dieses Zeitraums.

Die Kundenzuordnung muss serverseitig eindeutig ableitbar sein, beispielsweise über:

```text
Kunde
  └── Projekt
        └── Arbeitspaket
              └── Tätigkeit
```

Der Zeitraum muss reproduzierbar gespeichert werden (`period_start`, `period_end`).

Später verbindlich festzulegen:

- Beginn/Ende inklusive,
- verwendete Zeitzone,
- Rundungs- bzw. Tagesgrenzen.

---

## 4. Interne Abrechnungsvorbereitung

In der internen Teamlead-Sicht erscheinen **alle relevanten Tätigkeiten** des Kunden im Zeitraum:

- abrechenbare Tätigkeiten,
- nicht abrechenbare Tätigkeiten.

Mindestens sichtbar:

- Datum,
- Leistungsbeschreibung,
- Projekt,
- Arbeitspaket,
- geleistete Zeit,
- Status abrechenbar / nicht abrechenbar,
- intern: Leistungserbringer,
- gegebenenfalls Änderungs-/Prüfhinweise.

Der Teamlead kann vor Finalisierung:

- Tätigkeiten bearbeiten,
- Zeit bzw. Beschreibung korrigieren,
- nicht abrechenbar → abrechenbar ändern,
- abrechenbar → nicht abrechenbar ändern,
- Ergebnis neu berechnen lassen.

---

## 5. Abrechenbar / nicht abrechenbar

Nicht abrechenbare Leistungen werden **nicht aus der internen Prüfsicht entfernt**.

Das ist wichtig, weil der Teamlead vor Abschluss noch fachlich entscheiden können muss, ob die Einstufung korrekt ist.

Für die endgültige Summe gelten nur Tätigkeiten mit:

```text
billable = true
```

Nicht abrechenbare Tätigkeiten zählen nicht zur abrechenbaren Gesamtsumme.

Ob sie zusätzlich in einem **internen Abschlussnachweis** dokumentiert werden, sollte bei der Umsetzung entschieden werden. In der externen Kundenausgabe müssen sie nicht automatisch erscheinen.

---

## 6. Summe der abrechenbaren Zeit

Version 1 summiert ausschließlich die **abrechenbare Leistungszeit**.

Beispiel:

```text
Kunde A
Zeitraum: 01.08.2026–31.08.2026

abrechenbare Tätigkeit 1:  2:30 h
abrechenbare Tätigkeit 2:  1:15 h
nicht abrechenbare Tätigkeit: 0:45 h

Leistungsnachweis gesamt: 3:45 h
```

Die Berechnung muss deterministisch und reproduzierbar sein.

Noch festzulegen:

- Speichereinheit (empfohlen: Minuten),
- Rundungsregeln,
- Mindestzeiteinheiten,
- Umgang mit fehlerhaften oder negativen Zeitwerten.

---

## 7. Finalisierung und Schreibschutz

Empfohlenes Statusmodell für Version 1:

```text
draft → prepared → finalized
```

### draft
Tätigkeiten und Einstufungen werden geprüft und können verändert werden.

### prepared
Vorbereitung ist fachlich abgeschlossen, letzte Kontrolle möglich.

### finalized
Der Leistungsnachweis ist abgeschlossen und **schreibgeschützt**.

Nach der Finalisierung darf der gespeicherte Leistungsnachweis nicht still verändert werden.

---

## 8. Snapshot statt nachträglicher Veränderung

Beim Abschluss sollte Sysing einen **unveränderbaren Snapshot** der tatsächlich verwendeten Leistungspositionen speichern.

Das ist wichtig, weil die operativen Tätigkeiten später eventuell noch korrigiert werden müssen.

Der Snapshot sollte mindestens enthalten:

- Tätigkeit-ID als Referenz,
- Leistungsdatum,
- Beschreibung,
- Projekt,
- Arbeitspaket,
- abrechenbar-Status zum Abschlusszeitpunkt,
- Dauer zum Abschlusszeitpunkt,
- Kundenreferenz,
- Finalisierungszeitpunkt.

Damit bleibt der Leistungsnachweis auch später reproduzierbar.

---

## 9. Schutz vor doppelter Abrechnung

Eine Tätigkeit darf nicht versehentlich in zwei finalisierten Leistungsnachweisen desselben abrechenbaren Kontexts vorkommen.

Dafür braucht es später eine **serverseitige Idempotenz-/Eindeutigkeitsregel**.

Beispiel:

```text
BillingRun
   └── BillingItem
          └── activity_id
```

Beim Finalisieren muss geprüft werden, ob eine Tätigkeit bereits Teil eines anderen finalisierten Leistungsnachweises ist.

Eine reine UI-Warnung reicht nicht aus.

---

## 10. Korrektur nach Finalisierung

Ein finalisierter Leistungsnachweis wird nicht einfach wieder editierbar gemacht.

Für Fehler nach Abschluss braucht Version 1 einen nachvollziehbaren Korrekturweg, zum Beispiel:

```text
finalized
   ↓
voided / superseded
   ↓
neuer korrigierter Leistungsnachweis
```

Damit bleibt nachvollziehbar:

- welcher Stand ursprünglich abgeschlossen war,
- warum er korrigiert wurde,
- welcher neue Stand ihn ersetzt.

Da Version 1 keine Rechnung ist, genügt hier ein fachlicher Korrektur-/Ersetzungsprozess; steuerliche Storno-/Gutschriftlogik ist nicht erforderlich.

---

## 11. Leistungserbringer: intern ja, extern nein

Der konkrete Leistungserbringer — zum Beispiel **Sam Marnau** — darf intern für Prüfung, Audit und Nachvollziehbarkeit sichtbar bleiben.

Im endgültigen kundenbezogenen Leistungsnachweis wird der Name des Leistungserbringers **nicht ausgegeben**.

Damit gilt:

```text
Interne Teamlead-Sicht:
Sam Marnau sichtbar

Kunden-Leistungsnachweis:
kein Name von Sam Marnau
```

Das unterstützt Datenminimierung und trennt internen Arbeitsnachweis von externer Kundenkommunikation.

---

## 12. Leistungsnachweis / Report / Export

Jeder finalisierte Lauf erzeugt einen Report bzw. Export für genau einen Kunden und Zeitraum.

Mindestens enthalten:

- Kunde,
- Zeitraum,
- Leistungsbeschreibung bzw. sinnvoll gruppierte Positionen,
- Leistungsdatum bzw. Zeitraum der Position,
- abrechenbare Zeit,
- Gesamtsumme der abrechenbaren Zeit,
- Abschlussdatum,
- eindeutige Leistungsnachweis-ID / Referenz.

Nicht enthalten:

- Name des Leistungserbringers,
- interne Benutzer-ID,
- interne Auditdaten,
- interne Notizen,
- nicht abrechenbare Positionen, sofern nicht ausdrücklich als Kundeninformation gewünscht,
- Preise oder Rechnungsbeträge.

Mögliche Formate:

- PDF als primäre Kundenausgabe,
- CSV/XLSX für interne oder externe Weiterverarbeitung,
- optional JSON für spätere Schnittstellen.

---

## 13. Empfohlenes Datenmodell für Version 1

Diskussionsgrundlage:

```text
BillingRun
- id
- customer_id
- period_start
- period_end
- status
- finalized_at
- finalized_by
- total_billable_minutes
- created_at
- supersedes_billing_run_id (optional)

BillingItem
- id
- billing_run_id
- activity_id
- activity_date_snapshot
- description_snapshot
- project_snapshot
- workpackage_snapshot
- billable_snapshot
- duration_minutes_snapshot
```

Der interne Leistungserbringer kann über die ursprüngliche Tätigkeit und Auditdaten nachvollziehbar bleiben, muss aber nicht in den externen Snapshot-/Exportvertrag aufgenommen werden.

---

## 14. Audit

Mindestens auditieren:

- Änderung abrechenbar ↔ nicht abrechenbar,
- Änderung von Zeit oder Leistungsbeschreibung im Abrechnungskontext,
- Erstellung eines Abrechnungslaufs,
- Statuswechsel,
- Finalisierung,
- Korrektur / Ersetzung eines finalisierten Laufs,
- Export.

Der interne Audit darf den ausführenden Teamlead dokumentieren. Diese Information gehört nicht automatisch in die Kundenausgabe.

---

## 15. Punkte, die im ursprünglichen Gedanken noch fehlten bzw. später entschieden werden müssen

1. **Doppelabrechnung verhindern** — eine Tätigkeit darf nicht versehentlich zweimal finalisiert werden.
2. **Snapshot beim Abschluss** — spätere Tätigkeitsänderungen dürfen einen historischen Leistungsnachweis nicht verändern.
3. **Korrekturweg nach Abschluss** — finalisierte Nachweise nicht direkt wieder entsperren.
4. **Rundungsregeln** — Minuten, Viertelstunden, Mindestzeiten oder andere Regeln ausdrücklich festlegen.
5. **Zeitraumgrenzen / Zeitzone** — technisch eindeutig definieren.
6. **Umgang mit nachträglich erfassten Tätigkeiten** — was passiert, wenn nach Finalisierung noch eine Tätigkeit für den alten Zeitraum erfasst wird?
7. **Exportstruktur** — einzelne Tätigkeiten oder Gruppierung nach Projekt/Arbeitspaket/Tag/Leistungsart?
8. **Aufbewahrung** — Fristen für Leistungsnachweise und Exporte festlegen.
9. **Kundenwechsel einer Tätigkeit** — nach Finalisierung darf eine geänderte Zuordnung den alten Nachweis nicht umschreiben.
10. **Berechtigungstrennung** — `activity.edit` allein darf keine Finalisierung erlauben; Finalisierung nur Teamlead.

---

## 16. Verhältnis zur zukünftigen Kundenverantwortung

Die spätere Kundenverantwortung und die Abrechnung sind getrennte Konzepte:

- Kundenverantwortlicher Sysing-Benutzer: operativer fachlicher Kunden-Scope.
- Teamlead: besitzt zusätzlich den globalen Abrechnungsprozess über alle Kunden.

Ein Engineer oder Projectmanager mit Kundenverantwortung wird dadurch **nicht** automatisch abrechnungsberechtigt.

---

## 17. Architekturleitplanken

Für die spätere Umsetzung:

- Teamlead-Abrechnungsrecht serverseitig erzwingen,
- RLS-/Scope-Regeln nicht nur in der UI abbilden,
- Snapshots providerneutral modellieren,
- Supabase als MVP-Backend nutzen, aber spätere Azure-SQL-Migration ermöglichen,
- keine Lovable-spezifische unersetzbare Laufzeitabhängigkeit,
- Docker-Portabilität erhalten,
- alle Finalisierungen auditieren,
- keine personenbezogenen Leistungsrankings erzeugen,
- keine produktiven Schlüssel/Tokens in Dokumentation oder Code.

---

## 18. Vorläufiger Ablauf Version 1

```text
Teamlead
   ↓
Kunde auswählen
   ↓
Zeitraum festlegen
   ↓
alle Tätigkeiten prüfen
   ↓
abrechenbar / nicht abrechenbar korrigieren
   ↓
Tätigkeiten bei Bedarf bearbeiten
   ↓
Summe abrechenbare Zeit prüfen
   ↓
Leistungsnachweis vorbereiten
   ↓
finalisieren
   ↓
Snapshot + Schreibschutz + Audit
   ↓
PDF / Export ohne Namen der Leistungserbringer
```

Der fachliche Kern von Version 1 lautet:

> **Sysing erstellt einen nachvollziehbaren, finalisierten Leistungsnachweis über die abrechenbaren Tätigkeiten eines Kunden in einem festen Zeitraum. Die kaufmännische Rechnung bleibt außerhalb von Version 1.**
