# INT-CONTRACT-01 - External Management Data Contract

Status: **DRAFT / CONTRACT PLANNING ONLY**  
Contract version: **0.1.0-draft**  
Date: **2026-09-11**  
Related: Issue #123, Issue #125, Draft PR #124  
Management document: `TDF-Operatives-Management-Wallboard_0.7.1-draft.md`  
Producer requirements document: `EXTERNAL-DATA-TEAM-REQUIREMENTS_0.1.1-draft.md`

## Purpose

This package defines the provider-neutral JSON boundary for management data delivered by the external data team to the Sysing Dashboard. It enables safe parallel work before the BSF-05 runtime importer exists.

## Non-impact guarantee

This is documentation/contract work only. It does not change BSF-03, DB/RLS/Grants/Functions, runtime endpoints, internal persistence, roles, sessions or Lovable runtime behavior.

## Responsibility boundary

The external team owns source acquisition, deterministic mapping, stable source identifiers, timestamps, freshness/source status, mapping/provenance, producer-side quality, retry/idempotency and test deliveries.

The Sysing Dashboard owns contract versioning, consumer-side schema/scope validation, later provider adapter/persistence/projection, RBAC/RLS, partial-failure handling and wallboard presentation.

Detailed producer requirements: `EXTERNAL-DATA-TEAM-REQUIREMENTS_0.1.1-draft.md`.

## Contract maturity

| Stage | Meaning |
| --- | --- |
| C0 | scope and responsibility boundary |
| C1 | schema 0.1 draft, examples and producer requirements |
| C2 | external-team field/semantic/freshness review |
| C3 | compatibility/evolution hardening |
| C4 | contract 1.0 candidate in BSF-05 after BSF-04 |
| C5 | productive importer/transport/monitoring |

## Management domains

Projects, work packages, activities, aggregated absence/leave, aggregated PRTG infrastructure and aggregated support-mailbox counts. Mail content and personal absence details are excluded.

## Versioning

- Management TDF: `0.7.1-draft`
- Producer requirements document: `0.1.1-draft`
- JSON contract/schema package: `0.1.0-draft`

The management version `0.7.0-draft` and producer requirements `0.1.0-draft` remain historical predecessor states. The JSON schema is unchanged by the TDF/accessibility patch. Contract 1.0 remains gated by BSF-04/BSF-05.

## Package contents

- `wallboard-management-data.schema.json`
- `FIELD-CATALOG.md`
- `VALIDATION.md`
- `EXTERNAL-DATA-TEAM-REQUIREMENTS_0.1.1-draft.md`
- positive/negative JSON examples
- `CHANGELOG.md`

All examples are synthetic and contain no production data.

## Open decisions

Transport, producer authentication, payload size/batching, acknowledgement/retry transport, delta semantics, final source mappings, final freshness SLOs, persistence/conflict strategy and retention/audit remain deliberately open until their planned sprints.
