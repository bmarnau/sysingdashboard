# GitHub-Sync — Einrichtung & Betrieb

Diese Anleitung beschreibt, wie das Dashboard versioniert und mit GitHub
synchronisiert wird. Lovable verwaltet Git intern; Verbindung und
Authentifizierung laufen über die Lovable-UI, nicht über manuelle
`git`-Kommandos im Editor.

## 1. Verbindung herstellen (einmalig)

1. In Lovable: Plus-Menü (unten links in der Chatleiste) → **GitHub** →
   **Connect project**.
2. Lovable-GitHub-App autorisieren.
3. GitHub-Konto bzw. Organisation auswählen.
4. **Create Repository** klicken.

Das Projekt synchronisiert sich von da an bidirektional: Änderungen in
Lovable werden gepusht, Pushes auf GitHub werden in Lovable übernommen.

## 2. Was nach dem Connect automatisch greift

- `Service → Systemstatus…` zeigt Repository, Branch und Commit-SHA.
- `.github/workflows/ci.yml` läuft bei jedem Push/PR (Lint, Docs-Check,
  Build).
- `docs/CONTRIBUTING.md` beschreibt Branch- und Commit-Konventionen.
- `CHANGELOG.md` und das integrierte Handbuch werden mit dem Code
  versioniert.

## 3. Parallel lokal arbeiten

```bash
git clone <repo-url>
cd <repo>
bun install
bun run dev            # lokale Vorschau
bun run docs:check     # Doku-Sync prüfen
bun run lint
bun run build          # Produktions-Build
```

Branches gemäß `docs/CONTRIBUTING.md` anlegen, Pull Request auf `develop`
(bzw. `main`) öffnen.

## 4. Sensible Daten

- `.env*.local` und `.dev.vars` sind in `.gitignore` ausgeschlossen.
- Backups liegen ausschließlich lokal im Browser (IndexedDB) und werden
  nicht ins Repo geschrieben.

## 5. Eigenes Hosting

Der GitHub-Stand ist ein eigenständiges TanStack-Start-Projekt und kann auf
Cloudflare Workers, Vercel, Netlify oder jedem Node-fähigen Host
betrieben werden. Schritt-für-Schritt-Anleitung liegt in jedem ZIP-Backup
unter `INSTALL.md`.
