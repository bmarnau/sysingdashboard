# F-11 / MVP — TanStack Server Function CSRF Hardening

Stand: 2026-08-24  
Finding: Issue #57  
Status: **TECHNISCH PASS — FINAL-HEAD-RETEST LÄUFT**

## 1. Befund

Ein vorheriger Playwright-Lauf meldete während der Verarbeitung geschützter TanStack-Serverfunktionen ausdrücklich, dass die Server Functions nicht durch die TanStack-CSRF-Middleware geschützt sind.

`src/start.ts` definiert eine eigene `createStart()`-Konfiguration. Dadurch wurde der von TanStack sonst automatisch installierte Server-Function-CSRF-Schutz nicht automatisch ergänzt.

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

## 6. Technische Abnahme — erster vollständiger Fix-Head

Fix-Head vor Evidenzcommit: `b261b8e816e2f7666e65de005ce808a12ed18d15`

### Security

Security #379 / Run `32736984940`: **PASS**

- Custom Scanner: PASS
- Gitleaks: PASS

### CI

CI #388 / Run `32736985111`: **PASS**

- Setup: PASS
- Static: PASS
  - Prettier: PASS
  - ESLint: PASS
  - TypeScript: PASS
  - RBAC matrix: PASS
  - No-console guard: PASS
  - Docs sync: PASS
  - Project manifest: PASS
- Unit & Components + Coverage: PASS
- Backend: PASS
- API inklusive Discovery/Smoke/Functional: PASS
- RBAC & Security: PASS
- Import/Export: PASS
- Backup/Restore: PASS
- Production Build + Bundle Report: PASS
- Playwright E2E: **54/54 PASS**
- Accessibility: PASS
- Technical Debt: PASS
- Technical Report: PASS
- Quality Gate: PASS

### CSRF-Runtimenachweis

Der vollständige Playwright-Job `11 · E2E (Playwright)` wurde nach Abschluss auf die ursprüngliche Frameworkwarnung geprüft.

Ergebnis: **PASS**

Die vorherige TanStack-Meldung, Server Functions seien nicht durch die CSRF-Middleware geschützt, kommt im aktuellen E2E-Log **nicht mehr vor**.

Damit ist nachgewiesen, dass nicht nur der Quelltextvertrag erfüllt wird, sondern TanStack den Server-Function-CSRF-Schutz im tatsächlichen Testserver akzeptiert.

### Nicht blockierende Resthinweise

Im E2E-Log bleiben zwei getrennte Hinweisarten sichtbar, die den CSRF-Fix nicht infrage stellen:

- optionale Azure-ENV-Hinweise im Dev-Testkontext,
- TanStack-Deprecation für `createServerFn().inputValidator()`; separat als Post-MVP-Wartung in Issue #59 dokumentiert.

## 7. Final-Head-Regel

Dieser Evidenzcommit verändert nur die Dokumentation, erzeugt aber einen neuen PR-Head. Deshalb wird vor Merge die vollständige CI-/Security-Kette auf genau diesem finalen Head erneut ausgeführt.

Merge-Freigabe erst wenn auf dem finalen Head erneut bestanden sind:

- Security Workflow,
- vollständige CI inklusive Static, Unit/Components, Backend, API, RBAC/Security, Import/Export und Backup/Restore,
- Production Build,
- Playwright E2E,
- Accessibility,
- Technical Debt,
- Technical Report & Quality Gate.

## 8. Releasewirkung

Nach erfolgreichem Final-Head-Retest kann Issue #57 mit dem Merge-Nachweis geschlossen werden.

Der Fix erweitert keine Fachfunktion, sondern härtet einen bestehenden privilegierten Server-Function-Pfad entsprechend dem Frameworkvertrag ab. Er ist damit ein Release-Security-Hardening vor der formalen MVP-Baseline.
