# Sysing Dashboard — Project Governance

Stand: 2026-08-06 · Gültig ab Version 1.49.0 · Verbindlich für alle Beitragenden
(Mensch und KI-Agent).

Dieses Dokument ist die **oberste Regelquelle** des Projekts. Es beschreibt, wie
entwickelt, geprüft, dokumentiert und freigegeben wird. Bei Widerspruch gilt:
Governance > ADR > Architektur > Handbuch > Kommentar im Code.

---

## 1. Vision

Das Sysing Dashboard führt Tätigkeiten, Arbeitspakete, Projekte, Zeiten,
Verantwortlichkeiten und Berichte in einer zentralen, verlässlichen und sicher
betreibbaren Anwendung zusammen.

Zielbild:

- persönliches Arbeitsdashboard mit belastbaren Auswertungen,
- mehrbenutzerfähig über RBAC und RLS,
- autonom betreibbar (Docker) ohne unersetzbare Laufzeitabhängigkeit zu einer
  einzelnen Plattform,
- erweiterbar um AVKK-Fachlogik, Reference Data, Reports, Microsoft 365 und
  KI-Agenten — jeweils als klar abgegrenzte Ausbaustufe.

Die maßgebliche, maschinenlesbare Fassung von Vision, Roadmap und Status ist
[`docs/PROJECT-STATUS.yaml`](./PROJECT-STATUS.yaml).

---

## 2. Entwicklungsprinzipien

1. **Analyse vor Umsetzung.** Kein Sprint ohne benannten Ist-Zustand mit Beleg
   (Dateizeile, Testausgabe, Reportbefund). Vermutungen werden als Vermutung
   gekennzeichnet.
2. **Kleiner Schnitt.** Ein Sprint hat ein Thema. Refactoring und Fachlogik
   werden nicht vermischt.
3. **Verhalten unverändert bei Refactoring.** Strukturänderungen sind nur dann
   abgeschlossen, wenn die bestehenden Tests unverändert grün sind.
4. **Rückwärtskompatibilität ist Vertrag.** Formate (Backup, Export, Manifest)
   werden versioniert, nie stillschweigend gebrochen.
5. **Kein toter Code.** Nicht genutzte Module werden entfernt oder als bewusst
   archiviert gekennzeichnet (`archive/`).
6. **Nachweis statt Erfolgsmeldung.** Jede Abschlussmeldung nennt Zahlen:
   Testanzahl, Findings vorher/nachher, Version, Reportstand.

---

## 3. Architekturprinzipien

| ID | Regel |
| --- | --- |
| `source-of-truth` | GitHub ist die maßgebliche Quelle für Code, Dokumentation und Versionsstand. |
| `supabase-mvp` | Supabase ist die führende Daten- und Authentifizierungsplattform des MVP. |
| `provider-separation` | Fachlogik, Authentifizierung, Datenzugriff und providerspezifische Implementierungen sind getrennt. |
| `portable-runtime` | Keine unersetzbare Laufzeitabhängigkeit zu einer einzelnen Hostingplattform. |
| `container-ready` | Die Anwendung muss langfristig als Docker-Container autonom betreibbar sein. |
| `security-by-design` | Änderungen sind sicher, testbar, dokumentiert sowie RBAC- und RLS-konform. |
| `no-secrets` | Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts oder Dokumentation. |
| `layered-access` | UI greift nie direkt auf Persistenz- oder Providerinterna zu (siehe Abschnitt 4). |

Diese IDs sind identisch mit `architecturePrinciples[].id` in
`PROJECT-STATUS.yaml` und werden dort gepflegt.

---

## 4. Trennung Fachlogik / Infrastruktur

Verbindliches Schichtenmodell (Details und Diagramm:
[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)):

```text
Präsentation      src/routes, src/components
Facade/Hooks      src/hooks, src/lib/store/useDashboardStore
Fachlogik         src/lib/*-service.ts, src/lib/backup/, src/lib/rbac/
Infrastruktur     src/lib/store/dashboard-persistence.ts, src/integrations/supabase/, src/lib/azure/
```

Harte Regeln, maschinell geprüft durch `scripts/tech-debt/detectors/layer-violations.mjs`:

- `src/routes` und `src/components` importieren **nicht**
  `@/lib/store/dashboard-persistence`. Einstieg ist der Facade-Hook
  `useDashboardPersistence()`.
- `src/routes` und `src/components` importieren aus `@/lib/azure` ausschließlich
  `azure-service` und `types`.
- Fachlogik kennt keine React-Imports.
- Infrastruktur kennt keine Fachbegriffe der UI (Tabs, Dialoge, Views).

Ein Verstoß ist ein Finding der Kategorie „Architektur" und blockiert die
Definition of Done, sofern er nicht über
`scripts/technical-report/tech-debt-acceptances.json` befristet und mit Ticket
akzeptiert wurde.

---

## 5. Ablauf: Analyse → Umsetzung → Test → Dokumentation

1. **Analyse** — Ist-Zustand belegen, Zielbild formulieren, Nicht-Ziele benennen,
   Risiken benennen. Ergebnis: Sprintplan.
2. **Umsetzung** — kleinstmöglicher Schnitt, Verhalten erhalten, keine
   Sammeländerungen ohne Bezug zum Sprintziel.
3. **Test** — neue Regeln bekommen einen Test. Bestehende Suiten müssen grün
   bleiben. Manuelle Verifikation wird schriftlich dokumentiert.
4. **Dokumentation** — CHANGELOG, Handbuch, Entwicklungstagebuch,
   `PROJECT-STATUS.yaml`, bei Entscheidungen zusätzlich ein ADR.

Kein Schritt darf übersprungen werden. Dokumentation ist Teil der Umsetzung,
nicht Nacharbeit.

---

## 6. Definition of Done

Ein Sprint gilt erst als abgeschlossen, wenn **alle** Punkte erfüllt und belegt sind:

- [ ] Akzeptanzkriterien des Sprints erfüllt
- [ ] `bun run test` grün (Anzahl im Abschlussbericht genannt)
- [ ] `bun run typecheck` grün
- [ ] `bun run lint` und `bun run lint:no-console` grün
- [ ] Build grün
- [ ] `bun run docs:check` ohne unbegründete Warnung
- [ ] `bun run project-status:check` grün
- [ ] `CHANGELOG.md` mit neuer Version ergänzt
- [ ] Handbuch (`src/lib/help-documentation.ts`) aktualisiert
- [ ] `docs/ENTWICKLUNGSTAGEBUCH.md` fortgeschrieben
- [ ] `docs/PROJECT-STATUS.yaml` aktualisiert und validiert
- [ ] Technischer Prüfbericht neu erzeugt
- [ ] Go-/No-Go für den Folgesprint schriftlich dokumentiert

---

## 7. Dokumentationsstrategie

- **Eine Quelle je Aussage.** Versionsstand steht ausschließlich in
  `CHANGELOG.md`; `DASHBOARD_VERSION` wird daraus abgeleitet. Projekt- und
  Roadmapstand steht ausschließlich in `PROJECT-STATUS.yaml`.
- **Doku-Sync-Pflicht.** Jede neue oder geänderte Seite, Komponente, Einstellung,
  Rolle, Funktion oder Datenstruktur erzeugt einen Handbucheintrag mit
  aktualisiertem `lastUpdated` und einen CHANGELOG-Eintrag.
- **Entscheidungen gehören in ein ADR**, nicht in Codekommentare.
- **Dokumentation beschreibt den Ist-Zustand.** Geplantes wird ausdrücklich als
  „geplant" markiert.

---

## 8. Qualitätsregeln

| Regel | Prüfung |
| --- | --- |
| Kein `console.*` in Produktivcode | `bun run lint:no-console` |
| Typen vollständig, kein impliziter `any` an Modulgrenzen | `bun run typecheck` |
| Module unter 500 Zeilen (Ausnahme mit ADR und Ablaufdatum) | `test:debt` (oversize) |
| Keine Zyklen zwischen Modulen | `test:debt` (cyclic-deps) |
| Keine Layer-Verletzungen | `test:debt` (layer-violations) |
| RBAC-Matrix Frontend = Backend | `bun run rbac:check` |
| Dokumentation synchron | `bun run docs:check` |
| Projektmanifest gültig | `bun run project-status:check` |
| Endpunkte inventarisiert und getestet | `bun run api:gate` |

Findings werden nicht stillschweigend ignoriert. Ein akzeptiertes Finding
braucht Begründung, Ticket und Verfallsdatum.

---

## 9. Sicherheitsregeln

1. Keine Secrets in Code, Doku, Prompts, Logs oder Tests. Nur öffentliche
   Clientwerte (`VITE_SUPABASE_URL`, Publishable Key) dürfen im Frontend stehen.
2. Serverseitige Endpunkte validieren jede Eingabe (Zod) und vertrauen dem
   Browser nicht.
3. Frontend-RBAC ist Bedienkomfort, **keine** Sicherheitsgrenze. Durchsetzung
   erfolgt über RLS und serverseitige Prüfungen (ADR-0002).
4. Jede neue Tabelle: RLS aktiviert, Policies definiert, Grants gesetzt.
5. Logs werden redigiert (Tokens, Passwörter, Keys) und verlassen das Gerät
   nicht ohne Benutzeraktion.
6. Sicherheitsbefunde der Stufe „critical" blockieren jedes Release.

---

## 10. Versionierungsstrategie

Semantische Versionierung `MAJOR.MINOR.PATCH` für das Dashboard:

- **MAJOR** — Bruch eines externen Vertrags (Backup-/Exportformat, API) ohne
  Migrationspfad.
- **MINOR** — neue Funktion, neuer Sprintabschluss, neues Format mit
  Migrationspfad.
- **PATCH** — Fehlerbehebung, Dokumentation, interne Aufräumarbeiten.

Unabhängig davon versioniert werden: Backup-Manifest (`2.0`),
Prüfbericht-Schema (`2.0.0`), Projektmanifest-Schema (`schemaVersion`),
Dokumentationsversion (`DOCUMENTATION_VERSION`).

Jeder Sprintabschluss erzeugt mindestens eine neue MINOR-Version.

---

## 11. Sprint-Governance

**Startbedingungen**: vorheriger Sprint abgeschlossen und verifiziert;
CHANGELOG, Tagebuch, Prüfbericht und `PROJECT-STATUS.yaml` aktuell.

**Sprintstruktur**: Ziel → Teilaufgaben → Nicht-Bestandteil →
Abnahmekriterien → Abschlussbericht.

**Abschlussbericht** (Pflichtinhalte): neue Dokumente, geänderte Dokumente,
Ergebnis je Teilaufgabe, Testergebnisse mit Zahlen, Versionsnummer, Stand des
Prüfberichts, verbleibende Risiken, Go-/No-Go für den Folgesprint.

**Aktualisierungspflicht** für `PROJECT-STATUS.yaml` nach jedem Sprint:
Version, Sprint, Roadmap, Risiken, Tests, Release, bekannte Einschränkungen,
Backlog, technische Schulden.

---

## 11a. Phasenmodell

Das Projekt ist in Phasen gegliedert, die im Manifest (`phases`) geführt und vom
Validator geprüft werden (ADR-0023).

| Phase | Titel | Status | Abschluss |
| --- | --- | --- | --- |
| 1 | Technische Plattform | completed | v1.50.0 |
| 2 | AVKK-Fachmodell | next | offen |

Regeln:

- Nach Abschluss einer Phase ist Arbeit an deren Gegenstand nur noch als Wartung,
  Fehlerbehebung oder begründete Voraussetzung eines Sprints der Folgephase zulässig.
- Ein Phasenwechsel erfordert grüne Quality Gates, einen neu erzeugten Prüfbericht,
  einen Tagebucheintrag und ein aktualisiertes Manifest.

---

## 12. Rollen der Projektdokumente

| Dokument | Rolle | Pflegeanlass |
| --- | --- | --- |
| `docs/PROJECT-GOVERNANCE.md` | Oberste Regelquelle: wie gearbeitet wird | Regeländerung |
| `docs/PROJECT-STATUS.yaml` | Maschinenlesbare Single Source of Truth für Status, Roadmap, Risiken | jeder Sprint |
| `docs/PROJECT-STATUS.md` | Menschliche Erläuterung des Manifests | Schemaänderung |
| `docs/project-status.schema.json` | Formaler Vertrag des Manifests | Schemaänderung |
| `CHANGELOG.md` | Einzige Quelle der Dashboard-Version und Änderungshistorie | jede sichtbare Änderung |
| `docs/ARCHITECTURE.md` | Ist-Architektur und Zielarchitektur | Strukturänderung |
| `docs/ADR/`, `docs/adr/` | Einzelentscheidungen mit Trade-offs | Entscheidung |
| `src/lib/help-documentation.ts` | Benutzerhandbuch in der Anwendung | jede Funktionsänderung |
| `docs/ENTWICKLUNGSTAGEBUCH.md` | Chronik des Projektverlaufs | jeder Sprint |
| `test-report/technical-test-report.*` | Prüfbericht, Findings, Release-Gate | jeder Sprint |
| `docs/CONTRIBUTING.md` | Konkreter Entwickler-Workflow | Workflowänderung |

---

## 13. Änderung dieser Governance

Änderungen an diesem Dokument erfordern einen CHANGELOG-Eintrag und — sofern
eine Architektur- oder Qualitätsregel betroffen ist — ein ADR.
