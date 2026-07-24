# Security Report

Generated: 2026-07-24T05:45:53.045Z
Strict-High: no
Release blocked: **no**

## Zusammenfassung

- CRITICAL: **0**
- HIGH: **1**
- MEDIUM: 1
- LOW: 0
- akzeptiert (dokumentiert): 7

## Release-Regeln
- **CRITICAL** — blockiert Release: ja, Phasen: all
- **HIGH** — blockiert Release: nein, Phasen: auth-production, azure-production
- **MEDIUM** — blockiert Release: nein, benötigt dokumentierte Akzeptanz
- **LOW** — blockiert Release: nein

## Grenzen der Suite

- Keine Pen-Test-Ersatzleistung, kein Fuzzing, keine Kryptoanalyse.
- Auth ist aktiv; Browser-/E2E-Sign-in wird nur ausgeführt, wenn eine Test-Session bereitsteht.
- UI-Sichtbarkeit ist kein Sicherheitsnachweis; schreibende Server-Routen müssen Session und Permission serverseitig prüfen.
- Kein Anspruch auf Zertifizierung (ISO/IEC 27001, SOC 2, BSI o. ä.).

## Bereich: backend-rbac

### SEC-CRIT-001 · CRITICAL · Backend prüft keine Rolle oder Assignment

- **Location**: `backend/services/*, src/routes/api/*`
- **Reproduktion**: Historisch: direkter POST auf einen Endpoint ohne Auth. Seit v1.39.0 erzwingt `/api/sync` `Authorization: Bearer <supabase-jwt>` UND `public.has_permission(user, 'azure.import'|'azure.export')`.
- **Empfehlung**: Weitere Endpoints beim Anlegen sofort über `requireSupabaseAuth` + `has_permission` schützen. Muster: siehe `src/routes/api/sync.ts` (Prompt 2A.11).
- **Blockiert Phase**: all
- **Akzeptiert**: v1.39.0: echte Auth aktiv (Lovable Cloud E-Mail/Passwort). Endpoint prüft Session + Permission via DB-Funktion `has_permission`. Guards: e2e/specs/security/api-direct-call.spec.ts (401 ohne Token), src/__tests__/security/rbac-endpoints.test.ts (Matrix-Invarianten). Marker bleibt für Report-Historie.

## Bereich: identity

### SEC-CRIT-002 · CRITICAL · Aktive Rolle wird ausschließlich im localStorage geführt

- **Location**: `src/hooks/useCurrentUser.ts, src/lib/user-management.ts`
- **Reproduktion**: Historisch: `localStorage.setItem('northbit-active-user', existingId)` verlieh sofort Sysadmin-Rechte. Seit v1.39.0 leitet `useCurrentUser()` Rolle ausschließlich aus `public.user_roles` gegen `auth.uid()` (RLS-geschützt) ab; localStorage-Manipulation hat keinen Effekt.
- **Empfehlung**: Bei künftigen UI-Gates strikt `useCurrentUser()` verwenden, niemals direkt gegen localStorage prüfen.
- **Blockiert Phase**: auth-production
- **Akzeptiert**: v1.39.0: session-basierte Identität aktiv. Guard: src/__tests__/security/manipulation.test.tsx › should_ignoreForgedLocalStorage_when_deriveRoleFromSession.

## Bereich: auth

### SEC-HIGH-AUTH-001 · HIGH · Historisch: Keine Session-, Token- oder Provider-Infrastruktur

- **Location**: `-`
- **Reproduktion**: Historischer Befund vor v1.39.0. Aktuell existieren Auth-Seiten, Auth-Session, geschützte Dashboard-Route und serverseitige Bearer-Validierung auf /api/sync.
- **Empfehlung**: Echte Sign-in-E2E-Tests nur mit bereitgestellter Test-Session ausführen; ohne Test-Session authentifizierte Pfade als UNVERIFIED dokumentieren, nicht als fehlende Infrastruktur.
- **Blockiert Phase**: auth-production
- **Akzeptiert**: v1.39.0/v1.41.x: Auth-Infrastruktur ist vorhanden. Verbleibende Grenze ist Test-Session-Verfügbarkeit, kein Critical/High Architektur-Gap.

## Bereich: azure

### SEC-HIGH-AZURE-001 · HIGH · Historisch: Azure-Sync akzeptierte einen statischen Shared-Token als einzige Auth

- **Location**: `src/routes/api/sync.ts`
- **Reproduktion**: Historischer Befund. Der aktuelle Endpoint liest `Authorization: Bearer ...`, validiert `auth.getUser()` und prüft `has_permission(user, 'azure.import'|'azure.export')` vor Sync-Ausführung.
- **Empfehlung**: Dieses Muster für alle künftigen benutzerinitiierten Azure-Aktionen beibehalten; keinen X-Sync-Token-Fallback reintroduzieren.
- **Blockiert Phase**: azure-production
- **Akzeptiert**: v1.41.3: Shared-Token-Pfad entfernt; Actor stammt aus validierter Session, Permission aus DB-RPC.

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
