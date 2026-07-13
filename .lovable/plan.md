## Prompt 2A.4 – UI-Funktionstest und End-to-End-Test (v1.31.0)

Ziel: Playwright-basierte E2E-Suite, die die Anwendung aus Benutzersicht prüft, in die bestehende zentrale Testinstanz (v1.28.0) und CI integriert.

### Werkzeugwahl

Playwright bleibt. Es ist bereits in `e2e/api-smoke.spec.ts` produktiv, mit TanStack Start und Cloudflare Worker verträglich (läuft gegen den Vite-Dev-Server bzw. `bun run start`), und in CI vorhanden. Keine neue Abhängigkeit.

Kritischer Trade-off (offen benennen): die Suite läuft gegen den **Dev-Server**, nicht gegen einen echten Worker-Build. Das ist bewusst, weil ein Wrangler-Preview in CI die Laufzeit verdoppeln würde; Worker-spezifische Regressionen fängt weiterhin `build:dev` + `test:api` ab.

### Struktur

```text
e2e/
  fixtures/
    roles.ts             # 7 Rollen → gemockter Session-Bootstrap via localStorage
    test-instance.ts     # test:-Prefix, Storage-Reset pro Test
    axe.ts               # @axe-core/playwright Wrapper
  specs/
    navigation.spec.ts       # Hauptnav, Servicemenü, Dialoge, Zurück, Deep Links, mobile Nav
    dashboard.spec.ts        # KPIs, Listen, Suche/Filter/Sort, Edit, Persistenz, User-Wechsel
    service-menu.spec.ts     # LogViewer, Systemstatus, Health, Backup, Download, Import/Export, Azure, UserMgmt, Handbuch, ReleaseReadiness
    error-states.spec.ts     # leere/korrupte Daten, IDB/LS aus, API 500/Timeout, Azure unconfigured, 401/403
    responsive.spec.ts       # Desktop/Tablet/Mobile/kleine Höhe/200%-Zoom
    a11y.spec.ts             # axe-Scan, Fokus-Reihenfolge, Escape, Dialog-Focus-Trap
    rbac/
      role-matrix.spec.ts    # generisch über 7 Rollen × sichtbare Menüs/Aktionen
      backend-denial.spec.ts # direkter Fetch auf geschützte Endpunkte ohne UI
  reports/
    test-report.md           # generiert
    ui-matrix.md             # UI-Funktion ↔ Testfall
    untested.md              # Lücken
playwright.config.ts         # trace: on-first-retry, screenshot: only-on-failure, video: retain-on-failure
```

### Testabdeckung (Zuordnung UI-Funktion → Spec)

| Bereich | Spec |
|---|---|
| Navigation (7 Punkte) | `navigation.spec.ts` |
| Dashboard (14 Punkte) | `dashboard.spec.ts` |
| Servicefunktionen (11 Dialoge) | `service-menu.spec.ts` |
| Fehlerzustände (10 Punkte) | `error-states.spec.ts` |
| Responsive (5 Viewports) | `responsive.spec.ts` |
| Accessibility (7 Punkte) | `a11y.spec.ts` |
| Rollen (7 Rollen × 5 Prüfungen) | `rbac/*.spec.ts` |

Rollen-Matrix wird datengetrieben aus `src/lib/rbac/permissions.ts` erzeugt — kein Handpflege-Duplikat.

### Selektor-Strategie

Bevorzugt `getByRole` + Name. Wo Rollen nicht eindeutig sind, werden **minimal-invasiv** `data-testid`-Anker in Dialog-Wurzeln und Servicemenü-Buttons ergänzt (kein UI-Refactor). Erwartete Anker: `service-menu`, `dialog-<name>`, `kpi-<key>`, `nav-mobile-toggle`, `role-badge`.

### Fehlerzustands-Simulation

- **IDB/LS aus**: `addInitScript` löscht `indexedDB` bzw. wirft in `localStorage.setItem`.
- **API-Ausfälle**: `page.route('**/api/**', ...)` mit Fulfill 500/Timeout/Body-Garbage.
- **Azure**: Env-Flag `VITE_E2E_AZURE=off` → Service-Stub.
- **RBAC-Backend-Denial**: `page.request.post()` auf geschützte Server-Fn ohne passenden Rollenkontext → erwartet 401/403 statt 200.

### CI-Integration

Neuer Job `e2e` in `.github/workflows/ci.yml`:

- `actions/cache@v4` auf `~/.cache/ms-playwright` (offener Punkt aus v1.30.0 mit erledigt)
- `bunx playwright install --with-deps chromium`
- `bun run test:e2e`
- Upload von `playwright-report/`, `test-results/` (Traces, Screenshots, Videos) und `e2e/reports/*.md` als Artefakt

Neue Scripts:
- `test:e2e` — vollständige Suite
- `test:e2e:ui` — lokal headed
- `test:e2e:report` — generiert `test-report.md`, `ui-matrix.md`, `untested.md` aus Playwright-JSON

### Dokumentation

- Neues Handbuch-Kapitel „UI- und End-to-End-Tests" in `src/lib/help-documentation.ts`, Quicklink im Hilfe-Menü, `DOCUMENTATION_VERSION → 1.10.0`.
- `CHANGELOG.md`: `## 1.31.0 - 2026-07-13` mit den Bullet-Punkten.
- **ADR-0012**: „Playwright gegen Dev-Server statt Wrangler-Preview" — Begründung + Grenzen.
- `docs/ARCHITECTURE.md`: Testpyramide um E2E-Schicht ergänzt.

### Bewusst NICHT im Scope (mit Begründung)

1. **Visuelle Regression** (Screenshot-Diffing): flackert stark ohne stabile Fonts/Rendering; separater Prompt sinnvoll.
2. **Cross-Browser** (Firefox/WebKit): CI-Zeit + geringer Nutzen für Intranet-Dashboard. Erweiterbar in `playwright.config.ts` per `projects`.
3. **Echte Azure-Live-E2E**: bleibt hinter `AZURE_TEST_LIVE=1` wie in v1.28.0 vereinbart.
4. **Performance-Budgets** (LCP/CLS in E2E): separate Lighthouse-CI-Kette geplant.

### Erwartetes Ergebnis

~60–80 E2E-Cases, Laufzeit lokal < 3 min, in CI < 6 min (mit Cache). Erste Läufe werden reale Lücken (z. B. fehlende `aria-label` an Icon-Buttons, fehlende Fokus-Rückgabe nach Dialog-Close) sichtbar machen — diese fließen als Findings in den bestehenden Technical-Debt-Scanner (v1.29.0), nicht als Fixes in diesen PR (Scope-Disziplin).
