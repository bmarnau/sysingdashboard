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
- explicit non-impact rules for BSF-03/BSF-04/BSF-05.

Not decided in this version:

- transport protocol,
- producer authentication,
- batching/size limits,
- acknowledgement/retry protocol,
- delta semantics,
- final source field mappings,
- persistence model,
- production runtime endpoint.

Status remains **DRAFT / CONTRACT PLANNING ONLY**.
