# INT-CONTRACT-01 Validation Plan

Status: draft planning only.

## Goal

The external producer and the Sysing Dashboard consumer must be able to validate contract compatibility independently.

## C1 validation matrix

| ID  | Case                                                    | Expected result         |
| --- | ------------------------------------------------------- | ----------------------- |
| V01 | schema JSON parses                                      | PASS                    |
| V02 | valid full snapshot validates                           | PASS                    |
| V03 | valid partial-source-error validates                    | PASS                    |
| V04 | missing `schemaVersion` example validates               | FAIL                    |
| V05 | `snapshotComplete=true` with non-empty `missingDomains` | FAIL                    |
| V06 | `snapshotComplete=false` with empty `missingDomains`    | FAIL                    |
| V07 | unknown source state                                    | FAIL                    |
| V08 | negative count                                          | FAIL                    |
| V09 | invalid UUID deliveryId                                 | FAIL                    |
| V10 | unexpected top-level field                              | FAIL                    |
| V11 | payload contains no secret test values                  | PASS by review          |
| V12 | support mailbox contains no content metadata            | PASS by contract review |
| V13 | absence aggregate contains no names/reasons             | PASS by contract review |
| V14 | no internal DB table names in payload schema            | PASS by contract review |

## Future runtime tests

Not part of C1, but required before production:

- authentication/authorization of producer transport,
- systemhouse scope mismatch rejection,
- duplicate deliveryId/idempotency behavior,
- stale delivery policy,
- payload size and batching limits,
- retry/acknowledgement behavior,
- transactional persist/project behavior,
- audit trail,
- monitoring/alerting,
- rollback/replay behavior,
- RBAC/RLS regression,
- backup/restore impact.

These tests belong to later BSF-05 / Integration Readiness work and are not silently pulled into the current sprint.
