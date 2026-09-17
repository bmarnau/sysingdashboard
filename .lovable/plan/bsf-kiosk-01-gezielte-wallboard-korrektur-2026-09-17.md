# BSF-KIOSK-01 – gezielte Wallboard-Korrektur

## Ausgangsstand

- Arbeitsstand: Lovable-Variant `edit/edt-2a571e6a-2808-40bb-b132-3422527bd04a`, Exact Head `ff4878206c548d8f899bb626e184a4a44dd799d9`; der lokale und entfernte Feature-Ref `feat/bsf-kiosk-01-demo-pilot` zeigen auf denselben Commit.
- Vergleichsbasis für den letzten Wallboard-Stand: `3b67bd0a`. Seitdem wurden zehn Kiosk-/Dokumentationsdateien für den hellen Drei-Spalten-Finish-Pass verändert; die aktuelle Arbeitskopie ist sauber.
- `KioskView` rendert Kopf, Zustände und den derzeitigen Fuß mit Datenstand/letzter Aktualisierung. `KioskWallboardSections` rendert Operative Arbeit, Infrastruktur und Support.
- Die aktuelle Demo-Struktur enthält Projekte, Arbeitspakete, Tätigkeiten, Urlaub, Infrastruktur-Bereichszeilen und vier Support-Mengen. Sie enthält noch keine Support-Trends, keine vollständigen Projekt-/Arbeitspaket-Statusgruppen und keine aggregierten Systemverfügbarkeitszahlen.
- Der bestehende Import ist strikt und fail-closed. Optionale additive Felder müssen dort ausdrücklich validiert werden.
- Bestehende scope-fremde Abweichungen in `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, generierten Supabase-Typen und `routeTree.gen.ts` bleiben unangetastet und werden nur als Drift berichtet.

## Umsetzung

1. **TDD-Verträge vor der Darstellung ergänzen**
   - Component-Tests zuerst um Kopfstatus, Projekt-/Arbeitspaket-Hierarchie, Fortschrittsdarstellungen, sichtbare Systemverfügbarkeit, kompakte Support-Karten und datengetriebene Trends erweitern; unveränderte Farblogik und Drei-Spalten-Struktur weiter absichern.
   - Import-/Provider-Tests zuerst für optionale numerische Trendreihen, Grenzen, unbekannte Felder, Deep-Copy und rückwärtskompatible Datensätze ohne Trends ergänzen.
   - RED-Nachweis dokumentieren, danach minimal auf GREEN umsetzen.

2. **Bestehenden Kopf gezielt verdichten**
   - Branding, Begrüßung, Datum, Titel, Betriebsmodus, Demo-Warnung und Abmelden unverändert erhalten.
   - Datenstand, Datensatz-/Aktualisierungsstatus, 60-Sekunden-Auto-Refresh und letzte Aktualisierung kompakt rechts oben integrieren.
   - Den bisherigen separaten Fußstatus entfernen, sofern alle Angaben im Kopf vorhanden sind; dadurch bleibt der Kopf flach und es entsteht mehr nutzbare Wallboard-Höhe.
   - Fehlerstatus weiterhin sichtbar und zugänglich ausgeben; keine Session-/Refresh-Logik ändern.

3. **Operative Informationsdichte wiederherstellen**
   - Projekte als kompakte Gruppe mit großer Gesamtzahl, „im Plan“-Prozentwert samt Fortschrittsbalken sowie „mit Terminrisiko“ und „kritisch“ darstellen.
   - Arbeitspakete analog mit großer Gesamtzahl, Fortschrittsbalken und den Zuständen „im Plan“, „mit Risiken“ und „überfällig“ darstellen.
   - Bestehende synthetische Werte beibehalten und nur die zur vollständigen, intern konsistenten Demo-Verteilung benötigten synthetischen Werte im versionierten Demo-Datensatz ergänzen; keine produktiven Daten ableiten.
   - Tätigkeitsstunden und Prozent-Ring für „Abrechenbarer Anteil“ als kompakte gemeinsame Zeile ausrichten.
   - Urlaub auf die zwei aggregierten Wochenzahlen und den bestehenden Datenschutzhinweis begrenzen.

4. **Infrastrukturfläche mit Aggregaten vervollständigen**
   - Statussummen und bestehende Bereichstabelle unverändert erhalten.
   - Darunter „Verfügbarkeit (Systeme)“ mit den aggregierten Demo-Zahlen „Verfügbar“ und „Nicht verfügbar“ ergänzen; Grün/Rot nur für diese Statusaussage verwenden.
   - Die bisherige reine Textzeile durch die tatsächlichen Zahlen und den Wortlaut „Keine produktiven Hostnamen oder IP-Adressen. Nur aggregierte Demo-Statusdaten.“ ersetzen.

5. **Support-Karten kompakt mit datengetriebenem Verlauf darstellen**
   - Vier gleichmäßige, kompakte KPI-Flächen mit Bezeichnung, großer Zahl, kurzer Erläuterung und ruhigem Mini-Balkenverlauf erstellen.
   - Mengen neutral und ausschließlich „Älter“ amber lassen; vorhandene Farb-Tokens nicht ändern.
   - Den Kiosk-Metrikvertrag minimal additiv um `trend?: number[]` erweitern. Der strikte Import akzeptiert nur begrenzte Arrays endlicher, nichtnegativer Zahlen; alte JSON-Dateien ohne `trend` bleiben gültig.
   - Versionierten Default-Datensatz und JSON-Fixture mit festen synthetischen Trendfolgen synchronisieren; keine Zufallswerte, Animation, Achsen, Inhalte oder Personenbezüge.
   - Providergrenze unverändert lassen und Trendarrays beim bestehenden Clone-Vorgang sicher kopieren.

6. **Dokumentation nur für die tatsächliche Korrektur synchronisieren**
   - Bestehendes Kiosk-Handbuch/Design, Demo-Daten-Dokumentation, In-App-Hilfe, CHANGELOG und Roadmap knapp aktualisieren.
   - Festhalten: Trends vollständig synthetisch; keine Mailinhalte, Personenangaben oder Exchange-/Graph-Verbindung; Systemverfügbarkeit ausschließlich aggregiert.
   - Keine neue ADR und keine Statusschließung außerhalb dieses UI-Auftrags.

7. **Vollständige Abnahme**
   - Gesamt-Prettier, Gesamt-ESLint, TypeScript, Kiosk Unit-/Component-/Import-/Provider-/Route-/Session-Tests, Accessibility, Produktions-Build und bestehenden rollenisolierten Kiosk-Playwright-Test ausführen.
   - Das geladene Default-Demoszenario bei exakt 1920×1080 und 1280×900 prüfen: alle geforderten Inhalte sichtbar, keine abgeschnittenen Inhalte, kein horizontaler Overflow, keine Console- oder Page-Errors und keine unnötig halbleere Hauptspalte.
   - Gesamt-Gates nur bei tatsächlichem Gesamterfolg als PASS melden; vorbestehende Fehler als FAIL/BLOCKED mit exakter Datei ausweisen.
   - Abschließend vollständigen Diff und Scope prüfen und den Bericht exakt in den geforderten Blöcken A–E liefern.

## Technische Grenzen

- Bestehende Kiosk-Farbtokens und semantische Farblogik werden nicht geändert.
- Keine Änderungen an Auth, RBAC, RLS, Rollen, Permissions, Session-Watchdog, Sicherheitslogik, Datenbank, Migrationen, SQL, Supabase-Client/Auth-Storage/generierten DB-Typen, `previewAuthStorage.ts`, `routeTree.gen.ts`, externen Providern oder Integrationen.
- Keine neue Navigation, Filter, Drill-downs oder produktive Datenquelle.
- Kein Merge, Publish, Deploy oder Ziel-DB-Zugriff.
