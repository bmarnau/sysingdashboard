# Security Report

Generated: 2026-07-13T05:19:51.711Z
Strict-High: no
Release blocked: **YES**

## Zusammenfassung

- CRITICAL: **2**
- HIGH: **3**
- MEDIUM: 1
- LOW: 0
- akzeptiert (dokumentiert): 3

## Release-Regeln
- **CRITICAL** — blockiert Release: ja, Phasen: all
- **HIGH** — blockiert Release: nein, Phasen: auth-production, azure-production
- **MEDIUM** — blockiert Release: nein, benötigt dokumentierte Akzeptanz
- **LOW** — blockiert Release: nein

## Grenzen der Suite

- Keine Pen-Test-Ersatzleistung, kein Fuzzing, keine Kryptoanalyse.
- Kein produktiver Auth-Provider — Session-/Claims-Kategorien sind Findings, keine grünen Tests.
- UI-Sichtbarkeit ist kein Sicherheitsnachweis; Serverseite wird durch Middleware in einem Folge-Prompt eingezogen.
- Kein Anspruch auf Zertifizierung (ISO/IEC 27001, SOC 2, BSI o. ä.).

## Bereich: backend-rbac

### SEC-CRIT-001 · CRITICAL · Backend prüft keine Rolle oder Assignment

- **Location**: `backend/services/*, src/routes/api/*`
- **Reproduktion**: Direkter POST auf einen Endpoint mit beliebigem Body — es findet keine Rollen- oder Permission-Prüfung statt (siehe e2e/specs/security/api-direct-call.spec.ts).
- **Empfehlung**: Vor Auth-Produktivierung `requireRole`/`requirePermission`-Middleware analog zu `withCorrelation` einziehen. Verifiziert Actor gegen serverseitige Session, nicht gegen Client-Payload.
- **Blockiert Phase**: all

## Bereich: identity

### SEC-CRIT-002 · CRITICAL · Aktive Rolle wird ausschließlich im localStorage geführt

- **Location**: `src/lib/user-management.ts`
- **Reproduktion**: In der DevTools-Konsole: `localStorage.setItem('northbit-active-user', existingId)` — sofort greift die dortige Rolle in allen UI-Gates. Vitest-Beleg: manipulation.test.ts › KNOWN_GAP_SEC_CRIT_002.
- **Empfehlung**: Session-basierte Identität einführen (HTTP-only Cookie oder Bearer Token gegen echten Auth-Provider). Client-Storage bleibt UI-Cache.
- **Blockiert Phase**: auth-production

## Bereich: auth

### SEC-HIGH-AUTH-001 · HIGH · Keine Session-, Token- oder Provider-Infrastruktur

- **Location**: `-`
- **Reproduktion**: Es existieren weder Login-Endpunkte noch Session-Cookies/JWT. Damit sind sämtliche Test-Kategorien 'abgelaufene Session', 'manipulierte Claims', 'falscher Tenant', 'unpassende Gruppen' strukturell nicht umsetzbar.
- **Empfehlung**: Entra-ID (OIDC) oder Lovable Cloud Auth integrieren, Session-Layer + Middleware anlegen. Diese Suite wird die Kategorien dann tatsächlich testen.
- **Blockiert Phase**: auth-production

## Bereich: azure

### SEC-HIGH-AZURE-001 · HIGH · Azure-Sync akzeptiert einen statischen Shared-Token als einzige Auth

- **Location**: `src/routes/api/sync.ts`
- **Reproduktion**: Production erwartet Header `X-Sync-Token` gegen ein Env-Secret. Kein Actor, keine Rolle, kein Audit-Bezug zum Benutzer.
- **Empfehlung**: Shared-Token nur für Server-zu-Server-Callbacks belassen; benutzerinitiierten Sync auf `requirePermission('azure.import' | 'azure.export')` gegen echte Session umziehen.
- **Blockiert Phase**: azure-production

## Bereich: status

### SEC-HIGH-STATUS-001 · HIGH · /api/status ist ohne Auth erreichbar und listet fehlende ENV-Namen

- **Location**: `src/routes/api/status.ts`
- **Reproduktion**: GET /api/status liefert 200 mit `security.envValidation.missing` als Klartext-Env-Namen.
- **Empfehlung**: Bewusste Ausnahme dokumentieren (Health-Endpoint darf öffentlich sein) und sicherstellen, dass keine WERTE — nur Namen — ausgegeben werden. Bei Auth-Produktivierung Split in `/api/status/public` (Ping) und `/api/status/internal` (Details) erwägen.
- **Blockiert Phase**: auth-production
- **Akzeptiert**: Nur Namen, keine Werte. Bewusstes Design für Monitoring; wird bei Auth-Produktivierung neu bewertet.

## Bereich: logging

### SEC-HIGH-LOG-001 · HIGH · Logger-Redaction erfasst keine Connection-Strings mit AccountKey/SAS

- **Location**: `src/lib/logger.ts, backend/services/logger.mjs`
- **Reproduktion**: Feldnamen ohne token/secret/password (`connectionString`, `conn`) werden nicht maskiert. Nur der Wert wird gegen `JWT_RE` geprüft — Connection-Strings matchen nicht.
- **Empfehlung**: Redaction um String-Wert-Regex erweitern: `/(Server=|AccountKey=|SharedAccessSignature=)/`. Test: logging.test.ts › SEC-HIGH-LOG-001 kippt bei Fix auf `[REDACTED]`.
- **Blockiert Phase**: azure-production

### SEC-MED-CLAIMS-001 · MEDIUM · Keine Claims-Whitelist im Logger

- **Location**: `src/lib/logger.ts, backend/services/logger.mjs`
- **Reproduktion**: Ein zukünftiges `claims`-Feld würde vollständig geloggt (nur Feldnamen mit Secret-Match werden maskiert). Ohne Whitelist landen potentiell E-Mail, Vor-/Nachname, Groups im Log.
- **Empfehlung**: Whitelist einführen (`sub`, `roles`, `tid`) und vor Auth-Produktivierung aktivieren.
- **Blockiert Phase**: auth-production

## Bereich: navigation

### SEC-MED-REDIRECT-001 · MEDIUM · Kein zentraler Guard für Redirect-Ziele

- **Location**: `-`
- **Reproduktion**: Es gibt heute keinen Login-Flow und damit keinen `redirect`-Search-Param. Bei Auth-Einführung MUSS der Guard existieren, bevor der erste geschützte Redirect verwendet wird.
- **Empfehlung**: Helper `isSafeRedirectTarget(url)` bereitstellen, der nur same-origin/relative Pfade ohne `//`, `javascript:` oder Backslashes zulässt. Testen in `session-gaps` (später).
- **Blockiert Phase**: auth-production
- **Akzeptiert**: Kein Auth-Redirect existiert heute; Guard wird gemeinsam mit dem Login-Flow eingezogen.

## Bereich: docs

### SEC-LOW-DOCS-001 · LOW · Handbuch weist Grenzen der Suite explizit aus

- **Location**: `src/lib/help-documentation.ts`
- **Reproduktion**: -
- **Empfehlung**: Kapitel "Sicherheits- und RBAC-Tests" gepflegt halten, damit keine Zertifizierungs-Fehlannahmen entstehen.
- **Blockiert Phase**: none
- **Akzeptiert**: Marker-Finding, damit Doku-Pflege sichtbar im Bericht bleibt.
