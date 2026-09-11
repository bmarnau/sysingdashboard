# INT-CONTRACT-01 - External Management Data Contract

Status: **DRAFT / CONTRACT PLANNING ONLY**  
Contract version: **0.1.0-draft**  
Date: **2026-09-11**  
Related: Issue #123, Issue #125, Draft PR #124

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
- stable source identifiers,
- correct timestamps and source status,
- data quality on the producer side,
- test deliveries for contract acceptance.

Detailed producer and quality requirements are defined in `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`.

### Sysing Dashboard team

Responsible for:

- contract ownership and versioning,
- JSON Schema validation,
- scope validation,
- provider adapter / normalization boundary on the consumer side,
- later persistence/projection decisions,
- security/RBAC/RLS enforcement,
- freshness and partial-failure handling,
- Management-Wallboard presentation,
- runtime monitoring and audit as defined in later implementation sprints.

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
| C2 | after external-team feedback | field review and 0.2 draft |
| C3 | before BSF-05 | compatibility, evolution and validation rules stabilized |
| C4 | BSF-05 after BSF-04 decisions | contract 1.0 candidate / binding interface |
| C5 | BSF-05 or later | productive importer, monitoring and persistence |

The strategic sprint order is not changed by this track.

## 6. Management domains in 0.1 draft

The draft covers six domains:

1. projects,
2. work packages,
3. activities,
4. absence/leave aggregates,
5. infrastructure/PRTG aggregates,
6. support mailbox aggregates.

Projects, work packages and activities remain separate domains. Leave is aggregated. Support mailbox data contains counts/age buckets only and no message content, subject, sender or recipient.

## 7. Envelope rules

Every delivery contains at least:

- `schemaVersion`,
- `deliveryId`,
- `deliveryType`,
- `generatedAt`,
- `observedAt`,
- `producer`,
- `scope.systemhouseId`,
- `completeness.snapshotComplete`,
- `sourceStatus`,
- `data`.

All timestamps use RFC 3339 / ISO 8601 with timezone offset or `Z`.

`deliveryId` is unique per delivered payload and is intended to support future idempotency controls.

## 8. Snapshot semantics

Draft 0.1 starts with snapshot delivery as the primary model.

- `deliveryType = "snapshot"`
- `snapshotComplete = true` means all domains expected for that delivery are represented.
- `snapshotComplete = false` means one or more domains are missing, stale or unavailable.
- Missing data in an incomplete snapshot MUST NOT be interpreted as deletion.
- `missingDomains` explicitly lists domains that are not complete.

Delta delivery is deliberately reserved for later contract versions and must not be assumed by the producer.

## 9. Freshness and partial source failure

Each source has a `sourceStatus` entry with:

- source name,
- state (`ok`, `delayed`, `stale`, `error`),
- observation time,
- optional message/code that contains no secret or personal content.

A source failure must not invalidate unrelated domains. The consumer can therefore display healthy management areas while marking one source as unavailable/stale.

The producer-side freshness targets and data-quality SLOs are documented in `EXTERNAL-DATA-TEAM-REQUIREMENTS.md` and remain draft values until joint review.

## 10. Identity rules

For entity arrays, producer-side source IDs must be stable within the source system.

Draft 0.1 uses:

- `sourceId` for the delivered object,
- relationship references such as `projectSourceId` and `workPackageSourceId`,
- `scope.systemhouseId` as the provider-neutral systemhouse boundary.

No external team must know internal database primary keys. Final identity/matching rules remain part of BSF-05 and must remain compatible with BSF-04 decisions.

## 11. Security and privacy rules

- no passwords, access tokens, API keys or service-role keys in payloads,
- no e-mail body, subject, sender or recipient in support-mailbox data,
- no names or reasons in wallboard absence aggregates,
- no internal DB credentials or table names,
- producer error messages must not leak secrets,
- scope information is mandatory and later validated server-side,
- JSON validation is not a replacement for RBAC/RLS.

## 12. Versioning

`schemaVersion` follows semantic versioning once the contract reaches 1.0.

During draft development:

- `0.1.x` - first shared field contract,
- `0.2.x` - external-team feedback / field refinement,
- `0.x` - compatibility hardening,
- `1.0.0` - first binding production contract after BSF-04/BSF-05 review.

Each published schema version is immutable. Changes create a new versioned schema file/package.

The TDF Management document has its own document-version lifecycle and must not be confused with the JSON contract version.

## 13. Files in this package

- `wallboard-management-data.schema.json` - machine-readable draft schema,
- `EXTERNAL-DATA-TEAM-REQUIREMENTS.md` - detailed producer, agent/collector and quality requirements,
- `FIELD-CATALOG.md` - field semantics and domain notes,
- `VALIDATION.md` - validation approach and negative cases,
- `examples/valid-full-snapshot.json` - complete synthetic delivery,
- `examples/valid-partial-source-error.json` - partial delivery with one source unavailable,
- `examples/invalid-missing-schema-version.json` - intentionally invalid negative example,
- `CHANGELOG.md` - contract history.

All examples are synthetic and contain no production data.

## 14. Acceptance criteria for C1

C1 is complete when:

- scope/non-impact rules are documented,
- JSON Schema is syntactically valid,
- both valid examples conform to the schema,
- the invalid example is rejected,
- detailed producer quality requirements are reviewable,
- no production secret or personal data is present,
- the package does not reference internal DB tables as external contract fields,
- Issue #123 and the TDF management concept point to the contract package,
- no existing sprint status is changed.

## 15. Open decisions

The following remain deliberately open until later stages:

- transport: file, HTTP endpoint, object storage, queue or other mechanism,
- authentication between producer and consumer,
- maximum payload size and batching,
- retry/acknowledgement protocol,
- delta semantics,
- final status/traffic-light mapping,
- final SharePoint field mapping,
- exact leave definition for "next week",
- exact Exchange counting rules,
- final freshness SLOs,
- persistence and conflict strategy,
- retention and audit periods.

These are not blockers for C0/C1 contract drafting.
