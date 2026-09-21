# Sysing Dashboard — Lovable-Promptplan BSF-03B

Stand: 2026-09-21
Status: FINAL DONE · L1 LIVE/SECURITY VERIFIZIERT · L2 EXACT-HEAD PREVIEW NOT EVIDENCED (PLATTFORMGRENZE)
Issue: #107
Design: `docs/BSF-03B-DESIGN.md`
Implementation Plan: `docs/superpowers/plans/2026-09-14-bsf-03b-performance-statement.md`

## 1. Einsatzregel

Lovable wird in BSF-03B gezielt für zwei Dinge eingesetzt:

1. kontrollierter Supabase-Live-Precheck/DB-Lauf, weil Snapshot-/RLS-/Trigger-Invarianten real geprüft werden müssen,
2. späterer UI-/Preview-Pass für Teamlead-Prüfsicht, Finalisierungsdialog und History.

Lovable entscheidet nicht über das Fachmodell.

## 2. Harte Grenzen

Jeder Prompt muss einhalten:

- zuerst analysieren,
- danach nur im freigegebenen Scope umsetzen,
- testen,
- dokumentieren,
- strukturierter Abschlussbericht,
- keine Rechnung/Preise/Stundensätze/Umsatzsteuer,
- keine direkte Änderung fremder Shared Activities,
- keine Service Role im Normalpfad,
- keine neue direkt authenticated-executable SECURITY-DEFINER-RPC,
- interne Triggerfunktion nicht direkt ausführbar,
- keine neue Project Responsibility,
- kein Personenranking,
- kein Graph/SharePoint/MCP/Agent,
- kein `client.ts`-Kiosk/Auth-Hack,
- `previewAuthStorage.ts` nicht einführen,
- kein Merge,
- kein Deploy.

## 3. Prompt 03B-L1 — Live-Precheck und Persistenz-/Trigger-Vertrag — ABGESCHLOSSEN / REGRESSION PASS

```text
SYSING DASHBOARD — BSF-03B / L1
LIVE-PRECHECK + SNAPSHOT/CLAIM/REVIEW-VERTRAG

VERBINDLICHE BASIS
1. Lies docs/BSF-03B-DESIGN.md vollständig.
2. Lies docs/superpowers/plans/2026-09-14-bsf-03b-performance-statement.md.
3. Prüfe aktuellen Branch, Head und Main-Baseline.
4. Analysiere live read-only, bevor irgendeine DB-Änderung erfolgt.

PHASE A — READ-ONLY PRECHECK
Prüfe mindestens:
- aktuelle has_permission-Matrix,
- BSF-03A Shared-Projection-Schema inklusive category/freshness,
- shared_activity_projection RLS: Activity-UPDATE bleibt publisher-owned,
- Customer/Systemhouse Membership/Access-Helper,
- public.audit_log ACL/RLS/Trigger-Muster,
- aktuelle Migrationshistorie,
- aktuelle Security-Advisor-Baseline,
- ob irgendeines der BSF-03B-Objekte bereits live existiert.

Erwartete neue Objekte:
- customer_activity_billable_override,
- customer_performance_statement_request,
- customer_performance_statement,
- customer_performance_statement_item,
- customer_performance_activity_claim.

Bei Live/GitHub-Drift: BLOCKED dokumentieren. Keine alte Migration editieren.

PHASE B — SQL-TEST ZUERST
Lege supabase/tests/bsf03b-performance-statement.sql dauerhaft, transaktional und fail-fast an.
Prüfe mindestens:
- Teamlead ALLOW / Admin-PM-Engineer-Viewer-Customer DENY,
- Cross-Systemhouse/Customer DENY,
- Override revisionsgebunden,
- Override Audit,
- direct DML auf Statement/Item/Claim DENY,
- interne Triggerfunktion direct EXECUTE durch authenticated DENY,
- finalize request PASS,
- stale review fingerprint ROLLBACK,
- duplicate claim ROLLBACK,
- non-billable Item bleibt Snapshotbestandteil,
- korrekte Stunden-Summen,
- Idempotency-Key,
- Replacement v1 -> v2,
- alter Snapshot unverändert,
- Claims zeigen nach Ersatz auf v2,
- Null-Residuen.

PHASE C — MINIMALE MIGRATION
Nur nach klarem A/B:
1. performance.statement.manage in DB spiegeln: Teamlead, Sysadmin durch globale Regel; Admin/PM/Engineer/Viewer/Customer nicht.
2. Fünf Tabellen exakt gemäß Design anlegen.
3. RLS + Least Privilege.
4. Statement/Item/Claim keine direkten authenticated Writes.
5. Override INSERT/UPDATE nur manage + Scope; kein DELETE.
6. Request INSERT nur manage + Scope; kein Client UPDATE/DELETE.
7. Override-Audittrigger.
8. Interne Request-Triggerfunktion, falls SECURITY DEFINER:
   - search_path='',
   - voll qualifiziert,
   - REVOKE ALL FROM PUBLIC, anon, authenticated,
   - nur Triggerbindung.
9. Finalize/Replace vollständig atomar.
10. Kein Service Role.

PHASE D — REAL TEST
- BSF-03B SQL-Suite vollständig real ausführen,
- BSF-02C und BSF-03A Regression erneut ausführen,
- Null-Residuen bestätigen,
- offizieller Supabase Security Advisor read-only.

WICHTIG SECURITY
Eine neue Advisor-Warnung vom Typ authenticated security definer executable ist NICHT akzeptabel für die interne Triggerfunktion. Falls sie direkt ausführbar ist, ist die Umsetzung BLOCKED und muss gehärtet werden.

PHASE E — DOKUMENTATION
Dokumentiere exakt:
- Migration,
- ACL/RLS,
- Triggerfunktion-Attribute und EXECUTE-Grants,
- SQL Txx,
- Regression,
- Advisor.

ABSCHLUSSBERICHT
- PRECHECK
- LIVE_SCHEMA
- MIGRATION_HISTORY
- DATEIEN_GEAENDERT
- DB_GEAENDERT JA/NEIN
- PERMISSION_MATRIX
- ACTIVITY_OWNERSHIP_UNVERAENDERT JA/NEIN
- TRIGGER_FUNCTION_SECURITY
- DIRECT_EXECUTE_AUTHENTICATED JA/NEIN
- DIRECT_DML_STATEMENT_ITEM_CLAIM JA/NEIN
- TESTS Txx
- RESIDUEN
- BSF02C_REGRESSION
- BSF03A_REGRESSION
- SECURITY_ADVISOR
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 4. Prompt 03B-L2 — Teamlead UI / Preview — DURCHGEFÜHRT / EXACT-HEAD BINDING BLOCKED

L1, Runtime und der Owner-fähige BSF-02C/03A/03B-Regressionslauf sind abgeschlossen. L2 wurde anschließend read-only gegen die aktuellen GitHub-Kandidaten gestartet. Die Zielcommits waren öffentlich erreichbar, die verwaltete Lovable-Arbeitsfläche blieb jedoch auf einem abweichenden Tree und ließ sich nicht sicher auf den GitHub-Exact-Head umschalten. Deshalb wurden keine BSF-03B-UI-Dateien verändert und keine 1920x1080-/1366x768-, Console- oder Network-Evidenz als PASS behauptet. Die exakte GitHub-Version ist durch CI #1252 mit Production Build, Component-, Accessibility-, Playwright- und Security-E2E-Gates geprüft. Die Lovable-Lücke ist eine dokumentierte Tool-/Plattformgrenze und keine fachliche Laufzeitabhängigkeit.

```text
SYSING DASHBOARD — BSF-03B / L2
TEAMLEAD LEISTUNGSNACHWEIS UI / PREVIEW

VERBINDLICHE BASIS
- Lies docs/BSF-03B-DESIGN.md.
- Lies den Implementation Plan.
- Prüfe Branch, Head und git diff.
- Analysiere zuerst vorhandene PerformanceStatement-Komponenten und Tests.

HARTE GRENZEN
- Keine DB-/Migration-/RLS-/Grant-/Function-Änderung in diesem Prompt.
- Keine RBAC-/Auth-Änderung.
- Keine direkte Shared-Activity-Mutation.
- Keine allgemeine Activity-Edit-UI.
- Keine Eurobeträge/Stundensätze/Rechnungslogik.
- Keine Personennamen in der Kundenfassung.
- Keine Providerlogik in UI-Komponenten.
- Kein client.ts-Hack.
- Kein previewAuthStorage.ts.
- Kein Merge/Deploy.

PHASE A — ANALYSE
Prüfe:
- Kunde + Zeitraum,
- Freshness/Datenstand,
- Review-Zustände reviewable/legacy_finalized/claimed,
- Source billable vs effective billable,
- stale Override,
- Billable-Toggle nur reviewable,
- billable/non-billable Summen,
- Finalisierungsdialog,
- Fingerprint-Konflikt-Feedback,
- History finalized/superseded,
- Replacement-Aktion,
- Export PDF/CSV/JSON,
- Empty/Error/Conflict-Zustände,
- responsive Desktopdarstellung.

PHASE B — UI-UMSETZUNG
Nur Präsentation/Usability:
- Filter klar und kompakt,
- Status nicht nur farblich,
- Änderungen der Abrechenbarkeit deutlich sichtbar,
- Finalisierung als bewusste High-impact-Aktion,
- Warnung „Leistungsnachweis, keine Rechnung“,
- Datenstand unmittelbar am Finalisierungsbereich,
- irreversible Snapshot-Semantik verständlich,
- superseded Historie nicht mit aktivem Statement verwechselbar.

PHASE C — TEST
Mindestens:
- PerformanceStatement Component Tests,
- A11y,
- Performance Statement E2E,
- Replacement E2E,
- Security E2E,
- TypeScript,
- ESLint,
- Prettier.

PHASE D — CUSTOMER EXPORT PREVIEW
Prüfe manuell mindestens eine PDF-Ausgabe:
- kein Leistungserbringername,
- keine Engineer-ID,
- keine Source-Hashes,
- keine Eurobeträge,
- nur billable Kundenzellen,
- Summe stimmt mit finalem Snapshot.

ABNAHMEKRITERIEN
- keine Fach-/Securitydrift,
- Review und Finalisierung klar getrennt,
- irreversible Aktion bewusst bestätigt,
- Replacement verständlich,
- Kundenfassung datensparsam,
- targeted Tests PASS.

ABSCHLUSSBERICHT
- HEAD
- ANALYSEERGEBNIS
- DATEIEN_GEAENDERT
- UI_AENDERUNGEN
- FACHLOGIK_GEAENDERT JA/NEIN
- DB_RLS_AUTH_GEAENDERT JA/NEIN
- SHARED_ACTIVITY_MUTATION JA/NEIN
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- TESTS
- CUSTOMER_EXPORT_REDACTION
- OFFENE_PUNKTE
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 5. Prompt 03B-L3 — Abschluss-/Driftprüfung — ABGESCHLOSSEN

```text
SYSING DASHBOARD — BSF-03B / L3 ABSCHLUSSPRÜFUNG

Arbeite primär read-only.

1. Prüfe exakten Head und gesamten Diff gegen Main.
2. performance.statement.manage: Teamlead regulär, Sysadmin nur All-Permissions; Admin/PM/Engineer/Viewer/Customer DENY.
3. Prüfe, dass keine fremde Shared Activity durch BSF-03B mutiert wird.
4. Prüfe Override revisionsgebunden.
5. Prüfe Review Fingerprint TS ↔ DB deterministisch identisch.
6. Prüfe Statement/Items immutable.
7. Prüfe Claims und Race-Tests.
8. Prüfe Replacement-Kette.
9. Prüfe interne Triggerfunktion authenticated EXECUTE DENY.
10. Prüfe keine neue exponierte Security-Definer-Warnung.
11. Prüfe Kundenausgabe ohne Person/Euro/Source-Technik.
12. Führe targeted Tests erneut aus.
13. Keine kosmetische Änderung ohne reproduzierten Befund.
14. Kein Merge. Kein Deploy.

ABSCHLUSSBERICHT
- HEAD
- SCOPE_PASS
- PERMISSION_PASS
- ACTIVITY_OWNERSHIP_PASS
- OVERRIDE_PASS
- FINGERPRINT_PASS
- IMMUTABILITY_PASS
- CLAIM_PASS
- REPLACEMENT_PASS
- TRIGGER_EXECUTE_DENY
- CUSTOMER_REDACTION_PASS
- DRIFT_FINDINGS
- TESTS
- DATEIEN_GEAENDERT
- READY_FOR_FULL_CI JA/NEIN
- MERGE = NEIN
- DEPLOY = NEIN
```

## 6. Credit-Regel

- L1 ist der wichtigste Lauf: reale Supabase-ACL/RLS/Trigger-/Advisor-Prüfung.
- L2 nur für UI/Preview nach stabiler Runtime.
- L3 kurz und driftorientiert.
- Keine Lovable-Credits für Prettier-, reine Git- oder kleine CI-Korrekturen verbrauchen.

## 7. Abbruchregeln

Lovable meldet BLOCKED statt zu erweitern, wenn scheinbar benötigt werden:

- Service Role,
- direkt authenticated-executable SECURITY DEFINER,
- Lockern der BSF-02C Activity-Ownership,
- allgemeines Editieren fremder Activities,
- Rechnungs-/Preislogik,
- Personendirectory/Ranking,
- externe Provider,
- automatische Finalisierung,
- Hard Delete finaler Snapshots.


## 8. Abschlussstand

BSF-03B / Issue #107 ist **FINAL DONE**. Funktionaler Abschluss-Head:
`ffbf3641c2187a738b853fb050aa4e5f1b6541a0`. Security #1247 und CI #1252
sind vollständig PASS; der offizielle Supabase Security Advisor ist
BASELINE_ONLY ohne neue BSF-03B-Findings.

Die Lovable Exact-Head Visual Preview bleibt ausdrücklich **NOT EVIDENCED**,
weil die verwaltete Lovable-Arbeitsfläche nicht identitätsgebunden auf den
GitHub-Kandidaten geschaltet werden konnte. Details:
`docs/BSF-03B-CLOSURE-2026-09-21.md`.

PR #149 bleibt bis zu einer separaten Freigabe ungemergt; kein Deploy.
