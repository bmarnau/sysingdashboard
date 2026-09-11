# INT-CONTRACT-01 Changelog

## 0.1.0-draft - 2026-09-11

Initial contract-planning package for external delivery of Management-Wallboard data.

Added:

- provider-neutral JSON envelope,
- mandatory `schemaVersion` and unique `deliveryId`,
- snapshot-first delivery model,
- `snapshotComplete` / `missingDomains` semantics,
- producer and systemhouse scope metadata,
- per-source status/freshness information,
- separate project, work-package and activity domains,
- aggregated absence metrics without names/reasons,
- aggregated PRTG infrastructure metrics,
- Exchange Online mailbox counts without message content,
- synthetic full-snapshot example,
- synthetic partial-source-failure example,
- negative example missing `schemaVersion`,
- explicit non-impact rules for BSF-03/BSF-04/BSF-05,
- detailed external-data-team requirements in `EXTERNAL-DATA-TEAM-REQUIREMENTS.md`,
- deterministic agent/collector rules,
- producer-side quality goals for completeness, correctness, identity, references and timestamps,
- draft freshness SLOs per management domain,
- retry/idempotency rules,
- mapping/provenance requirements,
- producer-side error handling, logging and security requirements,
- external-team preflight tests and acceptance package.

Versioning note:

- the Management-Wallboard TDF document currently remains `0.6.0-draft`,
- the JSON contract package and its producer requirements are versioned independently as `0.1.0-draft`,
- the draft package has not been declared externally binding or production-ready,
- no released production contract has been overwritten.

Not decided in this version:

- transport protocol,
- producer authentication,
- batching/size limits,
- acknowledgement protocol,
- delta semantics,
- final source field mappings,
- final freshness SLOs,
- persistence model,
- production runtime endpoint.

Status remains **DRAFT / CONTRACT PLANNING ONLY**.
