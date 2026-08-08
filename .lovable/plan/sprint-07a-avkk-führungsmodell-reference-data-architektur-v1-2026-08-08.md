# Sprint 07A – AVKK-Führungsmodell & Reference-Data-Architektur (v1.51.0)

Reine Fach- und Architekturarbeit. Kein Produktivcode, keine Migration, keine UI. Ergebnis sind verbindliche Fachdokumente, ein Datenmodell-Entwurf, ein RBAC/RLS-Zielkonzept, eine ADR und ein konsolidiertes Projektmanifest.

## Ausgangslage (geprüft)

- Fachdaten heute: `src/lib/dashboard-data.ts` mit `Project`, `WorkPackage`, `Activity`, `Engineer`; Katalogwerte (`Priority`, `WorkPackageStatus`, `ProjectStatus`, `BillingStatus`) sind Union-Types im Frontend plus Style-Maps in `src/components/dashboard/constants.ts` — genau die Hardcodierung, die Reference Data ablösen soll.
- Supabase enthält bisher nur Plattformtabellen: `profiles`, `user_roles`, `app_settings`, `audit_log`; RBAC über `app_role`-Enum und `has_permission()`.
- ADRs: höchste vergebene Nummer ist **0023** (Phasenmodell). Freie nächste ID = **ADR-0024**. Achtung: zwei ADR-Ordner (`docs/ADR/` numerisch, `docs/adr/` mit Präfix) — neue ADR kommt nach `docs/ADR/`.
- Manifest hat bereits `phases` (phase-1 completed, phase-2 „next"), `roadmap`, `backlog`, `technicalDebt`; Validator `scripts/project-status/check.mjs` erzwingt Versionsgleichheit mit `CHANGELOG.md`.

## Zu erstellen

**1. `docs/AVKK.md`** — fachliche Referenz
- Warum AVKK (Grenzen klassischer Aufgabenlisten, Transparenz, Frühwarnung, Nutzen für Mitarbeitende/Projektleitung/Führung), inklusive expliziter Abgrenzung: kein Instrument der Leistungsüberwachung.
- A – Aufgabe: Aufgabentypen Tätigkeit, Arbeitspaket, Projekt, Maßnahme; Mapping auf bestehende `Activity`, `WorkPackage`, `Project`; „Maßnahme" als einziger neuer Typ, keine Parallelstruktur.
- V – Verantwortung: Verantwortungsarten (Ergebnis, Termin, Qualität, Kommunikation, Dokumentation, Budget, Freigabe, Koordination) als Katalog, Rollen Verantwortlicher/Stellvertreter, Mehrfachzuordnung.
- K – Kompetenz: Dimensionen (Fachwissen, Erfahrung, Zeit, Material, Werkzeuge, Budget, Berechtigung, Unterstützung), Bewertung vorhanden/teilweise/nicht vorhanden, Ableitung „zugeordnet aber gefährdet".
- K – Konsequenz: Bereiche, Schweregrade, Terminwirkung als Kataloge.
- Kontextindikatoren als getrennte Ebene inklusive Zielbild-Diagramm und Datenschutz-/Führungsgrundsatz (kein Gesundheitsbezug, kein automatisiertes Scoring).
- Verbindliche Anforderung „AVKK verstehen" für Sprint 09.

**2. `docs/REFERENCE-DATA.md`** — Plattformdienst
- Reference Data als allgemeiner Dienst, AVKK nur als erster Konsument.
- Attributmodell: technische ID, fachlicher Schlüssel, Katalog/Kategorie, Anzeigename, Beschreibung, Sortierung, aktiv-Flag, Gültigkeitszeitraum, Version, Audit-Felder, Sprachschlüssel für spätere i18n.
- Historisierungsstrategie: Referenzen speichern Fremdschlüssel **und** unveränderlichen Schlüssel-/Label-Snapshot, damit deaktivierte Werte historische Datensätze nicht unlesbar machen.
- Schichtung Supabase → Repository → Reference-Data-Service → Fachlogik → UI/Reports/Agenten, Providertrennung für späteren Wechsel auf Azure SQL.
- Weitere spätere Nutzung: Prioritäten, Status, Kategorien, Risikoklassen, Maßnahmenarten, Dokumenttypen, Reportdefinitionen (nur dokumentiert).

**3. `docs/AVKK-DATA-MODEL.md`** (bzw. Abschnitt in `docs/AVKK.md`, falls kompakt) — technischer Entwurf
- Entitäten: `avkk_subject` (polymorphe Aufgabenreferenz auf Projekt/Arbeitspaket/Tätigkeit/Maßnahme), `avkk_responsibility`, `avkk_competence`, `avkk_consequence`, `reference_catalog`, `reference_value`, optional `avkk_history`.
- Beziehungen, Kardinalitäten, PK/FK, Reference-Data-Bezüge, Historisierung, Audit-Anbindung an bestehendes `audit_log`.
- Ausdrücklich als Entwurf für Sprint 07B markiert, keine SQL-Ausführung.

**4. RBAC-/RLS-Zielkonzept** (Abschnitt im Datenmodell-Dokument)
- Lesen/Ändern von AVKK-Daten, Zuweisung von Verantwortung, Verwaltung von Reference Data (nur systemadministrator/administrator), Managementsicht.
- Neue Permission-Strings im v1/v2-Format vorschlagen (noch nicht in `permissions.ts` eintragen, damit `check-rbac.mjs` und Security-Tests unverändert grün bleiben).

**5. `docs/ADR/0024-avkk-und-reference-data.md`** — Architekturentscheidung mit allen in Punkt 20 geforderten Festlegungen.

## Zu aktualisieren

- `docs/ARCHITECTURE.md`: Reference-Data-Schicht, AVKK-Fachschicht, Template-Provider und Report-Service als geplante Bausteine präzisieren.
- `docs/ADR/README.md`: ADR-0024 eintragen.
- `README.md`: Verweise auf `docs/AVKK.md`, `docs/REFERENCE-DATA.md`, Phase-2-Hinweis.
- `docs/PROJECT-GOVERNANCE.md`: Regel „fachliche Kataloge gehören in Reference Data, nicht in den Frontend-Code".
- `docs/PROJECT-STATUS.yaml`: phase-1 completed, phase-2 `active`, Sprint 07A als `currentSprint`, Roadmap 07B/09 mit Abhängigkeiten, neue Backlog-Einträge für Kontextindikatoren, Report-Service, Corporate Document Templates, Reference Data; Version 1.51.0.
- `CHANGELOG.md`: `## 1.51.0` als oberster Eintrag (Validator erzwingt Gleichstand mit Manifest).
- `docs/ENTWICKLUNGSTAGEBUCH.md`: Eintrag „Beginn Phase 2 – Fachmodell und Managementsystem".
- `src/lib/help-documentation.ts`: Handbuchkapitel „AVKK-Führungsmodell" mit `lastUpdated` (Doku-Sync-Pflicht).
- Technischer Prüfbericht neu erzeugen, mit klarer Trennung umgesetzt / fachlich definiert / technisch entworfen / geplant.

## Verifikation

`bun run project-status:check`, `bun run docs:check`, `bunx --bun tsgo --noEmit`, `bun run lint`, `prettier --check`, `bun run lint:no-console`, Tests, Build — alle müssen grün bleiben. Abschluss mit Abschlussbericht nach Punkt 28 inklusive Go-/No-Go für 07B.

## Bewusst nicht Teil dieses Sprints

Keine Supabase-Migration, keine Tabellen, keine AVKK-UI, kein Report-Service, keine Änderung an `permissions.ts` oder `dashboard-data.ts`.

## Kritische Anmerkung

Der Prompt fordert „keine Hardcodierung" als Zielarchitektur — das bestehende Frontend hat aber bereits harte Kataloge (`Priority`, `*Status`). Ich schlage vor, deren Migration in Reference Data als expliziten Backlog-Eintrag mit Zielsprint zu führen, statt sie stillschweigend als erledigt zu behandeln.
