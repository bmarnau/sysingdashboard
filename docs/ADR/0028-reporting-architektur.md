# ADR-0028 — Reporting-Architektur, Corporate Templates und TDF-Ausgabe

Status: akzeptiert (Sprint 09A, v1.56.0)

## Kontext

Der bestehende PDF-Export (`src/lib/pdf-export.ts`) erzeugt genau ein Dokument
— den Leistungsnachweis — und vermischt dabei Datenauswahl, Layout und
Dateibenennung. Jede weitere Auswertung hätte diese Logik dupliziert. Mit den
AVKK-Sichten aus Sprint 08/09 werden mehrere Berichte in mehreren Formaten
(PDF, Druck, JSON, CSV, Word) benötigt.

## Entscheidung

1. **Dreiteilung.** Datenauswahl (`src/lib/report/data/`), neutrales
   Dokumentmodell (`ReportDocument`) und Renderer (`src/lib/report/renderers/`)
   sind getrennt. Renderer kennen keine Fachlogik, Berichte kennen kein Format.
2. **Deklarative Berichte.** Eine `ReportDefinition` beschreibt Titel, Version,
   Datenquelle, erforderliche Berechtigung, Template, Formate, Dokumentkennung
   und Dateinamensschema. Die Fassade (`renderReport`) verbindet alles.
3. **Corporate Templates über Provider-Kette.** `filesystem` vor `default`.
   Das mitgelieferte neutrale Template ist garantierter Fallback: Ein Bericht
   scheitert nie an einer fehlenden Vorlage. Die verwendete Quelle wird in den
   Metadaten mitgeführt.
4. **TDF als Struktur-Referenz.** Dateinamen folgen
   `{docId}_{slug}_{version}_{timestamp}`; TDF ist Namens- und Strukturvorgabe,
   keine Laufzeitabhängigkeit.
5. **Datenzugriff bleibt in der Anwendung.** Die Berichtsschicht bekommt bereits
   geladene Zeilen übergeben. RLS und Rechteprüfung finden genau einmal statt,
   und alle Berichte sind ohne Netzwerk testbar.
6. **Keine Leistungsbewertung.** Bestätigt ADR-0027 auch für Berichte: keine
   personenbezogenen Ranglisten oder Punktzahlen; Kompetenz nur je Dimension,
   Verantwortung nur als Zuordnungsstatus.

## Konsequenzen

- Neue Berichte kosten eine Definition, keinen neuen Renderer.
- Excel ist bewusst nicht enthalten; CSV (UTF-8 mit BOM, Semikolon) deckt den
  Excel-Bedarf des MVP. Ein Excel-Renderer kann später ohne Änderung an
  Berichten ergänzt werden.
- Der bestehende `pdf-export.ts` (Leistungsnachweis) bleibt vorerst unverändert
  bestehen und wird erst nach Abnahme des neuen Wegs migriert.
- Serverseitiges Rendern (z. B. im Container) ist möglich, ohne Fachlogik
  anzufassen — es wäre ein zusätzlicher Renderer.
