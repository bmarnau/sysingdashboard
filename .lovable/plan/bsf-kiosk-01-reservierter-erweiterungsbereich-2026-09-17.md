# BSF-KIOSK-01 – reservierter Erweiterungsbereich

## Ziel
Die akzeptierte „Operative Steuerungsübersicht“ behält Inhalt, Farben, drei Spalten und Gesamthöhe unverändert. Unter „Verfügbarkeit (Systeme)“ wird in der mittleren Infrastrukturspalte ausschließlich eine unsichtbare, technisch benannte Layoutgrenze für eine spätere fachlich freigegebene Erweiterung reserviert.

## Aktueller Stand
- Arbeitsstand: Branch `edit/edt-ed2901bc-f333-4388-aca4-e0091802d8ad`, Ausgangs-HEAD `d76e49fcf0ff9dc94f5103f7d879e3f4194f7e2c`, sauberer Arbeitsbaum.
- Die Infrastrukturansicht endet derzeit direkt nach der aggregierten Systemverfügbarkeit; einen benannten Erweiterungsslot gibt es dort noch nicht.
- Die drei Hauptbereiche liegen ab `xl` in einer gemeinsamen Grid-Zeile. Dadurch besitzt die mittlere Spalte bereits freie Restfläche, die ohne zusätzliche feste oder minimale Höhe genutzt werden kann.

## Umsetzung
1. **Unsichtbare Layoutgrenze ergänzen**
   - In `KioskWallboardSections.tsx` eine kleine präsentationsbezogene Grenze `KioskExtensionArea` direkt unter „Verfügbarkeit (Systeme)“ innerhalb von `Infrastructure` einfügen.
   - Den Infrastrukturcontainer innerhalb der bestehenden mittleren Spalte so ausrichten, dass der Slot nur die bereits vorhandene Restfläche einnimmt (`flex-1`/`min-h-0`), ohne feste Höhe, Mindesthöhe, Rand, Hintergrund, Überschrift, Text oder ARIA-Inhalt.
   - Der Slot erhält ausschließlich ein stabiles technisches Kennzeichen für Vertragstest und spätere gezielte Erweiterung. Er rendert keine Daten und keinen sichtbaren Zustand.

2. **Strukturvertrag testen**
   - Den bestehenden Kiosk-Komponententest erweitern: genau ein leerer, für assistive Technik verborgener Erweiterungsslot liegt in der Infrastrukturspalte nach der Systemverfügbarkeit.
   - Absichern, dass keine Platzhaltertexte, Dummy-KPIs oder künstlichen Zustände erscheinen und alle heutigen Infrastruktur- und Kiosk-Inhalte erhalten bleiben.

3. **Dokumentation synchronisieren**
   - In `docs/BSF-KIOSK-01-DESIGN.md` Lage und Zweck des Slots dokumentieren sowie die verbindlichen Zukunftsgrenzen festhalten: read-only, aggregiert, keine personenbezogenen Details, Mailinhalte/-metadaten, Gesundheitsdaten, Secrets, produktiven Hostnamen oder IP-Adressen; Provider- und Fachlogik bleiben getrennt.
   - Dort ausschließlich als zukünftigen Vertrag die Zustände `not-configured`, `loading`, `loaded`, `unknown`, `error` benennen; heute werden sie weder im UI noch im Datenvertrag implementiert.
   - Das bestehende Kiosk-Hilfethema knapp um den reservierten, heute fachlich unbelegten Bereich ergänzen und `lastUpdated` auf `2026-09-17` belassen.
   - Im bestehenden Changelog-Eintrag `1.63.0` einen knappen Nachweis ergänzen; keine neue Version und kein neuer Sprint.

## Technische Grenzen
- Kein generisches Datenmodell und keine Änderung an Kiosk-Vertrag, Provider, Demo-Datensatz, Import oder bestehenden KPI-Werten.
- Keine sichtbare Karte, Beschriftung, Zahl, Animation, Lade-/Leer-/Fehleranzeige und keine neue Datenquelle.
- Keine Änderung an Auth, RBAC, RLS, Backend, Datenbank, Migrationen, Supabase-Code/-Typen, Session, Navigation, Routing, Farben oder generierten Dateien.
- Kein Merge, Publish oder Deploy. Bei automatisch auftretenden scope-fremden Änderungen wird gestoppt und DRIFT berichtet.

## Verifikation
- Prettier und ESLint ausschließlich für geänderte Dateien.
- Bestehende Kiosk-Komponententests einschließlich neuem Strukturvertrag, TypeScript, Accessibility, `docs:check` und Production Build.
- Browserprüfung mit synthetischem Referenzdatensatz bei exakt 1920×1080: `innerWidth`, `scrollWidth`, `innerHeight`, `scrollHeight`, horizontaler/vertikaler Overflow, Clipping, Console Errors und Page Errors.
- Sichtprüfung, dass der Slot keine Baustelle erzeugt und alle bisherigen Inhalte unverändert sichtbar bleiben.
- Abschließender Diff-/Scope-Check gegen den Ausgangs-HEAD; Bericht mit Branch, exaktem Commit-SHA, geänderten Dateien, Tests und allen geforderten Negativbestätigungen.
