# BSF-03D — Abschlussbericht Arbeitspaket-Kategorien (Issue #103)

Stand: 2026-09-13
Version: 1.62.0
Ergebnis: **FINAL PASS (technisch verifiziert)** — GitHub-Integration (Branch, PR,
Security-Workflow, CI, Merge mit Expected-Head-SHA) ist ausdrücklich **nicht**
Teil dieses Berichts; Issue #103 bleibt bis dahin offen.

## 1. Scope

Arbeitspaket-Kategorien als editierbare, systemhausweite Stammdaten:

- Katalog `workpackage.category` mit Scope `systemhouse`, ohne Seed-Werte.
- `WorkPackage.categoryKey?: string | null`; Default und Legacy = keine Kategorie;
  maximal eine Kategorie.
- Stabile Key-Identität (Key nach Anlage unveränderlich), Deaktivieren statt
  Hard Delete; deaktivierte/unbekannte Kategorien an Altbeständen bleiben
  nachvollziehbar und werden nicht still umgeschrieben.
- Tags unabhängig; keine Ableitung von billable/priority/status.
- Auswahl durch AP-berechtigte Nutzer; Verwaltung nur `referencedata.manage`
  plus aktive Systemhaus-Membership; Viewer Write DENY; Cross-Systemhouse DENY.
- JSON-Schema 1.2.0 (categoryKey optional/null, unknown/inactive fail-safe),
  Backup/Restore mit Kategorie-Referenzprüfung.

Nicht im Scope: Shared Projection, BSF-02C-RPC, BSF-03 P5, globale
AVKK-Kataloge (unverändert global).

## 2. Ausgangsbasis und Verlauf

| Schritt                                   | Referenz                                   |
| ----------------------------------------- | ------------------------------------------ |
| Basis GitHub `main`                       | `b90f93c`                                  |
| Paket 1 (Migration, Vertrag, Resolver)    | `6484555`                                  |
| Review-Fix 1 / 2                          | `f422a01` / `5e67fd0`                      |
| Governance-Fix Broker (erste Entfernung)  | `b619596`                                  |
| Plattform-Reinjection Broker              | `b23c50f` (in Paket Q final bereinigt)     |
| Paket V (DB-Verifikation, read-only)      | `docs/BSF-03D-VERIFICATION-2026-09-13.md`  |
| Paket D (Doku/Version 1.62.0)             | `15a7124`                                  |
| Paket Q (Gates + Governance-Cleanup)      | finaler Workspace-Commit siehe Abschlussbericht im Chat / Git-Log |

Der finale Commit-SHA ist die Workspace-Sicht (Lovable-Spiegel); der
GitHub-Head ergibt sich erst durch den PR.

## 3. Testmatrix Paket Q (alle PASS)

| Gate                       | Ergebnis                                       |
| -------------------------- | ---------------------------------------------- |
| Auth-Client-Contract-Test  | 3/3                                            |
| Typecheck                  | PASS                                           |
| ESLint / No-Console        | PASS                                           |
| Prettier `--check .`       | PASS                                           |
| Vitest gesamt              | 101 Dateien, 765 PASS, 4 todo                  |
| A11y (Unit/axe)            | 4/4                                            |
| Security-Suite + Checks    | 112/112; CRITICAL 0 / HIGH 0 / MEDIUM 0        |
| Technical Debt             | Critical 0; neu nur Low/Info                   |
| docs:check                 | PASS                                           |
| project-status:check       | PASS                                           |
| Bundle/Perf                | PASS                                           |
| CI-Gate-Tests              | 12/12                                          |
| Production Build           | PASS                                           |
| E2E Kategorie-Spec         | 4/4                                            |
| E2E gesamt (chromium)      | 77/77                                          |
| Beispieldateien / API-Gate / Security-Gate | PASS                           |
| Technischer Prüfbericht    | v15, passed-with-findings, 0 Blocker           |
| Quality Gate (`ci:gate`)   | OK — 0 Blocker                                 |

Detaillierte Kommandos: `docs/BSF-03D-VERIFICATION-2026-09-13.md`, Abschnitt 8.

## 4. DB-Nachweis (Paket V, referenziert — keine erneute DB-Änderung)

- `supabase/tests/bsf03d-workpackage-category.sql` live auf der
  Projekt-Datenbank in genau einer Transaktion `BEGIN … ROLLBACK`:
  **T01–T16 = 16/16 PASS**; synthetische Daten danach 0.
- Live-Schema-Vertrag PASS: `reference_catalog.scope_type` DEFAULT `global`
  + NOT NULL + CHECK; `reference_value.systemhouse_id` + FK ON DELETE RESTRICT;
  partielle Unique-Indizes global/systemhouse; Scope-/History-Indizes;
  Scope-Trigger; RLS auf `reference_value`/`reference_value_history`; keine
  DELETE-Policy; History `systemhouse_id`.
- DB dauerhaft geändert: **NEIN** (in Paket V und Paket Q).

## 5. Security Advisor

Offizieller Supabase Security Advisor: ERROR 0, CRITICAL 0, WARN 2 — beide
Typ 0029 und ausschließlich bekannte SEC-01-Baseline (`avkk_can_write`,
`avkk_people_directory`). Keine neuen BSF-03D-Findings.

## 6. E2E-Realität

`e2e/specs/security/workpackage-category.spec.ts` prüft UI-Gating (Default
keine Kategorie, aktive Werte des eigenen Systemhauses, Mehrfach-Membership,
Admin-Pflege mit Deaktivieren, Viewer ohne Pflege-/Anlege-Eintrag) mit
Data-API-Route-Mocking. Die tatsächliche Durchsetzung von Viewer Write DENY
und Cross-Systemhouse DENY ist durch das Live-SQL-Artefakt belegt, nicht
durch E2E. UI-Gating ist UX; RLS/serverseitige Prüfung bleiben Sicherheitsgrenze.

## 7. Security / Governance

- Preview-Auth-Broker: `src/integrations/supabase/previewAuthStorage.ts`
  entfernt; `client.ts` bytegleich zum abgenommenen Vertrag `425fbed`
  (Storage `typeof window !== "undefined" ? localStorage : undefined`).
  Regressionstest `supabase-client-contract.test.ts` 3/3 PASS.
- Keine Secrets/Service-Role im Code, Chat, Tests oder Reports.
- Auth-/RLS-/RBAC-Semantik über BSF-03D-Migration hinaus unverändert; Shared
  Projection, BSF-02C-RPC und BSF-03 P5 nicht angefasst.
- Providerneutralität: Fachvertrag (`categoryKey`, Schema 1.2.0, Resolver)
  nicht an Supabase gekoppelt; Azure-SQL-Migration nicht erschwert.

## 8. Restrisiken

1. Die Plattform kann den Preview-Auth-Broker bei künftigen Lovable-Turns
   erneut erzeugen; der Contract-Test macht dies in CI sichtbar. Vor jedem
   PR ist der Test verpflichtend zu prüfen.
2. Historisch kein separater RED-Commit für das frühe Paket 1; spätere Pakete
   dokumentieren RED→GREEN.
3. Technical Debt 2 High / 6 Medium bestehend (Trendmetrik, nicht BSF-03D-verursacht).
4. E2E in der Sandbox über `E2E_CHROMIUM_PATH`; CI nutzt die Playwright-Binärdatei.
5. GitHub-Integration ausstehend: Branch + PR, separater Security-Workflow,
   vollständige CI inkl. `14 · Technical Report & Quality Gate`, Merge mit
   Expected-Head-SHA.
