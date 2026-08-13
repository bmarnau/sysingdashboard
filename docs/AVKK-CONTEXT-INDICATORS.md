# Kontextindikatoren — Zielmodell (getrennte Ebene neben AVKK)

Status: **konzipiert, nicht implementiert** (Stand 1.55.0)
Zugehörige Entscheidung: ADR-0027

## 1. Abgrenzung

Kontextindikatoren sind **kein** Bestandteil des Akronyms AVKK. AVKK beschreibt
den Sachverhalt einer Aufgabe (Aufgabe, Verantwortung, Kompetenz, Konsequenz).
Kontextindikatoren beschreiben die **Rahmenbedingungen**, unter denen an dieser
Aufgabe gearbeitet wird.

```text
AVKK-Sachverhalt  ──►  Kontextebene  ──►  Management-Handlungsbedarf
(faktisch)             (situativ)         (abgeleitet)
```

Die Kontextebene ist eine eigene Datenschicht mit eigener Berechtigung, eigener
Aufbewahrung und eigener Erhebung. Sie verändert AVKK-Daten nicht.

## 2. Vorgesehene Indikatoren

| Indikator | Bedeutung | Erhebung |
| --- | --- | --- |
| Arbeitsbelastung | subjektive Auslastung im Bezugszeitraum | Selbstauskunft |
| Zeitdruck | empfundener Termindruck | Selbstauskunft |
| Teamunterstützung | Verfügbarkeit fachlicher Hilfe | Selbstauskunft |
| Informationslage | Klarheit von Auftrag und Vorgaben | Selbstauskunft |
| Ressourcenlage | Material, Werkzeuge, Budget, Zugänge | Selbstauskunft |
| Eskalationsgrad | bereits eskalierte Sachverhalte | abgeleitet aus AVKK |
| Kundenzufriedenheit | Rückmeldung aus dem Projektumfeld | Fremdauskunft |

Skalen sind Katalogwerte des Reference-Data-Dienstes (kein Code-Enum), damit
Bedeutung und Version nachvollziehbar bleiben.

## 3. Verbindliche Regeln

1. **Freiwilligkeit**: Selbstauskünfte sind freiwillig; „keine Angabe" ist ein
   gültiger Wert und wird nicht als negativer Wert interpretiert.
2. **Keine Leistungsbewertung**: Kontextwerte dürfen nicht zu personenbezogenen
   Ranglisten, Scores oder Bewertungen verdichtet werden.
3. **Aggregation in Führungssichten**: Führungskräfte sehen ausschließlich
   aggregierte Werte je Aufgabe, Projekt oder Organisationseinheit — nie einen
   Einzelwert einer Person. Aggregation erst ab einer Mindestgruppengröße
   (Vorgabe: 3 Meldungen).
4. **Zweckbindung**: Verwendung ausschließlich zur Priorisierung von
   Unterstützungsmaßnahmen.
5. **Aufbewahrung**: Rohwerte maximal 90 Tage, danach nur noch aggregierte
   Zeitreihen ohne Personenbezug.
6. **Mitbestimmung**: Vor Produktivsetzung ist die Erhebung mit der jeweiligen
   Arbeitnehmervertretung und dem Datenschutz abzustimmen.

## 4. Vorgesehene Berechtigungen

| Recht | Bedeutung |
| --- | --- |
| `avkk.context.submit` | eigene Kontextwerte melden |
| `avkk.context.view.own` | eigene Meldungen einsehen |
| `avkk.context.view.aggregated` | aggregierte Kontextlage in Führungssichten |
| `avkk.context.manage` | Katalog- und Erhebungsparameter pflegen |

Ein Recht auf Einzelwerte anderer Personen ist **nicht** vorgesehen.

## 5. Skizze des Datenmodells

```text
avkk_context_report
  id, subject_type, subject_id, person_id,
  indicator_key, value_key, reported_at, valid_until, note (optional)
```

Zeilenrestriktion analog AVKK: Meldende sehen ausschließlich eigene Zeilen;
Führungsrollen erhalten nur Zugriff auf eine aggregierende Datenbanksicht,
nicht auf die Rohtabelle.

## 6. Offene Punkte vor Umsetzung

- Mindestgruppengröße und Sperrverhalten bei zu kleinen Gruppen festlegen.
- Erhebungsrhythmus (ereignisbezogen vs. periodisch) entscheiden.
- Darstellung im Cockpit: eigener Abschnitt, klar von AVKK getrennt.
- Aufnahme in Backup/Export nur aggregiert prüfen.
