# Deployment Guide

Das Dashboard deployed als **TanStack Start** auf **Cloudflare Worker**
(`compatibility_date: 2025-09-24`, `nodejs_compat`).

Konfiguration: [`wrangler.jsonc`](../wrangler.jsonc), Entry: `src/server.ts`.

## Environment Variables

Alle Werte in `.env` lokal (nicht committen) bzw. als Wrangler/Lovable-Secret
in Production.

| Variable                | Zweck                                  | Pflicht (PROD) |
| ----------------------- | -------------------------------------- | -------------- |
| `AZURE_SQL_CONNECTION`  | Verbindung zur Azure SQL DB            | Ja¹            |
| `AZURE_TABLE_CONNECTION`| Azure Table Storage                    | Ja¹            |
| `AZURE_STORAGE_SAS`     | SAS-URL für Blob Storage               | Ja¹            |
| `AZURE_CLIENT_ID`       | Entra-App-Registration (App-Only)      | Ja¹            |
| `AZURE_TENANT_ID`       | Entra-Tenant                           | Ja¹            |

¹ Nur nötig, sobald Azure-Sync aktiviert wird. Ohne diese Werte läuft das
Dashboard mit Mock-/Local-Only-Daten (siehe `config/secretManager.mjs`).

Vollständige Vorlage: [`.env.example`](../.env.example).

`process.env.*` darf nur **innerhalb** von `.handler()`-Bodies gelesen werden
— Env wird zum Call-Zeitpunkt injiziert, nicht bei Modul-Load.

## Build & Deploy

### Lokal (Dev)
```bash
bun install
bun run dev      # Vite Dev Server (SSR)
```

### Production Build
```bash
bun run build    # → optimiertes Worker-Bundle
```
Automatische Prüfungen davor: `bun run lint`, `bun run docs:check`, Tests
(via CI). Nie manuell überspringen.

### Deploy
Zwei Wege:
1. **Lovable** — Publish-Button oben rechts. Frontend-Änderungen erfordern
   „Update" im Publish-Dialog; Backend-Änderungen (Server-Routen, ENV) gehen
   sofort live.
2. **Wrangler direkt** (nur für self-hosted):
   ```bash
   bunx wrangler deploy
   ```

### URLs
- Stabile Preview: `project--<project-id>-dev.lovable.app`
- Stabile Production: `project--<project-id>.lovable.app`
- Custom Domain: konfigurierbar über Project Settings → Domains (nach erstem
  Publish).

## CI/CD

`.github/workflows/ci.yml` läuft bei jedem Push/PR:

1. `bun install`
2. `bun run lint`
3. `bun run docs:check`
4. `bun run test:coverage` (inkl. A11y-Tests via `vitest-axe`)
5. `bun run build`

`.github/workflows/security.yml`:
- Gitleaks (Secret-Scan gegen `.gitleaks.toml`)
- `scripts/security-check.mjs`
- `scripts/check-rbac.mjs` (Frontend/Backend-Permission-Parity)

Schlägt ein Schritt fehl, ist der PR blockiert.

## Rollback

Version = oberster Eintrag in [`CHANGELOG.md`](../CHANGELOG.md) (Single Source
of Truth). Rollback: vorherigen Git-Commit re-deployen (Lovable-Versionshistorie
oder `wrangler deployments list` + `wrangler rollback <id>`).

## Runtime-Constraints

Cloudflare Worker mit `nodejs_compat` erlaubt **nicht**: `child_process`,
Native-Addons (`sharp`, `canvas`), `fs.watch`, `puppeteer`. Details:
[`ARCHITECTURE.md § 4`](./ARCHITECTURE.md#4-runtime-grenzen-cloudflare-worker).

## Backups

- Automatisches lokales ZIP-Backup einmal pro Kalendertag (browserseitig,
  siehe Handbuch-Kapitel „Backup").
- Server-seitig gibt es aktuell **keine** DB — nichts zu sichern.
- Nach Aktivierung von Azure: Backup-Strategie wird eigenes ADR.
