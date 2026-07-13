# API- und Endpoint-Matrix

_Generiert: 2026-01-01T00:00:00.000Z_

| Endpoint | Methoden | Auth | Permission | Scope | Req-Schema | Resp-Schema | Cases | Status | Offene Risiken |
| -------- | -------- | ---- | ---------- | ----- | ---------- | ----------- | ----- | ------ | -------------- |
| `/api/status` | GET | nein | — | — | no | yes | 10 | active | Keine Correlation-ID im Response — Traceability nur über Server-Log.<br>Anonymer Zugriff bewusst offen (Uptime-Checks); prüft aber Secret-Freiheit hart. |
| `/api/sync` | POST | nein | sync.trigger | — | yes | yes | 16 | active | Auth-Gate greift erst in PROD (`SYNC_TRIGGER_TOKEN`); DEV-Modus ist ungeschützt.<br>Kein Rate-Limit — parallele Requests laufen alle durch. |
| `/api/azure/connection-test` | POST | ja | azure.connection.test | global | no | no | 0 | planned | Route noch nicht implementiert; Registry-Platzhalter für ADR-0008. |
| `/api/azure/export` | POST | ja | azure.export | customer | no | no | 0 | planned | — |
| `/api/azure/import` | POST | ja | azure.import | customer | no | no | 0 | planned | — |
| `/api/rbac/assignments` | GET,POST,DELETE | ja | rbac.assignments.write | tenant | no | no | 0 | planned | Backend-Mirror für RBAC v2 (ADR-0008 Phase M5). |

## Legende
- **Cases**: Anzahl automatisch erzeugter Runner-Fälle (Grundfunktion, Payload, Security, Stabilität, Nachvollziehbarkeit).
- **Status**: `active` = im Runner geprüft, `planned` = Registry-Platzhalter (Runner → todo), `archived` = außer Betrieb.
- **Offene Risiken**: bekannte Lücken (z. B. fehlende Correlation-ID). Nicht Runner-blockierend.
