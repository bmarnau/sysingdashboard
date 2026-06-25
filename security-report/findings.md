# Security-Scan-Report

- **Generiert:** 2026-06-25T04:34:08.987Z
- **Dateien geprüft:** 107
- **Regeln:** 22
- **CRITICAL:** 0 · **HIGH:** 0 · **MEDIUM:** 1
- **Build-Status:** ✅ PASS

## CRITICAL

_Keine Funde._

## HIGH

_Keine Funde._

## MEDIUM (1)

| Regel                | Fundstelle            | Beschreibung                                    | Snippet                                              |
| -------------------- | --------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `cors-wildcard-only` | backend/server.mjs:24 | CORS-Wildcard (Access-Control-Allow-Origin: \*) | `res.setHeader("Access-Control-Allow-Origin", "*");` |

---

Allowlist pro Treffer: `// security-scan-allow: <regel-id>` in derselben oder der Vorzeile.
