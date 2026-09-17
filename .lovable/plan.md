# BSF-KIOSK-01 – finaler visueller Finish-Pass

## Ausgangslage

- Arbeitsstand: Lovable-Variant `edit/edt-15948723-0cc2-43ce-85ec-5578c472f789`, HEAD `8eecc458`; direkter Nachfolger des lokalen Feature-Branch-Stands `feat/bsf-kiosk-01-demo-pilot` (`3b67bd0a`).
- Der Variant enthält bereits drei scope-fremde Plattformänderungen an Supabase-Dateien. Diese bleiben vollständig unangetastet und werden im Abschlussbericht getrennt ausgewiesen.
- Die bestehende Kiosk-Struktur mit „Operative Arbeit“, „Infrastruktur – Überblick“ und „Support-Postfach“ sowie die Sicherheits-, Provider- und Importverträge bleiben erhalten.
- Die vorhandenen gezielten Kiosk-Tests sind aktuell 20/20 grün. Sie sichern Inhalte und Zustände, aber noch nicht ausreichend die gewünschte neutrale Farblogik und Full-HD-Flächennutzung.
- Visuelle Schwächen im aktuellen Code: generische, mehrfach verschachtelte Domänenkarten; Statusfarbe auf ganzen Mengenflächen; zu hoher Kopf; kleine Tabellen-/Hinweistexte; ungleich genutzte Spaltenhöhe; neutrale Support-Mengen werden durch ihren fachlichen Status unnötig grün/gelb dargestellt.

## Umsetzung

1. **Layout-Verträge vor dem Finish schärfen**
   - Component-Tests um die unveränderte Drei-Spalten-Hierarchie, korrekte Zuordnung von Urlaub und Systemverfügbarkeit, alle vier Support-Kennzahlen, den exakten Begriff „Abrechenbarer Anteil“, neutrale Mengenflächen und das Verbot dunkler KPI-Flächen ergänzen.
   - Bestehende Zustands-, Datenschutz- und Sicherheitsprüfungen erhalten.

2. **Bestehende Wallboard-Präsentation gezielt verfeinern**
   - Die drei Hauptflächen beibehalten und die generischen Unterkarten durch leichte, klar getrennte Präsentationsgruppen ersetzen.
   - Kopf um etwa 10–15 % verdichten; Branding, Begrüßung, Datum, Haupttitel, Datenstand, Aktualisierungsstatus, Demo-Warnung und Abmelden vollständig bewahren.
   - Operative Kennzahlen mit großen neutralen Hauptwerten, kompakten Fortschrittsanzeigen und ausschließlich semantisch gefärbten Risiko-/Kritikhinweisen darstellen.
   - Urlaub als reine Wochenanzahlen unter „Operative Arbeit“ belassen; Datenschutztext unverändert erhalten. Den abrechenbaren Anteil als ruhigen, gut lesbaren Prozent-Ring darstellen.
   - Infrastruktur mit klaren Statussummen, lesbarer neutraler Bereichstabelle, semantischen Statuspunkten und Systemverfügbarkeit am Spaltenende ausrichten.
   - Support-KPIs gleichmäßig über die verfügbare Höhe verteilen: „Posteingang gesamt“, „Heute“ und „Gestern“ neutral; nur „Älter“ als Rückstauwarnung amber.
   - Typografie, Zeilenhöhen und Abstände auf 2–4 m Betrachtungsdistanz optimieren; kleinere Viewports geordnet stapeln lassen.

3. **Dokumentation knapp synchronisieren**
   - Bestehendes Kiosk-Handbuch und KIOSK-01-Nachweis nur um die tatsächlich geänderte visuelle Semantik ergänzen.
   - CHANGELOG gemäß Projektvertrag aktualisieren; keine neue Architekturentscheidung und keine künstliche zusätzliche Version außerhalb dieses dokumentationspflichtigen UI-Stands.

4. **Abnahme und Scope-Nachweis**
   - Kiosk Unit-/Component-Tests, Layout-Verträge, TypeScript, ESLint, Prettier, Accessibility, Doku-Sync und Produktions-Build ausführen.
   - Kiosk-E2E mit bestehender isolierter Kiosk-Rollenfixture ausführen.
   - Geladenen Demo-Stand bei exakt 1920×1080 visuell prüfen: Titel, Demo-Warnung, Spaltenzuordnung, Farblogik, Lesbarkeit, abgeschnittene Inhalte, horizontaler Overflow und Browserfehler.
   - Zusätzlich einen kleineren Viewport auf sauberes Stapeln und fehlende Überlappungen prüfen.
   - Diff abschließend gegen die verbotenen Bereiche kontrollieren und jeden Abnahmepunkt einzeln mit PASS/FAIL berichten.

## Technische Grenzen

- Keine Änderungen an Auth, RBAC, RLS, Rollen, Permissions, Session-/Kiosk-Sicherheitslogik, Providerarchitektur, Datenbank, Migrationen, Supabase-Konfiguration/-Client/-Types, `previewAuthStorage.ts`, `routeTree.gen.ts`, externen Integrationen oder JSON-Schema-Version.
- Keine neuen Datenquellen, Funktionen oder erfundenen Kennzahlen.
- Kein Merge, Publish, Deploy oder DB-Zugriff.
- Falls die vorhandenen Daten für eine reine Präsentationsanforderung nicht ausreichen, wird dies als Blocker berichtet statt die Datenarchitektur zu ändern.
