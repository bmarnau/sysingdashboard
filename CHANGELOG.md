# Changelog

Zentrale Änderungshistorie des Dashboards. **Pflicht:** Bei jeder Dashboard-Änderung
mit Nutzersichtbarkeit hier einen neuen Eintrag (neueste oben) ergänzen. Diese Datei
wird zur Build-Zeit in das integrierte Benutzerhandbuch (Kapitel
„Änderungshistorie") eingelesen. Die jeweils oberste Version bestimmt automatisch
`DASHBOARD_VERSION`.

Format pro Eintrag:

```
## <semver> - YYYY-MM-DD
- Kurzbeschreibung der Änderung (eine Zeile pro Bullet).
```

## 1.10.0 - 2026-06-16
- Servicebereich: neuer Menüpunkt „Systemstatus" zeigt GitHub-Repository, Branch, Commit-SHA, Build-Zeit, Dashboard-/Handbuch-Version und letztes Backup.
- Build-Info (Commit, Branch, Build-Zeit) wird zur Build-Zeit via `vite.config.ts` injiziert.
- GitHub Actions Workflow `ci.yml` (Lint, docs:check, Build) für jeden Push/PR.
- Doku in `docs/CONTRIBUTING.md` und `docs/GITHUB.md` (Branch- und Commit-Strategie, GitHub-Sync).

## 1.9.1 - 2026-06-16
- Änderungshistorie zentralisiert in `CHANGELOG.md`; Dashboard-Version wird automatisch aus der obersten Version übernommen.
- Doku-Sync-Skript `bun run docs:check` prüft Konsistenz zwischen `CHANGELOG.md`, Handbuch und Code.

## 1.9.0 - 2026-06-15
- Backup-Bereich: tägliches automatisches Daten-Backup, manueller Button, Download-Liste, ZIP-Validierung und Protokoll.

## 1.8.1 - 2026-06-15
- Mehrsprachigkeit (i18n) vorbereitet, Standardsprache Deutsch, HTML-lang auf de gesetzt.

## 1.8.0 - 2026-06-14
- Benutzerhandbuch im Servicebereich integriert (modal, suchbar, rollenabhängig, kontextbezogen).

## 1.7.0 - 2026-06-14
- Engineurprofil übernimmt Werte aus dem Arbeitszeitmodell; Zeit-/Stundenfelder gegen Eingabe gesperrt.
