# BSF-KIOSK-01 – Management-Wallboard UI

## Analyse des Ist-Stands

- Der Workspace liegt als sauberer Lovable-Variant auf dem Kiosk-Featurestand `3c57b6d8`; der Variant-HEAD `de6bba4a` enthält zusätzlich vier bereits vorhandene Plattformänderungen an generierten Auth-/Typ-/Routendateien. Diese Dateien bleiben unangetastet und gehören nicht zum Ergebnis dieses Auftrags.
- Die Kiosk-Seite besitzt bereits Kopfbereich, drei Spalten, deutsche Begrüßung, Demo-Warnung, Statuszustände und Logout. Die Darstellung ist jedoch noch eine generische Sammlung gleichartiger Karten mit großen Innenabständen und wiederholten Status-Badges.
- Die vorhandene Datenstruktur liefert pro Domäne nur eine flache Metrikliste. Dadurch fehlen die fachlich benötigten Verdichtungen: Urlaubszeiträume, abrechenbarer Anteil mit Einheit, Infrastrukturzeilen für sechs Bereiche sowie vier zeitlich getrennte Support-Kennzahlen.
- Die mittlere Spalte mischt derzeit Mitarbeiter-Verfügbarkeit und Infrastruktur. Das ist fachlich missverständlich. Mitarbeiterurlaub gehört zur operativen Arbeit; Systemverfügbarkeit und Infrastrukturstatus gehören zusammen.
- Das aktuelle Farbsystem der Kiosk-Komponenten ist zwar hell, aber die gleichförmigen Container und kleinen Zahlen erzeugen keine ausreichende Fernlesbarkeit. Das hochgeladene Zielbild dient als visuelle Referenz, nicht als einzubettendes Bild.

## Geplante Struktur

```text
Kompakter Kopf
├─ SYSING / SYSTEMHAUS · Info-Kiosk · Begrüßung · Datum
├─ Operatives Management-Wallboard · Betriebsart
└─ Datenstand · Auto-Aktualisierung · Demo-Warnung · Abmelden

Dreispaltiges Wallboard (1920 × 1080)
├─ Operative Arbeit
│  ├─ Projekte
│  ├─ Arbeitspakete
│  ├─ Tätigkeiten
│  └─ Urlaub + abrechenbarer Anteil
├─ Infrastruktur – Überblick
│  ├─ OK / Warnung / Kritisch
│  ├─ Status nach Server, Backup, Netzwerk, Firewall, Internet, Cloud
│  └─ Systemverfügbarkeit
└─ Support-Postfach
   ├─ Posteingang gesamt
   ├─ Heute
   ├─ Gestern
   └─ Älter
```

## Umsetzung

1. **Kiosk-Datenvertrag additiv erweitern**
   - Optionale Einheiten und strukturierte Infrastrukturzeilen als bekannte, streng validierte Demo-Felder ergänzen.
   - Bestehende sechs Domänen, `schemaVersion=sysing.kiosk.demo.v1`, Demo-Modus, Größenlimit, fail-closed Import und Last-good-Verhalten unverändert lassen.
   - Baseline-Datensatz und versionierte JSON-Demoquelle mit deutschen Labels und den benötigten synthetischen Managementwerten synchronisieren.
   - Tiefe Kopien der neuen optionalen Strukturen sicherstellen; keine produktiven Daten oder externen Quellen anbinden.

2. **Wallboard-Komponenten neu gliedern**
   - Die generische Domänenkarte in kleine kiosk-spezifische Präsentationsbausteine aufteilen: Kennzahl, Fortschritt, Statusübersicht, Infrastruktur-Tabelle, Verfügbarkeitsblock, Donut/Prozentanzeige und Support-Mini-Balken.
   - Keine verschachtelte Kartenlandschaft: drei klare Hauptflächen, darin flache Informationsgruppen mit feinen Trennlinien und gezielten Pastellflächen.
   - Bedeutungstragende Farben verwenden: Dunkelblau für Hierarchie und Zahlen, Grün für OK, Amber für Warnung, Rot für kritisch; unbekannte Werte neutral und ausdrücklich als unbekannt anzeigen.
   - Icons nur als Orientierungshilfe einsetzen; Text und Zahlen bleiben die primären Informationsträger.

3. **Kopf und 1920×1080-Komposition überarbeiten**
   - Kopf horizontal verdichten und alle geforderten Informationen ohne zusätzliche Höhe ordnen.
   - Hauptbereich mit stabilen Spaltenverhältnissen, festen Mindestbreiten und kontrollierter vertikaler Dichte für 1920×1080 aufbauen.
   - Zahlen deutlich vergrößern, deutsche Formatierung und kurze managementtaugliche Labels durchgängig anwenden.
   - Kleinere Ansichten weiterhin geordnet untereinander darstellen; bei 1920×1080 weder horizontalen Scroll noch abgeschnittene Inhalte zulassen.
   - Lade-, Fehler-, nicht-geladen-, unbekannt- und Sicherheitsblockzustände funktional und optisch konsistent erhalten.

4. **Scope-Schutz**
   - Keine Änderungen an Authentifizierung, Berechtigungsprüfung, Rollen, Datenbank, Migrationen, Kiosk-Session-Watchdog oder Providerarchitektur.
   - Keine echten SharePoint-, PRTG- oder Exchange-Bezeichnungen als angebliche Quelle verwenden; sichtbar bleibt ausschließlich „Quelle: synthetische Demo-Daten“.
   - Die bestehenden scope-fremden Änderungen an `client.ts`, `previewAuthStorage.ts`, generierten Typen und Route-Tree weder verändern noch inhaltlich übernehmen.

## Tests und visuelle Abnahme

- Komponentenvertrag zuerst auf die neue Informationshierarchie, deutsche Labels, Einheiten, Statuszeilen und unbekannte Werte ausrichten; danach Implementierung bis GREEN.
- Parser-/Import-, Repository- und Provider-Tests für die additive Demo-Datenstruktur und Rückwärtskompatibilität ergänzen.
- Relevante Kiosk-Komponenten-, Provider-, Import-, Routing-, Session- und Security-Vertragstests ausführen.
- TypeScript, ESLint, Prettier, Doku-Sync und Build prüfen.
- Kiosk-E2E einschließlich Logout und Rollen-/Routingvertrag ausführen, soweit die vorhandene Testidentität verfügbar ist.
- Mit Playwright bei exakt 1920×1080 prüfen: drei sichtbare Spalten, vollständiger Kopf, alle geforderten Bereiche, kein horizontaler Scroll, kein abgeschnittener Seiteninhalt und keine Console-/Page-Errors. Zusätzlich einen kleineren Viewport auf geordnetes Stapeln prüfen.

## Dokumentation

- Das Kiosk-/Demo-Kapitel im integrierten Handbuch um Wallboard-Inhalte, rein synthetische Quellen und Datenschutzgrenzen ergänzen; `lastUpdated` setzen.
- `docs/DEMO-DATA.md` um den Kiosk-Datensatz und die neuen aggregierten Felder ergänzen.
- Einen neuen obersten `CHANGELOG.md`-Eintrag gemäß Repository-Regel anlegen; keine historische Abnahme umschreiben.
- `roadmap.md` nur um diesen klar abgegrenzten Wallboard-UI-Arbeitspunkt und dessen tatsächlich erreichte Prüfergebnisse ergänzen.

## Einzelabnahme

Am Ende wird jedes Kriterium separat mit Beleg bewertet:

1. visuelle Nähe zum bereitgestellten Zielbild
2. drei klar erkennbare Wallboard-Spalten
3. kompakter, professioneller Kopf
4. Urlaub und Verfügbarkeit fachlich getrennt sichtbar
5. sechs Infrastruktur-Bereiche vorhanden
6. vier Support-Zeiträume vorhanden
7. „Abrechenbarer Anteil“ und korrekte deutsche Sprache/Zahlen
8. verbesserte Fernlesbarkeit und Kontrast
9. keine Änderung an Auth/RBAC/RLS/Backend-Sicherheitslogik
10. TypeScript und relevante Tests erfolgreich

## Nicht im Scope

- Main-Merge, Publish/Deploy, Datenbankänderungen oder echte Drittsystemintegration
- Bereinigung der bereits vorhandenen Plattformänderungen außerhalb des Kiosk-Scopes
- Abschluss von KIOSK-01 oder Änderung bestehender Security-/Governance-Verdicts
