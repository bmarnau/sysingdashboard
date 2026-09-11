# INT-CONTRACT-01 - Parallel Contract Workstream

Status: **PLANNED / PARALLEL CONTRACT TRACK**  
Date: 2026-09-11  
Parent idea: #123  
Draft documentation: #124  

## Objective

Provide the external data-delivery team with an early, provider-neutral, versioned JSON contract for Management-Wallboard data without changing the active Sysing Dashboard sprint order.

## Why this is safe to start now

The workstream defines only the external contract boundary (`what is delivered`). It deliberately does not define the internal persistence/runtime implementation (`how the Sysing Dashboard stores and processes it`). Therefore it does not pre-empt BSF-04 and does not start the BSF-05 runtime implementation.

## Non-impact guardrail

The active product sequence remains unchanged. INT-CONTRACT-01 is allowed to produce documentation, schemas and synthetic examples only.

Forbidden in this track:

- DB migrations,
- RLS/Grant/Function changes,
- runtime endpoints,
- production credentials,
- Lovable runtime changes,
- new roles or session exceptions,
- changes to BSF-03 scope/status,
- irreversible persistence decisions.

## Work packages

### C0 - Contract frame

- scope,
- responsibility boundary,
- versioning principle,
- management domains,
- explicit non-impact rules.

Exit: documented and reviewable.

### C1 - JSON Contract 0.1 draft

- machine-readable JSON Schema,
- full-snapshot example,
- partial-source-error example,
- negative validation example,
- validation plan,
- contract changelog.

Exit: producer can start implementing against a draft.

### C2 - External-team review

- review real source fields,
- resolve naming questions,
- clarify status mappings,
- clarify leave/mail counting definitions,
- create 0.2 draft.

Exit: both teams agree on field semantics.

### C3 - Compatibility hardening

- evolution rules,
- forward/backward compatibility,
- idempotency semantics,
- payload/batching planning,
- transport options documented but not implemented.

Exit: stable 0.x candidate before BSF-05.

### C4 - Contract 1.0 in BSF-05

After BSF-04 persistence/synchronization decisions:

- align canonical identity/matching,
- confirm consumer behavior,
- freeze first binding contract,
- create implementation acceptance tests.

Exit: production contract 1.0 candidate.

### C5 - Runtime importer

Normal BSF-05 / integration work:

- authenticated transport,
- validation,
- provider adapter,
- persistence/projection,
- monitoring/audit,
- runtime tests.

## Deliverables already prepared in Draft PR #124

- `contracts/README.md`
- `contracts/v0.1-draft/README.md`
- `contracts/v0.1-draft/wallboard-management-data.schema.json`
- `contracts/v0.1-draft/VALIDATION.md`
- `contracts/v0.1-draft/CHANGELOG.md`
- positive/negative synthetic examples
- TDF Management-Wallboard concept updated to 0.6.0-draft

## Management relationship

The external contract becomes an input to BSF-05. The Management-Wallboard remains functionally located under BSF-07. Real productive source integration remains subject to Integration Readiness.
