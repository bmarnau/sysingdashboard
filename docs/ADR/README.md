# Architecture Decision Records

Kurze, datierte Notizen zu **einer** Entscheidung. Nach Genehmigung
unveränderlich — Kurskorrekturen entstehen als **neues** ADR mit
`Supersedes: ADR-000X`.

## Index

Vollständig und lückenlos ADR-0001 bis ADR-0028. Alle ADRs liegen ausschließlich
in diesem Verzeichnis (`docs/ADR/`); das frühere zweite Verzeichnis `docs/adr/`
wurde in Sprint 09B aufgelöst, weil zwei Verzeichnisse mit gleichem Namen unter
Windows kollidieren.

| Nr.  | Titel                                                                                                          | Status   |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------- |
| 0001 | [TanStack Start v1 als Framework](./0001-tanstack-start.md)                                                    | Accepted |
| 0002 | [Frontend-RBAC gespiegelt zum Backend](./0002-frontend-rbac-mirrored.md)                                       | Accepted |
| 0003 | [Local-First mit localStorage](./0003-local-first-localstorage.md)                                             | Accepted |
| 0004 | [Pub-Sub-Store statt Zustand/Redux](./0004-pubsub-store-no-zustand.md)                                         | Accepted |
| 0005 | [Frontend-Logger statt Sentry](./0005-frontend-logger-no-sentry.md)                                            | Accepted |
| 0006 | [Kein Virtual Scrolling (bis Messnachweis)](./0006-no-virtual-scrolling.md)                                    | Accepted |
| 0007 | [RBAC v2 — Resource Types, Scopes und Permission Groups](./0007-rbac-v2-scopes-and-resources.md)               | Accepted |
| 0008 | [RBAC v2 — Assignment-Architektur](./0008-rbac-v2-assignment-architecture.md)                                  | Accepted |
| 0009 | [Zentrale Testinstanz — Vitest-Projects + Playwright + MSW](./0009-central-test-instance.md)                   | Accepted |
| 0010 | [Technical-Debt-Hybrid-Ansatz](./0010-tech-debt-hybrid.md)                                                     | Accepted |
| 0011 | [API-/Endpoint-Contract-Tests via Registry](./0011-api-endpoint-contract-tests.md)                             | Accepted |
| 0012 | [Playwright-E2E-Umfang](./0012-playwright-e2e-scope.md)                                                        | Accepted |
| 0013 | [Security-Release-Gate](./0013-security-release-gate.md)                                                       | Accepted |
| 0014 | [API-Discovery über statische Analyse](./0014-api-discovery-static-analysis.md)                                | Accepted |
| 0015 | [Backup-/Restore-Tests](./0015-backup-restore-tests.md)                                                        | Accepted |
| 0016 | [Ops-Baselines](./0016-ops-baselines.md)                                                                       | Accepted |
| 0017 | [Zentraler technischer Prüfbericht](./0017-technical-test-report.md)                                           | Accepted |
| 0018 | [CI-Quality-Gates](./0018-ci-quality-gates.md)                                                                 | Accepted |
| 0019 | [Refactoringplan für übergroße Module](./0019-oversize-refactor-plan.md)                                       | Accepted |
| 0020 | [Providerneutrale Inaktivitäts-Abmeldung](./0020-idle-logout-provider-neutral.md)                              | Accepted |
| 0021 | [Modularisierung des Backup-/Restore-Service](./0021-backup-service-modularisierung.md)                        | Accepted |
| 0022 | [Backupformat 2.0 — manifestbasierte Zuordnung](./0022-backupformat-2.md)                                      | Accepted |
| 0023 | [Phasenmodell und Abschluss der Infrastrukturphase](./0023-phasenmodell-infrastrukturabschluss.md)             | Accepted |
| 0024 | [AVKK-Führungsmodell und Reference Data als Plattformdienst](./0024-avkk-und-reference-data.md)                | Accepted |
| 0025 | [AVKK-Umsetzung Sprint 07B](./0025-avkk-umsetzung-07b.md)                                                      | Accepted |
| 0026 | [Löschstrategie, AVKK im Backup und bewertete Sicherheitswarnungen](./0026-loeschstrategie-und-avkk-backup.md) | Accepted |
| 0027 | [AVKK-Führungssicht und getrennte Kontextebene](./0027-avkk-management-und-kontextebene.md)                    | Accepted |
| 0028 | [Reporting-Architektur und Corporate Templates](./0028-reporting-architektur.md)                               | Accepted |

Stand der Prüfung: Sprint 09B (v1.58.0). Kein ADR ist deprecated oder superseded;
keine widersprüchlichen Entscheidungen festgestellt.

## Template

```markdown
# ADR-000X: <Titel>

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-000Y
- **Datum**: YYYY-MM-DD

## Kontext

Was war das Problem, welche Constraints galten.

## Entscheidung

Was wurde gewählt — klar und knapp.

## Alternativen

Was wurde verworfen, Ein-Satz-Begründung je Option.

## Konsequenzen

Positive **und** negative, inkl. bekannter Trade-offs.

## Trust-Boundary / Security-Note

Nur wenn relevant.
```
