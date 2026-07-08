# Plan: Architecture Decision Records & Architektur-Doku

## Kritisches Feedback zum Original-Prompt

Bevor ich losschreibe, drei Punkte, die ich anders machen möchte als vorgeschlagen — sag Bescheid, wenn du eins davon trotzdem so haben willst:

1. **`CONTRIBUTING.md` existiert bereits** (`docs/CONTRIBUTING.md`, gut gepflegt, mit Doku-Sync-Pflicht und CI-Regeln). Ich ersetze sie **nicht**, sondern verlinke sie aus `README` und `ARCHITECTURE.md`. Der Prompt-Vorschlag ist deutlich dünner als das Bestehende.
2. **`docs/DATA-SCHEMA.md` doppelt `src/lib/json-schema.ts`** — die einzige Wahrheit ist heute der TS-Typ + JSON-Schema-Datei. Ich schreibe stattdessen eine **kurze `DATA-SCHEMA.md`, die auf `src/lib/json-schema.ts` verweist** und nur die Versionierungs-Policy + Migrationsregeln dokumentiert (sonst driftet die Doku garantiert).
3. **ADR-Nummerierung**: Ich lege 5 ADRs an (nicht 3), inklusive der zwei „stillen" Entscheidungen, die in bisherigen Prompts implizit getroffen wurden — Pub-Sub-Store statt Zustand/Redux und Frontend-Logger statt Sentry. Sonst tauchen die nie in der ADR-Historie auf, obwohl sie klar reviewbedürftig sind.

Kein LLM-Buzz, keine Diagramme aus dem Nichts — nur Ist-Zustand + Begründung.

## Deliverables

### Neu
- `docs/ARCHITECTURE.md` — System-Übersicht, Modulgrenzen, Datenfluss (ASCII), Runtime-Grenzen (Cloudflare Worker + nodejs_compat), Trust-Boundaries
- `docs/ADR/README.md` — Index + Template (Format: Kontext / Entscheidung / Konsequenzen / Status)
- `docs/ADR/0001-tanstack-start.md` — TanStack Start v1 statt Next.js/Remix
- `docs/ADR/0002-frontend-rbac-mirrored.md` — RBAC im Frontend gespiegelt (aktueller Zustand: kein echter Auth-Layer, `can()` = UI-Komfort; `check-rbac.mjs` garantiert Parity zu `backend/services/rbac.mjs`)
- `docs/ADR/0003-local-first-localstorage.md` — localStorage + Dashboard-Store, user-scoped Keys, kein IndexedDB (außer Logger)
- `docs/ADR/0004-pubsub-store-no-zustand.md` — eigener Pub-Sub + `useSyncExternalStore` statt Zustand/Redux (Zero-Dep, Referenz-Stabilität)
- `docs/ADR/0005-frontend-logger-no-sentry.md` — Logger + IndexedDB-Ringbuffer statt Sentry/Datadog (Privacy, Kosten, PII-Kontrolle)
- `docs/API.md` — nur die zwei realen Endpoints: `GET /api/status` und `POST /api/sync` mit Request/Response-Schema und Auth-Status („aktuell keine Auth")
- `docs/DEPLOYMENT.md` — Cloudflare Worker (wrangler.jsonc), ENV-Variablen aus `.env.example`, GitHub-Actions-Workflow-Übersicht, Rollback via CHANGELOG-Version
- `docs/DATA-SCHEMA.md` — Verweis auf `src/lib/json-schema.ts` + Versionierungs-/Migrationsregeln

### Geändert
- `README.md` — neue Sektion „Weiterführende Dokumentation" mit Links auf alle obigen Dateien + `docs/CONTRIBUTING.md`
- `src/lib/help-documentation.ts` — neuer Handbuch-Topic `architektur` mit Kurzfassung + Verlinkung auf `docs/`, `lastUpdated` gesetzt
- `CHANGELOG.md` — neuer Eintrag `## 1.24.0 - 2026-07-08` mit ADR-Auflistung
- `scripts/check-docs-sync.mjs` — falls es ADR-Dateien scanned: sicherstellen, dass es die neuen Files akzeptiert (nur wenn nötig, sonst unverändert)

### Bewusst NICHT gemacht
- Keine Mermaid-/PlantUML-Diagramme (Repo hat keinen Renderer; ASCII reicht und diffed sauber)
- Kein separates `CONTRIBUTING.md`-Rewrite
- Kein Copy-Paste des `json-schema.ts` in Markdown

## Umfang & Format der ADRs

Jedes ADR ~40–80 Zeilen, striktes Format:

```text
# ADR-000X: <Titel>
Status: Accepted | Datum: YYYY-MM-DD

## Kontext
Was war das Problem, welche Constraints galten.

## Entscheidung
Was wurde gewählt, klar und knapp.

## Alternativen
Was wurde verworfen, mit Ein-Satz-Begründung je Option.

## Konsequenzen
Positive + negative, inkl. bekannter Trade-offs.

## Trust-Boundary / Security-Note (nur wo relevant)
```

## Nach der Implementation
- `bun run docs:check` grün
- `bun run lint` grün
- Keine neuen Tests nötig (reine Doku)

## Offene Fragen
1. **ADR-0002 (Frontend-RBAC)**: Soll ich den aktuellen Zustand („keine echte Auth, RBAC ist UI-Komfort") explizit als **Risk** im ADR markieren, oder milder als „Interim-Zustand bis Entra ID"? Ich tendiere zu explizit — das ist ehrlicher gegenüber neuen Entwicklern.
2. **Sprache**: Alles auf **Deutsch** (Rest der Doku ist Deutsch) — okay?
