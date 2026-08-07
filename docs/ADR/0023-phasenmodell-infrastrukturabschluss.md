# ADR-0023 — Phasenmodell und Abschluss der Infrastrukturphase

- **Status**: accepted
- **Datum**: 2026-08-07
- **Version**: 1.50.0
- **Kontext-Sprint**: 06B (Finalisierung)

## Kontext

Bis einschließlich Sprint 06B wurde ausschließlich technische Plattform gebaut:
Auth und RBAC, Prüfberichte, Test- und Qualitätsinfrastruktur, Backupformat 2.0,
Governance und Projektmanifest. Fachliche Erweiterungen (AVKK, Reference Data,
Report Service) wurden bewusst zurückgestellt.

Ohne eine explizite Phasengrenze bleibt unklar, wann Infrastrukturarbeit endet und
wann Fachentwicklung beginnt. Das führte in vergangenen Sprints wiederholt dazu, dass
Infrastruktur- und Fachthemen im selben Sprint konkurrierten.

## Entscheidung

Das Projekt wird in explizite **Phasen** gegliedert, die im Projektmanifest
(`docs/PROJECT-STATUS.yaml`, Abschnitt `phases`) geführt und vom Validator geprüft werden.

- **Phase 1 — Technische Plattform**: abgeschlossen mit Version 1.50.0.
- **Phase 2 — AVKK-Fachmodell**: nächste Phase, beginnt mit Sprint 07.

Regeln:

1. Eine Phase besitzt Ziel, Status, Startversion und (bei Abschluss) Abschlussversion.
2. Infrastrukturarbeit nach Phase 1 ist zulässig, aber nur als Wartung, Fehlerbehebung
   oder als ausdrücklich begründete Voraussetzung eines Fachsprints.
3. Ein Phasenwechsel erfordert: grüne Quality Gates, neu erzeugten technischen
   Prüfbericht, Eintrag im Entwicklungstagebuch und aktualisiertes Manifest.
4. Das Schema des Manifests führt `phases` als optionalen Abschnitt (schemaVersion 1.3.0),
   damit ältere Manifest-Stände gültig bleiben.

## Konsequenzen

**Positiv**

- Klare, prüfbare Grenze zwischen Plattform- und Fachentwicklung.
- Roadmap und Kommunikation gegenüber Stakeholdern gewinnen eine Ebene über Sprints.
- Der Validator kann Phasenkonsistenz maschinell prüfen.

**Negativ / Kosten**

- Zusätzlicher Pflegeaufwand im Manifest bei jedem Sprintabschluss.
- Gefahr formaler Scheingenauigkeit, wenn Phasen zu fein geschnitten werden — daher
  bewusst nur wenige, grobe Phasen.

## Alternativen

- **Nur Sprints, keine Phasen**: verworfen — kein Abschlusskriterium für die
  Infrastrukturarbeit, Roadmap bleibt flach.
- **Phasen nur in der Dokumentation (Fließtext)**: verworfen — nicht maschinell prüfbar
  und damit nicht mit dem Manifest-Prinzip vereinbar.

## Referenzen

- `docs/PROJECT-GOVERNANCE.md`
- `docs/PROJECT-STATUS.md`, `docs/PROJECT-STATUS.yaml`
- `docs/ARCHITECTURE.md` Abschnitt 9
- ADR-0010 (Tech-Debt-Hybrid), ADR-0017 (Technischer Prüfbericht), ADR-0022 (Backupformat 2.0)
