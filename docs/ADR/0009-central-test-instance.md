# ADR-0009: Zentrale Testinstanz — Vitest-Projects + Playwright + MSW

- **Status**: Accepted
- **Datum**: 2026-07-13

## Kontext
Für den technischen Prüfbericht wird eine reproduzierbare Testumgebung
gefordert, die den **aktuellen Buildstand** des Dashboards prüft — nicht
eine gespiegelte zweite App. Bestehende Infrastruktur: Vitest, Testing
Library, vitest-axe, gitleaks/security-check, docs-sync, RBAC-Check.
Neue Anforderungen: 15 klar getrennte Testmodi (Unit … Regression),
isolierte Daten, kein Zugriff auf produktives Azure, ausführbar lokal
und in CI, Ergebnisse als strukturierter Report.

## Entscheidung
1. **Vitest bleibt Runner.** Neue Modi werden über Pfad-Filter
   (`vitest run src/__tests__/<modus>`) und ein zentrales
   Test-Instance-Modul (`src/__tests__/env/test-instance.ts`) getrennt.
   Kein zweiter Config-Baum, kein zweiter Runner.
2. **Playwright für UI-E2E** gegen den lokalen Dev-Server auf Port 8080.
3. **MSW (Node)** für alle HTTP-Isolation (Azure, externe APIs) — opt-in
   pro Test-Suite.
4. **Isolationshooks** additiv in App-Code: Storage-Präfix
   (`VITE_TEST_STORAGE_PREFIX`) und IndexedDB-Name
   (`VITE_TEST_IDB_NAME`) sind read-only Konstanten mit Produktions-
   Default. Keine Verhaltensänderung außerhalb Tests.
5. **Azure-Live-Gate**: `AZURE_TEST_LIVE=1` ist die einzige Möglichkeit,
   echte Endpunkte anzusprechen. Default: MSW-Mock.

## Alternativen
- **Separate Test-App**: verworfen — würde Prüfen des aktuellen
  Buildstands unmöglich machen.
- **Cypress**: verworfen — Playwright ist bereits in der Sandbox
  vorhanden und produziert bessere Traces.
- **Testcontainers**: verworfen — Cloudflare-Worker-Umgebung erlaubt
  keine Docker-Abhängigkeit; MSW deckt HTTP-Isolation vollständig ab.
- **Vitest workspace file**: verworfen zugunsten der einfacheren
  Pfad-Filter-Lösung; kann später bei Bedarf nachgezogen werden.

## Konsequenzen
- Positiv: Ein Runner, ein Fixtures-Verzeichnis, ein Guard-Modul.
  Kein Drift zwischen Test-App und Produktion.
- Positiv: Neue Modi kosten nur ein Verzeichnis + ein Script.
- Negativ: Kein hard-enforced Grenzwert je Modus — Isolation zwischen
  Modi muss über Ordner-Disziplin gehalten werden.
- Negativ: Playwright zieht Chromium in CI (~200 MB Cache).

## Trust-Boundary / Security-Note
- `test-instance.ts` bricht mit Throw ab, wenn außerhalb Vitest geladen.
- MSW-Handler enthalten keine echten Credentials/Endpunkte.
- `AZURE_TEST_LIVE`-Gate verhindert versehentliche Live-Aufrufe.
- Fixtures verwenden ausschließlich synthetische Namen/IDs.
