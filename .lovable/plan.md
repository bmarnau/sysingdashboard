
# Prompt 2A.5 – Sicherheits-, RBAC- und Auth-Test-Suite

## Realitätsabgleich vorab (wichtig)

- **Kein echter Auth-Layer im Repo**: Aktive Rolle wird per `localStorage`
  gesetzt (`src/lib/user-management.ts`). Es gibt keine Sessions, keine
  Tokens, keinen Tenant, keine Claims, keine Gruppen. Die Entra-Quelle ist
  ein Assignment-Feld, kein OIDC-Client.
- **Backend-RBAC fehlt**: `/api/status` ist öffentlich, `/api/sync` prüft
  nur einen statischen `X-Sync-Token`. Keine Rolle/Assignment wird
  serverseitig ausgewertet.
- Konsequenz: viele Prompt-Punkte („abgelaufene Session", „manipulierte
  Claims") sind **strukturell nicht testbar**, bis Auth existiert. Die
  Suite meldet das ehrlich als **Release-Blocker-Findings**, statt grüne
  Tests vorzutäuschen. Das ist die Kernaufgabe des Berichts.

## Ziel

Deterministische, additive Testsuite `v1.33.0`, die den Ist-Zustand
ehrlich messbar macht und die Auth-/Azure-Produktivierung an klare
Bedingungen knüpft.

## Neue/geänderte Dateien

```text
src/__tests__/security/
  rbac-v1/
    permission-matrix.test.ts       FE↔BE-Parität aus permissions.ts vs rbac.mjs
    forbidden-permissions.test.ts   roles.manage, azure.database.build nur SysAdmin
    direct-role-compare.test.ts     rg-Scan: `role === "..."` außerhalb src/lib/rbac
    lockout.test.ts                 letzter SysAdmin / letzter Admin nicht löschbar/degradierbar
    forbidden-role-changes.test.ts  Non-SysAdmin kann keinen SysAdmin erzeugen/befördern
  rbac-v2/
    scope-canonicalization.test.ts  parseScope/serialize/roundtrip/scopeIncludes
    assignments.test.ts             expiresAt<now denied, revokedAt denied, Duplikate,
                                    Multi-Assignment, source local/entra
    sysadmin-protection.test.ts     v2-Pfad kann Lockout nicht umgehen
    scope-fixtures.test.ts          customer/*, azure.subscription/*, azure.rg/*
  manipulation/
    localstorage-tamper.test.ts     Rolle im Storage ändern → PermissionGate bleibt zu
    assignment-injection.test.ts    JSON-Import mit gefälschten Assignments → Zod-Reject
    scope-payload-tamper.test.ts    Client sendet scope/permission → Backend ignoriert
    ui-gate-bypass.test.ts          React-Render mit manipuliertem Store → keine Aktion
    expired-revoked-replay.test.ts  wiederverwendete abgelaufene/widerrufene Assignments
  auth/
    api-anonymous.test.ts           /api/sync ohne Token → 401 + code+correlationId
    api-invalid-token.test.ts       falscher Token → 401
    session-gaps.test.ts            skipped-mit-Grund: expired/invalid/tenant/claims/groups
                                    (jeder Skip erzeugt Finding in report.json)
    redirect-safety.test.ts         Redirect-Ziel muss same-origin/relative sein
    token-storage-scan.test.ts      rg-Scan localStorage/sessionStorage vs token/jwt/bearer
  logging/
    blocked-access-logged.test.ts   Logger-Spy: actorId + correlationId bei Deny
    no-secret-leak.test.ts          Logger-Redaction: token, connectionString, password
    claims-not-full.test.ts         Redaction für claims.* (Whitelist statt Blacklist)

e2e/specs/security/
  ui-gate-tamper.spec.ts            aktive Rolle in localStorage patchen, Servicemenü prüfen
  api-direct-call.spec.ts           /api/sync direkt aus Browser ohne Token
  logout-and-back.spec.ts           Logout → Back-Button darf keinen geschützten Zustand zeigen

scripts/security/
  release-rules.mjs                 Severity→Gate-Regeln (Critical/High/Medium/Low)
  security-report.mjs               liest Vitest-JSON + statische Findings → Markdown
  static-findings.json              vom Team gepflegte Fundstellen (v1.33.0-Startset)

test-report/security-report.md      Output (in .gitignore, CI-Artefakt)

CHANGELOG.md                        v1.33.0-Eintrag (Single Source of Truth)
src/lib/help-documentation.ts       Kapitel „Sicherheits- und RBAC-Tests", DOC 1.12.0
docs/adr/ADR-0013-security-release-gate.md
.github/workflows/ci.yml            neuer Job `security` mit Gate-Step
package.json                        Scripts: test:security, test:security:report,
                                    security:gate, test:e2e:security
```

## Release-Regeln (in `release-rules.mjs`)

| Severity | Gate |
|---|---|
| **Critical** | blockiert JEDE weitere Phase; CI fail |
| **High** | blockiert Auth- und Azure-Produktivierung; CI warn+Artefakt |
| **Medium** | benötigt dokumentierte Bewertung in `static-findings.json` (`accepted: true` + Begründung) |
| **Low** | geplant, kein Gate |

`security:gate` liest `security-report.md`-JSON-Kopf, zählt offene
Critical/High. Critical → `exit 1`. High außerhalb der Whitelist → Warn.

## Berichts-Format (`security-report.md`)

Pro Finding: **ID · Severity · Titel · Route/Funktion · Reproduktion
(3-Zeilen-Snippet oder Testname) · Empfohlene Behebung · Release-Blocker?**.
Sortiert nach Severity, gruppiert nach Bereich (RBAC v1/v2, Manipulation,
Auth, Logging).

## Startset an ehrlichen Findings (statisch, v1.33.0)

- **CRITICAL** — Backend prüft keine Rolle/Assignment; `/api/sync` nur per
  Shared Token. Empfehlung: `requireRole`/`requirePermission`-Middleware
  vor Auth-Produktivierung. → blockiert alle Folgeprompts.
- **CRITICAL** — Aktive Rolle wird ausschließlich im `localStorage`
  gehalten; kein serverseitiger Gegencheck. → blockiert Auth-Prod.
- **HIGH** — Keine Session/Token-Infrastruktur (Auth-Kapitel-Tests sind
  strukturell N/A). → blockiert Auth-Prod bis Auth eingezogen.
- **HIGH** — `/api/status` liefert `security.envValidation.missing` als
  Klartext-Env-Namen; sinnvoll, aber muss unauthentisiert bleiben dürfen
  → als bewusste Ausnahme dokumentieren.
- **MEDIUM** — Kein Redaction-Test für Logger-Ausgaben (wird durch neue
  Suite abgedeckt, Finding schließt sich bei erstem grünen Lauf).
- **MEDIUM** — Redirect-Search-Param wird nicht zentral validiert
  (`redirect-safety.test.ts` wird aktuell rot → Fix in Folge-Prompt).

Diese Liste ist die Grundlage der ersten `security-report.md`. Sie
verschwindet nicht mit einem grünen Vitest-Lauf.

## Manipulationsstrategie (technisch)

- **localStorage-Tamper (Vitest)**: `test-instance`-Storage, `setActiveUser`
  auf gefälschte ID, `PermissionGate` per Testing-Library rendern und
  Sichtbarkeit assertieren. Zusätzlich e2e mit `page.evaluate`, gleichzeitig
  Backend-Aufruf → 401/403.
- **Assignment-Injection**: JSON-Import-Pipeline mit manipuliertem
  Snapshot (`source:"entra"`, `expiresAt`-Fake) → Zod-Schema muss ablehnen.
- **Payload-Tamper**: POST an `/api/sync` mit `{ role, permission, scope }`
  im Body → Feld muss ignoriert werden (Test dokumentiert bis
  Backend-RBAC-Middleware existiert, dass Payload egal ist, weil kein
  RBAC-Check greift → Finding CRITICAL wie oben).
- **Replay**: Assignments mit `expiresAt < now`, `revokedAt != null` durch
  `evaluateAccessV2` → `false`.

## Logging-Tests

- Logger-Spy im Test-Setup registriert alle `warn`/`error` und asserted:
  - Bei Deny: `event: "access.denied"`, `actorId`, `correlationId` gesetzt.
  - Kein Feld matcht `/eyJ[A-Za-z0-9._-]{10,}/`, `/(password|pwd|secret)=/i`,
    `/(Server=|AccountKey=|SharedAccessSignature=)/`.
- Claims-Redaction: der Logger reicht künftig nur eine Whitelist
  (`sub`, `roles`, `tid`) durch; Test prüft Blacklist-Felder werden
  entfernt. Falls Redaction fehlt → Finding HIGH, kein grüner Test.

## Handbuch-Kapitel „Sicherheits- und RBAC-Tests"

- Abdeckung: was wird tatsächlich getestet.
- **Grenzen** (explizit): keine Pen-Test-Ersatzleistung, kein Fuzzing,
  keine Zeitangriffs- oder Kryptoanalyse, keine Prüfung produktiver
  Auth-Provider (nicht vorhanden), Rollen-Manipulation im Client zeigt
  keine Backend-Sicherheit.
- **Keine Zertifizierungsbehauptung**: „ISO/IEC 27001", „SOC 2", „BSI"
  o. ä. dürfen nicht abgeleitet werden. Suite ist internes
  Regressions-/Design-Testing.
- Verweis auf `docs/adr/ADR-0013` und Release-Gate.

## Bewusste Nicht-Ziele

- Keine echte Session-/OIDC-Implementierung in diesem Prompt.
- Kein Umbau der Auth-Provider-Wahl (bleibt späterem Prompt vorbehalten).
- Keine Änderung an bestehenden Endpoints (nur additive Tests + Berichte).

## Risiken

1. Report-Startset entwertet spätere Auth-Arbeit nicht — er dokumentiert
   Blocker, die diese Arbeit erst rechtfertigen.
2. Vitest-JSON-Reporter muss aktiviert werden (`--reporter=json`), sonst
   findet `security-report.mjs` keine Rohdaten. Ich baue Fallback auf
   statische Findings ein, damit CI nicht am Reporter scheitert.
3. `direct-role-compare`-Scan kann False Positives erzeugen; ich pflege
   eine minimale Whitelist in der Testdatei mit Begründung pro Eintrag.
