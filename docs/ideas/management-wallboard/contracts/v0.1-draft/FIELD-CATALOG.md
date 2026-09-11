# INT-CONTRACT-01 Field Catalog - 0.1.0-draft

## Envelope

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| schemaVersion | string | yes | contract/schema version, currently `0.1.0-draft` |
| deliveryId | UUID | yes | unique payload identifier for later idempotency controls |
| deliveryType | enum | yes | currently only `snapshot` |
| generatedAt | date-time | yes | time the producer created the payload |
| observedAt | date-time | yes | overall observation time represented by the payload |
| producer.system | string | yes | producer application/logical system name |
| producer.instance | string | yes | producer instance identifier |
| scope.systemhouseId | string | yes | provider-neutral Sysing systemhouse scope |
| completeness.snapshotComplete | boolean | yes | whether all expected domains are complete |
| completeness.missingDomains | string[] | yes | explicit list of incomplete/missing domains |
| sourceStatus | object[] | yes | per-source state and observation time |
| data | object | yes | delivered management domains |

## sourceStatus

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| source | enum | yes | `sharepoint`, `prtg`, `exchange-online` |
| state | enum | yes | `ok`, `delayed`, `stale`, `error` |
| observedAt | date-time | yes | observation/attempt time for the source |
| code | string | no | short non-sensitive producer error/status code |
| message | string | no | short non-sensitive explanation; no secrets/PII |

## Projects

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| sourceId | string | yes | stable producer-side project identifier |
| title | string | yes | project display title |
| status | string | yes | source/canonical status label; final mapping still open |
| trafficLight | enum | yes | `green`, `yellow`, `red`, `neutral` |
| lastChangedAt | date-time | yes | last relevant project change |

## Work packages

Same base fields as projects plus:

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| projectSourceId | string | yes | reference to parent project source ID |

## Activities

Same base fields as projects plus:

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| workPackageSourceId | string | yes | reference to parent work-package source ID |

## Absence aggregates

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| employeesOnLeaveThisWeek | integer >= 0 | yes | aggregate count only |
| employeesStartingLeaveNextWeek | integer >= 0 | yes | aggregate count according to final agreed definition |
| observedAt | date-time | yes | observation time |

No person names or absence reasons are allowed in this contract domain.

## Infrastructure aggregates

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| ok | integer >= 0 | yes | sensors/systems mapped to OK |
| warning | integer >= 0 | yes | warning count |
| critical | integer >= 0 | yes | critical count |
| total | integer >= 0 | yes | total represented count |
| observedAt | date-time | yes | observation time |

Final PRTG sensor/group mapping remains open for external-team review.

## Support mailbox aggregates

| Field | Type | Required | Meaning |
| --- | --- | :---: | --- |
| total | integer >= 0 | yes | total messages in agreed scope |
| today | integer >= 0 | yes | messages in agreed current-day bucket |
| yesterday | integer >= 0 | yes | messages in agreed previous-day bucket |
| older | integer >= 0 | yes | messages older than agreed previous-day boundary |
| observedAt | date-time | yes | observation time |

Not allowed: body, subject, sender, recipient, AI urgency classification or message-level records.

## Open semantic decisions for 0.2

- exact project/AP/activity status vocabulary,
- exact traffic-light mapping ownership,
- exact leave definition for next week,
- exact Exchange folder/time/count rules,
- whether infrastructure `total` must equal `ok + warning + critical` or may include neutral/paused sensors,
- whether entity arrays need customer/project grouping fields beyond current parent references,
- whether optional source system metadata is required per entity.
