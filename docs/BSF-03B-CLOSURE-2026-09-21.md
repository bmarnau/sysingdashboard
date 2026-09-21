# BSF-03B — Sprintabschluss Teamlead-Leistungsnachweis V1

Stand: 2026-09-21  
Issue: #107  
PR: #149  
Status: **FINAL DONE / READY FOR REVIEW — MERGE NEIN / DEPLOY NEIN**

## 1. Ergebnis

BSF-03B liefert einen revisionsgebundenen Teamlead-Leistungsnachweis als
eigenständige Fachfunktion. Operative Shared Activities bleiben
publisher-owned. Der Teamlead prüft Abrechenbarkeit über ein separates
Override, finalisiert atomar in einen unveränderbaren Snapshot und kann
finalisierte Nachweise als PDF, CSV und JSON ausgeben.

Die Ausgabe ist ausdrücklich **Leistungsnachweis, keine Rechnung**. Preise,
Stundensätze, Umsatzsteuer, Rechnungsnummern, Zahlungsziele oder sonstige
Fakturalogik gehören nicht zu BSF-03B.

## 2. Fach- und Sicherheitsvertrag

- Permission: `performance.statement.manage` für Teamlead; Systemadministrator
  nur über den bestehenden technischen All-Permissions-Break-glass.
- Administrator, Projektmanager, Engineer, Viewer, Customer und Kiosk erhalten
  kein reguläres Manage-Recht.
- Billable-Overrides sind an Source-ID und Source-Revision gebunden.
- Review-Fingerprint schützt gegen TOCTOU/stale review.
- Finalisierung läuft atomar über Request + interne Triggerfunktion.
- Statement, Items und Claims sind nach Finalisierung nicht direkt clientseitig
  schreibbar.
- Doppelverwendung derselben Source-Activity wird über Claims verhindert.
- Replacement erzeugt eine neue Version, superseded den Vorgänger und verändert
  den alten Snapshot nicht.
- Kundenexport enthält keine automatische Leistungserbringer-/Engineer-ID,
  keine Source-Hashes und keine Euro-/Rechnungslogik.
- Backup/Restore und administrativer JSON-Export enthalten die notwendigen
  BSF-03B-Cloud-Daten getrennt von der kundenorientierten Ausgabe.

## 3. Datenbank und Live-Supabase

Migration:
`20260921095742_bsf03b_performance_statement`

Fünf Tabellen:

- `customer_activity_billable_override`
- `customer_performance_statement_request`
- `customer_performance_statement`
- `customer_performance_statement_item`
- `customer_performance_activity_claim`

Live-Abschlussprüfung:

- RLS auf allen fünf Tabellen aktiv.
- Kein anon-/PUBLIC-DML auf den fünf Tabellen.
- `public.bsf03b_billable_override_audit()`: SECURITY DEFINER,
  `search_path=""`, kein direktes EXECUTE für authenticated/anon/PUBLIC.
- `public.bsf03b_process_statement_request()`: SECURITY DEFINER,
  `search_path=""`, kein direktes EXECUTE für authenticated/anon/PUBLIC.
- offizieller Supabase Security Advisor: **BASELINE_ONLY**.
- 0 ERROR, 0 CRITICAL, 2 bekannte WARN
  `0029_authenticated_security_definer_function_executable` ausschließlich
  für `public.avkk_can_write(uuid)` und
  `public.avkk_people_directory()`.
- neue BSF-03B-Findings: **keine**.
- DB-/Testdatenänderung durch die Abschlussprüfung: **nein**.

## 4. Exact-Head GitHub-Evidenz

Funktionaler Abschlusskandidat:

`ffbf3641c2187a738b853fb050aa4e5f1b6541a0`

GitHub Actions:

- Security #1247: **PASS**
- CI #1252: **PASS**
- Static: Prettier, ESLint, TypeScript, RBAC-Matrix, No-console, Docs-Sync,
  Project-Manifest und Golden Dataset: **PASS**
- Unit & Components: **PASS**
- Database Schema Drift: **PASS**
- Kiosk DB Contract: **PASS**
- BSF-02C Regression T01–T30: **PASS**
- BSF-03A DB Contract T01–T20: **PASS**
- BSF-03B DB Contract T01–T30: **PASS**
- Backend: **PASS**
- API: **PASS**
- RBAC & Security: **PASS**
- Import/Export: **PASS**
- Backup/Restore: **PASS**
- Production Build: **PASS**
- Playwright E2E inkl. BSF-03B/Security: **PASS**
- Accessibility: **PASS**
- Technical Debt: **PASS**
- Technical Report & Quality Gate: **PASS**

Die nach diesem Nachweis folgenden reinen Abschluss-/Dokumentationscommits müssen
erneut durch die Required Checks laufen. Der resultierende SHA wird bewusst
nicht in diesem Dokument hartcodiert, weil das Ändern dieser Datei den Exact
Head selbst verändern würde. Maßgeblich sind die GitHub-PR-Checks des jeweils
aktuellen Heads.

## 5. Lovable-Preview — Evidenzgrenze

Die produktive Lovable-Projektarbeitsfläche ließ sich nicht identitätsgebunden
auf den GitHub-Kandidaten umschalten.

Reproduzierter Befund:

- erwarteter GitHub-Head zunächst `bf4db6fe...`, später
  `ffbf3641c...`,
- Lovable-Arbeitsfläche: `5eebc270e25aace590fb16db02af9c9de7751561`,
- erwarteter BSF-03B-Tree in Lovable nicht verfügbar,
- im nicht maßgeblichen Lovable-Tree fehlen BSF-03B-UI-Dateien und
  `previewAuthStorage.ts` ist vorhanden,
- Zielcommit ist öffentlich erreichbar, die verwaltete Projektarbeitsfläche
  erlaubt aber keinen sicheren Exact-Head-Checkout,
- deshalb keine behauptete 1920x1080-/1366x768-Preview-Evidenz auf BSF-03B.

Bewertung: **akzeptierte Plattform-/Toolgrenze, kein Produkt-PASS und kein
Produktblocker**. Die exakte GitHub-Version ist durch Production Build,
Component-/A11y-/Playwright-E2E- und Security-E2E-Gates geprüft. GitHub bleibt
Source of Truth; Lovable Cloud ist gemäß Architektur keine unersetzbare
Laufzeit- oder Abnahmeabhängigkeit.

## 6. AQGS / Golden Dataset

Der Golden-Dataset-Vertrag wird in CI jetzt als Required Gate ausgeführt.
BSF-03B verwendet die bestehende synthetische Referenzbasis und schützt die
fachliche Semantik zusätzlich über Domain-, Fingerprint-, DB-, Export- und
E2E-Verträge. Expected Results werden nicht automatisch aus Produktionscode
abgeleitet.

## 7. Abnahme

| Prüfpunkt | Ergebnis |
| --- | --- |
| Permission/RBAC | PASS |
| RLS/ACL/Scope | PASS |
| Override revisionsgebunden | PASS |
| Review-Fingerprint | PASS |
| Atomare Finalisierung | PASS |
| Trigger Direct Execute Deny | PASS |
| Snapshot-Unveränderlichkeit | PASS |
| Claim/Doppelverwendung | PASS |
| Replacement v1→v2 | PASS |
| Kunden-Redaction | PASS |
| PDF/CSV/JSON | PASS |
| Backup/Restore | PASS |
| IDOR/BOLA / Cross-Scope | PASS |
| DB Regression BSF-02C/03A/03B | PASS |
| Security Advisor | BASELINE_ONLY |
| Golden Dataset Required Gate | PASS |
| E2E / Security-E2E | PASS |
| Accessibility | PASS |
| Technical Report / Quality Gate | PASS |
| Lovable Exact-Head Visual Preview | NOT EVIDENCED — Plattformgrenze dokumentiert |

## 8. Abschlussstatus

BSF-03B / Issue #107 ist fachlich und technisch **FINAL DONE**. Die verbliebene
Lovable-Exact-Head-Visualprüfung ist als Tool-/Plattformgrenze dokumentiert und
wird nicht als fingierter PASS geführt.

PR #149 bleibt bis zur separaten Freigabe **ohne Merge**. Es erfolgt durch
diesen Sprintabschluss **kein Deploy**.

Nächster Sprint: **BSF-03E / Issue #63**.
