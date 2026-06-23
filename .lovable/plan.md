## Kritische Befunde zum Systemstatus

`SystemStatusDialog` liest alle Felder ausschließlich aus `BUILD_INFO`, das in `vite.config.ts` per `safeGit()` zur Build-Zeit ermittelt wird. In der Lovable-Sandbox ist `git` und/oder `git remote` häufig nicht verfügbar, deshalb fallen `commit`, `branch` und `repoRemote` auf `"unknown"` zurück. Folge:

- `githubConnected` ist `false` → Anzeige „nicht verbunden", obwohl das Repo existiert.
- „Repository", „Branch", „Letzter Commit" zeigen `—` bzw. `unknown`.
- Es gibt kein Feld für den **Lovable-Publish-Pfad** (`https://sysingdashboard.lovable.app`) und kein Feld für die **Preview-URL**.
- Es gibt keinen Lauf-zeitlichen Plausibilitätscheck — die Werte sind in einem statischen Build eingefroren, ohne Hinweis auf Veraltetheit.

Zusätzlich: die letzten Prompts (Secrets/Env, Backend-API, ESM-Vereinheitlichung) sind im `CHANGELOG.md` und Handbuch ab 1.15.0/1.16.0 erfasst, aber der neue Systemstatus-Umbau fehlt noch.

## Umsetzung

### 1. Stabile Stammdaten als Single Source of Truth
Neue Datei `src/lib/project-info.ts`:

```ts
export const PROJECT_INFO = {
  github: {
    owner: "bmarnau",
    repo: "sysingdashboard",
    url: "https://github.com/bmarnau/sysingdashboard",
    defaultBranch: "main",
  },
  lovable: {
    projectId: "3c209338-443a-40f8-8a16-7c3c1b51da0e",
    publishedUrl: "https://sysingdashboard.lovable.app",
    previewUrl: "https://id-preview--3c209338-443a-40f8-8a16-7c3c1b51da0e.lovable.app",
    stablePreviewUrl: "https://project--3c209338-443a-40f8-8a16-7c3c1b51da0e-dev.lovable.app",
    editorUrl: "https://lovable.dev/projects/3c209338-443a-40f8-8a16-7c3c1b51da0e",
  },
} as const;
```

`build-info.ts` füllt fehlende Werte (`repoRemote`, `branch`) künftig aus `PROJECT_INFO`, statt `"unknown"` zu liefern. `repoLabel()` und `commitUrl()` bleiben kompatibel.

### 2. SystemStatusDialog reparieren und erweitern
- GitHub-Sektion: Repository immer als `bmarnau/sysingdashboard` mit Link auf `https://github.com/bmarnau/sysingdashboard`. `githubConnected` = true, solange `PROJECT_INFO.github.url` gesetzt ist; Commit-Status separat als „Build-Commit verfügbar: ja/nein" anzeigen, damit der Sandbox-Fallback klar erkennbar bleibt.
- Neue Sektion **„Lovable-Deployment"** mit Zeilen:
  - Published URL → Link `https://sysingdashboard.lovable.app`
  - Preview (stabil) → Link auf `project--<id>-dev.lovable.app`
  - Editor → Link auf `lovable.dev/projects/<id>`
  - Projekt-ID (monospace)
- Versionssektion: zusätzlich „Backend-Modus" (dev/prod) und „Letzte Statusprüfung" (Zeitstempel).

### 3. Laufzeit-Aktualitätscheck beim Start
Neuer Hook `useSystemStatusHealth()` (in `src/hooks/`), aufgerufen einmalig im Root oder beim Öffnen des Dialogs:
- Fetch `GET /api/status` (bereits vorhanden), Timeout 3 s.
- Vergleicht `result.mode` und Verfügbarkeit der API mit erwarteten Werten.
- Schreibt `{ checkedAt, mode, apiReachable, lastError }` in einen In-Memory-Store (Zustand via `useSyncExternalStore`, kein localStorage — Status ist flüchtig).
- Beim Start (Effect in `src/routes/__root.tsx`) wird der Check einmal getriggert. Der Dialog zeigt „Zuletzt geprüft: …" und einen „Jetzt prüfen"-Button.
- Bei Abweichung (z. B. `mode=production` ohne Secrets, API nicht erreichbar, Build älter als 24 h) erscheint ein dezenter Warnhinweis im Dialog (kein Toast-Spam).

### 4. Doku-Sync
- Neuer `HelpTopic` `system-status` in `src/lib/help-documentation.ts` (oder bestehendes Topic erweitern), mit Beschreibung GitHub-Link, Lovable-URLs, Start-Health-Check, `lastUpdated` auf heute.
- `CHANGELOG.md` neuer Eintrag `## 1.17.0 - 2026-06-23`:
  - Systemstatus zeigt feste GitHub-URL und Lovable-Publish-/Preview-/Editor-URLs.
  - Laufzeit-Aktualitätscheck (`/api/status`) beim Start mit Anzeige „Zuletzt geprüft".
  - `src/lib/project-info.ts` als Single Source of Truth für Repo- und Deploy-Pfade.
- `bun run docs:check` ausführen.

### 5. Nicht im Scope
- Keine Änderung an Backend-Services oder Secret-Logik.
- Kein automatischer Polling-Intervall (nur Start + manueller Refresh) — vermeidet unnötige Worker-Anfragen.
- Keine Persistenz des Health-Status (bewusst flüchtig, sonst zeigt das Dashboard veraltete „OK"-Stände nach Deploy).

## Geänderte/neue Dateien (Vorschau)
- neu: `src/lib/project-info.ts`, `src/hooks/useSystemStatusHealth.ts`
- geändert: `src/lib/build-info.ts`, `src/components/SystemStatusDialog.tsx`, `src/routes/__root.tsx`, `src/lib/help-documentation.ts`, `CHANGELOG.md`

## Alternativvorschlag (kritisch)
Wenn das GitHub-Repo später umzieht, wird die hartcodierte URL zur Stolperfalle. Sauberer wäre, `VITE_PROJECT_GITHUB_URL` und `VITE_LOVABLE_PUBLISHED_URL` als Build-Env in `vite.config.ts` zu lesen und nur bei fehlendem Wert auf die Konstanten in `project-info.ts` zurückzufallen. Soll ich das gleich mit einbauen?
