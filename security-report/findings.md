# Security-Scan-Report

- **Generiert:** 2026-08-01T03:28:09.216Z
- **Dateien geprüft:** 285
- **Regeln:** 22
- **CRITICAL:** 1 · **HIGH:** 0 · **MEDIUM:** 0
- **Build-Status:** ❌ FAIL (CRITICAL/HIGH)

## CRITICAL (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `azure-storage-conn` | src/__tests__/lib/logger.test.ts:38 | Azure Storage Connection-String | `"DefaultEndpointsProtocol=https;AccountName=demo;AccountKey=aGVsbG9zZWNyZXQ=;EndpointSuffix=core.windows.net";` |

## HIGH

_Keine Funde._

## MEDIUM

_Keine Funde._

---

Allowlist pro Treffer: `// security-scan-allow: <regel-id>` in derselben oder der Vorzeile.
