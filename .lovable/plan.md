
## Ergebnis Offline-Check (Architektur)

Der Code wurde gegen die 7 Kriterien geprüft. **Keine Architekturkorrektur nötig** — die Offline-Fähigkeit ist bereits konsequent umgesetzt:

| Kriterium | Status | Beleg |
| --- | --- | --- |
| Start ohne Azure-Konfiguration | OK | `config/env.mjs` defaultet auf `development`; `assertAzureAllowed()` blockt jeden Azure-Zugriff in Dev. |
| Projekte lokal | OK | `src/routes/index.tsx` lädt/persistiert `PersistedState` (Projekte, WPs, Tätigkeiten) ausschließlich aus `localStorage` (user-scoped). |
| Arbeitspakete lokal | OK | gleicher Persisted-State, kein Remote-Call. |
| Tätigkeiten lokal | OK | gleicher Persisted-State; `timeEntries` ebenfalls localStorage. |
| localStorage bleibt aktiv | OK | `UserManagementService.userScopedKey` + alle Module (`export-archive`, `engineer-target-time`, `export-download-service`, `backup-service`) nutzen weiterhin `window.localStorage`. |
| Azure-Ausfall blockiert nichts | OK | Einziger Startup-Call ist `/api/status` (read-only, kein Azure-Touch) mit 3 s Timeout in `useSystemStatusHealth.ts`; Fehler werden flüchtig in den State geschrieben, kein UI-Block. |
| Keine automatische Azure-Aktion | OK | `runSync` wird nirgendwo automatisch getriggert — Suche nach `runSync`/`/api/sync` in `src/` liefert nur Routen-Definition und Dokumentation. Kein `setInterval`, kein Auto-Sync-Hook. |

Einzige Schwachstelle ist kosmetisch: in einem reinen Static-Deploy ohne Backend liefert `/api/status` 404 und der Systemstatus zeigt "API nicht erreichbar". Das ist korrektes Verhalten und blockiert nichts — wird im Handbuch klargestellt.

## Geplante Änderungen (nur Dokumentation/UI, keine Logik)

### 1. `src/components/SystemStatusDialog.tsx`
Neue Sektion **"Security-Scan"** am Dialogende mit:
- Anzeige der aktiven Scanner: Custom-Scanner (`scripts/security-check.mjs`), Gitleaks, GitHub Workflow (`.github/workflows/security.yml`).
- Letzter Trigger: Push/PR + wöchentlich montags 03:00 UTC.
- Link auf den Report-Pfad (`security-report/findings.md`) im aktuellen Branch.
- Status-Pill "konfiguriert" (statisch, keine Live-Abfrage — Scan läuft in CI, nicht im Browser).
- Hinweis: Findings werden im Lovable Security-Panel gepflegt.

Außerdem kleine Notiz unter dem bestehenden Health-Block: "API-Status 'nicht erreichbar' ist im reinen Frontend-Deploy ohne Backend erwartet — Dashboard arbeitet vollständig lokal."

### 2. `src/lib/help-documentation.ts`
- Vorhandenes Topic **`ci-security-scan`** (bereits dokumentiert) wird im Kapitel "Systemstatus" verlinkt.
- Neues Topic **`offline-betrieb`** (Slug `offline-mode`) mit den 7 Garantien aus der Tabelle oben, klar getrennt nach "Was lokal funktioniert" und "Was Backend braucht (Sync)".
- Eintrag in `CHANGELOG.md` (Version-Bump Patch, z. B. `1.17.5`) — wird von `DASHBOARD_VERSION` automatisch übernommen.

### 3. `bun run docs:check`
Nach den Änderungen ausführen, um `CHANGELOG`/`builtInTopics`-Konsistenz zu verifizieren.

## Bewusst NICHT geändert

- Keine Service-Worker / PWA-Offline-Schicht — Dashboard ist bereits SPA + localStorage. Ein SW würde den Lovable-Preview-Workflow brechen und ist laut PWA-Skill nur bei expliziter Offline-Anforderung erlaubt; localStorage-only ist hier ausreichend.
- Kein Refactor von `useSystemStatusHealth` — Verhalten ist korrekt, nur die UI-Sektion fehlt.
- Kein Eingriff in `runSync`/Backend-Services — Auth-Gate und Dev-Block bleiben unverändert.

## Kritische Anmerkung

Der `bootstrapSystemStatusCheck` feuert `fetch('/api/status')` 250 ms nach Mount. Im offline-getrennten Browser erzeugt das einen `TypeError: Failed to fetch` in der Konsole. Funktional unkritisch (catch greift), aber kosmetisch unsauber. **Optionaler Folge-Patch**: vor dem Fetch `navigator.onLine` prüfen und bei `false` direkt `apiReachable: false, lastError: "offline"` setzen. In diesem Plan nicht enthalten — bei Bedarf separat anfordern.
