# Security-Scan-Report

- **Generiert:** 2026-06-25T04:33:33.663Z
- **Dateien geprüft:** 108
- **Regeln:** 22
- **CRITICAL:** 1 · **HIGH:** 0 · **MEDIUM:** 1
- **Build-Status:** ❌ FAIL (CRITICAL/HIGH)

## CRITICAL (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `azure-account-key` | scripts/_smoke.mjs:1 | Azure Storage AccountKey-Literal im Code | `const k = "AccountKey=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH+="; export default k;` |

## HIGH

_Keine Funde._

## MEDIUM (1)

| Regel | Fundstelle | Beschreibung | Snippet |
| --- | --- | --- | --- |
| `cors-wildcard-only` | backend/server.mjs:24 | CORS-Wildcard (Access-Control-Allow-Origin: *) | `res.setHeader("Access-Control-Allow-Origin", "*");` |

---

Allowlist pro Treffer: `// security-scan-allow: <regel-id>` in derselben oder der Vorzeile.
