# Nicht getestete UI-Funktionen (E2E-Lücken)

Stand: MVP-Baseline v1.59.6 vom 2026-08-24. Diese Datei dokumentiert bewusst nur die verbleibenden Lücken der automatisierten Playwright-E2E-Abdeckung.

Was hier steht, ist NICHT durch belastbare funktionale E2E-Tests abgedeckt. Ein vorhandener Sichtbarkeits-, Smoke- oder Rollenanker darf nicht als vollständiger Funktionsnachweis interpretiert werden.

## Bereits vorhandene E2E-Basis

Die aktuelle E2E-Suite enthält unter anderem:

- Dashboard-/Navigations-Smoke,
- Error-State- und Correlation-ID-Prüfungen,
- rollenbasierte Sichtbarkeitsprüfungen,
- serverseitige Denial-/Endpoint-Anker,
- Accessibility-Smoke,
- Responsive-Smoke,
- Servicemenü-Smoke.

Die zentrale Playwright-Fixture bildet den angemeldeten Zustand über deterministische synthetische Supabase-Sessions ab und mockt die Supabase-HTTP-Grenze. Damit ist die historische Aussage „client-seitige User-Auswahl / keine Auth-Session“ nicht mehr gültig.

Wichtig: Die synthetische Session ist eine reproduzierbare Testgrenze. Sie ersetzt keinen produktiven End-to-End-Test gegen echte Supabase-Auth-Dienste.

## Dashboard-Interaktionen (funktional nicht vollständig geprüft)

- vollständige CRUD-Flows für Projekte, Arbeitspakete und Tätigkeiten einschließlich Persistenz über mehrere Navigationsschritte,
- Zeiterfassung/Buchungsvalidierung in komplexen Randfällen,
- kombinierte Filter-/Sortierzustände einschließlich Persistenz und Reset,
- Wechsel Woche ↔ Monat mit vollständiger fachlicher Prüfung der Periodengrenzen,
- KPI-Berechnungen gegen bekannte Testdaten; derzeit sind primär Rendering-/Sichtbarkeitsanker vorhanden,
- umfangreiche Abrechnungs- und Leistungsnachweis-Interaktionen über reine Sicht-/RBAC-Prüfungen hinaus.

## Servicemenü-Dialoge

`e2e/specs/service-menu.spec.ts` prüft bewusst nur, dass zentrale Menüeinträge erreichbar sind. Das ist ein Smoke-Test, kein Funktionsnachweis der Dialoge.

Noch nicht als tiefe funktionale E2E-Flows abgedeckt sind insbesondere:

- Log Viewer: Filter, Level-Umschaltung, Export,
- Systemstatus: Live-Aktualisierung und vollständige Detailzustände,
- Backup: manueller Trigger, Download und Restore-Verifikation,
- Download Center: Vorschau, Dateiinhalte und Retention-Löschlogik,
- Import/Export: vollständiger Mehrschritt-Flow einschließlich Fehler-/Rollbackpfaden,
- Azure-Datenbereich: optionale Verbindung und Sync-Pfade,
- Benutzer-/Auth-Administration: Anlegen, Rollenwechsel, administratives Passwortsetzen und Schutzpfade als vollständige Browser-Flows,
- Handbuch-Suche und Deep-Links über reine Erreichbarkeit hinaus,
- technischer Prüfbericht/Release-Readiness als tiefer Browser-Flow.

Mehrere dieser Bereiche sind manuell bzw. durch Unit/API/RBAC/Security-Tests abgenommen. Das ändert nichts daran, dass die Playwright-Funktionstiefe bewusst geringer ist.

## RBAC und Auth

Vorhanden:

- rollenbasierte Start-/Sichtbarkeitsanker,
- zentrale RBAC-Matrixprüfungen außerhalb von Playwright,
- serverseitige Permission-/Denial-Tests,
- Viewer-/Negativpfade in der MVP-Abnahme.

Verbleibende E2E-Lücken:

- vollständige Feld- und Aktionsprüfung jedes Servicemenü-Dialogs pro Rolle,
- vollständige Browser-Negativtests für alle geschützten Adminaktionen,
- produktiver Login-/Logout-/Recovery-/Session-Ablauf gegen einen echten Supabase-Auth-Dienst,
- abgelaufene bzw. widerrufene Sessions und Token-Refresh als echter Provider-E2E-Fall,
- Cross-User-/Cross-Scope-Flows in größerer Breite als die aktuellen Abnahmefälle.

## Backend-/API-Grenze

`e2e/specs/rbac/backend-denial.spec.ts` enthält weiterhin einen schlanken Endpoint-Anker für `/api/status` und `/api/sync`.

Neue oder wesentlich geänderte geschützte Endpunkte müssen weiterhin in API-/Security-Tests und – wo sinnvoll – in Playwright-Negativtests aufgenommen werden. Ein Endpoint darf nicht allein aufgrund von UI-Gating als geschützt gelten.

## Accessibility

Die vorhandenen axe-Prüfungen sind ein guter Smoke-Anker, aber keine vollständige Accessibility-Abnahme aller Zustände.

Noch nicht systematisch abgedeckt:

- alle Servicemenü-Dialoge und Wizards,
- vollständige Tastatur-/Fokusreihenfolge in komplexen Dialogen,
- Screenreader-Namen dynamischer Meldungen/Toasts/Live-Regions,
- Fehlerzustände und Validierungsfeedback aller Formulare.

## Responsive

Die Suite prüft mehrere Viewports als Smoke. Nicht vollständig automatisiert sind:

- visuelle Layout-Regressions-Snapshots,
- systematische Mindestgrößen von Touch-Zielen,
- Overflow-Regressionsprüfung für alle Tabellen/Dialoge,
- vollständige mobile Interaktionen in komplexen Verwaltungsdialogen.

## Cross-Browser und Sessions

- Chromium ist der verbindliche CI-Browser; Firefox/WebKit bleiben gemäß bestehender Testentscheidung außerhalb des Pflicht-CI-Scopes.
- Authentifizierte E2E-Fälle laufen mit synthetischen Supabase-Sessions gegen die gemockte Provider-Grenze.
- Echte Provider-Fälle wie abgelaufene, serverseitig widerrufene oder extern erneuerte Supabase-Sessions sind noch nicht als produktive Browser-E2E-Tests vorhanden.

## Pflege-Regel

Diese Datei wird nur dann gekürzt, wenn konkrete automatisierte Tests die betreffende Lücke tatsächlich schließen. Manuelle Abnahme, Unit-Tests, API-Tests, Security-Tests und Playwright-Smoke erfüllen unterschiedliche Zwecke und dürfen nicht gegenseitig als gleichwertige Testabdeckung umetikettiert werden.
