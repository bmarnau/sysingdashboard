# BSF-02 / BSF-02C — Abschluss- und Abnahmenachweis

Stand: 2026-09-07  
Status: **FINAL READY / INTEGRIERT**  
Issues: #88, Parent #76

## 1. Ergebnis

BSF-02 und der letzte Teil BSF-02C stellen die minimale gemeinsame, serverseitig lesbare Mehrbenutzer-Datenbasis bereit, die für die nachfolgenden Kunden- und Leistungssichten benötigt wird.

Der umgesetzte fachliche Pfad ist:

`Systemhouse → Customer → Project → WorkPackage → Activity → Leistungserbringer`

Die fachliche Customer-Identität bleibt providerneutral:

`(systemhouseId, customerId)`

Die vollständige Ablösung bzw. Neugestaltung der Local-First-Datenhaltung ist ausdrücklich nicht Bestandteil dieses Abschlusses und bleibt BSF-04.

## 2. Architektur- und Providergrenze

Die Lösung trennt:

- fachlichen Shared-Projection-Contract,
- providerneutralen Runtime-/Repository-Service,
- Auth-/Session-Bindung,
- Supabase-spezifischen Adapter,
- Datenbankgrenze aus Grants + RLS.

Der normale Publish-Pfad lautet:

`Browser → authentifizierte Serverfunktion → gleicher User-JWT → Runtime-Service → Supabase-Adapter → transaktionale SECURITY-INVOKER-RPC → Grants + RLS`

Es gibt keine Service Role im normalen Publish-/Read-Pfad.

## 3. Phase A — Shared Projection / Grants / RLS

Integration über PR #110.

Abgenommen wurden insbesondere:

- persistente Shared Projections für Project, WorkPackage und Activity,
- stabile Source-Identität im exakten Systemhouse-/Customer-Scope,
- Composite Parent-FKs,
- Least-Privilege-Grants,
- RLS für Customer-/Systemhouse-Grenzen,
- keine DELETE-/ALL-Policy,
- T01–T30 reale DB-/Grant-/RLS-Tests: PASS,
- Rollback und Residuenprüfung: PASS.

## 4. Phase B2 — transaktionale Publish-RPC

Integration über PR #116.

Funktion:

`public.bsf02c_publish_shared_projection_snapshot(...)`

Sicherheits- und Transaktionsvertrag:

- `SECURITY INVOKER`,
- `search_path = public`,
- Publisher und Activity-Engineer aus `auth.uid()`,
- `PUBLIC` EXECUTE: DENY,
- `anon` EXECUTE: DENY,
- `authenticated` EXECUTE: ALLOW,
- Parent-Auflösung serverseitig und fail-closed im exakten `(systemhouse_id, customer_id)`-Scope,
- publisher-eigene Reconciliation nur als Soft Withdraw,
- kein Hard Delete,
- Source-Revision und Source-Hash,
- vollständiger Snapshot-Publish in einer PostgreSQL-Transaktion.

Reale Tests:

- T31–T51 vollständig PASS,
- gespeicherte Testfassung reproduzierbar PASS,
- T51 Atomic Rollback PASS,
- frühe Writes nach absichtlich späterem Fehler bereits vor äußerem Test-Rollback nicht vorhanden,
- Testresiduen: 0.

## 5. Offizieller Supabase Security Advisor

Offizieller read-only Lauf am 2026-09-07: **PASS für BSF-02C/B2**.

Ergebnis:

- keine ERROR-/CRITICAL-Findings,
- keine neue BSF-02C-Warnung,
- B2-RPC erscheint nicht als SECURITY-DEFINER-Finding und bleibt `prosecdef=false`,
- ausschließlich bekannte SEC-01-WARN-Baseline:
  - `public.avkk_can_write(_subject uuid)`,
  - `public.avkk_people_directory()`.

Diese bekannten Findings sind durch B2 nicht verändert worden.

## 6. Phase B — Runtime Publish-/Read-Pfad

Integration über PR #111.

Finaler Runtime-Head vor Merge:

`0cc1fb4179aebff059a22217d638445b9986dd32`

Merge auf `main`:

`60ed2d81542cc25543dafa2b4821740cfff45043`

Der Supabase-Adapter publiziert einen fachlichen Snapshot nun über genau **einen** Aufruf der abgenommenen B2-RPC. Der frühere Multi-Request-Write-Pfad wurde entfernt.

Zusätzlich gilt:

- `snapshotComplete: true` für Reconciliation zwingend,
- observed Source-Mengen bleiben vom publizierbaren Batch getrennt,
- skipped/unresolved wird nicht als gelöscht behandelt,
- `project.edit` autorisiert Struktur-Publish,
- `activity.edit` ohne `project.edit` erlaubt nur eigene Activities gegen aktive sichtbare WorkPackage-Projections,
- `engineer_id = auth.uid()` im normalen Activity-Pfad,
- Source-Hashes werden als SHA-256 aus dem fachlichen Source-Inhalt erzeugt,
- RPC-Fehler schlagen fail-closed fehl,
- der Read-Pfad bleibt User-JWT-/RLS-gebunden und exakt Customer-scoped.

## 7. Runtime- und Regressionsevidenz

Exact Head: `0cc1fb4179aebff059a22217d638445b9986dd32`

Security:

- Run #519 / `34080533051`: **PASS**

CI:

- Run #527 / `34080533041`: **PASS**

Bestanden:

- Prettier,
- ESLint,
- TypeScript,
- RBAC-Matrix,
- No-console-Guard,
- Docs Sync,
- Project Manifest,
- Unit & Components,
- Backend,
- API,
- RBAC & Security,
- Import/Export,
- Backup/Restore,
- Production Build,
- Playwright E2E,
- Accessibility,
- Technical Debt,
- Technical Report & Quality Gate.

Die Adaptertests bestätigen zusätzlich:

- Struktur-Publish erzeugt genau einen B2-RPC-Aufruf,
- während des Publish erfolgt kein direkter Table-Write über `.from(...)`,
- Activity-only übergibt keine Struktur-Payload oder Struktur-Reconciliation,
- Source-Hashes werden erzeugt,
- RPC-Fehler werden fail-closed behandelt.

## 8. Security-/RBAC-/RLS-Abnahme

Erfüllt sind insbesondere:

- deny by default,
- Cross-Systemhouse DENY,
- Cross-Customer DENY,
- IDOR/BOLA-Schutz über serverseitigen Scope + RLS,
- aktive Account-/Membership-/Customer-Access-Prüfung,
- fachliche Permission-Prüfung,
- Viewer erhält kein neues Schreibrecht,
- UI ist keine Security Boundary,
- keine Service Role im Client oder normalen Runtime-Pfad,
- fremde Publisher-Projections werden weder übernommen noch withdrawn.

## 9. Import/Export, Backup/Restore und AVKK

Die vollständige Exact-Head-CI bestätigt Import/Export und Backup/Restore ohne Regression.

Bestehende Source-IDs bleiben für die Shared Projection stabil. Damit wird die vorhandene AVKK-Referenzlogik nicht durch eine unnötige Neunummerierung oder einen Big-Bang-Datenumbau gebrochen.

BSF-02C führt keine vollständige kanonische Zentralpersistenz der operativen Local-First-Daten ein; dieser Architekturentscheid bleibt BSF-04.

## 10. Scope- und Overlay-Prüfung

B2-Produkt-PR #116 enthielt exakt die vier abgenommenen B2-Artefakte.

Runtime-PR #111 enthielt exakt sechs Runtime-Dateien.

Nicht Bestandteil der Produkt-PRs:

- `src/integrations/supabase/client.ts`,
- `src/integrations/supabase/previewAuthStorage.ts`,
- sonstige Lovable-Preview/Auth-Overlays.

Damit wurde der während des Vorchecks festgestellte Seitenlinien-Drift nicht in `main` übernommen.

## 11. Dokumentationsprüfung

Aktuelle technische Nachweise:

- `docs/BSF-02C-DESIGN.md`,
- `docs/BSF-02C-PHASE-A-IMPLEMENTATION.md`,
- `docs/BSF-02C-PHASE-B-CONTRACT.md`,
- `docs/BSF-02C-PHASE-B2-TRANSACTION-RPC.md`,
- `docs/BSF-02C-PHASE-B-RUNTIME.md`,
- dieser datierte Abschlussnachweis,
- laufaktuelle `docs/BSF-CURRENT-PRIORITIES.md`.

`docs/CURRENT-STATUS.md` verweist für den laufenden BSF-Ausbau bereits auf `docs/BSF-CURRENT-PRIORITIES.md` als operative Statusquelle. Historische, datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben.

Es wurde keine neue Bedienoberfläche eingeführt. Daher besteht für BSF-02C kein fachlicher Änderungsbedarf an kontextsensitiver Hilfe oder Benutzerhandbuch.

Der technische Prüfbericht wird durch den auf dem Exact Head erfolgreichen Job `14 · Technical Report & Quality Gate` nachgewiesen.

## 12. Lovable-Promptbilanz

Historische Planung ab 2026-09-06 für den BSF-02C-Abschluss: **0–1** Prompts.

Tatsächlich verbraucht: **1**.

Noch erwartet für BSF-02C: **0**.

Gesamtplanung bis einschließlich BSF-04A bleibt unverändert **13–23**; nach BSF-02C sind **1** verbraucht und aktuell **12–22** verbleibend erwartet.

Der unveränderliche Ausgangssnapshot liegt in:

`docs/LOVABLE-PROMPT-PLAN-2026-09-06.md`

## 13. Abschlussentscheidung

Die technischen, fachlichen und sicherheitsbezogenen Abnahmekriterien von BSF-02C / Issue #88 und des Parent BSF-02 / Issue #76 sind erfüllt.

**BSF-02 = DONE**  
**BSF-02C = DONE**

Damit ist nach formaler Issue-/Dokumentationskonsolidierung der Übergang zu **BSF-03 — Kundenverantwortung / „Meine Kunden“ (#105)** freigegeben.
