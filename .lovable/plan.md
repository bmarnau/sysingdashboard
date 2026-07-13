
# Plan: API- und Endpoint-Test-Suite (v1.30.0)

## Kontext
Aktuell existieren zwei Server-Routen (`/api/status`, `/api/sync`) und je ein
minimaler Handler-Test (`src/__tests__/api/*.route.test.ts`), der nur
"Antwort ist JSON" verifiziert. Es gibt keine Endpoint-Matrix, keine
negativen Fälle, keine Security-Assertions und keinen CI-Gate speziell für
API-Tests. Azure-/RBAC-/Assignment-Routen sind noch nicht implementiert,
das Framework muss sie aber vorbereitet aufnehmen.

## Ansatz
Ein **Contract-first Endpoint-Registry** statt handgeschriebener Tests pro
Route. Jede Route wird einmal deklarativ beschrieben (Methode, Auth,
Schema, Cases); ein generischer Runner erzeugt daraus alle Test-Fälle. Neue
Routen (Azure, RBAC) tragen nur einen Registry-Eintrag ein — Runner, CI-
Gate und Matrix-Report aktualisieren sich automatisch.

## Deliverables

### 1. Endpoint-Registry (`src/__tests__/api/registry/`)
- `types.ts` — `EndpointContract`: `{ path, methods[], authRequired,
  permission?, scope?, requestSchema?, responseSchema, errorSchema,
  cases: TestCase[], knownRisks[] }`.
- `endpoints.ts` — zentrale Liste. Initial: `status`, `sync`.
- `cases/` — wiederverwendbare Case-Bausteine (`invalidJson`,
  `emptyBody`, `oversizePayload`, `wrongMethod`, `sqlishInput`,
  `secretsInResponse`, `stacktraceInResponse`, `sensitiveHeaders`).

### 2. Generischer Runner (`src/__tests__/api/runner.test.ts`)
Iteriert die Registry, führt pro Endpoint aus:
- **Grundfunktion**: erlaubte/nicht erlaubte Methoden, Content-Type,
  Statuscode, Response gegen Zod-Schema, Fehlerform.
- **Payloads**: gültig, leer, unvollständig, 1 MB Oversize, unerwartete
  Felder, ungültiges JSON.
- **Security**: Response-Body-Scan auf JWT-, Bearer-, Connection-String-,
  SAS-, Stacktrace-Muster; Header-Scan auf `set-cookie`, `x-powered-by`,
  `server`. CORS-Check, wenn `corsExpected` gesetzt.
- **Stabilität**: 10 parallele Requests, 3 wiederholte identische
  Requests (Idempotenz-Assert bei GET/PUT/DELETE).
- **Auth-Negativfall**: für `authRequired: true` Endpunkte ohne / mit
  falschem Token → 401/403.
- **Nachvollziehbarkeit**: falls `X-Correlation-Id` mitgegeben, muss der
  Wert im Response-Header oder Log auftauchen; Fehler müssen strukturiert
  sein (`{ ok:false, error, code? }`).

Der Runner ruft **Route-Handler direkt** auf (kein Netz, kein Dev-Server),
so wie es die bestehenden Tests machen. Ergänzend eine kleine
Playwright-Suite (`e2e/api-smoke.spec.ts`) für echten HTTP-Round-Trip
gegen Vite auf 8080, gated durch `E2E=1`.

### 3. Reporter (`scripts/api-matrix/generate.mjs`)
Liest die Registry (via `tsx`) und generiert:
- `test-report/api-matrix.md` — Tabelle: Endpoint | Methode | Auth |
  Permission | Scope | Req-Schema | Resp-Schema | Cases (n) | Status |
  offene Risiken.
- `test-report/api-matrix.json` — maschinenlesbar für Diffs.
- Wird von `bun run test:api` nach dem Runner ausgeführt.

### 4. CI-Gate (`.github/workflows/ci.yml`)
Neuer Job-Step `test:api`:
- Läuft nach Unit-Tests, vor E2E.
- **Kritisch = Build-Fail** (Exit 1): Secrets/Stacktraces im Response,
  falsche Statuscodes bei Auth-Fällen, Registry-Eintrag ohne Runner-
  Cases.
- **Warn** (Exit 0, im Report markiert): fehlende Correlation-ID,
  fehlende CORS-Header wenn `corsExpected: false`.
- Upload `test-report/api-matrix.{md,json}` als Artefakt.

### 5. Handbuch + ADR
- **`src/lib/help-documentation.ts`**: neues Kapitel `api-endpoint-tests`
  (Testumfang, Ausführung `bun run test:api`, Fehlerinterpretation nach
  Case-Kategorie, Sicherheitsgrenzen — kein Live-Azure, keine Prod-DB —,
  bekannte Einschränkungen: nur Handler-Level außer E2E-Smoke).
  `DOCUMENTATION_VERSION` → 1.9.0.
- **`docs/ADR/0011-api-endpoint-contract-tests.md`**: Warum Registry statt
  Test-pro-Datei, warum Handler-direct statt HTTP, Migration-Weg für neue
  Routen.
- **`CHANGELOG.md`**: v1.30.0 Eintrag.

### 6. Migration bestehender Tests
`src/__tests__/api/status.route.test.ts` und `sync.route.test.ts` werden
gelöscht — der Runner deckt sie vollständig ab. `security.route`-Tests in
`src/__tests__/security/rbac-endpoints.test.ts` bleiben bestehen
(anderer Fokus: RBAC-Matrix-Konsistenz, nicht HTTP-Kontrakt).

## Technisch: Abgrenzungen und bewusste Trade-offs

- **Handler-direct statt HTTP-Round-Trip als Default**: schnell, kein
  Port-Handling, deterministisch. **Trade-off**: umgeht Middleware-Stack
  (CORS-Header vom Framework, Body-Size-Limits des Workers). Deshalb der
  zusätzliche Playwright-Smoke gegen 8080 — bewusst schmal, nur die Fälle
  die Handler-Level nicht sehen können.
- **Response-Schema mit Zod**: die Registry deklariert das Schema; wenn
  eine Route ihr Response-Shape ändert, bricht der Test. Das ist genau
  der Sinn — Schema-Drift ist der häufigste API-Regression-Vektor.
- **Oversize-Payload = 1 MB**, nicht 100 MB: der Test-Runner soll nicht
  Minuten dauern. Real-World-DoS-Grenzen gehören in die Worker-Config
  (`wrangler.jsonc`), nicht in Vitest.
- **Kein Fuzzing / kein Property-Based**: bewusst außen vor für v1.30.
  Wenn später konkrete Regressionen auftauchen, wäre `fast-check` die
  10-Zeilen-Ergänzung im Runner. Nicht spekulativ jetzt.
- **Azure-/RBAC-Endpoints als Placeholder-Einträge**: Registry-Einträge
  mit `status: "planned"` und leerer `cases`-Liste. Der Runner
  überspringt sie mit `test.todo`, damit sie im Matrix-Report sichtbar
  bleiben ("bekannte Lücke") ohne CI rot zu färben.

## Offene Fragen (blockieren den Plan nicht, aber gut zu wissen)

1. Soll die Registry auch die **archivierten Legacy-Routen** unter
   `archive/legacy-standalone-backend/routes/` dokumentieren (Status
   `archived`), oder komplett ignorieren? Vorschlag: ignorieren — sie
   sind nicht im Live-Bundle.
2. Ist `SYNC_TRIGGER_TOKEN` in Tests via ENV-Fixture ok, oder soll der
   Runner den PROD-Auth-Pfad nur mit `AZURE_TEST_LIVE`-ähnlichem Gate
   testen? Vorschlag: gesetztes Test-Token im MSW-Env (`test:` Prefix),
   damit beide Auth-Pfade abgedeckt sind.

## Kritischer Punkt vorab

Der Prompt fordert "Correlation-ID" als Nachvollziehbarkeit — die gibt es
im aktuellen Code **nicht**. Zwei Optionen:
- **A**: Runner asserted nur "wenn vorhanden, dann korrekt" — dokumentiert
  Lücke im Matrix-Report als `openRisk`.
- **B**: Correlation-ID im gleichen PR nachrüsten (Middleware, die
  `X-Correlation-Id` durchreicht / generiert, Logger-Kontext).

Vorschlag: **A** für v1.30.0, **B** als separater Prompt danach —
sonst wird der PR zu groß und mischt Test-Infrastruktur mit
Runtime-Änderungen.
