# E2E Test-Report

- Gesamt: **77**
- Passed: **77**
- Failed: **0**
- Skipped: **0**
- Erzeugt: 2026-09-13T22:34:55.114Z

| Datei | Test | Status | Dauer (ms) |
|---|---|---|---|
| `api-smoke.spec.ts` | GET /api/status liefert 200 mit application-Feld | passed | 734 |
| `api-smoke.spec.ts` | POST /api/sync mit gültigem Body liefert ok=true (DEV-Mock) | passed | 638 |
| `api-smoke.spec.ts` | POST /api/sync mit ungültigem JSON liefert strukturierten Fehler | passed | 404 |
| `ops/health.spec.ts` | status endpoint is safe & healthy | passed | 53 |
| `ops/health.spec.ts` | 500 responses do not leak stack traces | passed | 17 |
| `perf/startup.spec.ts` | dashboard startup timing | passed | 1172 |
| `specs/a11y.spec.ts` | Startseite: keine kritischen axe-Verstöße | passed | 10760 |
| `specs/a11y.spec.ts` | Tastatur: Tab erreicht Hilfe-Button vor Servicemenü | passed | 5367 |
| `specs/correlation.spec.ts` | liefert neue ID, wenn Header fehlt | passed | 59 |
| `specs/correlation.spec.ts` | übernimmt gültige Client-ID | passed | 17 |
| `specs/correlation.spec.ts` | verwirft ungültige Client-ID | passed | 16 |
| `specs/correlation.spec.ts` | verwirft überlange Client-ID | passed | 14 |
| `specs/correlation.spec.ts` | parallele Requests bekommen verschiedene IDs | passed | 64 |
| `specs/correlation.spec.ts` | Fehler-Response enthält strukturierte Correlation-Felder | passed | 16 |
| `specs/dashboard.spec.ts` | Startseite zeigt globale Suche | passed | 8594 |
| `specs/dashboard.spec.ts` | Globale Suche akzeptiert Eingabe und Reset-Button erscheint | passed | 4503 |
| `specs/dashboard.spec.ts` | Persistenz: Suchbegriff überlebt Reload NICHT (Session-only Feld) | passed | 7637 |
| `specs/dashboard.spec.ts` | Benutzer-Wechsel wird angezeigt (aktiver Benutzer im Header) | passed | 3449 |
| `specs/error-states.spec.ts` | App startet, wenn localStorage-Writes werfen (Quota / privater Modus) | passed | 1355 |
| `specs/error-states.spec.ts` | App startet, wenn localStorage komplett leer ist | passed | 8623 |
| `specs/error-states.spec.ts` | App startet, wenn `northbit-users` beschädigt ist | passed | 4555 |
| `specs/error-states.spec.ts` | API-Ausfall auf /api/status wird toleriert (kein weißer Screen) | passed | 4355 |
| `specs/error-states.spec.ts` | Nicht-registrierte Route liefert Not-Found-Zustand | passed | 765 |
| `specs/navigation.spec.ts` | Startseite lädt und Haupt-Landmark ist sichtbar | passed | 8407 |
| `specs/navigation.spec.ts` | Servicemenü lässt sich öffnen und wieder schließen (Escape) | passed | 4966 |
| `specs/navigation.spec.ts` | Deep-Link auf /?view=projects rendert Dashboard-Route | passed | 5049 |
| `specs/navigation.spec.ts` | Browser-Back kehrt zur vorherigen URL zurück | passed | 1106 |
| `specs/rbac/backend-denial.spec.ts` | POST /api/sync ohne X-Sync-Token: entweder 401/403 oder DEV-Mock | passed | 559 |
| `specs/rbac/backend-denial.spec.ts` | GET /api/status ist öffentlich lesbar | passed | 376 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 7827 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 4481 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 4829 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 3547 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 3286 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2241 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2252 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2277 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 1965 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2028 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 1871 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 2130 |
| `specs/rbac/role-matrix.spec.ts` | Startseite lädt und Main ist sichtbar | passed | 2496 |
| `specs/rbac/role-matrix.spec.ts` | Servicemenü-Button sichtbar | passed | 1923 |
| `specs/responsive.spec.ts` | Responsive: desktop rendert Main-Landmark | passed | 7261 |
| `specs/responsive.spec.ts` | Responsive: tablet rendert Main-Landmark | passed | 4619 |
| `specs/responsive.spec.ts` | Responsive: mobile rendert Main-Landmark | passed | 4811 |
| `specs/responsive.spec.ts` | Responsive: kleine-hoehe rendert Main-Landmark | passed | 3440 |
| `specs/responsive.spec.ts` | Zoom 200 %: keine horizontale Scrollleiste am Body bei 1280px | passed | 928 |
| `specs/security/api-direct-call.spec.ts` | POST /api/sync ohne X-Sync-Token liefert keinen Stack, mit Correlation-ID | passed | 505 |
| `specs/security/api-direct-call.spec.ts` | POST /api/sync mit gefälschtem Token liefert 401/503 in Production, kein Leak sonst | passed | 856 |
| `specs/security/customer-responsibility-management.spec.ts` | Manager sieht systemhausweite Kundenverwaltung einschließlich unzugeordnetem Kunden | passed | 5720 |
| `specs/security/customer-responsibility-management.spec.ts` | Zuweisen und Wechseln verwendet nur die datensparsame Kandidatenliste | passed | 4133 |
| `specs/security/customer-responsibility-management.spec.ts` | Beenden macht den Kunden verwaltbar, aber unzugeordnet | passed | 4569 |
| `specs/security/customer-responsibility-management.spec.ts` | serverseitige Ablehnung bleibt datenarm | passed | 2782 |
| `specs/security/my-customers-visibility.spec.ts` | 1/2: eigener Kunde mit read bzw. write Access wird korrekt gekennzeichnet | passed | 3973 |
| `specs/security/my-customers-visibility.spec.ts` | 2: Detail mit write Access weist Schreiben als zusätzlich berechtigungspflichtig aus | passed | 3555 |
| `specs/security/my-customers-visibility.spec.ts` | 1: Detail mit read Access zeigt Projekt -> Arbeitspaket -> Tätigkeit ohne Schreibhinweis | passed | 3155 |
| `specs/security/my-customers-visibility.spec.ts` | 3: Customer Access ohne Responsibility erscheint nicht in „Meine Kunden“ | passed | 6036 |
| `specs/security/my-customers-visibility.spec.ts` | 4: Responsibility ohne Customer Access bleibt fail-closed unsichtbar | passed | 2669 |
| `specs/security/my-customers-visibility.spec.ts` | 5: direkte fremde Customer-URL (IDOR) liefert kein Detail und keine Existenzaussage | passed | 4040 |
| `specs/security/my-customers-visibility.spec.ts` | 5: syntaktisch ungültige IDs lösen keinen Serveraufruf aus | passed | 1828 |
| `specs/security/my-customers-visibility.spec.ts` | 6: Cross-Systemhouse-Zugriff wird verweigert | passed | 1920 |
| `specs/security/my-customers-visibility.spec.ts` | 7: beendete Responsibility entfernt den Kunden aus Liste und Detail | passed | 3358 |
| `specs/security/my-customers-visibility.spec.ts` | 8: inaktive oder ungültige Membership macht den Kunden unsichtbar | passed | 3207 |
| `specs/security/my-customers-visibility.spec.ts` | 11: Empty State erklärt die fehlende Zuordnung ohne Kundendaten | passed | 1840 |
| `specs/security/my-customers-visibility.spec.ts` | 12: Error State zeigt keine Kundendaten | passed | 1916 |
| `specs/security/my-customers-visibility.spec.ts` | 9: Viewer erhält über „Meine Kunden“ keine zusätzlichen Rechte | passed | 3337 |
| `specs/security/my-customers-visibility.spec.ts` | 10: vorgetäuschte Rolle im Browser-Storage erzeugt keine Serverrechte | passed | 3183 |
| `specs/security/my-customers-visibility.spec.ts` | Unangemeldeter Aufruf landet auf der Anmeldung, nicht im Kundendetail | passed | 1454 |
| `specs/security/ui-gate-tamper.spec.ts` | localStorage-Rolle vortäuschen öffnet keine Sysadmin-Sichten | passed | 1029 |
| `specs/security/workpackage-category.spec.ts` | Default keine Kategorie; nur aktive Werte des eigenen Systemhauses wählbar | passed | 4773 |
| `specs/security/workpackage-category.spec.ts` | Mehrfach-Membership erzwingt explizite Systemhaus-Wahl | passed | 3641 |
| `specs/security/workpackage-category.spec.ts` | Administrator legt Kategorie systemhausbezogen an und deaktiviert statt zu löschen | passed | 3026 |
| `specs/security/workpackage-category.spec.ts` | Viewer sieht keinen Pflege-Eintrag und kein Arbeitspaket-Anlegen | passed | 2439 |
| `specs/service-menu.spec.ts` | Menü listet Kern-Einträge (Log Viewer, Systemstatus, Backup) | passed | 3892 |
| `specs/service-menu.spec.ts` | Handbuch-Button ist erreichbar (aria-label Hilfe) | passed | 2702 |
| `stability/dialog-loop.spec.ts` | dialog loop stability | passed | 5883 |
