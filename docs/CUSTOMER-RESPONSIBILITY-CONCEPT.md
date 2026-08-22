# Kundenverantwortung — Konzeptnotiz für spätere Umsetzung

**Status:** Idee / fachliche Vormerkung, noch nicht zur Umsetzung freigegeben  
**Stand:** 22.08.2026  
**Zweck:** Gedanken zur späteren Kundenverantwortung im Sysing Dashboard sichern

---

## 1. Grundidee

Kundenverantwortung wird als eigener fachlicher Scope neben Rollen, Projektverantwortung und AVKK betrachtet.

Ein interner Sysing-Benutzer kann für einen oder mehrere Kunden verantwortlich sein. Die Rolle `viewer` ist von einer Kundenverantwortung ausgeschlossen.

Ein Kunde kann einen verantwortlichen Sysing-Benutzer besitzen.

Für den ersten fachlichen Entwurf gilt damit:

```text
Sysing-Benutzer 1 ──< Kundenverantwortung >── 1 Kunde

Ein Sysing-Benutzer: 0..n verantwortete Kunden
Ein Kunde:           0..1 primär verantwortlicher Sysing-Benutzer
```

Ob später zusätzlich Stellvertretungen oder mehrere Verantwortungsarten je Kunde benötigt werden, wird erst in der Discovery entschieden.

---

## 2. Berechtigte Rollen

Grundgedanke des Fachmodells:

- interne Sysing-Rollen können grundsätzlich Kundenverantwortung erhalten,
- `viewer` kann keine Kundenverantwortung erhalten,
- die externe Rolle `customer` ist nicht automatisch eine interne Kundenverantwortungsrolle,
- `teamlead` erhält zusätzlich eine Gesamtsicht über alle Kunden.

Die Kundenverantwortung ist **keine neue globale Benutzerrolle**. Sie ist ein zusätzlicher fachlicher Scope zu einer vorhandenen Rolle.

Beispiel:

```text
Rolle: engineer
Kunden-Scope: Kunde A, Kunde C

=> Engineer bleibt Engineer,
   erhält aber den fachlich erlaubten Zugriff auf Kunde A und Kunde C.
```

---

## 3. „Meine Kunden“

Für Benutzer mit eigener Kundenverantwortung wird ein eigener Einstieg **Meine Kunden** benötigt.

Die Ansicht soll mindestens zeigen:

- Kundenname,
- verantwortlicher Sysing-Benutzer,
- Anzahl laufender Projekte,
- offene bzw. aktive Arbeitspakete,
- Tätigkeiten / Leistungsdaten im gewählten Zeitraum,
- relevante Kundenberichte,
- später optional kundenbezogene AVKK-Risiken aus Projekten und Arbeitspaketen.

Ein Klick auf einen Kunden öffnet eine konsolidierte Kundensicht.

---

## 4. Kundensicht als fachlicher Arbeitsraum

Ist ein Benutzer für einen Kunden verantwortlich, soll er alle zum Kunden gehörenden fachlichen Arbeitsobjekte sehen und im vorgesehenen Scope bearbeiten können:

- Projekte,
- Arbeitspakete,
- Tätigkeiten,
- zugehörige Zeit-/Leistungsdaten,
- daraus erzeugte Kundenberichte.

Die Kundensicht wird damit zu einem eigenen Arbeitskontext:

```text
Kunde
  ├── Projekte
  │     ├── Arbeitspakete
  │     │     └── Tätigkeiten
  │     └── AVKK zu Projekt/Arbeitspaket
  ├── Leistungs-/Zeitdaten
  └── Kundenberichte
```

Wichtig: Tätigkeiten bleiben operative Arbeits-/Leistungsnachweise. Kundenverantwortung ändert nicht das AVKK-Fachmodell.

---

## 5. Bearbeitungsrecht aus Kundenverantwortung

Der zentrale Fachgedanke lautet:

> Wer für einen Kunden verantwortlich ist, kann die zum Kunden gehörenden Projekte, Arbeitspakete und Tätigkeiten sehen und bearbeiten.

Technisch darf dies später nicht nur über sichtbare Buttons umgesetzt werden. Der Scope muss serverseitig durch RBAC/RLS bzw. die jeweilige Datenzugriffsschicht erzwungen werden.

Empfohlenes Berechtigungsprinzip:

```text
globale Rollenberechtigung
        UND/ODER
fachlicher Kunden-Scope
        => zulässige Aktion
```

Die genaue Kombination muss in der Discovery je Objekt festgelegt werden. Dabei ist besonders zu prüfen, ob Kundenverantwortung bestehende Objektberechtigungen erweitert oder lediglich den sichtbaren Datenumfang bestimmt.

Kundenverantwortung darf **nicht automatisch** Rechte auf folgende Bereiche verleihen:

- Benutzerverwaltung,
- Rollenverwaltung,
- Systemeinstellungen,
- Reference Data,
- globale Administration.

---

## 6. Teamleiter

Der Teamleiter besitzt eine besondere Kundensicht:

- sieht alle Kunden,
- kann einen Kunden auswählen,
- sieht danach alle Projekte, Arbeitspakete und Tätigkeiten dieses Kunden,
- kann diese Objekte im vorgesehenen Teamlead-Scope bearbeiten,
- kann die zugehörigen Kundenberichte öffnen bzw. erzeugen.

Die Kundenauswahl ist dabei **kein Rollenwechsel und keine Impersonation**. Sie setzt lediglich den aktuellen fachlichen Arbeits-/Filterscope.

Ein sinnvoller Einstieg wäre:

```text
Kunden
  ├── Alle Kunden                 ← Teamlead
  └── Meine Kunden               ← eigener Verantwortungsbereich
```

Ob beide Einstiege getrennt oder in einer gemeinsamen Kundenseite mit Filtern umgesetzt werden, ist eine spätere UX-Entscheidung.

---

## 7. Kundenberichte

Die bestehende Berichtsfamilie ist später um **Kundenberichte** zu ergänzen.

Ein Kundenbericht sollte aus demselben autoritativen Datenbestand wie die Kundensicht erzeugt werden und beispielsweise enthalten können:

- Kunde / Stammdaten,
- verantwortlicher Sysing-Benutzer,
- Projektübersicht,
- Arbeitspaketstatus,
- Tätigkeiten / Leistungsnachweise,
- Zeit- und gegebenenfalls Abrechnungsinformationen,
- offene bzw. kritische Vorgänge,
- AVKK-Auswertung für Projekte und Arbeitspakete,
- Zeitraum und Erstellkontext.

AVKK-Daten dürfen dabei weiterhin keine automatisierte personenbezogene Leistungsbewertung erzeugen.

Kundenberichte benötigen dieselben Zugriffsbeschränkungen wie die zugrunde liegende Kundensicht.

---

## 8. Kundenverantwortung und AVKK sauber trennen

Kundenverantwortung und AVKK-Verantwortung sind unterschiedliche Konzepte:

- **Kundenverantwortung:** Wer betreut einen Kunden und erhält dadurch einen fachlichen Kunden-Scope?
- **AVKK-Verantwortung:** Wer übernimmt für ein konkretes Projekt oder Arbeitspaket eine bestimmte Verantwortung?

Ein kundenverantwortlicher Sysing-Benutzer ist daher nicht automatisch AVKK-Verantwortlicher für jedes Projekt oder Arbeitspaket des Kunden.

Er darf jedoch — soweit seine Rolle die entsprechende AVKK-Berechtigung besitzt — die AVKK-Situation der Kundenprojekte sehen bzw. bearbeiten.

---

## 9. Historisierung und Audit

Kundenverantwortung sollte nicht als bloßes überschreibbares Feld modelliert werden, wenn die Funktion produktiv genutzt wird.

Für die spätere Umsetzung sollten mindestens vorgesehen werden:

- `customer_id`,
- `person_id`,
- `valid_from`,
- `valid_to`,
- `assigned_by`,
- `created_at`,
- Audit-Eintrag bei Anlage, Wechsel und Beendigung.

Damit bleibt nachvollziehbar, wer zu welchem Zeitpunkt für einen Kunden verantwortlich war.

Ein Wechsel der Kundenverantwortung sollte historisierend erfolgen und nicht durch unprotokolliertes Überschreiben.

---

## 10. Offene Discovery-Fragen für später

Vor der Umsetzung sind insbesondere folgende Punkte bewusst zu entscheiden:

1. Hat ein Kunde genau einen primären Verantwortlichen oder zusätzlich Stellvertreter?
2. Wer darf eine Kundenverantwortung vergeben, ändern oder beenden?
3. Erweitert Kundenverantwortung bestehende Bearbeitungsrechte oder definiert sie nur den Datenscope?
4. Welche internen Rollen außer `viewer` sollen Kundenverantwortung tatsächlich erhalten dürfen?
5. Wie wird der bestehende `customer`-Datensatz eindeutig mit Projekten, Arbeitspaketen und Tätigkeiten verknüpft?
6. Wie werden Kundenwechsel bei bereits bestehenden Projekten historisch behandelt?
7. Welche Kundeninformationen dürfen in der Gesamtsicht des Teamleiters angezeigt werden?
8. Welche Kundenberichte sind für MVP, Management und Abrechnung erforderlich?
9. Soll es neben **Meine Kunden** eine globale Ansicht **Alle Kunden** für Teamlead/Administration geben?
10. Wie werden Kundenverantwortung, Projektverantwortung und AVKK-Verantwortung in der UI so erklärt, dass die drei Ebenen nicht verwechselt werden?

---

## 11. Architekturleitplanken

Bei der späteren Umsetzung gelten die bestehenden Sysing-Grundsätze:

- fachliche Kundenverantwortung von Authentifizierung und Providerlogik trennen,
- RBAC und kundenspezifischen Scope serverseitig erzwingen,
- Supabase/RLS für den MVP nutzen, aber das Fachmodell providerneutral halten,
- späteren Wechsel zu Entra ID / Azure SQL ermöglichen,
- keine Lovable-spezifische unersetzbare Laufzeitabhängigkeit,
- Docker-Portabilität erhalten,
- Änderungen auditierbar und testbar umsetzen,
- keine produktiven Geheimnisse in Code oder Dokumentation.

---

## 12. Vorläufiges Zielbild

```text
                         ┌──────────────────────┐
                         │      Teamleiter      │
                         │     alle Kunden      │
                         └──────────┬───────────┘
                                    │ Kunde wählen
                                    ▼
┌──────────────────┐      ┌──────────────────────┐
│ Sysing-Benutzer  │─────▶│        Kunde         │
│ Kundenverantw.   │      └──────────┬───────────┘
└──────────────────┘                 │
                             ┌───────┴────────┐
                             ▼                ▼
                         Projekte       Kundenberichte
                             │
                       Arbeitspakete
                             │
                         Tätigkeiten
```

Der fachliche Kern lautet:

> **Kundenverantwortung schafft einen klaren Arbeits- und Datenscope rund um einen Kunden. Sie ersetzt weder die globale Rolle noch die konkrete AVKK-Verantwortung.**
