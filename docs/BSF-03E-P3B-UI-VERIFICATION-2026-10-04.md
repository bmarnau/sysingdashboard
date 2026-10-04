# BSF-03E P3b – UI-Kandidat und Abnahmenachweise

Stand: 2026-10-04 · Version: 1.68.0 · Issue: #63

## Status und Basis

**P3b-UI und lokale Browserverträge umgesetzt; Signatur-/Exact-Head-Gate noch offen. BSF-03E ist insgesamt nicht DONE.**

Die Basis ist `main@b5acf3d9349bfb132a1a3615878024955d2a4385`, nach Merge von PR #170. Ausschließlich für diese Basis gelten:

- [Post-Merge CI 37183668646](https://github.com/bmarnau/sysingdashboard/actions/runs/37183668646): PASS.
- [Post-Merge Security 37183668658](https://github.com/bmarnau/sysingdashboard/actions/runs/37183668658): PASS.

Kandidatenbezogene CI-/Security-Runs sind anhand des finalen PR-Heads live zu prüfen; die Basis-Runs ersetzen diesen Nachweis nicht.

## Fachlicher Schnitt

`/verantwortungen` enthält die bestehende Personensicht und den zusätzlichen Bereich **Arbeitspakete**. Der Read-Hook ruft `readWorkPackageWorkViewFn({ data: {} })` auf. Der bestehende Serververtrag bestimmt Scope, Referenzzeit und Kalenderdatum vor Darstellung/Filterung.

- Gruppierung nach Kunde, aktivem primären Owner oder Fälligkeit.
- Sortierung und Richtung unabhängig von der Gruppierung.
- Explizite Text-/Kunden-/Owner-/Status-/Due-Filter; Reset erhält Gruppierung/Sortierung.
- Owner, zusätzliche Deputies und „Nicht zugeordnet“ ausgeschrieben.
- Stabile Kunden-/Personenidentitäten als Gruppenschlüssel; gleiche Namen werden nicht zusammengeführt.
- Loading/Empty/Error/Retry; alte Ergebnisse bei Benutzer-/Permission-Wechsel und Refresh ausgeblendet, späte frühere Antworten verworfen.
- Keine zusätzliche Persistenz, DB-/RLS-/RBAC-/RPC-/Provider- oder Dependency-Änderung.

Plan: `docs/superpowers/plans/2026-10-04-bsf-03e-p3b-work-view-ui.md`.

## Lokale Nachweise

Prüfumgebung: frischer Linux-Checkout der exakten GitHub-Basis, Bun 1.4.2, Node 24.19.0; Produktabhängigkeiten aus unverändertem `bun.lock` installiert.

| Prüfung                                      | Ergebnis                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Domain-/Hook-Verträge                        | 16/16 PASS; identitätsbasierte Gruppen RED→GREEN                                               |
| UI-Verträge                                  | 6/6 PASS; sichtbare Bedien-/Zustandsverträge RED→GREEN                                         |
| Typecheck                                    | PASS                                                                                           |
| ESLint                                       | PASS, 0 Fehler; 20 bestehende Warnungen außerhalb des neuen Schnitts                           |
| Production Build                             | PASS                                                                                           |
| Vollsuite mit TZ=UTC                         | 1072 PASS, 2 FAIL, 4 TODO; 160 Testdateien                                                     |
| Playwright-Browserabnahme                    | 10/10 PASS; Rollen-/Server-DENY, alle Gruppierungen, Filter, Reload, Loading/Empty/Error/Retry |
| Final-Head-Signatur / Exact-Head-CI/Security | Vor Kandidatenfreigabe gesondert zu prüfen                                                     |

Gezielte Regression einschließlich Backend-/Adapter-/P3a-/Route-Verträgen: **46/46 PASS**. Docs-/Manifest-/RBAC-/Golden-/No-Console-Checks: PASS. Security-Scan: **0 Critical / 0 High / 0 Medium**. Responsive: **1280/640/390 Pixel ohne Dokument-Overflow**, Axe: **0 WCAG-A/AA-Verstöße**; Screenshots als Testattachments.

Lokale Browserumgebung: Chromium 153 statt des hier nicht herunterladbaren Playwright-Bundles. Ausschließlich ein temporärer, unversionierter Prüf-Wrapper bindet Vite explizit an Loopback und deaktiviert die Videoaufzeichnung wegen des fehlenden FFmpeg-Bundles. Testfälle, Assertions und Produktkonfiguration bleiben unverändert; Screenshots/Traces stehen zur Verfügung. CI nutzt weiterhin die reguläre Playwright-Konfiguration.

### Reproduzierte Baseline-Grenze

Vor jeder Produktänderung: 1052 PASS, 6 FAIL, 4 TODO (158 Dateien). Vier Kalender-/Zeitzonentests bestehen bei `TZ=UTC`, wie in der CI. Zwei unveränderte Tests bleiben auch dann rot:

1. `src/__tests__/api/runner.test.ts` → `endpoint status (/api/status) > should_returnResponse_when_GETInvoked`.
2. `src/__tests__/api/smoke/smoke.test.ts` → `api smoke (inventory-driven) > status (/api/status) > smoke-runs`.

Beide rufen die echte öffentliche GitHub-Main-Abfrage über `/api/status` auf. Der importierte Test-Harness friert die Timeout-Timer ein; in dieser Umgebung antwortet die externe Abfrage nicht innerhalb der Testlaufzeit. Keine Assertions, Timeouts oder Produktstatuslogik wurden für den UI-Schnitt abgeschwächt. Die integrierte Main-Basis hat dieselben Verträge in GitHub CI bestanden. Dies ist ein gesonderter Harness-/Umgebungsbefund; die lokale Vollsuite wird ausdrücklich nicht als PASS bezeichnet.

### Browser- und Security-Evidenzgrenze

Die E2E-Fixture simuliert ausschließlich bereits getroffene Serverentscheidungen und enthält keine produktiven Identitäten/Schlüssel. Sie prüft UI-Bedienung, DENY-Darstellung, URL-/Client-Manipulation ohne Scope-Request sowie alle vier festen Due-Gruppen. Sie ersetzt keinen realen DB-RLS-Nachweis. Die vorhandenen Backend-/Adapter-/DB-Verträge bleiben die Autorisierungsnachweise.

## Offene Gates und nächster Schritt

1. Unabhängige Branch-Review; signierten Final-Head sowie zugehörige CI/Security belegen.
2. Separater Merge-Gate und Post-Merge-Abnahme.
3. Lokalen Windows-Checkout und veröffentlichte Lovable-App auf den integrierten Stand synchronisieren und tatsächlich prüfen.
4. BSF-03E P5: Gesamtverträge, Security Advisor, Backup/Restore/Import/Export, technische Nachweise und Abschlussentscheidung. P4 Bulk bleibt optional und nicht freigegeben.

Die technische CI-Berichterzeugung bleibt das verbindliche aktuelle Prüfbericht-Gate. Lokal generierte Berichte dürfen die hier beschriebenen Grenzen nicht in einen pauschalen Release-PASS umdeuten.
