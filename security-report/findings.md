# Security-Scan-Report

- **Generiert:** 2026-07-13T04:03:41.966Z
- **Dateien geprüft:** 179
- **Regeln:** 22
- **CRITICAL:** 0 · **HIGH:** 1 · **MEDIUM:** 0
- **Build-Status:** ❌ FAIL (CRITICAL/HIGH)

## CRITICAL

_Keine Funde._

## HIGH (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `azure-env-outside-server` | src/__tests__/env/test-instance.ts:93 | process.env.AZURE_* / *CONNECTION* außerhalb Server-Scope | `if (process.env.AZURE_TEST_LIVE === "1") return;` |

## MEDIUM

_Keine Funde._

---

Allowlist pro Treffer: `// security-scan-allow: <regel-id>` in derselben oder der Vorzeile.
