# ADR-0011: API-/Endpoint-Contract-Tests via Registry

- **Status**: Accepted
- **Datum**: 2026-07-13

## Kontext
Bis v1.29 gab es je Server-Route eine handgeschriebene Vitest-Datei, die
im Wesentlichen „Antwort ist JSON" prüfte. Der Prompt fordert positive
und negative Fälle pro Endpoint für Grundfunktion, Payload, Security,
Stabilität und Nachvollziehbarkeit — für aktuelle Routen (`/api/status`,
`/api/sync`) und zukünftige (Azure-, RBAC-Assignment-Routen). Test-pro-
Datei würde Boilerplate multiplizieren und Drift begünstigen.

## Entscheidung
Ein **Contract-first Endpoint-Registry** unter
`src/__tests__/api/registry/`. Jede Route ist ein `EndpointContract`-
Objekt (Pfad, erlaubte Methoden, Auth-Flag, Zod-Schemas, `loadRoute()`).
Der generische Runner `runner.test.ts` iteriert die Registry und erzeugt
pro Endpoint dieselben Testkategorien. Neue Routen brauchen nur einen
Registry-Eintrag — Runner, CI-Gate und Matrix-Report ziehen automatisch
nach.

Der Runner ruft **Route-Handler direkt** auf (kein Netz, kein Dev-
Server) — deterministisch und millisekundenschnell. Für die Fälle, die
nur der echte HTTP-Stack zeigt (Middleware, Framework-Header), existiert
die schmale Playwright-Suite `e2e/api-smoke.spec.ts`.

Die Matrix (`test-report/api-matrix.{md,json}`) wird als CI-Artefakt
hochgeladen.

## Alternativen
- **Test-pro-Route (Status quo)**: verworfen — jeder neue Endpoint kostet
  ~200 Zeilen Boilerplate und schafft Drift-Risiko.
- **HTTP-Round-Trip als Default (Supertest o. ä.)**: verworfen — braucht
  laufenden Dev-Server, deutlich langsamer, wenig Mehrwert für
  Contract-Assertions. Als schmaler Zusatz via Playwright.
- **OpenAPI-Spec-Generierung**: verworfen für v1.30 — zu groß für den
  aktuellen Endpoint-Umfang. Registry ist die Vorstufe; ein späterer
  OpenAPI-Emitter kann die Registry als Input nehmen.
- **Fuzzing / Property-Based (fast-check)**: bewusst außen vor — 10-
  Zeilen-Ergänzung im Runner sobald echte Regressionen auftauchen.

## Konsequenzen
- Positiv: Neue Route → ein Registry-Eintrag → automatisch ~10 Testfälle
  + Matrix-Zeile.
- Positiv: Schema-Drift wird hart erkannt (Zod-Validation im Runner).
- Negativ: Handler-direct umgeht Middleware — Playwright-Smoke muss die
  Lücke schließen. Aktuell 3 Cases, bewusst schmal.
- Negativ: Correlation-ID wird nur „wenn vorhanden" geprüft, da die
  Routen sie noch nicht ausstellen. Als `openRisk` in der Matrix
  dokumentiert; Implementierung ist eigener Prompt.

## Trust-Boundary / Security-Note
Response-Body und Header werden hart auf JWT-, Bearer-, Connection-
String-, SAS- und Stacktrace-Muster gescannt. Ein Treffer bricht CI —
das ist der eigentliche Grund für den Ansatz. Sensitive Header
(`set-cookie`, `x-powered-by`, `server`) dürfen aktuell keine Route
setzen.
