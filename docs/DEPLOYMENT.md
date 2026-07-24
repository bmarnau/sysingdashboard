# Deployment Guide

## Auth-Inbetriebnahme (Erstinstallation)

1. **Cloud → Users → URL-Konfiguration**: Zulässige Redirect-URLs eintragen
   (mindestens `https://sysingdashboard.lovable.app/**` und aktuelle
   Preview-URL sowie `/reset-password`). Keine Wildcard `*`.
2. **Confirm email**, **HIBP** aktiv (per `configure_auth` gesetzt),
   Anonymous-Signups deaktiviert.
3. **Ersten Benutzer** über `/auth` selbst registrieren — der DB-Trigger
   `handle_new_user` weist ihm atomar `systemadministrator` zu.
   Kein Passwort im Repo, kein Seed, keine manuelle Rollenvergabe.
4. Weitere Benutzer starten als `viewer` und werden vom Sysadmin
   über die Benutzerverwaltung hochgestuft.

Reparaturpfad, falls ein Auth-Benutzer vor Trigger-Installation existiert
(nicht der Regelfall — DB ist bei Erstinstallation leer):

```sql
-- Nur ausführen wenn der Benutzer eindeutig identifiziert ist.
-- Ersetze <UUID> durch die auth.users.id des Erstadmins.
INSERT INTO public.profiles (id, email)
  SELECT id, COALESCE(email, '') FROM auth.users WHERE id = '<UUID>'
  ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES ('<UUID>', 'systemadministrator', '<UUID>')
  ON CONFLICT DO NOTHING;
```



Das Dashboard deployed als **TanStack Start** auf **Cloudflare Worker**
(`compatibility_date: 2025-09-24`, `nodejs_compat`).

Konfiguration: [`wrangler.jsonc`](../wrangler.jsonc), Entry: `src/server.ts`.

## Environment Variables

Alle Werte in `.env` lokal (nicht committen) bzw. als Wrangler/Lovable-Secret
in Production.

| Variable                | Zweck                                  | Pflicht (PROD) |
| ----------------------- | -------------------------------------- | -------------- |
| `VITE_SUPABASE_URL` | Client-Auth-URL, statisch ins Vite-Bundle ersetzt | Ja |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable Auth-Key für Browser-Client | Ja |
| `VITE_SUPABASE_PROJECT_ID` | Projektkennung für Startprüfung/Diagnose | Ja |
| `SUPABASE_URL` | Server-seitige Auth-/DB-URL | Ja |
| `SUPABASE_PUBLISHABLE_KEY` | Server-seitiger Publishable Key für Bearer-validierte Requests | Ja |
| `AZURE_SQL_CONNECTION`  | Verbindung zur Azure SQL DB            | Nur Azure-Live¹ |
| `AZURE_TABLE_CONNECTION`| Azure Table Storage                    | Nur Azure-Live¹ |
| `AZURE_STORAGE_SAS`     | SAS-URL für Blob Storage               | Nur Azure-Live¹ |
| `AZURE_CLIENT_ID`       | Entra-App-Registration (App-Only)      | Nur Azure-Live¹ |
| `AZURE_TENANT_ID`       | Entra-Tenant                           | Nur Azure-Live¹ |

¹ Nur nötig, sobald Azure-Sync live aktiviert wird. Ohne diese Werte startet
das Dashboard trotzdem; `/api/status` meldet die fehlende Azure-Konfiguration
secret-frei, blockiert aber Anmeldung und Health nicht.

Die drei `VITE_SUPABASE_*`-Werte werden ausschließlich zur Build-Zeit per
statischem Zugriff (`import.meta.env.VITE_SUPABASE_URL` usw.) ersetzt. Nach
Änderungen an der Lovable-Cloud-Verbindung muss die veröffentlichte App über
„Update" im Publish-Dialog neu gebaut werden.

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
