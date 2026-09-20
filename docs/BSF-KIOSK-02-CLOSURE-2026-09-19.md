# BSF-KIOSK-02 — Abschluss- und Abnahmenachweis interner Read-Provider

Stand: 2026-09-20  
Status: **FINAL DONE / K02-L1 EXACT-TREE PASS / MERGE PENDING**  
Version: 1.65.0  
Issue: #136  
Pull Request: #147  
Branch: `feat/bsf-kiosk-02-internal-read`

## 1. Ziel und Fachscope

BSF-KIOSK-02 erweitert den bestehenden Info-Kiosk additiv um einen serverseitig autorisierten internen Hybridmodus.

Der Kiosk bleibt read-only. Er erzeugt keinen zweiten Reporting-, Stunden- oder Billable-Vertrag.

Hybridmodus:

- **INTERN:** Projekte, Arbeitspakete und Tätigkeiten,
- **DEMO:** Verfügbarkeit, Infrastruktur und Support,
- **NICHT VERFÜGBAR:** interne Quelle kann nicht sicher gelesen werden.

Der Demo-Pfad aus KIOSK-01 bleibt unverändert nutzbar.

## 2. Architektur

```text
KioskView
  -> KioskDataProvider
      -> DemoKioskDataProvider
      -> InternalReadKioskDataProvider
          -> readInternalKioskSnapshotFn
              -> ProjectControllingService
                  -> ProjectControllingRepository
                      -> Supabase User-JWT + RLS
```

Interne Kiosk-Kennzahlen werden aus dem BSF-03A-Controlling-Vertrag abgeleitet. Vergleichbare Kennzahlen verwenden dieselbe Golden-Dataset-Fachdefinition.

Keine direkte Supabase-Logik wurde in Kiosk-Komponenten eingeführt.

## 3. Berechtigungs- und Scopegrenze

Der technische Kiosk-Account bleibt exklusiv auf `kiosk.view` begrenzt und erhält **kein** `project.controlling.view`.

Interne Leistungsdaten erfordern:

- normale angemeldete Session,
- `project.controlling.view`,
- aktives Systemhouse Membership,
- zulässigen Customer-/Controlling-Scope,
- bestehende RLS-Grenzen.

Viewer, Engineer, Customer sowie manipulierte technische Kiosk-Sessions erhalten keine internen Leistungsdaten. Fremde Systemhäuser und manipulierte Scopes bleiben fail-closed.

Es wurde keine neue KIOSK-02-Permission eingeführt.

## 4. Datenminimierung und Freshness

Die Großbildsicht zeigt nur Aggregate.

Nicht angezeigt werden insbesondere:

- Tätigkeitstitel,
- Personennamen,
- Engineer-IDs,
- interne Datenbank-IDs,
- Eurobeträge,
- Nachrichteninhalte,
- Gesundheitsdaten.

Der interne Zeitraum ist standardmäßig der aktuelle Kalendermonat bis heute. Der Datenstand stammt aus den Source-/Projection-Freshness-Werten; die Renderzeit wird nicht als fachlicher Datenstand verwendet.

## 5. Golden Dataset

KIOSK-02 nutzt für vergleichbare Leistungskennzahlen dieselbe Fachdefinition wie BSF-03A.

Referenz V1:

- `schemaVersion = sysing.golden.v1`,
- `datasetVersion = 1.0.0`,
- 8 Tätigkeiten,
- 25.0 h gesamt,
- 20.0 h billable,
- 5.0 h non-billable,
- 80.0 % Billable-Quote.

`expected/kiosk-summary.json` und die Golden-Dataset-Regression bleiben die unabhängige Referenz.

## 6. Datenbank / RLS / Auth

**Keine KIOSK-02-Datenbankänderung.**

BSF-KIOSK-02 hat keine neue:

- fachliche Tabelle,
- Migration,
- RLS-Policy,
- Permission,
- Service-Role-Nutzung,
- direkt exponierte Security-Definer-RPC

benötigt.

Die vollständige Database-Schema-Drift-Prüfung auf dem Implementierungs-Head ist PASS.

## 7. GitHub Exact-Head Evidenz

Code-tragender Implementierungs-Head vor dem Dokumentationsnachlauf:

`8c69ccac189f00d1d61e93674a61ebb7cbc64fc4`

GitHub Actions:

- Security #1075 / Run `35426390840`: **PASS**,
- CI #1081 / Run `35426390795`: **PASS**.

CI #1081:

- Static / Prettier / ESLint / TypeScript / RBAC / Docs / Projektmanifest: **PASS**,
- Unit & Components: **135 Testdateien / 949 PASS / 4 TODO**,
- Database Schema Drift: **PASS**,
- Backend: **PASS**,
- API: **PASS**,
- RBAC & Security: **PASS**,
- Import/Export: **PASS**,
- Backup/Restore: **PASS**,
- Production Build: **PASS**,
- Playwright E2E: **98/98 PASS**,
- Accessibility: **PASS**,
- Technical Debt: **PASS**,
- Technical Report & Quality Gate: **PASS**.

Der Security-Scan meldete 0 CRITICAL, 0 HIGH und 0 MEDIUM.

## 8. E2E-Korrektur

Der letzte Code-Gate-Befund war kein Produktfehler.

Der Test erwartete drei Treffer für `getByText("INTERN")`. Playwrights Teiltextsuche zählte zusätzlich:

- „INTERNE DATEN“,
- „Interner Datenstand“.

Dadurch entstanden fünf Treffer trotz korrekt gerenderter drei INTERN-Badges.

Der Test prüft jetzt exakt:

- drei `INTERN`-Badges,
- drei `DEMO`-Badges.

Die produktive UI- oder Fachlogik musste dafür nicht verändert werden.

## 9. Dokumentation

Fortgeschrieben wurden beziehungsweise werden im KIOSK-02-Abschluss:

- CHANGELOG / Version 1.65.0,
- CURRENT-STATUS,
- PROJECT-STATUS.yaml,
- BSF-CURRENT-PRIORITIES,
- roadmap.md,
- SPRINT-PLAN-MVP-BSF,
- Entwicklungstagebuch,
- kontextsensitive Hilfe,
- Benutzerhandbuch,
- dieser Abschlussnachweis.

## 10. K02-L1 Exact-Tree-/Responsive-Abnahme

Die finale Lovable-Abnahme wurde am 20.09.2026 in der isolierten, nicht veröffentlichten Validierungsumgebung gegen einen frischen temporären Checkout des exakten GitHub-Kandidaten durchgeführt.

Geprüfter Kandidat:

`528b5bc8373a51b7c3e946241b07467bd3245dd9`

Tree-Nachweis:

- EXPECTED TREE: `ab0a5655485c50f9b7be5f3c8fa0a36166aeb949`,
- ACTUAL TREE: `ab0a5655485c50f9b7be5f3c8fa0a36166aeb949`,
- TREE MATCH: **JA**.

Ergebnisse:

- targeted Vitest: **11 Dateien / 69 Tests PASS**,
- Golden Dataset V1: **PASS**,
- KIOSK Demo E2E: **PASS**,
- KIOSK Internal E2E: **PASS**,
- KIOSK Security E2E: **PASS**; zusammen **9/9 Kiosk-Specs PASS**,
- Preview 1920×1080: **PASS**,
- Preview 1366×768: **PASS**,
- Hybridheader **HYBRID — INTERNE DATEN + DEMO-DATEN**: **PASS**,
- exakt **3× INTERN** und **3× DEMO**: **PASS**,
- Zeitraum **01.09.2026 – 19.09.2026** sichtbar,
- interner Datenstand **18.09.2026 10:00** sichtbar und von der Renderzeit getrennt,
- Link **Projektcontrolling öffnen**: **PASS**,
- Datenminimierung: **PASS**,
- Read-only UI: **PASS**,
- Runtime Console / Page Errors: **PASS**,
- Network: **PASS**,
- Fail-closed / kein Demo-Fallback: **PASS**.

Drift-/Governance-Nachweis:

- `client.ts` Drift: **NEIN**,
- `previewAuthStorage.ts` im geprüften Kandidaten: **NEIN**,
- Migration oder DB-Änderung: **NEIN**,
- versionierte Dateien im Prüfobjekt geändert: **NEIN**,
- `/dev-server` als Prüfobjekt oder Produktworkspace verändert: **NEIN**,
- Commit / Merge / Deploy / Publish durch Lovable: **NEIN**.

## 11. Definition of Done

Alle KIOSK-02-Abnahmekriterien sind erfüllt:

- Demo-Provider Regression: **PASS**,
- Internal Provider: **PASS**,
- Hybrid-Quellenstatus: **PASS**,
- Permission/Scope: **PASS**,
- IDOR/BOLA: **PASS**,
- Golden Dataset / gemeinsame Fachdefinition: **PASS**,
- A11y/E2E: **PASS**,
- Security/CI/Quality Gate: **PASS**,
- K02-L1 Exact-Tree-/Responsive-Preview: **PASS**,
- Dokumentation: **fortgeschrieben**.

Damit gilt BSF-KIOSK-02 fachlich und technisch als **FINAL DONE**.

Der nachfolgende Dokumentations-Head muss vor Merge weiterhin die normalen GitHub Required Checks bestehen. Dies ist kein neuer Funktionsscope.

## 12. Nächster Schritt

1. Dokumentations-Head durch Security und vollständige CI bestätigen.
2. PR #147 auf **READY FOR MERGE** setzen.
3. Merge nur nach separater Freigabe.
4. Nach Merge Version `v1.65.0` auf dem tatsächlichen `main`-Merge-Commit taggen und als GitHub Release veröffentlichen.
5. Danach BSF-03B / Issue #107 starten.

```text
FINAL_DONE = JA
MERGE = NOCH NEIN
DEPLOY = NEIN
NÄCHSTER SPRINT = BSF-03B / #107
```
