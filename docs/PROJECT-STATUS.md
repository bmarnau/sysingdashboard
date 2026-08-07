# Project Manifest — `docs/PROJECT-STATUS.yaml`

Stand: 2026-08-07 · Schema: [`docs/project-status.schema.json`](./project-status.schema.json)
· Prüfbefehl: `bun run project-status:check`

`PROJECT-STATUS.yaml` ist die **verbindliche, maschinenlesbare Single Source of
Truth** für Projektstatus, Roadmap, Risiken, Qualität und Release-Stand. Wo eine
andere Datei denselben Sachverhalt beschreibt, gilt das Manifest — mit einer
Ausnahme: die Dashboard-Version stammt aus `CHANGELOG.md` und wird im Manifest
nur gespiegelt. Der Validator erzwingt die Übereinstimmung.

---

## 1. Aufbau

| Abschnitt | Inhalt | Pflicht |
| --- | --- | --- |
| `schemaVersion` | Semver des Manifest-Schemas | ja |
| `lastUpdated` | ISO-Datum der letzten Pflege | ja |
| `project` | Name, Repository, Quelle der Wahrheit, Lebenszyklus | ja |
| `vision` | Zielaussage und Zielzustand | ja |
| `architecturePrinciples` | ID + Regel, identisch mit Governance Abschnitt 3 | ja |
| `versions` | Dashboard, Schemata, Formate | ja |
| `phases` | Projektphasen mit Ziel, Status, Start- und Abschlussversion (ab schemaVersion 1.3.0) | nein |
| `currentState` | aktueller Sprint, Testanzahl, Gates, Verifikationsgrenzen | ja |
| `platforms` | Entwicklungs- und Laufzeitplattformen | nein |
| `supabase` | Rolle, Umgebungen, Auth-/RBAC-/RLS-Stand | nein |
| `completedSprints` | abgeschlossene Sprints mit Version | nein |
| `roadmap` | geplante Sprints mit Ziel, Priorität, Abhängigkeiten | ja |
| `backlog` | thematische Rückstände | ja |
| `technicalDebt` | bekannte Schulden mit Referenz | ja |
| `adrs` | Verzeichnis der Entscheidungen | nein |
| `quality` | Tests, Findings, Gates | ja |
| `releaseManagement` | aktueller Release und Nachweise | ja |
| `risks` | Risiken mit Eintrittswahrscheinlichkeit und Wirkung | ja |
| `mcpAndAgents` | geplante Agentennutzung und Leitplanken | nein |
| `artifacts` | Pfade zu allen Projektartefakten | ja |
| `consumers` | menschliche und maschinelle Nutzer | nein |
| `validation` | Pflichtprüfungen und Prüfbefehl | ja |
| `sprintGovernance` | Startbedingungen, Definition of Done, Auslöser | ja |

---

## 2. Schema

Der formale Vertrag liegt als JSON Schema (Draft 2020-12) in
`docs/project-status.schema.json`.

Wesentliche Festlegungen:

- `versions.dashboard`, `releaseManagement.currentRelease` und alle
  Sprint-Versionen sind strenges Semver (`MAJOR.MINOR.PATCH`).
- IDs entsprechen `^[A-Za-z0-9][A-Za-z0-9._-]*$` und sind je Abschnitt eindeutig.
- Statuswerte sind eine geschlossene Liste: `open`, `planned`, `next`,
  `in-progress`, `completed`, `accepted`, `resolved`, `rejected`, `future`,
  `unverified`.
- Schweregrade: `low`, `medium`, `high`, `critical`.
- `releaseReadiness` und `releaseManagement.status`: `passed`,
  `passed-with-findings`, `blocked`, `not-assessed`.
- Listeneinträge in `roadmap`, `backlog`, `technicalDebt`, `risks`, `adrs` und
  `completedSprints` erlauben **keine** zusätzlichen Felder — Tippfehler fallen
  dadurch sofort auf.

---

## 3. Was der Validator prüft

`scripts/project-status/check.mjs`:

1. YAML ist syntaktisch gültig.
2. Struktur erfüllt das JSON-Schema (Pflichtfelder, Typen, Statuswerte).
3. `versions.dashboard` == oberste Version in `CHANGELOG.md`.
4. `releaseManagement.currentRelease` == `versions.dashboard`.
5. `currentState.currentSprint` und `previousSprint` existieren als Sprint-ID.
6. Roadmap-Einträge sind vollständig; `dependencies` verweisen auf bekannte Sprints.
7. Keine doppelten IDs; kein Sprint gleichzeitig in `roadmap` und `completedSprints`.
8. `reference` und `targetSprint` verweisen auf bekannte ADRs, Backlog-Einträge,
   Risiken oder Sprints.
9. `lastUpdated` liegt nicht in der Zukunft.

Fehler beenden den Prozess mit Exitcode 1. Warnungen (z. B. fehlende
`exitCriteria`, unbekannte weiche Referenz) werden getrennt ausgewiesen und
brechen den Lauf nicht ab.

---

## 4. Pflege

Pflichtaktualisierung **nach jedem Sprint** — mindestens:

- `lastUpdated`
- `versions.dashboard` und `releaseManagement.currentRelease`
- `currentState` (Sprint, Titel, Vorsprint, Testanzahl, Gates)
- `roadmap` (abgeschlossenen Sprint nach `completedSprints` verschieben)
- `risks`, `technicalDebt`, `backlog`
- `quality.tests` und `quality.gates`
- `currentState.knownVerificationLimits`

Ablauf:

```bash
# 1. CHANGELOG-Eintrag der neuen Version anlegen
# 2. Manifest anpassen
bun run project-status:check
# 3. Rest der Doku (Handbuch, Tagebuch) nachziehen
bun run docs:check
```

---

## 5. Versionierung des Manifests

`schemaVersion` folgt Semver:

- **MAJOR** — Feld entfernt oder Bedeutung geändert (Konsumenten müssen angepasst werden).
- **MINOR** — neues optionales Feld oder neuer Abschnitt.
- **PATCH** — Klarstellung ohne strukturelle Wirkung.

Jede Schemaänderung aktualisiert Schema, dieses Dokument und den Validator im
selben Commit.

---

## 6. Beispiele

Roadmap-Eintrag:

```yaml
roadmap:
  - id: "07A"
    title: "AVKK-Datenmodell"
    status: "next"
    priority: "high"
    goal: "AVKK als fachliche Erweiterung der Arbeitspakete einführen."
    dependencies:
      - "06B"
    exitCriteria:
      - "Datenmodell dokumentiert"
      - "Migration mit RLS und Grants angelegt"
```

Technische Schuld mit Referenz:

```yaml
technicalDebt:
  - id: "TD-DASHBOARD-ORCHESTRATION"
    status: "accepted"
    severity: "medium"
    reference: "ADR-0019"
    description: "Verbleibende Dashboard-Orchestrierung ist dokumentiert."
```

Risiko:

```yaml
risks:
  - id: "RISK-SESSION-CLIENT-ONLY"
    category: "security"
    probability: "medium"
    impact: "medium"
    status: "open"
    mitigation: "Serverseitige Sitzungsgrenzen prüfen."
```

---

## 7. Erweiterbarkeit

- Neue **optionale** Top-Level-Abschnitte sind erlaubt
  (`additionalProperties: true` auf oberster Ebene) und erhöhen die MINOR-Version
  des Schemas.
- Neue **Pflichtfelder** in Listeneinträgen sind ein MAJOR-Schritt, weil
  bestehende Einträge sonst ungültig werden.
- Neue Statuswerte werden im Schema ergänzt — nie ad hoc im YAML verwendet.

---

## 8. Nutzung durch Werkzeuge und Agenten

| Konsument | Nutzung |
| --- | --- |
| **Lovable** | Liest Sprintstand, Roadmap und Nicht-Ziele, bevor Änderungen geplant werden; schreibt den Manifest-Stand am Sprintende fort. |
| **ChatGPT** | Nutzt das Manifest als Kontextanker für Sprintplanung und Abnahmeprüfung, statt sich auf Chatverlauf zu stützen. |
| **Codex / lokale IDE** | Liest Architekturprinzipien, technische Schulden und Definition of Done vor lokalen Änderungen. |
| **GitHub Actions** | Führt `project-status:check` im Job `static` aus; ein ungültiges Manifest bricht den Build ab. |
| **Zukünftige KI-Agenten** | Verwenden `artifacts`, `consumers` und `mcpAndAgents.guardrails` als Einstiegs- und Leitplankenquelle. Agenten dürfen das Manifest lesen; Schreibzugriff nur über einen regulären, überprüfbaren Commit. |

Regel für alle Konsumenten: **Nie aus dem Manifest ableiten, was im Code
verifizierbar ist.** Das Manifest beschreibt Absicht und Stand, es ersetzt keine
Prüfung.
