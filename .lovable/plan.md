## Ziel

Den `SystemStatusDialog` zu einer vollständigen Statusübersicht ausbauen, die exakt die in Check 8 geforderten Garantien erfüllt: nie Werte, nur Namen/Booleans, kein Crash bei fehlenden Daten, ohne Azure lauffähig.

## Architektur-Hinweis (kritisches Feedback)

Die Vorgabe „beim Start validieren" ist im Frontend prinzipiell schwach: alle wirklich sensiblen Prüfungen (ENV, Secrets, Key Vault) müssen serverseitig passieren. Das Frontend darf nur das **Ergebnis** anzeigen, niemals selbst ENV lesen. Aktuell macht `secretManager`/`envValidator` das bereits richtig — wir erweitern nur `/api/status` um ein verdichtetes, **secret-freies** Statusobjekt und konsumieren es im Dialog. Eine zweite client-seitige Validierung wäre Doppelung und Risiko (Bundle-Leak). → Single Source bleibt der Server.

Hydration-Mismatch im Header (Rolle „Senior Systems Engineer" vs. „System-Administrator") ist ein separater SSR-Bug in `useCurrentUser`, **nicht** Teil dieses Plans. Bei Bedarf separat adressieren.

## Änderungen

### 1) `backend/services/statusService.mjs` — erweitern

Liefert ein flaches, secret-freies Payload mit allen Feldern, die der Dialog anzeigt:

```text
{
  application: { name, version, builtAt, mode },
  github:      { repositoryUrl, branch, commit | null },
  lovable:     { publishedUrl | null, projectId | null, status: "configured"|"not_configured", lastDeploymentAt | null },
  azure:       {
    allowed: boolean,                     // !isDev()
    sql:   { configured: boolean },       // has('AZURE_SQL_CONNECTION')
    table: { configured: boolean },       // has('AZURE_TABLE_CONNECTION')
    storage: { configured: boolean },     // has('AZURE_STORAGE_SAS')
    authMode: "managed-identity" | "client-secret" | "none",
    lastConnectionTestAt: string | null,
    missingEnv: string[]                  // NUR Namen aus secretManager.validate()
  },
  security:    {
    authMode: "local" | "entra" | "none",
    rbac: { enabled: true, rolesCount, permissionsCount },
    secretManager: { enabled: true, missing: string[] },
    envValidation: { ok: boolean, missing: string[] },
    keyVault: { configured: boolean }      // keyVault.isKeyVaultConfigured()
  },
  data:        { lastAzureExportAt: string|null, lastAzureImportAt: string|null }, // vom syncService bzw. null
  documentation: { dashboardVersion, documentationVersion, lastUpdated },           // bereits in src/lib/help-documentation
  timestamp
}
```

Quellen:
- `application.*` aus `package.json` + `process.env.NODE_ENV` + Build-Time (vorhandene `vite.config` Injektion bleibt für Frontend; Backend liefert `process.env.npm_package_version` und Startzeit).
- `github.*` aus ENV (`GITHUB_REPOSITORY`, `GITHUB_SHA`, `GITHUB_REF_NAME`) — falls leer: feste URL aus `PROJECT_INFO`-Pendant via neuer Konstante in `backend/services/projectInfo.mjs` (Single Source mit `src/lib/project-info.ts`).
- `lovable.*` aus ENV (`LOVABLE_PROJECT_ID`, `LOVABLE_PUBLISHED_URL`) → sonst `"not_configured"`.
- `azure.missingEnv` aus `secretManager.validate().missing` (nur Namen).
- `security.keyVault` aus `config/keyVault.isKeyVaultConfigured()`.
- `data.*` aus `syncService.getSyncMeta()` (vorhandenes `lastRun` als Export-Timestamp; Import bleibt vorerst `null`).

Sicherheitsregel: nie `consume()` aufrufen; nur `has()`/`status()`/`isKeyVaultConfigured()`/`validate()`. Keine Maskierung im Payload — bereits Booleans/Namen.

### 2) `src/hooks/useSystemStatusHealth.ts` — Payload erweitern

`SystemStatusHealth` um die neuen Felder ergänzen (alle optional, `null`-tolerant). Fetch bleibt unverändert (`/api/status`), Timeout 3 s. Frontend fasst lokale Werte (`BackupService.lastAuto`, `HelpDocumentationService.getLastUpdated`, `DASHBOARD_VERSION`) **clientseitig** zusammen und merged mit Serverdaten — Server bleibt Single Source für alles ENV-/Azure-Bezogene.

### 3) `src/components/SystemStatusDialog.tsx` — 7 Sektionen

Bestehende Sektionen ersetzen durch genau die 7 geforderten Blöcke in dieser Reihenfolge:

1. **Application** — Name, Version (`DASHBOARD_VERSION`), Build-Date (`BUILD_INFO.builtAt`), Runtime-Mode (vom Server: `mode`).
2. **GitHub** — Repository-URL (fix `PROJECT_INFO.github.url`, klickbar), Branch (`BUILD_INFO.branch`), Commit (`BUILD_INFO.commit` oder „Not configured").
3. **Lovable** — Publish-URL oder „Not configured", Deployment-Status (`configured`/`not_configured`), Last-Deployment (Server oder „Not configured").
4. **Azure** — SQL/Table/Storage je `configured: boolean` (Badge ✓/✗), Auth-Mode, Last-Connection-Test oder „Not configured", **Missing ENV** als reine Namensliste (Chips), nie Werte.
5. **Security** — Auth-Mode, RBAC enabled (+ Counts aus `permissions.ts`), Secret-Manager enabled, ENV-Validation `ok`-Badge + Liste fehlender Namen, Key-Vault `configured`/`not_configured`.
6. **Data** — Local-Storage (immer „active"), Last-Local-Backup (`BackupService.lastAuto`), Last-Azure-Export (Server), Last-Azure-Import (Server oder „Not configured").
7. **Documentation** — User-Manual-Status („available", `DOCUMENTATION_VERSION`), Management-Overview-Status (vorhanden/„Not configured"), Last-Documentation-Update.

UI:
- Bestehende `<Row>`-Komponente wiederverwenden; neue `<Chip>`-Sub-Komponente für ENV-Namenslisten.
- Jede Sektion rendert defensiv: fehlt ein Feld → „Not configured" (Konstante).
- Bestehender Security-Scan-Block bleibt am Ende (separat, bereits korrekt).
- Refresh-Button und Expand/Collapse bleiben.

### 4) Startvalidierung

Bereits vorhanden via `bootstrapSystemStatusCheck()` in `__root.tsx` (250 ms nach Mount → `/api/status`). Beibehalten. Backend ruft `secretManager.validate()` weiterhin in `ensureEnv()` pro Request auf — Fail-Fast in PROD, Warn in DEV.

### 5) Kein neuer ENV-Zugriff im Frontend

`src/` importiert weder `secretManager.mjs` noch `envValidator.mjs` noch `keyVault.mjs`. Alle Werte kommen ausschließlich aus dem `/api/status`-Response.

### 6) Dokumentation & Changelog

- `CHANGELOG.md`: neuer Eintrag `## 1.18.1 - 2026-06-29` mit Stichpunkten.
- `src/lib/help-documentation.ts`: Kapitel „Systemstatus" auf neue 7-Sektionen-Struktur aktualisieren, `lastUpdated` setzen.
- `bun run docs:check` lokal grün.

## Check-8-Mapping

| Anforderung | Erfüllt durch |
|---|---|
| GitHub-URL sichtbar | Sektion 2, fix aus `PROJECT_INFO` |
| Lovable-Publish-URL oder „Not configured" | Sektion 3, defensive Anzeige |
| ENV-Validation-Status | Sektion 5, `envValidation.ok` Badge |
| Fehlende ENV nur Namen | Sektion 4 + 5, Chip-Liste aus `validate().missing` |
| Keine ENV-Werte / Secrets / SAS / Connection-Strings | Payload enthält ausschließlich Booleans + Namen; `consume()` nie aufgerufen |
| Fehlende Werte brechen Anzeige nicht | „Not configured"-Konstante in jeder Row |
| Funktioniert ohne Azure / ohne Backend | Frontend rendert auch ohne `/api/status`-Response (lokale Werte + „Not configured") |
| Startvalidierung | `bootstrapSystemStatusCheck` + Backend `ensureEnv` |

## Out of Scope

- Hydration-Mismatch im Header (separate Aufgabe).
- Echte Azure-Connection-Tests (heutiger Stand: Stub; Last-Connection-Test bleibt `null` bis echter Test implementiert ist).
- Entra-ID-Auth (Readiness-Stub bleibt).
