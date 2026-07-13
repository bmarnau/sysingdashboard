## Kritischer Befund vorab

Nicht das gesamte `/backend/` ist tot. Die TanStack-Server-Routen
`src/routes/api/status.ts` und `src/routes/api/sync.ts` importieren
weiterhin `backend/services/{statusService,syncService,ensure-env}.mjs`.
Diese laufen also **produktiv im Cloudflare-Deployment** und dürfen nicht
verschoben werden — sonst bricht der Build.

Tatsächlich obsolet ist nur das **Standalone-Node-Server-Gerüst** (Express-artiger
lokaler Dev-Server), das seit v1.16.0 durch die TanStack-Routen abgelöst wurde:

- `backend/server.mjs` — startet den lokalen HTTP-Listener; wird von
  keinem Runtime-Pfad und keinem npm-Script mehr aufgerufen.
- `backend/routes/status.mjs`, `backend/routes/sync.mjs` — Adapter, die
  `services/*` an Node-`http` hängen; von den TanStack-Routen ersetzt.
- `backend/README.md` — beschreibt den Standalone-Betrieb.

`backend/services/*.mjs` und `backend/services/logger.mjs`, `rbac.mjs`
**bleiben unverändert** — sie sind die framework-freie Business-Logik,
die sowohl das (jetzt archivierte) Standalone-Backend als auch die
TanStack-Routen nutzen.

## Zielstruktur

```text
archive/
└── legacy-standalone-backend/
    ├── README.md         ← Kontext + Wiederherstellungs-Anleitung
    ├── server.mjs        ← ex-backend/server.mjs
    └── routes/
        ├── status.mjs    ← ex-backend/routes/status.mjs
        └── sync.mjs      ← ex-backend/routes/sync.mjs

backend/
├── README.md             ← neu geschrieben: „Nur Services, kein Server"
└── services/             ← unverändert, weiter produktiv
    ├── ensure-env.mjs
    ├── logger.mjs
    ├── rbac.mjs
    ├── statusService.mjs
    └── syncService.mjs
```

## Dateiänderungen

1. **Neu:** `archive/README.md` — erklärt Zweck des Archivs, Regel „Build ignoriert /archive/".
2. **Neu:** `archive/legacy-standalone-backend/README.md` — was war das, wann/warum
   ersetzt (v1.16.0 → TanStack Server-Routen), wie im Notfall reaktivieren.
3. **Verschieben** via `mv`:
   - `backend/server.mjs` → `archive/legacy-standalone-backend/server.mjs`
   - `backend/routes/` → `archive/legacy-standalone-backend/routes/`
4. **Ersetzen:** `backend/README.md` — Kurzfassung: „Enthält framework-freie
   Services, die von `src/routes/api/*` importiert werden. Kein eigener
   HTTP-Server mehr — Historie unter `archive/legacy-standalone-backend/`."
5. **Anpassen:** `scripts/check-no-console.mjs` — Zeile 33
   (`"backend/routes"`) entfernen (Pfad existiert nicht mehr) und
   verifizieren, dass `backend/server.mjs`-Referenz ebenfalls raus muss.
6. **Anpassen:** `scripts/security-check.mjs` — Zeile 110
   (`rel.startsWith("backend/")`) bleibt korrekt für `backend/services/`,
   keine Änderung nötig; nur prüfen.
7. **Anpassen:** `.gitleaks.toml`, `.github/workflows/*.yml` — grep, ob
   `backend/server.mjs` / `backend/routes` referenziert wird; anpassen falls ja.
8. **Doku-Updates:**
   - `docs/API.md` — Kapitel „Standalone-Backend" umschreiben auf
     „Historisch, siehe archive/…".
   - `docs/ARCHITECTURE.md` — Zeilen 18 / 34 / 43 aktualisieren
     („Node-Backend" entfällt, nur noch Services).
   - `CHANGELOG.md` — neuer Patch-Eintrag `v1.27.2 - 2026-07-13`:
     „Legacy-Standalone-Backend archiviert. Keine Runtime-Änderung."
   - `src/lib/help-documentation.ts` — `lastUpdated: "2026-07-13"` bumpen.

## Verifikation (nach Umbau)

- `bun run docs:check` — muss grün bleiben.
- `bun run build:dev` — muss grün bleiben; sichert, dass die
  TanStack-Routen ihre Service-Imports weiterhin auflösen.
- `bun run lint:no-console` und `bun run security:check` — grün.
- Grep-Kontrolle: `rg "backend/(server\.mjs|routes)" -g '!archive/**' -g '!CHANGELOG.md' -g '!docs/**'`
  liefert keine Treffer.

## Bewusst NICHT angefasst (aus Sicherheitsgründen)

- `backend/services/**` — produktiv genutzt.
- `config/envValidator.mjs`, `config/keyVault.mjs` — laut vorheriger
  ADR-Iteration ausdrücklich als Fassade/Stub für die Azure-Key-Vault-
  Vorbereitung erhalten; nicht Teil dieses Prompts.
- `.env.example`, `config/entraMapping.example.json`, generierte
  Security-Reports — vom User-Umfang ausgeschlossen.

## Rollback

Reversibel per `mv archive/legacy-standalone-backend/{server.mjs,routes} backend/`
plus `backend/README.md` zurücksetzen.
