# Sysing Dashboard — Architektur

Stand: 2026-08-07 · Version: siehe `CHANGELOG.md` (Single Source of Truth)
· Steuerungsebene: [`docs/PROJECT-GOVERNANCE.md`](./PROJECT-GOVERNANCE.md) und
[`docs/PROJECT-STATUS.yaml`](./PROJECT-STATUS.yaml)

Dieses Dokument beschreibt den **Ist-Zustand** der Codebasis. Geplante Bausteine sind
ausdrücklich als *geplant* gekennzeichnet und besitzen heute keinen Code.
Entscheidungen mit Trade-offs stehen einzeln in [`docs/ADR/`](./ADR/).

---

## 1. Architekturübersicht

| Ebene       | Technologie / Ort                                                        |
| ----------- | ------------------------------------------------------------------------ |
| Frontend    | React 19 + TanStack Start v1 (SSR, File-based Routing) + Vite 7           |
| Styling     | Tailwind CSS v4 + oklch-Design-Tokens in `src/styles.css`                 |
| UI-Kit      | shadcn/ui (Radix Primitives) + Lucide Icons                               |
| State       | Pub-Sub-Store (`src/lib/store/`) + `useSyncExternalStore`                 |
| Persistenz  | `localStorage` (user-scoped) · IndexedDB (Logs, Downloads) · Supabase     |
| Identität   | Supabase Auth (E-Mail/Passwort), Profile + Rollen in Postgres mit RLS     |
| Server      | TanStack Server-Routes auf Cloudflare Worker (`nodejs_compat`)            |
| Services    | `src/lib/*` (Client) · `backend/services/*` (framework-freie ESM-Module)  |
| Governance  | Project Manifest + Validator + CI-Gates                                   |
| CI          | GitHub Actions: static, lint, docs, tests, security, tech-debt, build     |

```text
┌──────────────────────────── Browser ────────────────────────────┐
│ Routes (src/routes)  →  Views/Dialoge (src/components)          │
│        │                        │                                │
│        ▼                        ▼                                │
│ Hooks / Facades (src/hooks)  ── Store (src/lib/store)            │
│        │                        │                                │
│        ▼                        ▼                                │
│ Services (src/lib/*: backup, export, import, pdf, rbac, session) │
│        │                        │                                │
│        ▼                        ▼                                │
│ Persistenz: localStorage (user-scoped) · IndexedDB (Logs/Downloads)│
└───────────────┬─────────────────────────────┬────────────────────┘
                │ HTTPS                       │ supabase-js
                ▼                             ▼
   ┌──────────────────────┐        ┌────────────────────────────┐
   │ Server-Routes        │        │ Supabase                   │
   │ /api/status /api/sync│        │ Auth · profiles ·          │
   │ /api/public/*        │        │ user_roles · app_settings  │
   │ (Cloudflare Worker)  │        │ RLS + Grants + Audit       │
   └──────────┬───────────┘        └────────────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ Azure (geplant/opt.) │
   │ SQL · Table · Blob   │
   └──────────────────────┘
```

---

## 2. Schichtenmodell

| Schicht | Ort | Darf importieren | Darf **nicht** importieren |
| --- | --- | --- | --- |
| Routen / UI | `src/routes`, `src/components` | Hooks, Services (öffentliche API), UI-Kit | Persistenzmodule direkt (`src/lib/store/*-persistence`), `*.server.ts` |
| Hooks / Facades | `src/hooks` | Services, Store, Persistenz | UI-Komponenten |
| Services | `src/lib/*` | andere Services, Persistenz, Plattform-Clients | Routen, Komponenten |
| Persistenz / Repository | `src/lib/store/*`, `src/integrations/supabase/*` | Plattform-SDKs | UI, Hooks |
| Serverseite | `src/routes/api/*`, `backend/services/*` | Node-/Worker-APIs, `config/*` | Browser-Code |

Durchsetzung: `scripts/tech-debt/detectors/layer-violations.mjs`
(Finding-Klasse `td-layer-*`), CI-Job `tech-debt`.
Beispiel für die eingezogene Grenze: die Dashboard-Route hydratisiert den Store
ausschließlich über die Facade `src/hooks/useDashboardPersistence.ts` statt über
`src/lib/store/dashboard-persistence` (behoben in v1.49.0, Finding `td-layer-d1e551ce`).

---

## 3. Frontend

- **Routing**: File-based unter `src/routes`. `__root.tsx` liefert Shell, Head-Metadaten
  und Provider. Geschützte Seiten liegen unter `src/routes/_authenticated/` hinter dem
  Route-Gate `_authenticated/route.tsx` (Redirect nach `/auth` inkl.
  Open-Redirect-Schutz über `buildSafeInternalTarget`).
- **Store**: modul-globaler Pub-Sub-Store (`dashboardStore`) für `engineer`, `projects`,
  `workPackages`, `activities`; Bindung über Selektor-Hooks und `useSyncExternalStore`
  ([ADR-0004](./ADR/0004-pubsub-store-no-zustand.md)).
- **Dialoge**: 11 selten genutzte Dialoge sind per `React.lazy` ausgelagert und gegen
  ihren `open`-State gegated; `jspdf`, `jspdf-autotable` und `recharts` verlassen dadurch
  den Initial-Bundle.
- **i18n**: `src/lib/i18n/` (de/en) mit Deutsch als Standard; Formatierung in `format.ts`.
- **Barrierefreiheit**: WCAG 2.1 AA als Zielmaß, geprüft über `src/__tests__/a11y/` und
  `e2e/specs/a11y.spec.ts`.

---

## 4. Services

**Client-Services** (`src/lib/`) — jeweils ein fachlicher Zuständigkeitsbereich:
`backup/` (13 Module, Fassade `backup-service.ts`), `export-*`, `json-import-service`,
`json-export-service`, `pdf-export`, `engineer-performance`, `rbac/`, `session/`,
`logger*`, `correlation`, `user-management`, `users-supabase-service`.

**Server-Services** (`backend/services/`) — framework-freie ESM-Module ohne eigenen
Server: `syncService`, `statusService`, `ensure-env`, `logger`, `rbac`. Sie werden von
den TanStack-Server-Routes importiert (siehe [ADR-0001](./ADR/0001-tanstack-start.md)).
Der historische Standalone-Node-Server liegt unter `archive/legacy-standalone-backend/`
und ist nicht Teil des Builds.

---

## 5. Persistenz und Repository-Grenze

- **Domänendaten**: `localStorage`, debounced 300 ms, Schlüssel user-scoped
  (`<key>::<userId>`, `userScopedKey()`), Cross-Tab-Sync über das `storage`-Event
  ([ADR-0003](./ADR/0003-local-first-localstorage.md)).
- **Logs**: IndexedDB-Ringbuffer (`logger.indexeddb.ts`), kein Netzwerk-Export ohne
  Benutzeraktion ([ADR-0005](./ADR/0005-frontend-logger-no-sentry.md)).
- **Downloads**: IndexedDB-Ablage mit Metadaten und Aufbewahrungsfrist
  (`export-download-service.ts`).
- **Supabase**: Identität, Rollen und anwendungsweite Einstellungen.

Prinzip **Local-First**: Edits landen sofort lokal; Cloud-Synchronisation ist ein
bewusst ausgelöster Vorgang, kein Live-Two-Way-Sync.

---

## 6. Supabase

| Objekt | Zweck | Zugriff |
| --- | --- | --- |
| `auth.users` | Identität (E-Mail/Passwort) | Supabase-verwaltet |
| `public.profiles` | Anzeigename, Kontostatus | RLS: eigener Datensatz, Admin über `has_role` |
| `public.user_roles` | Rollenzuordnung (separate Tabelle, nie am Profil) | RLS + Security-Definer-Funktion |
| `public.app_settings` | globale Einstellungen (z. B. Idle-Timeout) | Lesen authentifiziert, Schreiben Admin |

- Rollenprüfung über die Security-Definer-Funktion `has_role(uuid, app_role)`,
  Kontostatus über `is_account_active(uuid)`; `EXECUTE` ist von `PUBLIC` entzogen.
- Jede Tabelle im Schema `public` besitzt explizite `GRANT`s zusätzlich zu RLS.
- Client-Zugriff über `src/integrations/supabase/client.ts`; defensiver Wrapper
  `safe-client.ts` und Startprüfung `env-check.ts` verhindern harte Startfehler bei
  fehlender Konfiguration, mit Laufzeit-Fallback über `/api/public/auth-config`.

---

## 7. RBAC

Zwei Ebenen, bewusst getrennt:

1. **Frontend-RBAC** (`src/lib/rbac/`, `PermissionGate`, `usePermission`) — reine
   UX-Steuerung, **keine** Security-Boundary ([ADR-0002](./ADR/0002-frontend-rbac-mirrored.md)).
2. **Serverseitige Grenze** — RLS-Policies plus Prüfungen in den Server-Routes.
   Erst diese Ebene ist verbindlich.

Modell: 7 Rollen, Scopes und Ressourcen nach
[ADR-0007](./ADR/0007-rbac-v2-scopes-and-resources.md) und
[ADR-0008](./ADR/0008-rbac-v2-assignment-architecture.md).
Die Spiegelung zwischen `src/lib/rbac` und `backend/services/rbac.mjs` prüft
`scripts/check-rbac.mjs` in CI. Matrix: [`docs/RBAC-MATRIX.md`](./RBAC-MATRIX.md).

---

## 8. Backup und Restore

Format **2.0** ([ADR-0022](./ADR/0022-backupformat-2.md)), Module unter `src/lib/backup/`
([ADR-0021](./ADR/0021-backup-service-modularisierung.md)):

- Das Manifest enthält eine `entries[]`-Tabelle: fachlicher Inhaltstyp → Speicherpfad im
  ZIP. **Dateinamen haben keine fachliche Bedeutung mehr.**
- Je Eintrag eine WebCrypto-Prüfsumme `sha256:<hex>`; Restore verifiziert vor dem Schreiben.
- Restore arbeitet ausschließlich über `entries[]`, transaktional mit Rollback-Snapshot.
- Backups im Altformat 1.x werden beim Lesen intern migriert.
- Verifikation: `src/__tests__/backup/*`, Report `scripts/backup-integrity/report.mjs`.

---

## 9. Project Manifest und Governance

Steuerungsebene über dem Code:

- [`docs/PROJECT-GOVERNANCE.md`](./PROJECT-GOVERNANCE.md) — Vision, Architekturprinzipien,
  Definition of Done, Versionierungs- und Dokumentenregeln.
- [`docs/PROJECT-STATUS.yaml`](./PROJECT-STATUS.yaml) — maschinenlesbares Manifest
  (Phasen, Sprints, Roadmap, Risiken, technische Schulden, Qualität, Release).
- [`docs/project-status.schema.json`](./project-status.schema.json) — formaler Vertrag
  (JSON Schema 2020-12).
- `scripts/project-status/check.mjs` (`bun run project-status:check`) — prüft Schema,
  Versionsgleichheit mit `CHANGELOG.md`, eindeutige IDs, Sprint-Referenzen und Roadmap.
  Getestet durch `src/__tests__/scripts/project-status-validator.test.ts`.
- Der Prüfbericht (`scripts/technical-report/`) aggregiert alle Prüfbereiche zu einem
  versionierten, hashgesicherten Bericht (Schema 2.0,
  [ADR-0017](./adr/ADR-0017-technical-test-report.md)).

Phasenmodell: [ADR-0023](./ADR/0023-phasenmodell-infrastrukturabschluss.md).

---

## 10. Geplante Bausteine (heute kein Code)

| Baustein | Zielbild | Sprint |
| --- | --- | --- |
| **Reference Data** | Zentrale Stammdatenschicht (Kataloge, Klassifizierungen) als eigener Service mit eigener Supabase-Tabelle und Cache im Store | nach 07 |
| **AVKK** | Fachliche Erweiterung der Arbeitspakete: eigenes Datenmodell, Migration mit RLS/Grants, Berücksichtigung in Import/Export/Backup | 07 |
| **Report Service** | Serverseitig erzeugte, versionierte Berichte statt clientseitigem PDF-Bau | nach 08 |
| **Microsoft 365** | Graph-Anbindung (Kalender, Aufgaben, SharePoint) über Server-Routes, Entra-ID-Identität | später |
| **KI-Agenten** | Lesende Agenten auf Manifest, Prüfbericht und Tagebuch; Schreibzugriff nur über regulären Commit (`mcpAndAgents.guardrails`) | später |

Regel: Kein geplanter Baustein darf implizit über UI-Code entstehen — er beginnt mit ADR
und Manifest-Eintrag.

---

## 11. Betrieb: Docker und Azure-Zielarchitektur

**Heute**: Build über Vite, Auslieferung als Cloudflare-Worker-Bundle (SSR + Server-Routes),
Supabase als verwaltete Plattform.

**Docker (Zielbild)**: Das Prinzip `portable-runtime` verlangt, dass Lovable Cloud keine
unersetzbare Laufzeitabhängigkeit ist. Voraussetzung dafür ist bereits erfüllt: keine
proprietären Laufzeit-APIs im Anwendungscode, Konfiguration ausschließlich über Env-Variablen
(`config/envValidator.mjs`). Offen: Container-Image, Reverse-Proxy-Konfiguration,
Health-Endpunkt-Ableitung aus `/api/status`.

**Azure (Zielbild)**: Azure SQL (relationale Domänendaten), Azure Table Storage
(append-orientierte Sync-Daten), Blob Storage (Backups, Reportarchiv), Entra ID
(Identität statt Supabase Auth). Der Migrationspfad ist durch `provider-separation`
vorbereitet: Fachlogik kennt keine Provider-Details, Azure-Aufrufe laufen ausschließlich
serverseitig und sind im Runtime-Mode `development` durch `assertAzureAllowed` blockiert.

---

## 12. Trust-Boundaries und Runtime-Grenzen

| Boundary | Wer vertraut wem | Enforcement |
| --- | --- | --- |
| Browser ↔ Server-Route | Server vertraut Browser **nicht** | Zod-Validierung, Bearer-Prüfung in `/api/sync` |
| Browser ↔ Supabase | Datenbank vertraut Client nicht | RLS + Grants + Security-Definer-Funktionen |
| Server-Route ↔ Azure | beidseitig authentifiziert | `config/secretManager.mjs` |
| Frontend-RBAC | UI-Komfort, keine Sicherheitsgrenze | ADR-0002 |
| Logs → IndexedDB | lokal, Redaction aktiv | `logger.ts` (Credential-Redaction) |

**Cloudflare Worker (`nodejs_compat`)**: erlaubt sind `fs`, `path`, `crypto`, `Buffer`,
`stream`, `url`, `zlib`, `http(s)`, `net`; nicht erlaubt sind `child_process`,
`sharp`/`canvas`/`puppeteer`, `fs.watch` und Native-Addons. Alle Pakete werden zur
Build-Zeit gebundelt; `process.env.*` nur innerhalb von Handler-Bodies lesen.

---

## 13. Weiterführend

- [`docs/API.md`](./API.md) — Server-Routen
- [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) — Build & Ops
- [`docs/DATA-SCHEMA.md`](./DATA-SCHEMA.md) — Export-/Backupformat und Versionierung
- [`docs/SESSION-TIMEOUT.md`](./SESSION-TIMEOUT.md) — Inaktivitäts-Logout
- [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) — Dev-Workflow & Doku-Sync-Pflicht
- [`docs/technical-report-2.md`](./technical-report-2.md) — Prüfbericht 2.0
- [`docs/ADR/`](./ADR/) — Alle Architekturentscheidungen
