# UI-Funktion ↔ E2E-Testfall (Matrix)

Manuell gepflegter Index – ergänzt den auto-generierten `test-report.md`.
Zweck: schneller Nachweis, welche funktionale UI-Anforderung von welchem
Spec-File adressiert wird.

| Bereich                  | UI-Funktion                          | Spec / Test                                           | Ebene   |
|--------------------------|--------------------------------------|-------------------------------------------------------|---------|
| Navigation               | Startseite lädt                      | `navigation.spec.ts` › Startseite lädt                | Smoke   |
| Navigation               | Servicemenü öffnen/Escape            | `navigation.spec.ts` › Servicemenü öffnen             | Funktion|
| Navigation               | Deep Link                            | `navigation.spec.ts` › Deep-Link                      | Funktion|
| Navigation               | Browser-Back                         | `navigation.spec.ts` › Browser-Back                   | Funktion|
| Dashboard                | Globale Suche sichtbar               | `dashboard.spec.ts` › zeigt globale Suche             | Smoke   |
| Dashboard                | Suche-Eingabe + Reset                | `dashboard.spec.ts` › Suche akzeptiert Eingabe        | Funktion|
| Dashboard                | Persistenz-Regressions-Anker         | `dashboard.spec.ts` › überlebt Reload NICHT           | Regress.|
| Dashboard                | Aktiver Benutzer                     | `dashboard.spec.ts` › Benutzer-Wechsel                | Smoke   |
| Servicemenü              | Log Viewer / Systemstatus / Backup   | `service-menu.spec.ts` › Kern-Einträge                | Smoke   |
| Servicemenü              | Handbuch-Button                      | `service-menu.spec.ts` › Handbuch erreichbar          | Smoke   |
| Fehlerzustände           | Leerer Storage                       | `error-states.spec.ts` › leer                         | Robust. |
| Fehlerzustände           | Korrupter Storage                    | `error-states.spec.ts` › beschädigt                   | Robust. |
| Fehlerzustände           | Storage-Writes werfen                | `error-states.spec.ts` › Quota                        | Robust. |
| Fehlerzustände           | API 500                              | `error-states.spec.ts` › /api/status Ausfall          | Robust. |
| Fehlerzustände           | Not-Found                            | `error-states.spec.ts` › unbekannte Route             | Robust. |
| Responsive               | 4 Viewports + 200 % Zoom             | `responsive.spec.ts`                                  | Regress.|
| Accessibility            | axe-Scan Startseite                  | `a11y.spec.ts` › keine critical axe                   | Contract|
| Accessibility            | Tastatur-Fokus                       | `a11y.spec.ts` › Fokus                                | Smoke   |
| RBAC                     | 7 Rollen × Main sichtbar             | `rbac/role-matrix.spec.ts`                            | Matrix  |
| RBAC                     | Backend-Denial                       | `rbac/backend-denial.spec.ts`                         | Contract|
| API                      | /api/status, /api/sync Round-Trip    | `api-smoke.spec.ts`                                   | Contract|

Nicht abgedeckte Bereiche siehe `untested.md`.
