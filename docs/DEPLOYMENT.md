# Deployment Guide

Stand: 2026-08-22

Dieses Dokument trennt den **heutigen MVP-Betrieb** von der geplanten
Portabilitaet. Aktuell wird die Anwendung ueber Lovable/Cloudflare Workers
bereitgestellt und nutzt Supabase als fuehrende Authentifizierungs- und
Datenplattform. Ein autonomer Docker-Betrieb ist verbindliches Zielbild, aber
noch kein abgenommener Runtime-Pfad.

## Auth-Inbetriebnahme (Erstinstallation)

1. **Cloud → Users → URL-Konfiguration**: Zulaessige Redirect-URLs eintragen
   (mindestens `https://sysingdashboard.lovable.app/**` und aktuelle
   Preview-URL sowie `/reset-password`). Keine Wildcard `*`.
2. **Confirm email**, **HIBP** aktiv, Anonymous-Signups deaktiviert.
3. **Ersten Benutzer** ueber `/auth` selbst registrieren — der DB-Trigger
   `handle_new_user` weist ihm atomar `systemadministrator` zu.
   Kein Passwort im Repo, kein Seed, keine manuelle Rollenvergabe.
4. Weitere Benutzer starten als `viewer` und werden vom Sysadmin
   ueber die Benutzerverwaltung hochgestuft.

Reparaturpfade fuer Auth/DB gehoeren in die administrative Datenbankebene und
werden nicht mit produktiven Kennungen oder Zugangsdaten in dieser allgemeinen
Deployment-Anleitung dokumentiert. Fuer die konkreten Schutzregeln gelten die
Supabase-Migrationen, `docs/BACKEND-ADMINISTRATION.md` und die RBAC/RLS-ADRs.

## Heutige Runtime

Das Dashboard deployed als **TanStack Start** auf **Cloudflare Worker**
(`nodejs_compat`). Konfiguration: [`wrangler.jsonc`](../wrangler.jsonc),
Server-Entry: `src/server.ts`.

Die aktuelle produktive Referenzumgebung ist die Lovable-App. GitHub bleibt die
massgebliche Quelle fuer Code und Dokumentation; Lovable ist keine autoritative
Codequelle.

### Datenplattform im MVP

Supabase ist heute produktiver Bestandteil der Anwendung und fuehrt insbesondere:

- Authentifizierung (`auth.users`)
- Profile und Rollen
- globale Einstellungen
- Audit-Log
- Reference Data
- AVKK-Fuehrungsdaten

Projekte, Arbeitspakete und Taetigkeiten sind im aktuellen MVP weiterhin
Local-First/browsergebunden. Details: [`DATA-SCHEMA.md`](./DATA-SCHEMA.md) und
[`ADR-0025`](./ADR/0025-avkk-umsetzung-07b.md).

## Environment Variables

Alle Werte lokal in einer nicht versionierten Umgebung bzw. als
Provider-/Deployment-Secret in Production. Produktive Secret-Werte gehoeren
weder in GitHub noch in Dokumentation oder Prompts.

| Variable                        | Zweck                                                          | Pflicht (PROD)  |
| ------------------------------- | -------------------------------------------------------------- | --------------- |
| `VITE_SUPABASE_URL`             | Client-Auth-URL, statisch ins Vite-Bundle ersetzt              | Ja              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable Auth-Key fuer Browser-Client                        | Ja              |
| `VITE_SUPABASE_PROJECT_ID`      | Projektkennung fuer Startpruefung/Diagnose                     | Ja              |
| `SUPABASE_URL`                  | Server-seitige Auth-/DB-URL                                    | Ja              |
| `SUPABASE_PUBLISHABLE_KEY`      | Server-seitiger Publishable Key fuer Bearer-validierte Requests | Ja             |
| `AZURE_SQL_CONNECTION`          | Verbindung zur Azure SQL DB                                    | Nur Azure-Live¹ |
| `AZURE_TABLE_CONNECTION`        | Azure Table Storage                                            | Nur Azure-Live¹ |
| `AZURE_STORAGE_SAS`             | Blob-/Storage-Anbindung                                        | Nur Azure-Live¹ |
| `AZURE_CLIENT_ID`               | Entra-App-Registration                                         | Nur Azure-Live¹ |
| `AZURE_TENANT_ID`               | Entra-Tenant                                                   | Nur Azure-Live¹ |

¹ Nur noetig, sobald Azure-Sync bzw. ein Azure-Provider live aktiviert wird.
Ohne diese Werte startet der Supabase-MVP; fehlende Azure-Konfiguration darf
nicht als Ausfall des heutigen MVP interpretiert werden.

Die drei `VITE_SUPABASE_*`-Werte werden zur Build-Zeit bereitgestellt. Der
Runtime-Fallback fuer Auth-Konfiguration ist separat abgesichert. Nach Aenderung
der Deployment-Konfiguration ist ein neuer Publish-/Production-Build erforderlich,
sofern der jeweilige Wert in das Vite-Bundle eingeht.

Vollstaendige Vorlage: [`.env.example`](../.env.example).

## Build & Deploy

### Lokal (Dev)

```bash
bun install
bun run dev
```

### Production Build

```bash
bun run build
```

Vor Merge/Release gelten die GitHub-CI-Gates; insbesondere TypeScript, Tests,
Security, RBAC, Backup/Restore, Production Build, E2E und technischer
Pruefbericht duerfen nicht manuell umgangen werden.

### Aktuelle Cloud-Deploy-Pfade

1. **Lovable** — veroeffentlichte Referenzumgebung.
2. **Wrangler / Cloudflare** — direkter Worker-Deploy, sofern die notwendige
   Cloudflare-Konfiguration vorhanden ist.

Ein Wrangler-Deploy ist **kein autonomes Self-Hosting**; er bleibt ein
Cloudflare-Deployment.

### Docker / autonomer Betrieb — Zielbild

Die Governance verlangt langfristig einen autonomen Docker-Betrieb ohne
unersetzbare Lovable-Cloud-Abhaengigkeit. Die Codebasis ist darauf vorbereitet,
aber der Runtime-Pfad ist noch nicht abgenommen.

Vor einer Docker-Freigabe fehlen mindestens:

- versioniertes Dockerfile / reproduzierbares Image
- dokumentierte Runtime-ENV-Vertraege
- Reverse-Proxy-/TLS-Konzept fuer den Unternehmensbetrieb
- Healthcheck auf Basis eines dafuer geeigneten Endpunkts
- Start-/Stop-/Restart- und Persistenz-Smoke-Test
- Betriebsnachweis gegen eine vom Lovable-/Cloudflare-Hosting unabhaengige
  Umgebung

Bis diese Punkte bestanden sind, lautet der Status **Docker-Readiness vorhanden,
Containerbetrieb nicht verifiziert**.

## URLs

- Produktive Referenz: `https://sysingdashboard.lovable.app`
- Stabile Preview-/Projekt-URLs werden vom Hosting bereitgestellt und koennen
  sich providerbedingt unterscheiden.
- Kanonisches Repository: `https://github.com/bmarnau/sysingdashboard`

Interne Clone-/Hosting-Remotes sind **keine** zulaessigen
Repository-Metadaten fuer Systemstatus, Browser-Bundle oder oeffentliche API.
Diese Grenze wird seit PR #30 durch Regressionstests abgesichert.

## CI/CD

`.github/workflows/ci.yml` prueft gestaffelt unter anderem:

1. Setup
2. Format, ESLint, TypeScript, RBAC, Dokumentation und Projektmanifest
3. Unit-/Komponententests
4. Backend und API
5. Security/RBAC
6. Import/Export und Backup/Restore
7. Production Build
8. Playwright E2E und Accessibility
9. Technical Debt
10. technischen Pruefbericht und Quality Gate

`.github/workflows/security.yml` ergaenzt den separaten Secret-/Security-Scan.
Ein gruener PR-Head ist Voraussetzung fuer die kontrollierte Integration.

## Rollback

Dashboard-Version = oberster Eintrag in [`CHANGELOG.md`](../CHANGELOG.md).
Code-Rollback erfolgt ueber einen vorherigen, nachgewiesenen Git-Stand und einen
neuen kontrollierten Deploy. Ein Code-Rollback ersetzt **keinen** Datenbank-
Rollback.

## Runtime-Constraints der heutigen Cloudflare-Auslieferung

Die aktuelle Worker-Runtime (`nodejs_compat`) hat andere Grenzen als ein
spaeterer Node-/Docker-Betrieb. Native Addons und prozessgebundene Werkzeuge sind
im Worker nicht ohne Weiteres verfuegbar. Deshalb duerfen Fachlogik und
Providervertraege nicht an Cloudflare-spezifische APIs gekoppelt werden.

Details und Zielbild: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Backup und Restore

Es existieren **zwei unterschiedliche Sicherungsebenen**, die nicht vermischt
werden duerfen.

### 1. Anwendungs-/Browser-Backup

Backupformat 2.0 sichert den browsergebundenen Arbeitsbestand und fuehrt
zusaetzlich AVKK-/Reference-Data-Snapshots als Nachweis mit. Manifest und
Pruefsummen werden vor Restore validiert.

Der Browser-Restore schreibt AVKK-/Reference-Data-Snapshots bewusst **nicht** in
Supabase zurueck. Das verhindert einen nicht-transaktionalen Misch-Restore aus
lokalen und serverseitigen Daten und schuetzt Audit-/Historienketten.

Verbindliche Entscheidung: [`ADR-0026`](./ADR/0026-loeschstrategie-und-avkk-backup.md).

### 2. Supabase-/Datenbank-Wiederherstellung

Supabase fuehrt reale serverseitige Daten. Deren Wiederherstellung ist eine
**Provider-/Datenbank-Betriebsaufgabe** und kein Browser-Feature. Der aktuelle
Client-Backupdialog darf daher nicht als vollstaendige Wiederherstellung einer
verlorenen Supabase-Datenbank interpretiert werden.

Vor einem spaeteren autonomen Unternehmensbetrieb muss fuer den jeweils
verwendeten Datenbankprovider ein eigener Backup-/Restore-Nachweis vorliegen.
Ein spaeterer Wechsel zu Azure SQL/Table/Blob benoetigt entsprechend einen
providerbezogenen Betriebs- und Restore-Test.
