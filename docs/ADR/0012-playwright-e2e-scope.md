# ADR-0012: Playwright-E2E-Suite gegen Dev-Server, nur Chromium

- **Status**: Accepted
- **Datum**: 2026-07-13

## Kontext
Prompt 2A.4 fordert eine vollständige UI- und End-to-End-Suite über 7
Bereiche (Navigation, Dashboard, Services, Fehler, Responsive, A11y, RBAC).
Zielumgebung ist Cloudflare Worker, produktive Preview läuft in Wrangler.
CI-Budget: < 6 min pro Job.

## Entscheidung
1. **Playwright** bleibt als E2E-Werkzeug (bereits produktiv seit v1.30.0).
2. Suite läuft gegen den lokalen **Vite-Dev-Server**, nicht gegen einen
   Wrangler-Preview. Worker-spezifische Regressionen deckt `build:dev` +
   `test:api` ab.
3. Nur **Chromium** in CI. Firefox/WebKit werden nur bei nachgewiesener
   Renderdifferenz aktiviert.
4. Rollen-Seeding erfolgt clientseitig über `localStorage` (Fixture
   `e2e/fixtures/roles.ts`) – ausreichend für UI-Sichtbarkeit
   (`PermissionGate`). Serverseitige Verweigerung wird über direkte
   HTTP-Requests in `rbac/backend-denial.spec.ts` geprüft.
5. Reports (`test-report.md`, `ui-matrix.md`, `untested.md`) leben unter
   `e2e/reports/` und werden als CI-Artefakt hochgeladen. Traces,
   Screenshots und Videos nur bei Fehlern (Cost-Optimierung).

## Begründung
- Wrangler-Preview + Playwright verdoppelt die CI-Laufzeit (Startup ~30 s,
  keine HMR). Nutzen ist gering, weil der Worker-Runtime-Unterschied bei
  UI-Interaktion nicht sichtbar wird – er greift nur bei Server-Fn-/API-
  Bundling-Fehlern, die `build:dev` und `test:api` schon fangen.
- Cross-Browser-Tests sind für ein internes Dashboard mit definierter
  Zielumgebung (Chromium/Edge) eher Wartungslast als Ertrag.
- Client-Seeding statt echter Auth: die App hat aktuell keine Auth-Session
  mit Ablauf. Sobald sie eingeführt wird, muss diese Fixture überarbeitet
  werden – dann gehört auch „abgelaufene Session" in die Fehlerzustände.

## Konsequenzen
- **+** Schnelle Feedback-Schleife, wenig Setup-Fläche.
- **+** Klare Trennung: Contract-Tests (Vitest-Runner), API-Smoke
  (Playwright HTTP), UI-Smoke/Funktion (Playwright Browser).
- **−** Worker-Middleware wird in E2E nicht durchlaufen – falsche Sicherheit
  möglich, wenn Middleware in Zukunft UI-relevante Header setzt.
- **−** Rollen-Sichtbarkeitstests sind KEIN Sicherheitsnachweis. Die
  Matrix-Datei `RBAC-MATRIX.md` und `backend-denial.spec.ts` sind die
  autoritativen Quellen.
- **−** Die im Prompt genannten Detail-Interaktionen (Bearbeitung, Zeit-
  erfassung, Wizards) sind derzeit nur auf Smoke-Ebene abgedeckt. Die
  bewusste Lücke ist in `e2e/reports/untested.md` dokumentiert und muss
  bei stabilen `data-testid`-Ankern nachgezogen werden.
