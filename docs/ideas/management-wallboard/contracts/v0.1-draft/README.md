# INT-CONTRACT-01 - External Management Data Contract

Status: **DRAFT / CONTRACT PLANNING ONLY**  
Contract version: **0.1.0-draft**  
Date: **2026-09-11**  
Related: Issue #123, Issue #125, Draft PR #124  
Management document: `TDF-Operatives-Management-Wallboard_0.7.0-draft.md`

## 1. Purpose

This package defines an early, provider-neutral JSON boundary for management data delivered by another team to the Sysing Dashboard. It exists to allow safe parallelization before the BSF-05 runtime importer is implemented.

## 2. Non-impact guarantee

INT-CONTRACT-01 is a documentation/contract track only. It must not interrupt BSF-03, introduce DB/RLS/Grant/Function changes, prescribe internal Supabase/Azure SQL tables, define the final transport protocol, create a Lovable Cloud runtime dependency, weaken RBAC/RLS or claim BSF-05 implementation has started.

## 3. Responsibility boundary

The external data team owns source acquisition, deterministic mapping, stable source identifiers, timestamps, source status/freshness, mapping/provenance documentation, producer-side quality, retry/idempotency behavior and test deliveries.

The Sysing Dashboard team owns contract versioning, consumer-side schema/scope validation, the later provider adapter, later persistence/projection, RBAC/RLS enforcement, freshness/partial-failure handling and wallboard presentation.

Detailed producer and quality requirements are defined in `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`.

## 4. Contract maturity

| Stage | Timing | Meaning |
| --- | --- | --- |
| C0 | now | scope, responsibility boundary, non-impact rules |
| C1 | parallel to BSF-03 | JSON Schema 0.1 draft + examples + producer quality profile |
| C2 | external-team review | field/semantic/freshness review and next draft |
| C3 | before BSF-05 | compatibility/evolution hardening |
| C4 | BSF-05 after BSF-04 | contract 1.0 candidate |
| C5 | BSF-05 or later | productive importer/monitoring/persistence |

## 5. Management domains

The draft covers projects, work packages, activities, aggregated absence/leave, aggregated infrastructure/PRTG and aggregated support-mailbox counts. No mail content, subject, sender or recipient and no personal absence reasons are part of the contract.

## 6. Envelope and snapshot rules

Every delivery contains `schemaVersion`, `deliveryId`, `deliveryType`, `generatedAt`, `observedAt`, `producer`, `scope.systemhouseId`, completeness metadata, `sourceStatus` and `data`.

Draft 0.1 starts with snapshots. Missing domains in an incomplete snapshot must not be interpreted as deletion. Each source has its own freshness/status state (`ok`, `delayed`, `stale`, `error`).

## 7. Security and privacy

No passwords, tokens, API keys, service-role keys, mail contents, personal absence details, internal DB credentials or secret-bearing error messages belong in the payload. JSON validation is not authorization; future runtime still enforces authentication, scope, RBAC/RLS and audit.

## 8. Versioning

The lifecycles are deliberately separate:

- Management TDF: `0.7.0-draft`,
- JSON contract + producer requirements: `0.1.0-draft`.

The previous management version `0.6.0-draft` remains historical. Contract 1.0 remains gated by BSF-04/BSF-05.

## 9. Package contents

- `wallboard-management-data.schema.json`
- `FIELD-CATALOG.md`
- `VALIDATION.md`
- `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`
- positive/negative JSON examples
- `CHANGELOG.md`

All examples are synthetic and contain no production data.

## 10. Open decisions

Transport, producer authentication, payload size/batching, acknowledgement/retry transport, delta semantics, final source mappings, final freshness SLOs, persistence/conflict strategy and retention/audit remain deliberately open until their planned sprints.
