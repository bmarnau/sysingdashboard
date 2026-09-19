# AQGS Pilot - Sysing Dashboard

Stand: 2026-09-18  
AQGS: 1.0.0-draft  
Pilot-Baseline: `main@91adefa97054aa3cbc6ad03e4cb2a58b868e4e75`  
Profil: **Security/Data**

## Zweck

Dieser Pilot prüft, ob sich die bestehende Sysingdashboard-Qualitätssicherung in
AQGS abbilden lässt, **ohne die vorhandene CI-Semantik umzubauen**.

Der Pilot führt keine neuen Produkt-, Datenbank-, Auth-, RBAC- oder RLS-Regeln
ein. Er macht ausschließlich die bereits vorhandenen Qualitätsverträge unter
stabilen AQGS-Gate-IDs sichtbar.

## Ergebnis

Die bestehende Qualitätssicherung lässt sich vollständig auf G0-G15 abbilden.

| Gate | Vorhandene Sysingdashboard-Evidence                                | Pilot-Einordnung                                |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------- |
| G0   | Git/PR/Exact SHA                                                   | blocking                                        |
| G1   | Static: Prettier, ESLint, TypeScript, no-console                   | blocking                                        |
| G2   | Unit/Component + Backend                                           | blocking                                        |
| G3   | Security Suite + separater Security Workflow                       | blocking                                        |
| G4   | Production Build + Bundle                                          | blocking                                        |
| G5   | DB-Rebuild, Contracts, Schema-/Type-Drift                          | blocking                                        |
| G6   | RBAC-/Security-/RLS-Verträge                                       | blocking                                        |
| G7   | API, Discovery, Smoke, Functional                                  | blocking                                        |
| G8   | Import/Export                                                      | blocking                                        |
| G9   | Backup/Restore + transaktionaler Rollback-Snapshot                 | blocking                                        |
| G10  | Playwright E2E; sprintabhängige externe Preview zusätzlich möglich | blocking                                        |
| G11  | Accessibility                                                      | advisory, wie heutige CI                        |
| G12  | Docs-Sync + Project-Manifest + Governance-Dokumente                | blocking                                        |
| G13  | Technical Debt / Portability                                       | advisory, wie heutige CI                        |
| G14  | Technical Report + zentraler Quality Gate                          | blocking                                        |
| G15  | vorhandene Ops-Suite                                               | conditional/advisory; nicht Teil der Default-CI |

## Abgleich mit dem vorhandenen Technical Report

Der vorhandene Technical Report bildet bereits einen großen Teil von G14 ab:

- Kandidaten-/Commit-Identität,
- Bereichsreports,
- Findings und Schweregrade,
- akzeptierte historische Findings,
- Blocker,
- zentrale Gate-Entscheidung.

AQGS ergänzt vor allem eine **stabile, projektübergreifende Taxonomie**:

1. Gate-IDs G0-G15 statt projektspezifischer Jobnamen.
2. Explizite Enforcement-Klasse: blocking / advisory / informational.
3. No-Silent-Skip: required + unavailable = BLOCKED.
4. Exact-Candidate-Reopening nach jedem Head-Wechsel.
5. Explizite Regeln für Golden-Dataset-Evidenz und kontrollierte Evidenzwiederverwendung.
6. G9 benennt Restore/Rollback/Roll-forward als zusammengehörigen Recovery-Vertrag.

Der vorhandene Technical Report soll deshalb zunächst **nicht ersetzt** werden.
Er ist die Sysingdashboard-spezifische Evidence-Quelle, auf die G14 referenziert.

## Golden Dataset

Auf der Pilot-Baseline `main` liegt
`docs/GOLDEN-DATASET-STRATEGY.md` als verbindlicher Querschnittsvertrag vor.

Die Strategie definiert unter anderem:

- ausschließlich synthetische Daten,
- feste Referenzzeit,
- Dataset-Versionierung,
- unabhängige Expected Results,
- keine automatische Snapshot-Freigabe,
- getrennte Security-Negativfälle,
- feste BSF-03A-Sollwerte.

Wichtig für die Evidence-Integrität:

**Die geplante V1-Struktur ist auf der verwendeten main-Baseline noch nicht als
vollständiger Fixture-Baum vorhanden.** Sie darf daher in diesem Pilot nicht als
bereits akzeptierte main-Evidence ausgegeben werden.

Die laufende BSF-03A-Arbeit materialisiert diesen Vertrag. Erst nach deren
Abnahme und Merge wird der Golden Dataset reguläre Current-Main-Evidence.

## G9 - Rollback-Befund

Der Pilot korrigiert eine anfängliche Annahme: Sysingdashboard besitzt bereits
einen substanziellen Recovery-Vertrag.

Die Architektur beschreibt:

- Restore validiert vor dem Schreiben,
- Restore arbeitet transaktional,
- vor dem Restore wird ein Rollback-Snapshot angelegt,
- Fehler sollen keinen Teilzustand hinterlassen,
- Backup-/Restore-/Integritätstests sind vorhanden.

Damit ist G9 im Projekt nicht nur „Backup vorhanden“, sondern umfasst bereits
Restore und transaktionales Rollback.

## Offene Verbesserungsmöglichkeiten

Diese Punkte sind **keine neuen Blocker des aktuellen Projekts**, sondern
Erkenntnisse des AQGS-Piloten:

1. **G15:** Ops-Suite ist vorhanden, aber nicht Bestandteil des blockierenden
   Default-CI-Pfads. Für einen später produktionskritischen Betriebsstatus sollte
   entschieden werden, ob G15 blocking wird.
2. **G11/G13:** Accessibility und Technical Debt sind bewusst advisory. AQGS
   macht diese Governance-Entscheidung explizit.
3. **Golden Dataset:** nach Merge von GDS-01/BSF-03A kann
   `quality-gates.yaml` die konkrete Dataset-Version und Manifest-Datei binden.
4. **G14:** der Technical Report kann später zusätzlich die AQGS-Gate-IDs
   maschinenlesbar ausgeben. Das ist für den Pilot noch nicht erforderlich.

## Pilot-Abnahme

- AQGS lässt sich ohne GitHub-Actions-spezifische Semantik beschreiben: **JA**
- vorhandene CI muss für die erste Einführung refaktoriert werden: **NEIN**
- Security/Data-Profil passt: **JA**
- Existing Technical Report bleibt nutzbar: **JA**
- Gate-Drift/Skip wird durch AQGS sichtbarer: **JA**
- Golden Dataset ist korrekt als geplant/branchabhängig statt als main-PASS ausgewiesen: **JA**
- produktive Runtime/DB/Auth/RBAC/RLS geändert: **NEIN**

## Nächster Schritt

Nach Review dieses Piloten:

1. AQGS-Profil als Projektvertrag akzeptieren.
2. Nach BSF-03A-Merge konkrete Golden-Dataset-Version in das Profil übernehmen.
3. Optional später G14 um maschinenlesbare AQGS-Gate-IDs erweitern.
4. AQGS an einer deutlich einfacheren zweiten Anwendung gegenprüfen.
