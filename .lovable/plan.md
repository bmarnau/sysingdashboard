# Sprint 09 – AVKK-Management-Cockpit und Führungssicht

## Ausgangsbefund (geprüft)

- Die Permission `avkk.management.view` existiert bereits in `src/lib/rbac/permissions.ts` (Rollen: Systemadministrator, Administrator, Projektleiter, Teamleiter) — sie ist aktuell **nirgends** in der UI verwendet. Sie wird in Sprint 09 zur Schutzberechtigung des Cockpits.
- Die Ableitungslogik in `src/lib/avkk/workspace.ts` (Gefährdung, Vollständigkeit, Termin, Schweregrad) ist rein und testbar. Sie wird wiederverwendet, **keine** zweite Fachlogik.
- Die Detailansicht `AvkkDetailDialog.tsx` existiert und wird wiederverwendet.
- Kataloge (Verantwortungsart/-rolle, Kompetenzdimension/-bewertung, Konsequenzbereich/-schweregrad, Terminwirkung) kommen aus Reference Data; alle Fachwerte bleiben katalogbasiert.
- **Kontextindikatoren** (Belastung, Stress, Kundenzufriedenheit …) sind in `docs/AVKK.md` konzipiert, aber es existiert **kein** Datenmodell, keine Tabelle, kein Feld. Es gibt daher auch keine Trenddaten (AVKK-Historie liegt nur als Supersede-Kette vor, keine Snapshot-Zeitreihe).
- Datenzugriff ist heute pro Subjekt ein Dossier-Aufruf (N+1) — für die Managementsicht muss das gebündelt werden.

## Empfehlung / kritische Bewertung

1. **Kontextindikatoren nicht in Sprint 09 implementieren.** Personenbezogene Belastungs-/Stressdaten brauchen Zweckbindung, Aufbewahrungsfrist, eigene RLS und eine Datenschutzbewertung. Das ist ein eigener Sprint (Vorschlag: 09B). Sprint 09 liefert stattdessen das **definierte Zielmodell als Dokument** (Felder, Ebenen, Sichtbarkeit, Aufbewahrung, RBAC) plus ADR — ohne Tabelle, ohne Frontend-Feld, ohne Schattenpersistenz. Der Cockpit-Bereich zeigt dafür einen ehrlichen "geplant"-Hinweis statt leerer Kacheln.
2. **Keine Trendcharts in Sprint 09.** Es gibt keine historischen Snapshots. Statt Fake-Verläufen: der Management-Snapshot (Punkt "Reporting") wird so definiert, dass eine spätere Zeitreihe daraus entsteht.
3. **Kundenzufriedenheit** bleibt undefiniert (keine Quelle, kein Maßstab) — wird im Kontextmodell-Dokument spezifiziert, nicht als Kennzahl angezeigt.

## Umsetzung

### 1. Aggregationsschicht (rein, ohne React)

Neu `src/lib/avkk/management.ts`, aufbauend auf `AvkkRow` aus `workspace.ts`:

- `buildManagementSummary(rows)` — Kennzahlen: offen, gefährdet, kritische Konsequenz, überfällig, Kompetenzdefizit, hohe/kritische Konsequenz, unvollständig bewertet, ohne Verantwortung.
- `buildActionItems(rows)` — Handlungsbedarf-Kategorien mit deterministischen, dokumentierten Regeln: `kritisch`, `gefaehrdet`, `unterstuetzung`, `terminrisiko`, `voraussetzung-fehlt`, `konsequenz-kunde`, `konsequenz-projekt`, `verantwortung-fehlt`. Jede Kategorie liefert Anzahl + Zeilenschlüssel (Drill-down-Basis).
- `aggregateCompetenceGaps(rows)` — Aggregation **pro Kompetenzdimension** (nicht pro Person): "Zeit fehlt bei 6 Aufgaben".
- `aggregateConsequences(rows)` — pro Bereich × Schweregrad, plus Terminwirkung.
- `aggregateResponsibility(rows)` — mit/ohne Verantwortung, Verantwortungsarten, kritisch ohne vollständige Zuordnung. Keine Personen-Rangliste; Personenzahlen nur als Zuordnungsstatus.
- `prioritize(rows)` — dokumentierte Reihenfolge kritisch → gefährdet → hohe Konsequenz → überfällig → bald fällig. Keine intransparente Punktzahl.
- Management-Filter (Zeitraum, Projekt/Kontext, Aufgabentyp, Verantwortungsart, Verantwortlicher, Kompetenzstatus, Konsequenzschwere, Gefährdung, Fälligkeit) als reine Funktion `filterManagementRows`.

Für die Rollen-/Bereichsaggregation wird `AvkkRow` um die bereits vorhandenen Dossier-Felder erweitert (Verantwortungsarten, Konsequenzbereiche, Kompetenzdimensionen mit Rating) — keine erfundenen Felder.

### 2. Datenzugriff

Neu `src/hooks/useAvkkManagement.ts`: lädt Subjekte + Dossiers gebündelt über die bestehende AVKK-Fassade (ein Listen-Aufruf statt N+1, Repository-Erweiterung `listDossiers()`), Reference Data einmalig über den bestehenden Cache. Es werden ausschließlich Daten geladen, die RLS für den Benutzer freigibt — keine Service-Role, keine privilegierte Abfrage im Browser.

### 3. UI

- Neuer Dashboard-Tab **„AVKK Management"** neben „Mein AVKK", gerendert nur unter `PermissionGate permission="avkk.management.view"`, mit sichtbarem Fallback bei fehlender Berechtigung.
- `src/components/avkk/management/`:
  - `AvkkManagementView.tsx` — Rahmen, Filterleiste, Kennzahlenkopf, Bereichsumschaltung.
  - `ManagementKpiGrid.tsx` — klickbare Kennzahlen (Drill-down setzt den Filter).
  - `ActionNeedPanel.tsx` — Handlungsbedarf-Kategorien mit Begründung.
  - `ManagementTable.tsx` — Aufgabe, Kontext, Verantwortliche/Verantwortungsart, Fälligkeit, Kompetenzstatus, Konsequenz, Gefährdung, Gründe, letzte Änderung; Klick öffnet den **bestehenden** `AvkkDetailDialog`.
  - `CompetenceGapPanel.tsx`, `ConsequencePanel.tsx`, `ResponsibilityPanel.tsx`.
  - `ContextIndicatorsPlaceholder.tsx` — erklärt die getrennte Ebene und den Status „geplant".
  - `AvkkUnderstandPanel.tsx` — dauerhaft erreichbare A/V/K/K-Erklärung, Texte aus der bestehenden `AvkkExplainer`-Quelle erweitert, konsistent zu `docs/AVKK.md`, inkl. Hinweis „kein Instrument zur Leistungsbewertung".
- Zwei Diagramme (recharts, bereits vorhanden): Verteilung Gefährdungsstatus und Konsequenzschwere — filterkonsistent, mit tabellarischer Textalternative, Status nie nur über Farbe.
- Empty-/Loading-/Fehler-/Teil-Daten-Zustände je Panel; mobil reduzierte Kartenansicht statt Tabelle (Kennzahlen, Handlungsbedarf, Drill-down bleiben nutzbar).

### 4. Reporting-Vorbereitung

`buildManagementSnapshot()` in `management.ts` als versionierter, serialisierbarer Datenvertrag (Kennzahlen, Handlungsbedarf, Aggregate, Filterkontext, Zeitstempel). Wird als optionaler Block in den bestehenden JSON-Export gehängt (additiv, Schema 1.2.0), ohne bestehende Exporte zu brechen. Kein Report-Service, keine Templates.

### 5. Tests

Neue Vitest-Suiten für: Kennzahlen, Handlungsbedarf-Regeln, Kompetenz-/Konsequenz-/Verantwortungsaggregation, Filter + Drill-down-Konsistenz, Priorisierung, Snapshot-Vertrag, Berechtigungsgating, Empty-/Fehlerpfade, sowie ein expliziter Test, dass keine personenbezogene Rangfolge erzeugt wird. Bestehende 448 Tests bleiben grün.

### 6. Dokumentation

- Neu: `docs/AVKK-MANAGEMENT-MANUAL-ACCEPTANCE.md` (Tests 1–10 wie beauftragt).
- Neu: `docs/AVKK-CONTEXT-INDICATORS.md` — Zielmodell, Ebenen, Datenschutz, RBAC/RLS-Anforderungen, MVP-Schnitt, Aufbewahrung; plus **ADR-0027** „Kontextindikatoren: Modell definiert, Persistenz vertagt".
- Aktualisiert: `CHANGELOG.md` (1.55.0), `docs/AVKK.md`, `docs/ARCHITECTURE.md`, `docs/ENTWICKLUNGSTAGEBUCH.md`, Handbuch (`src/lib/help-documentation.ts`), `docs/RBAC-MATRIX.md`, technischer Prüfbericht, `docs/PROJECT-STATUS.yaml` (Sprint 09 completed, Kontextindikatoren `planned`, nächster Sprint 09A, MVP-Reife begründet).
- TDF als Qualitätsreferenz dokumentiert, ohne Runtime-Abhängigkeit.

### 7. Nicht Bestandteil

Report-Service, Corporate-Templates, Kontextindikator-Persistenz, Trendcharts, produktives AVKK-DB-Restore (ADR-0026 bleibt unverändert, wird als offener MVP-Entscheidungspunkt dokumentiert), Mitarbeiter-Rankings.

### 8. Quality Gates

`test`, `typecheck`, `lint`, `lint:no-console`, `docs:check`, `project-status:check`, `build` sowie Security-, RBAC-, Tech-Debt- und Ops-Gates vollständig. Bestehende Security-Ausnahme `avkk_can_write` bleibt unverändert akzeptiert.
