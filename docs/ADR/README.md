# Architecture Decision Records

Kurze, datierte Notizen zu **einer** Entscheidung. Nach Genehmigung
unveränderlich — Kurskorrekturen entstehen als **neues** ADR mit
`Supersedes: ADR-000X`.

## Index

| Nr.  | Titel                                                                 | Status   |
| ---- | --------------------------------------------------------------------- | -------- |
| 0001 | [TanStack Start v1 als Framework](./0001-tanstack-start.md)           | Accepted |
| 0002 | [Frontend-RBAC gespiegelt zum Backend](./0002-frontend-rbac-mirrored.md) | Accepted |
| 0003 | [Local-First mit localStorage](./0003-local-first-localstorage.md)    | Accepted |
| 0004 | [Pub-Sub-Store statt Zustand/Redux](./0004-pubsub-store-no-zustand.md) | Accepted |
| 0005 | [Frontend-Logger statt Sentry](./0005-frontend-logger-no-sentry.md)   | Accepted |

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
