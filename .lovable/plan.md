## Automatisierter Security-Check in CI

Ziel: Bei jedem Push/PR auf `main`/`develop` läuft ein Security-Scan, der Secrets, gefährliche HTTP-Header und unerlaubte Azure-/Connection-Strings im Frontend findet, das Ergebnis als GitHub-Actions-Artefakt ablegt und bei kritischen Funden den Build rot färbt.

---

### Neue Datei: `scripts/security-check.mjs`

Eigenständiger Node-Script (keine zusätzliche Dependency, nutzt `node:fs`/`node:path`). Scannt rekursiv `src/`, `backend/`, `config/`, `scripts/`, `app/`. Schließt `node_modules`, `.lovable`, `dist`, `build`, `routeTree.gen.ts`, lockfiles, der Scanner selbst und `CHANGELOG.md` / `help-documentation.ts` (Erwähnungen, keine Werte) per Ignore-Liste aus.

Drei Regel-Kategorien mit Severity:

**CRITICAL — bricht CI (Exit 1)**
- `AccountKey=[A-Za-z0-9+/=]{40,}` (Azure Storage Connection)
- `SharedAccessSignature=` mit Wert
- `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=`
- SAS-Tokens: `\?sv=20\d\d-\d\d-\d\d&.*sig=`
- `Server=tcp:[^;]+;.*Password=` (Azure SQL)
- AWS-Keys: `AKIA[0-9A-Z]{16}`
- Generische API-Key-Literale: `sk_live_[A-Za-z0-9]{20,}`, `sk-[A-Za-z0-9]{32,}`, `ghp_[A-Za-z0-9]{36}`, `xox[baprs]-[A-Za-z0-9-]{10,}`
- Private Keys: `-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----`
- JWT-Literale mit Header `eyJ` und ≥ 2 Punkten und Länge > 100

**HIGH — bricht CI (Exit 1)**
- Direkter Azure-SDK-Import im **Frontend** (`src/**`, ohne `src/routes/api/`): `@azure/`, `mssql`, `tedious`, `@azure/storage-blob`, `@azure/data-tables`, `@azure/identity`.
- `process.env.AZURE_*` oder `process.env.*CONNECTION*` außerhalb `backend/`, `config/`, `src/routes/api/`, `src/server.ts`, `src/start.ts`.
- Gefährliche HTTP-Header-Literale in Server-Code:
  - `Access-Control-Allow-Origin: *` **in Kombination mit** `Access-Control-Allow-Credentials: true`
  - `X-Frame-Options: ALLOWALL`
  - `Content-Security-Policy:.*unsafe-eval`
- `dangerouslySetInnerHTML` mit dynamischem Input (Heuristik: `dangerouslySetInnerHTML={{__html: <Variable, kein String-Literal>}}`); Whitelist für `src/components/ui/chart.tsx`.

**MEDIUM — Warnung, kein Fail**
- `console.log\(.*error` / `console.error\(error\)` (volles Error-Objekt) außerhalb erlaubter Helper.
- `eval\(`, `new Function\(`.
- `Access-Control-Allow-Origin: *` alleine.
- `fetch\(['"]https?://(?!localhost)` aus `src/**` außerhalb `src/routes/api/` (direkter Drittanbieter-Call aus Client).

Optionen über CLI:
- `--json <pfad>` schreibt strukturierten Report (`{summary, findings: [{severity, rule, file, line, snippet}]}`)
- `--markdown <pfad>` schreibt menschenlesbaren Report mit Tabellen pro Severity.
- `--baseline <pfad>` (optional, später): erlaubt Allowlist per Hash.
- Exit-Code: `0` bei nur MEDIUM/keinen Funden, `1` bei ≥ 1 HIGH/CRITICAL.

Output-Verzeichnis: `security-report/` (gitignored).

---

### Neue Datei: `.gitleaks.toml`

Minimal-Config für `gitleaks` als zweite Verteidigungslinie (CVE-getrieben, ergänzt unsere Heuristiken). Allowlist für:
- Dokumentation (`CHANGELOG.md`, `help-documentation.ts`, `**/*.md`) — Erwähnungen ohne Werte.
- `bun.lock` (Integrity-Hashes).
- `src/types/backend.d.ts` (Typ-Namen wie `azure`).

---

### `package.json` (neuer Script-Eintrag)

```json
"security:check": "node scripts/security-check.mjs --json security-report/findings.json --markdown security-report/findings.md"
```

`docs:check`-Pattern bleibt unverändert. Keine neuen npm-Dependencies (Custom-Scanner ist plain Node; gitleaks läuft als Action).

---

### Neue Datei: `.github/workflows/security.yml`

Separater Workflow (parallel zu `ci.yml`), damit Security-Funde auch bei grünem Lint/Build sichtbar sind und Artefakte sauber getrennt liegen.

```text
name: Security
on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main, develop] }
  schedule: [{ cron: '0 3 * * 1' }]   # zusätzlich montags 03:00 UTC

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - actions/checkout@v4 (fetch-depth: 0)
      - oven-sh/setup-bun@v2
      - bun install --frozen-lockfile
      - run: mkdir -p security-report
      - run: bun run security:check                # eigener Scanner
        id: custom
        continue-on-error: false                   # CRITICAL/HIGH → Fail
      - uses: gitleaks/gitleaks-action@v2          # zweite Verteidigung
        with: { config-path: .gitleaks.toml }
        env:  { GITLEAKS_ENABLE_UPLOAD_ARTIFACT: true }
        continue-on-error: true                    # Report kommt ins Artefakt, kein Hard-Fail
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-report-${{ github.run_id }}
          path: |
            security-report/
            results.sarif
          retention-days: 30
      - name: PR-Kommentar (optional, nur PRs)
        if: github.event_name == 'pull_request' && always()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: security-report/findings.md
```

---

### `.gitignore`

`security-report/` ergänzen, damit lokale Läufe das Repo nicht verschmutzen.

---

### Dokumentation (Doku-Sync-Pflicht)

- **`CHANGELOG.md`** → neue Version `1.17.4 - 2026-06-24` mit Eintrag „CI-Security-Scan (Secrets, Azure-Strings, Headers) + Artefakt".
- **`src/lib/help-documentation.ts`** → Topic „Backend-API" um Abschnitt „CI-Security-Scan" ergänzen ODER neues Topic `ci-security-scan` (Kategorie „Service") mit:
  - Welche Regeln in welcher Severity.
  - Wie man Funde liest (Artefakt-Download, `security-report/findings.md`).
  - Wie man legitime Treffer per Allowlist (`.gitleaks.toml`, Code-Kommentar `// security-scan-allow: <regel>`) markiert.
  - `lastUpdated: "2026-06-24"`.
- `bun run docs:check` muss grün laufen.

---

### Verifikation vor Abschluss

1. `node scripts/security-check.mjs --json /tmp/findings.json --markdown /tmp/findings.md` lokal ausführen.
2. Erwartung: aktueller Code → 0 CRITICAL/HIGH (Baseline ist sauber, siehe Plan 1.17.3). Eventuelle MEDIUM-Funde dokumentieren oder per Whitelist abdecken.
3. Smoke-Test: temporär `const KEY = "AccountKey=abcdef0123456789..."` in eine wegwerf-Datei einfügen, Scanner laufen lassen, prüfen dass CRITICAL erkannt wird, Datei wieder entfernen.
4. `bun run lint` und `bun run docs:check` grün.

---

### Bewusst NICHT im Scope (kritische Hinweise)

- **Keine Laufzeit-Security-Tests** (DAST/ZAP). Wäre ein eigener Workflow gegen die Preview-URL — größere Aufgabe, nur sinnvoll wenn Auth steht.
- **Keine `npm audit`/`bun audit`-Stufe.** Kann ich später als zweiten Job ergänzen, ist aber laut deinem aktuellen Auftrag (Secrets/Header/Azure) nicht gefordert.
- **Keine Signatur-Prüfung gegen historische Commits** (`git log -p | gitleaks detect`). `gitleaks-action@v2` macht das automatisch mit `fetch-depth: 0`.
- **Bessere Alternative zur Custom-Heuristik**: Statt eigenen Regex-Scanners könnte man **`trufflehog`** + **`semgrep`** kombinieren. Vorteil: gepflegte Regeln, weniger False Positives. Nachteil: zwei zusätzliche Actions, längere Laufzeit. **Meine Empfehlung**: starten mit Custom-Scanner + gitleaks (schnell, projektspezifisch); `semgrep` als optionalen dritten Job in einer Folgeversion, falls die False-Positive-Rate gut bleibt.

---

### Offene Frage (vor Implementierung)

Soll der Scanner bei HIGH/CRITICAL den **CI-Build wirklich blocken** (Standardvorschlag) oder erst nur Warnungen + Artefakt liefern, damit das Team das Verhalten in Ruhe einspielen kann? Ohne Gegenanweisung setze ich blockierend um — das ist die sicherere Default-Variante.
