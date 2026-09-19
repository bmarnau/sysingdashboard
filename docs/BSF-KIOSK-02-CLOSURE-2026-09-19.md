# BSF-KIOSK-02 — Abschluss- und Abnahmenachweis interner Read-Provider

Stand: 2026-09-19  
Status: **IMPLEMENTATION COMPLETE / GITHUB EXACT-HEAD PASS / LOVABLE K02-L1 PREVIEW BLOCKED**  
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

## 10. Noch offener K02-L1 Preview

Der vorgesehene Lovable K02-L1-Lauf ist vorbereitet und prüft read-only gegen einen frischen temporären Checkout des exakten GitHub-Baums:

- 1920×1080,
- 1366×768,
- Hybridheader,
- exakt drei INTERN- und drei DEMO-Badges,
- Zeitraum und Freshness,
- Datenminimierung,
- kein Overflow/Clipping,
- Runtime Console / Network,
- Demo-Regression,
- Fail-closed / kein Demo-Fallback,
- keine Code-/DB-/Auth-Drift.

Der Lauf konnte am 19.09.2026 nicht gestartet werden, weil der Lovable-Workspace keine verfügbaren Credits meldete.

Dies ist ein **Werkzeug-/Abnahmeblocker**, kein reproduzierter Code-, Security- oder Datenbankfehler.

## 11. Definition of Done

Aktueller Stand:

- Demo-Provider Regression: **PASS**,
- Internal Provider: **PASS**,
- Hybrid-Quellenstatus: **PASS**,
- Permission/Scope: **PASS**,
- IDOR/BOLA: **PASS**,
- A11y/E2E: **PASS**,
- Security/CI/Quality Gate: **PASS**,
- Dokumentation: **fortgeschrieben**,
- Lovable Exact-Tree-/Responsive-Preview: **BLOCKED — keine Credits**.

Damit gilt BSF-KIOSK-02 derzeit als **IMPLEMENTATION COMPLETE**, aber noch nicht als **FINAL DONE**.

## 12. Nächster Schritt

1. Lovable-Credits verfügbar machen und den vorbereiteten K02-L1 Exact-Tree-/Responsive-Preview ausführen.
2. Bei PASS den Abschlussnachweis auf FINAL DONE setzen und PR #147 final freigeben.
3. Merge nur nach separater Freigabe.
4. Danach BSF-03B / Issue #107 starten.

```text
MERGE = NEIN
DEPLOY = NEIN
NÄCHSTER SPRINT = BSF-03B / #107
```
