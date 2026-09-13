# E2E Test-Report

- Gesamt: **77**
- Passed: **77**
- Failed: **0**
- Skipped: **0**
- Erzeugt: 2026-09-13T22:28:05.207Z

| Datei | Test | Status | Dauer (ms) |
|---|---|---|---|
| `api-smoke.spec.ts` | GET /api/status liefert 200 mit application-Feld | passed | 556 |
| `api-smoke.spec.ts` | POST /api/sync mit gültigem Body liefert ok=true (DEV-Mock) | passed | 324 |
| `api-smoke.spec.ts` | POST /api/sync mit ungültigem JSON liefert strukturierten Fehler | passed | 253 |
| `ops/health.spec.ts` | status endpoint is safe & healthy | passed | 67 |
| `ops/health.spec.ts` | 500 responses do not leak stack traces | passed | 27 |
| `perf/startup.spec.ts` | dashboard startup timing | passed | 990 |
| `specs/a11y.spec.ts` | Startseite: keine kritischen axe-Verstöße | passed | 7201 |
| `specs/a11y.spec.ts` | Tastatur: Tab erreicht Hilfe-Button vor Servicemenü | passed | 2668 |
| `specs/correlation.spec.ts` | liefert neue ID, wenn Header fehlt | passed | 23 |
| `specs/correlation.spec.ts` | übernimmt gültige Client-ID | passed | 16 |
| `specs/correlation.spec.ts` | verwirft ungültige Client-ID | passed | 17 |
| `specs/correlation.spec.ts` | verwirft überlange Client-ID | passed | 24 |
| `specs/correlation.spec.ts` | parallele Requests bekommen verschiedene IDs | passed | 73 |
| `specs/correlation.spec.ts` | Fehler-Response enthält strukturierte Correlation-Felder | passed | 14 |
| `specs/dashboard.spec.ts` | Startseite zeigt globale Suche | passed | 5010 |
| `specs/dashboard.spec.ts` | Globale Suche akzeptiert Eingabe und Reset-Button erscheint | passed | 2311 |
| `specs/dashboard.spec.ts` | Persistenz: Suchbegriff überlebt Reload NICHT (Session-only Feld) | passed | 4600 |
| `specs/dashboard.spec.ts` | Benutzer-Wechsel wird angezeigt (aktiver Benutzer im Header) | passed | 3005 |
| `specs/error-states.spec.ts` | App startet, wenn localStorage-Writes werfen (Quota / privater Modus) | passed | 590 |
| `specs/error-states.spec.ts` | App startet, wenn localStorage komplett leer ist | passed | 4655 |
| `specs/error-states.spec.ts` | App startet, wenn `northbit-users` beschädigt ist | passed | 2170 |
| `specs/error-states.spec.ts` | API-Ausfall auf /api/status wird toleriert (kein weißer Screen) | passed | 2398 |
| `specs/error-states.spec.ts` | Nicht-registrierte Route liefert Not-Found-Zustand | passed | 638 |
| `specs/navigation.spec.ts` | Startseite lädt und Haupt-Landmark ist sichtbar | passed | 4385 |
| `specs/navigation.spec.ts` | Servicemenü lässt sich öffnen und wieder schließen (Escape) | passed | 2689 |
| `specs/navigation.spec.ts` | Deep-Link auf /?view=projects rendert Dashboard-Route | passed | 2430 |
| `specs/navigation.spec.ts` | Browser-Back kehrt zur vorherigen URL zurück | passed | 840 |
| `specs/rbac/backend-denial.spec.ts` | POST /api/sync ohne X-Sync-Token: entweder 401/403 oder DEV-Mock | passed | 431 |
| `specs/rbac/backend-denial.spec.ts` | GET /api/status ist öffentlich lesbar | passed | 337 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2721 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2969 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2453 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2303 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2363 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2273 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2133 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2625 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 5209 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 1764 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 1922 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 1961 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2238 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 1831 |
| `specs/responsive.spec.ts` | Responsive: desktop rendert Main-Landmark | passed | 2422 |
| `specs/responsive.spec.ts` | Responsive: tablet rendert Main-Landmark | passed | 2764 |
| `specs/responsive.spec.ts` | Responsive: mobile rendert Main-Landmark | passed | 2334 |
| `specs/responsive.spec.ts` | Responsive: kleine-hoehe rendert Main-Landmark | passed | 2319 |
| `specs/responsive.spec.ts` | Zoom 200 %: keine horizontale Scrollleiste am Body bei 1280px | passed | 412 |
| `specs/security/api-direct-call.spec.ts` | POST /api/sync ohne X-Sync-Token liefert keinen Stack, mit Correlation-ID | passed | 362 |
| `specs/security/api-direct-call.spec.ts` | POST /api/sync mit gefälschtem Token liefert 401/503 in Production, kein Leak sonst | passed | 339 |
| `specs/security/customer-responsibility-management.spec.ts` | Manager sieht systemhausweite Kundenverwaltung einschließlich unzugeordnetem Kunden | passed | 2600 |
| `specs/security/customer-responsibility-management.spec.ts` | Zuweisen und Wechseln verwendet nur die datensparsame Kandidatenliste | passed | 2709 |
| `specs/security/customer-responsibility-management.spec.ts` | Beenden macht den Kunden verwaltbar, aber unzugeordnet | passed | 2372 |
| `specs/security/customer-responsibility-management.spec.ts` | serverseitige Ablehnung bleibt datenarm | passed | 1854 |
| `specs/security/my-customers-visibility.spec.ts` | 1/2: eigener Kunde mit read bzw. write Access wird korrekt gekennzeichnet | passed | 2525 |
| `specs/security/my-customers-visibility.spec.ts` | 2: Detail mit write Access weist Schreiben als zusätzlich berechtigungspflichtig aus | passed | 1876 |
| `specs/security/my-customers-visibility.spec.ts` | 1: Detail mit read Access zeigt Projekt -> Arbeitspaket -> Tätigkeit ohne Schreibhinweis | passed | 1973 |
| `specs/security/my-customers-visibility.spec.ts` | 3: Customer Access ohne Responsibility erscheint nicht in „Meine Kunden“ | passed | 3762 |
| `specs/security/my-customers-visibility.spec.ts` | 4: Responsibility ohne Customer Access bleibt fail-closed unsichtbar | passed | 2294 |
| `specs/security/my-customers-visibility.spec.ts` | 5: direkte fremde Customer-URL (IDOR) liefert kein Detail und keine Existenzaussage | passed | 3835 |
| `specs/security/my-customers-visibility.spec.ts` | 5: syntaktisch ungültige IDs lösen keinen Serveraufruf aus | passed | 4075 |
| `specs/security/my-customers-visibility.spec.ts` | 6: Cross-Systemhouse-Zugriff wird verweigert | passed | 1736 |
| `specs/security/my-customers-visibility.spec.ts` | 7: beendete Responsibility entfernt den Kunden aus Liste und Detail | passed | 3293 |
| `specs/security/my-customers-visibility.spec.ts` | 8: inaktive oder ungültige Membership macht den Kunden unsichtbar | passed | 3219 |
| `specs/security/my-customers-visibility.spec.ts` | 11: Empty State erklärt die fehlende Zuordnung ohne Kundendaten | passed | 1731 |
| `specs/security/my-customers-visibility.spec.ts` | 12: Error State zeigt keine Kundendaten | passed | 1737 |
| `specs/security/my-customers-visibility.spec.ts` | 9: Viewer erhält über „Meine Kunden“ keine zusätzlichen Rechte | passed | 3081 |
| `specs/security/my-customers-visibility.spec.ts` | 10: vorgetäuschte Rolle im Browser-Storage erzeugt keine Serverrechte | passed | 3002 |
| `specs/security/my-customers-visibility.spec.ts` | Unangemeldeter Aufruf landet auf der Anmeldung, nicht im Kundendetail | passed | 1145 |
| `specs/security/ui-gate-tamper.spec.ts` | localStorage-Rolle vortäuschen öffnet keine Sysadmin-Sichten | passed | 462 |
| `specs/security/workpackage-category.spec.ts` | Default keine Kategorie; nur aktive Werte des eigenen Systemhauses wählbar | passed | 3456 |
| `specs/security/workpackage-category.spec.ts` | Mehrfach-Membership erzwingt explizite Systemhaus-Wahl | passed | 3003 |
| `specs/security/workpackage-category.spec.ts` | Administrator legt Kategorie systemhausbezogen an und deaktiviert statt zu löschen | passed | 3603 |
| `specs/security/workpackage-category.spec.ts` | Viewer sieht keinen Pflege-Eintrag und kein Arbeitspaket-Anlegen | passed | 4308 |
| `specs/service-menu.spec.ts` | Menü listet Kern-Einträge (Log Viewer, Systemstatus, Backup) | passed | 2571 |
| `specs/service-menu.spec.ts` | Handbuch-Button ist erreichbar (aria-label Hilfe) | passed | 2450 |
| `stability/dialog-loop.spec.ts` | dialog loop stability | passed | 4646 |
