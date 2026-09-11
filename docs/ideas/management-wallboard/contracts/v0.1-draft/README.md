# INT-CONTRACT-01 - External Management Data Contract

Status: **DRAFT / CONTRACT PLANNING ONLY**  
Contract version: **0.1.0-draft**  
Date: **2026-09-11**  
Related: Issue #123, Issue #125, Draft PR #124  
Management document: `TDF-Operatives-Management-Wallboard_0.7.0-draft.md`

## 1. Purpose

This package defines an early, provider-neutral JSON boundary for management data delivered by another team to the Sysing Dashboard.

The purpose is parallelization: the external data team can design and test its delivery format before BSF-05 is implemented, while the active Sysing Dashboard sprint sequence remains unchanged.

This package is **not** an implementation approval. It does not create a runtime endpoint, database schema, Supabase migration, new role, session exception or external integration.

## 2. Non-impact guarantee

INT-CONTRACT-01 is a documentation/contract track only.

It MUST NOT:

- interrupt or reorder BSF-03 and its successors,
- introduce DB/RLS/Grant/Function changes,
- prescribe Supabase tables or Azure SQL tables,
- define the final transport protocol,
- create a Lovable Cloud runtime dependency,
- use service-role credentials in a normal user path,
- weaken RBAC/RLS or existing customer/systemhouse scope rules,
- change BSF-04 persistence/synchronization decisions,
- claim BSF-05 implementation has started.

## 3. Responsibility boundary

### External data team

Responsible for:

- reading source systems such as SharePoint, PRTG and Exchange Online,
- mapping source-specific values to the agreed contract,
- supplying syntactically valid JSON,
- stable source identifiers and relationship references,
- correct timestamps, source status and freshness,
- mapping/provenance documentation,
- data quality on the producer side,
- retry/idempotency behavior,
- test deliveries for contract acceptance.

Detailed producer and quality requirements are defined in `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`.

### Sysing Dashboard team

Responsible for contract ownership/versioning, JSON Schema and scope validation, the later provider adapter, later persistence/projection decisions, RBAC/RLS enforcement, freshness/partial-failure handling, Management-Wallboard presentation and later runtime monitoring/audit.

## 4. Architectural boundary

```text
SharePoint ----\
PRTG -----------+--> External data team --> Canonical JSON Contract --> Sysing Dashboard
Exchange Online-/                                                   |
                                                                     +--> Validate
                                                                     +--> Provider adapter
                                                                     +--> Persist / project later
                                                                     +--> Management-Wallboard
```

Source-specific acquisition stays outside the Sysing Dashboard UI. The JSON contract must not expose or depend on internal Supabase table names.

## 5. Contract maturity path

| Stage | Timing | Meaning |
| --- | --- | --- |
| C0 | now | scope, responsibility boundary, non-impact rules |
| C1 | parallel to BSF-03 | JSON Schema 0.1 draft + examples + producer quality profile |
| C2 | after external-team feedback | field/semantic/freshness review and next draft |
| C3 | before BSF-05 | compatibility, evolution and validation rules stabilized |
| C4 | BSF-05 after BSF-04 decisions | contract 1.0 candidate / binding interface |
| C5 | BSF-05 or later | productive importer, monitoring and persistence |

## 6. Management domains in 0.1 draft

The draft covers projects, work packages, activities, absence/leave aggregates, infrastructure/PRTG aggregates and support-mailbox aggregates. Leave is aggregated. Support-mailbox data contains counts/age buckets only and no message content, subject, sender or recipient.

## 7. Envelope rules

Every delivery contains at least `schemaVersion`, `deliveryId`, `deliveryType`, `generatedAt`, `observedAt`, `producer`, `scope.systemhouseId`, `completeness.snapshotComplete`, `completeness.missingDomains`, `sourceStatus` and `data`.

All timestamps use RFC 3339 / ISO 8601 with timezone offset or `Z`.

## 8. Snapshot semantics

Draft 0.1 starts with snapshot delivery. Missing data in an incomplete snapshot MUST NOT be interpreted as deletion. Delta delivery is deliberately reserved for later contract versions.

## 9. Freshness and partial source failure

Each source has a `sourceStatus` entry with source name, state (`ok`, `delayed`, `stale`, `error`), observation time and optional non-sensitive message/code. A source failure must not invalidate unrelated domains.

## 10. Identity rules

Producer-side source IDs must be stable within the source system. No external team must know internal database primary keys. Final identity/matching rules remain part of BSF-05 and must remain compatible with BSF-04 decisions.

## 11. Security and privacy rules

- no passwords, access tokens, API keys or service-role keys in payloads,
- no e-mail body, subject, sender or recipient in support-mailbox data,
- no names or reasons in wallboard absence aggregates,
- no internal DB credentials or table names,
- producer error messages must not leak secrets,
- JSON validation is not a replacement for RBAC/RLS.

## 12. Versioning

The two lifecycles are deliberately separate:

- Management TDF: `0.7.0-draft`,
- JSON contract + producer requirements: `0.1.0-draft`.

The previous management version `0.6.0-draft` remains historical and is not silently overwritten. Contract 1.0 remains gated by BSF-04/BSF-05.

## 13. Files in this package

- `wallboard-management-data.schema.json`
- `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`
- `FIELD-CATALOG.md`
- `VALIDATION.md`
- positive and negative JSON examples
- `CHANGELOG.md`

All examples are synthetic and contain no production data.

## 14. Open decisions

Transport, producer authentication, payload size/batching, acknowledgement/retry transport, delta semantics, final source mappings, final freshness SLOs, persistence/conflict strategy and retention/audit remain deliberately open until their planned sprints.
