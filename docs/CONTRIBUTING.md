# Contributing — Engineer Dashboard

Dieses Dokument bündelt die Entwicklungs- und Doku-Regeln für das Dashboard.
Es gilt für Arbeiten in Lovable wie für lokales Arbeiten gegen das GitHub-Repository.

## 1. Repository-Struktur

```
src/             Anwendungscode (Routen, Komponenten, Libs, i18n)
src/components/  Wiederverwendbare UI- und Dialog-Komponenten
src/lib/         Services, Datenmodelle, Hilfsfunktionen
src/lib/i18n/    Übersetzungen (Standard de, en vorbereitet)
src/routes/      TanStack-Start file-based routing
docs/            Projekt-/Prozessdokumentation (dieses Verzeichnis)
scripts/         CI- und Wartungsskripte (z. B. docs:check)
CHANGELOG.md     Single Source of Truth der Dashboard-Version
.github/         GitHub Actions Workflows
```

## 2. Branch-Strategie

| Branch        | Zweck                                               |
| ------------- | --------------------------------------------------- |
| `main`        | Produktionsstand. Nur gemergte Releases.            |
| `develop`     | Integrationsbranch. Basis für Features.             |
| `feature/<x>` | Neue Funktion. Mergt zurück nach `develop`.         |
| `bugfix/<x>`  | Fehlerbehebung. Mergt zurück nach `develop`.        |
| `hotfix/<x>`  | Dringender Produktionsfix. Mergt nach `main`+`develop`. |

Lovable arbeitet standardmäßig direkt auf `main`. Wer parallel lokal entwickelt,
nutzt feature/bugfix-Branches und merged via Pull Request.

## 3. Commit-Konvention (Conventional Commits)

```
<type>(<scope>): <kurze Beschreibung im Imperativ>
```

Erlaubte Typen: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`.

Beispiele:

```
feat(export): PDF-Arbeitszeitreport ergänzt
feat(profile): flexible Teilzeit eingeführt
docs(handbook): Handbuch aktualisiert
fix(calculation): Sollzeitberechnung korrigiert
chore(deps): fflate aktualisiert
```

## 4. Doku-Sync-Pflicht (verbindlich)

Jede Änderung mit Nutzersichtbarkeit MUSS dokumentiert werden:

1. **HelpTopic** in `src/lib/help-documentation.ts` ergänzen/anpassen
   (`lastUpdated` setzen). Neue Einstellungen → `builtInSettings`.
2. **CHANGELOG.md** — neuer Eintrag oben. Format:
   `## <semver> - YYYY-MM-DD` gefolgt von `- bullet`-Zeilen.
   Die oberste Version wird automatisch zur `DASHBOARD_VERSION` im Handbuch.
3. **`bun run docs:check`** lokal ausführen, bevor committet wird.
   Der Workflow `.github/workflows/ci.yml` führt denselben Check in jedem PR aus.

Pre-Commit-Checkliste:

- [ ] HelpTopics aktualisiert
- [ ] CHANGELOG-Eintrag ergänzt
- [ ] `docs:check` grün
- [ ] Lint grün

## 5. CI/CD

`.github/workflows/ci.yml` führt bei jedem Push/PR aus:

1. `bun install`
2. `bun run lint`
3. `bun run docs:check`
4. `bun run build` (Production-Bundle)

Schlägt ein Schritt fehl, ist der PR blockiert.

## 6. Systemstatus im Dashboard

`Service → Systemstatus…` zeigt zur Laufzeit:

- GitHub-Repository, Branch, letzten Commit (Build-Zeit injiziert via
  `vite.config.ts` über `__BUILD_INFO__`)
- Dashboard- und Handbuch-Version
- Letztes automatisches Backup

Ist `git` zur Build-Zeit nicht verfügbar (z. B. reine Lovable-Sandbox ohne
Repository-Anbindung), zeigt der Dialog einen entsprechenden Hinweis an und
fordert zur Verbindung über das Lovable-Plus-Menü auf.

## 7. Sensible Daten

Niemals committen:

- `.env`, `.env.local`, `.dev.vars`, `*.local`
- Tokens, API-Keys, JWTs, Passwörter
- Lokale Backup-ZIPs (liegen im Browser, nicht im Repo)

`.gitignore` enthält die nötigen Muster; bei Erweiterung dort ergänzen.
