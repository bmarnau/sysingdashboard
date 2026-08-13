# ADR-0027: AVKK-Führungssicht und getrennte Kontextebene

- Status: accepted
- Datum: 2026-08-13
- Kontext-Sprint: 09

## Kontext

Mit Sprint 08 existiert der persönliche AVKK-Arbeitsplatz. Für Steuerung fehlte
eine Führungssicht, die Gefährdungen, Verantwortungslücken, Kompetenzdefizite
und Konsequenzen über alle sichtbaren Aufgaben hinweg verdichtet. Gleichzeitig
wurden weiche Faktoren (Belastung, Zeitdruck, Kundenzufriedenheit) gefordert,
die fachlich **nicht** Teil von AVKK sind.

## Entscheidung

1. **Eigene Aggregationsschicht, keine zweite Fachlogik.**
   `src/lib/avkk/management.ts` baut ausschließlich auf den Zeilen aus
   `src/lib/avkk/workspace.ts` auf. Gefährdung, Vollständigkeit und Termine
   werden nicht neu berechnet. Die Datei ist rein (kein React, kein Supabase)
   und damit ohne UI testbar.

2. **Gebündelter Datenzugriff.**
   `AvkkService.listDossiers()` lädt Subjekte, Aggregate und Schwellwerte
   gebündelt. Es gibt keine privilegierte Abfrage im Browser; RLS bleibt die
   maßgebliche Sichtbarkeitsgrenze. Die UI-Berechtigung `avkk.management.view`
   ist reines Anzeige-Gating.

3. **Handlungsbedarf statt Score.**
   Priorisierung erfolgt über eine dokumentierte Reihenfolge
   (`PRIORITY_RULE`), jede Handlungskategorie führt ihre Regel (`ACTION_RULES`)
   als sichtbaren Text mit. Verborgene Gewichtungen sind unzulässig.

4. **Kein personenbezogenes Ranking.**
   Verantwortung wird ausschließlich als Zuordnungsstatus und Verteilung der
   Verantwortungsarten aggregiert, Kompetenz ausschließlich je Dimension.
   Personenbezogene Ranglisten, Scores oder Leistungsbewertungen sind
   architektonisch ausgeschlossen und in `management.ts` als verbindliche
   Regel dokumentiert.

5. **Kontextindikatoren als getrennte Ebene.**
   Weiche Faktoren werden in Sprint 09 **nicht** erhoben und nicht gespeichert.
   Das Zielmodell (Indikatoren, Skalen aus Reference Data, Rechte,
   Mindestgruppengröße 3, Aufbewahrung 90 Tage) ist in
   `docs/AVKK-CONTEXT-INDICATORS.md` beschrieben. Das Cockpit weist den Status
   ehrlich aus, statt leere Diagramme zu zeigen.

6. **Berichtsdatenvertrag.**
   `buildManagementSnapshot()` erzeugt einen versionierten, serialisierbaren
   Stand (Version 1.0.0) ohne Personenbezug und ohne Zeilenschlüssel. Damit ist
   spätere Reporting-Integration möglich, ohne die UI zu duplizieren.

## Konsequenzen

**Positiv**
- Eine einzige Quelle für Gefährdungs- und Vollständigkeitslogik.
- Kennzahlen sind erklärbar und per Drill-down überprüfbar.
- Datenschutzrisiko durch Leistungsbewertung ist strukturell reduziert.

**Negativ / akzeptiert**
- `listDossiers()` lädt Aggregate je Subjekt; bei stark wachsendem Bestand ist
  eine serverseitige Verdichtung nötig (Backlog).
- Diagramme sind bewusst einfache Balkenlisten ohne Diagrammbibliothek;
  aufwendigere Visualisierung bleibt offen.
- Ohne Kontextebene bleibt ein Teil der Führungsfrage („warum gefährdet?")
  weiterhin nur über die AVKK-Begründungen beantwortbar.
