# Security-Scan-Report

- **Generiert:** 2026-07-13T04:02:59.739Z
- **Dateien geprüft:** 179
- **Regeln:** 22
- **CRITICAL:** 1 · **HIGH:** 1 · **MEDIUM:** 0
- **Build-Status:** ❌ FAIL (CRITICAL/HIGH)

## CRITICAL (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `jwt-literal` | src/__tests__/lib/logger.test.ts:29 | JWT-Literal (eyJ…\.…\.…) | `const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";` |

## HIGH (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `azure-env-outside-server` | src/__tests__/env/test-instance.ts:93 | process.env.AZURE_* / *CONNECTION* außerhalb Server-Scope | `if (process.env.AZURE_TEST_LIVE === "1") return;` |

## MEDIUM

_Keine Funde._

---

Allowlist pro Treffer: `// security-scan-allow: <regel-id>` in derselben oder der Vorzeile.
