
# Prompt 2A.10 – CI-Integration und Quality Gates

Bestehender Workflow `.github/workflows/ci.yml` läuft alle Prüfungen sequenziell in **einem** Job, mit weichen Gates (Lint via `bun run lint` ohne Toleranz, Security-Gate im Soft-Modus, API-Gate mit `|| echo`). Ziel: klare Stufen, harte Blocker exakt gemäß Vorgabe.

## Zielarchitektur

Ein Workflow, mehrere Jobs mit `needs:`-Kette, damit ein Blocker die Pipeline früh stoppt und Folgejobs entfallen. Reihenfolge = Prompt-Vorgabe:

```text
setup ─▶ static ─▶ unit ─▶ backend ─▶ api ─▶ security ─▶ io ─▶ backup ─┐
                                                                       ▼
                                                        build ─▶ e2e ─▶ a11y ─▶ debt ─▶ report
```

`setup` cached Bun-Install + Playwright-Browser einmal (Artifact), Folgejobs restoren.

## Job-Stufen (Mapping zu Prompt-Punkten)

| # | Job | Kommandos | Blocker? |
|---|---|---|---|
| 1 | `setup` | `bun install --frozen-lockfile`, Cache | ja (Install-Fehler) |
| 2 | `static` | `bun run format --check`, `bun run lint`, `bunx tsgo --noEmit`, `bun run docs:check` | ja (TS-Fehler, Lint-Fehler jetzt hart, Doku-Drift) |
| 3 | `unit` | `bun run test:unit --coverage` | ja |
| 4 | `components` | `bun run test:components` | ja |
| 5 | `backend` | `bun run test:backend` | ja |
| 6 | `api` | `bun run test:api`, `bun run api:discover`, `bun run test:api:discovery`, `bun run test:api:smoke`, `bun run test:api:functional` | ja |
| 7 | `security` | `bun run test:security`, `bun run security:report`, **`security:gate` hart** (CRITICAL/HIGH → exit 1), `bun run rbac:check`, RBAC-Vitest-Suite | ja |
| 8 | `io` | `bun run test:io` | ja |
| 9 | `backup` | `bun run test:backup:integrity` (inkl. Restore-Kerntests) | ja |
| 10 | `build` | `bun run build` (production) | ja |
| 11 | `e2e` | `bunx playwright install --with-deps chromium`, `bun run test:e2e` inkl. `e2e/specs/security/*` (privilegierte Endpoints, UI-Tamper) | ja |
| 12 | `a11y` | `bun run test:a11y` + `bun run ops:e2e` (a11y-Teil) | nein (Warn-Only, Report-Artifact) |
| 13 | `debt` | `bun run test:debt`, `bun run test:perf` | nein |
| 14 | `report` | `bun run test:report`, `bun run report:technical:ci`, Upload aller `test-report/`, `coverage/`, `playwright-report/` | immer (`if: always()`) |

## Quality-Gate-Logik

Neue Datei `scripts/ci/quality-gate.mjs` läuft nach `report` und liest `test-report/technical-test-report.json`. Setzt Exit 1 bei einem der Prompt-Blocker:

- Build-Fehler → wird bereits vom Job selbst geblockt.
- TypeScript-Fehler → durch neuen `tsgo`-Schritt in `static`.
- Critical Finding (jede Kategorie, `severity=critical`, `accepted=false`).
- High Security Finding (`id` startet mit `sec:` und `severity=high`).
- Datenintegritätsfehler (`id` startet mit `backup:` und `severity in {critical,high}`).
- Offener privilegierter Endpoint (`id` startet mit `api:` und `type=unprotected-privileged`).
- Secret Leak (`sec:secret-leak` oder `source=gitleaks`).
- RBAC-Lockout-Test failed → aus Vitest-JSON (`test-report/security-vitest.json`, Testname enthält `admin-lockout`).
- Backup-/Restore-Kerntest failed → `test-report/backup-vitest.json`, Suite `restore.test.ts` oder `integrity.test.ts` mit Failures.

Dieses Skript ersetzt das jetzige `--soft`-Flag in Security- und API-Gates. Bestehende `security:gate`/`api:gate`-Scripts bleiben unverändert erhalten, werden aber im CI-Job hart aufgerufen; `soft`-Aufrufe entfallen.

## Weitere Änderungen

- **`.github/workflows/ci.yml`**: In Jobs aufteilen, Concurrency-Group (`cancel-in-progress: true` für PRs), Node 22 + Bun latest bleiben, Playwright-Browser-Cache je Job restoren.
- **`.github/workflows/security.yml`**: unverändert (läuft parallel/nightly).
- **`package.json`**: `ci:gate` Script hinzufügen (`node scripts/ci/quality-gate.mjs`); `test:report:ci` bleibt.
- **`scripts/technical-report/build.mjs`**: kleine Erweiterung — Feld `blockers[]` im JSON mit den geprüften Bedingungen befüllen, damit Gate-Skript nur `blockers.length===0` checken muss.
- **Tests**:
  - `src/__tests__/ci/quality-gate.test.ts` — feeds Fixtures in `quality-gate.mjs`, prüft jede Blocker-Kategorie einzeln + Grüner-Pfad.
  - Neuer Vitest-Modus `test:ci-gate` in `package.json`.
- **Handbuch** (`src/lib/help-documentation.ts`): neues Kapitel „CI-Pipeline und Quality Gates" mit Stufenliste, Blocker-Tabelle, Hinweis auf Report-Artefakte. `DOCUMENTATION_VERSION` → 1.17.0.
- **CHANGELOG.md**: neuer Eintrag `## 1.38.0 - 2026-07-16` mit Zusammenfassung + Bump.
- **ADR-0018** `docs/adr/ADR-0018-ci-quality-gates.md`: begründet Job-Split (statt Monolith), harte Gates jetzt (weil SEC-CRIT-001/002 bereits im Report sichtbar sind und differenziert behandelt werden können), Quality-Gate-Skript als Single-Source für Prompt-Blocker.

## Nicht enthalten

- Kein Wechsel auf Reusable Workflows oder Matrix-Runner (Overhead nicht gerechtfertigt für Single-Repo).
- Kein Firefox/WebKit/Mobile im Standard-Run (bleibt opt-in via `RUN_FIREFOX` etc. laut ADR-0012).
- Keine Änderung an Vitest-Konfiguration selbst — nur zusätzliche Scripts.

## Technische Details

- `tsgo` ist bereits transitiv verfügbar; falls nicht, `bunx --bun tsgo` mit Install-Check im Job.
- Prettier-Check: `bun run format -- --check` — reine Formatierungsfehler blocken den Build (harter Gate für „Format").
- Concurrency: `group: ci-${{ github.ref }}`, `cancel-in-progress: true` nur für PRs.
- Alle Jobs `checkout: fetch-depth: 0` (Gitleaks + Diff-Basis).
- Artifacts pro Job hochladen, `report`-Job lädt aggregiertes `test-report/` erneut hoch.

## Risiken

- Harte Lint- und Security-Gates können bestehenden Merge blockieren. Bekannte offene Findings (SEC-CRIT-001/002) müssen entweder als `accepted:true` in `static-findings.json` eingetragen oder vor Merge behoben werden. Plan schlägt vor: `accepted:true` mit Begründung + Ticket-Referenz, sonst rot.
- Job-Split erhöht CI-Zeit durch mehrfaches Bun-Install → mit `actions/cache` auf `~/.bun/install/cache` und `node_modules` reduziert.
