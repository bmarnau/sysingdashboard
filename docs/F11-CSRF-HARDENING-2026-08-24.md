# F-11 / MVP — TanStack Server Function CSRF Hardening

Stand: 2026-08-24  
Finding: Issue #57  
Status: **TECHNISCHE ABNAHME AUSSTEHEND**

## 1. Befund

Ein aktueller Playwright-Lauf meldete während der Verarbeitung geschützter TanStack-Serverfunktionen ausdrücklich, dass die Server Functions nicht durch die TanStack-CSRF-Middleware geschützt sind.

`src/start.ts` definiert eine eigene `createStart()`-Konfiguration. Dadurch wird der von TanStack sonst automatisch installierte Server-Function-CSRF-Schutz nicht automatisch ergänzt.

## 2. Bestehende Schutzschichten

Die privilegierten Admin-Serverfunktionen besitzen bereits mehrere serverseitige Schutzschichten:

- Supabase-Bearer-Authentifizierung,
- `requireSupabaseAuth`,
- serverseitige Berechtigungsprüfung wie `users.manage`,
- RBAC/RLS-konforme Benutzerkontextprüfung,
- privilegierter Providerclient erst nach bestandener Autorisierung.

Diese Schutzschichten bleiben unverändert.

Der CSRF-Fix ergänzt Defense-in-Depth und die vom Framework vorgesehene Same-Origin-Prüfung für Server-Function-RPCs.

## 3. Minimalfix

`src/start.ts` registriert zusätzlich:

```text
createCsrfMiddleware
  -> filter: handlerType === serverFn
  -> globale requestMiddleware
```

Bewusst **nicht** gesetzt werden:

- `allowRequestsWithoutOriginCheck`,
- eine Unterdrückung der TanStack-CSRF-Warnung,
- ein hart codierter Lovable- oder anderer Provider-Origin.

Damit bleibt die Prüfung deployment- und providerneutral und vergleicht die Browser-Origin mit der eingehenden Request-Origin nach dem Frameworkstandard.

## 4. Regression

`src/__tests__/security/serverfn-csrf.test.ts` schreibt als Security-Vertrag fest:

- `createCsrfMiddleware` ist vorhanden,
- der Filter gilt explizit für `serverFn`,
- `csrfMiddleware` ist in `requestMiddleware` registriert,
- die Origin-Prüfung wird nicht über `allowRequestsWithoutOriginCheck` gelockert,
- die Warnung wird nicht nur unterdrückt.

## 5. Abgrenzung

Nicht geändert werden:

- Supabase-Konfiguration,
- Auth-Vertrag und Bearer-Token-Transport,
- RBAC/RLS,
- Rollen oder Berechtigungen,
- Datenbank und Migrationen,
- Fachlogik,
- Lovable-spezifische Runtime-Konfiguration.

## 6. Abnahmekriterien

Vor Merge müssen auf demselben finalen Head mindestens bestanden sein:

- Security Workflow,
- Prettier / ESLint / TypeScript,
- Security-/RBAC-Suite inklusive neuer Regression,
- Unit & Components,
- Backend,
- API,
- Import/Export,
- Backup/Restore,
- Production Build,
- Playwright E2E,
- Accessibility,
- Technical Debt,
- Technical Report & Quality Gate.

Zusätzlich wird der aktuelle Playwright-Log geprüft: Die bisherige TanStack-Meldung, Server Functions seien nicht durch CSRF-Middleware geschützt, darf nicht mehr auftreten.

## 7. Releasewirkung

Das Finding wird vor der formalen MVP-Baseline geschlossen. Der Fix erweitert keine Fachfunktion, sondern härtet einen bestehenden privilegierten Server-Function-Pfad entsprechend dem Frameworkvertrag ab.
