# INT-CONTRACT-01 - Parallel Contract Workstream

Status: **PLANNED / PARALLEL CONTRACT TRACK**  
Date: 2026-09-11  
Parent idea: #123  
Contract issue: #125  
Draft documentation: #124

## Objective

Provide the external data-delivery team with an early, provider-neutral, versioned JSON contract for Management-Wallboard data without changing the active Sysing Dashboard sprint order.

In addition to the field/schema contract, C1 defines a measurable producer-quality profile: deterministic agent/collector behavior, completeness, stable source identity, reference integrity, timestamps, freshness, provenance, error handling, security and producer-side preflight tests.

## Non-impact guardrail

INT-CONTRACT-01 is allowed to produce documentation, schemas and synthetic examples only. It must not create DB/RLS/Grant/Function changes, runtime endpoints, production credentials, Lovable runtime changes, new roles/session exceptions, changes to BSF-03 scope/status or irreversible persistence decisions.

## Work packages

### C0 - Contract frame

Scope, responsibility boundary, versioning principle, management domains and explicit non-impact rules.

### C1 - JSON Contract 0.1 draft

- machine-readable JSON Schema,
- positive/negative examples,
- detailed external-team requirements,
- deterministic agent/collector rules,
- measurable producer data-quality goals,
- draft freshness SLOs,
- mapping/provenance requirements,
- retry/idempotency and error-handling rules,
- producer preflight and acceptance package.

### C2 - External-team review

Real source fields, naming, status mappings, leave/mail counting definitions, PRTG mapping, practical polling/freshness limits and mapping/provenance evidence.

C2 uses a documented decision log. Feedback is classified before any schema change is made. A new contract draft is created only when a reviewed decision actually changes or extends the machine-readable contract.

### C3 - Compatibility hardening

Evolution rules, compatibility, idempotency, payload/batching planning and final quality/freshness rules for Contract 1.0.

### C4 - Contract 1.0 in BSF-05

After BSF-04 decisions: canonical identity/matching, consumer behavior, binding contract and implementation acceptance tests.

### C5 - Runtime importer

Authenticated transport, validation, provider adapter, persistence/projection, monitoring/audit and runtime tests.

## Deliverables in Draft PR #124

- `TDF-Operatives-Management-Wallboard_0.7.1-draft.md`
- `TDF-CHECK-2026-09-11.md`
- `contracts/v0.1-draft/README.md`
- `contracts/v0.1-draft/wallboard-management-data.schema.json`
- `contracts/v0.1-draft/FIELD-CATALOG.md`
- `contracts/v0.1-draft/VALIDATION.md`
- `contracts/v0.1-draft/EXTERNAL-DATA-TEAM-REQUIREMENTS_0.1.1-draft.md`
- `contracts/v0.1-draft/CHANGELOG.md`
- positive/negative synthetic examples.

## Versioning boundary

The document and contract lifecycles are deliberately separate:

- TDF Management-Wallboard document: `0.7.1-draft`,
- producer requirements document: `0.1.1-draft`,
- machine-readable JSON contract/schema package: `0.1.0-draft`.

The predecessor document versions remain history and are not silently overwritten. The JSON schema was not bumped by the TDF/accessibility patch because its machine-readable semantics did not change. Contract 1.0 remains gated by BSF-04/BSF-05.

## C2 semantic review guardrail

The current schema is intentionally not treated as proof of all business semantics. C2 must explicitly review at least:

- completeness of all six domains for a full snapshot,
- uniqueness and completeness of `sourceStatus`,
- source-ID uniqueness and stability,
- project -> work package -> activity reference integrity,
- ownership/configuration of `scope.systemhouseId`,
- timezone/calendar semantics for leave and mailbox buckets,
- PRTG and Exchange aggregate invariants,
- achievable freshness targets.

These items are review decisions, not authorization to change runtime, persistence or security.

## Management relationship

The external contract becomes an input to BSF-05. The Management-Wallboard remains functionally located under BSF-07. Real productive source integration remains subject to Integration Readiness.
