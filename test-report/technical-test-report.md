# Technischer Prüfbericht 2.0

_Report ID: `b9e48162-39e8-4889-9001-34888a434363` · Version 8 · Generiert: 2026-08-10T04:27:43.359Z_

## 1. Prüfidentität
- Report-ID: `b9e48162-39e8-4889-9001-34888a434363`
- Reportversion: **8**
- Vorgängerbericht: `dfb75b8e-1271-453f-8f78-2357fc5fe9ec`
- Schema: `2.0.0`
- Dashboard-Version: **1.52.0**
- Commit: `dcffe47`
- Build-Tag: —
- DB-Migration: —
- Ersteller: root
- Build-Zeit: —
- Testzeit: 2026-08-10T04:27:43.248Z
- Umgebung: Node v22.22.0 · linux · CI=false
- Integrität: `sha256:e059219e281951c751272ac99162c65fa70c36e45e0f64fddf444c17da8b2737`

## 2. Freigabestufe
- Vorschlag: **production**
- Effektiv: **production**
- Begründung: Alle Pflichtnachweise grün, keine Blocker offen.

## 3. Gesamtstatus
**bestanden mit Findings**

## 4. Executive Summary
- Findings gesamt: 68 (CRITICAL 0 · HIGH 0 · MEDIUM 8 · LOW 43 · akzeptiert 10).
- Freigabeempfehlung (Legacy): **Entwicklung fortsetzen** — Weiterentwicklung empfohlen.

## 5. Prüfbereiche (deklarativ)
| Bereich | Status | Nachweis |
| --- | --- | --- |
| architecture | bestanden mit Findings | test-report/tech-debt.md |
| rbac | bestanden mit Findings | src/__tests__/security/rbac-v2.test.ts, docs/RBAC-MATRIX.md |
| apiSecurity | bestanden | test-report/api-findings.md, test-report/api-matrix.md |
| operations | nicht ausgeführt | test-report/ops-report.md |
| tests | bestanden mit Findings | test-report/security-vitest.json, test-report/backup-vitest.json |
| backup | bestanden | test-report/backup-integrity-report.md |
| auth | bestanden mit Findings | e2e/specs/navigation.spec.ts, test-report/security-report.md, docs/adr/ADR-0013-security-release-gate.md |
| rls | bestanden | supabase/migrations/*, src/__tests__/security/rbac-v2.test.ts |
| supabase | bestanden | src/integrations/supabase/config.ts, supabase/config.toml |
| dockerPortability | not-applicable | docs/DEPLOYMENT.md |
| azureReadiness | not-applicable | src/lib/azure/*, docs/ADR/0007-rbac-v2-scopes-and-resources.md |
| docs | bestanden | scripts/check-docs-sync.mjs, src/lib/help-documentation.ts, docs/ARCHITECTURE.md |
| governance | bestanden | docs/PROJECT-GOVERNANCE.md, docs/PROJECT-STATUS.yaml, docs/project-status.schema.json, docs/ADR/0023-phasenmodell-infrastrukturabschluss.md |
| projectManifest | bestanden | scripts/project-status/check.mjs, src/__tests__/scripts/project-status-validator.test.ts |
| ci | bestanden | .github/workflows/ci.yml, scripts/ci/quality-gate.mjs |
| backupFormat | bestanden | src/lib/backup/manifest.ts, src/__tests__/backup/manifest-v2.test.ts, docs/ADR/0022-backupformat-2.md |
| layerArchitecture | bestanden | scripts/tech-debt/detectors/layer-violations.mjs, src/hooks/useDashboardPersistence.ts |
| infrastructurePhase | bestanden | docs/ENTWICKLUNGSTAGEBUCH.md, CHANGELOG.md (1.50.0), docs/PROJECT-STATUS.yaml (phases) |

## 6. Testergebnisse nach Bereich

| Bereich | Status | CRIT offen | HIGH offen |
| --- | --- | ---: | ---: |
| Frontend | nicht ausgeführt | 0 | 0 |
| Backend | nicht ausgeführt | 0 | 0 |
| API | bestanden | 0 | 0 |
| UI/E2E | nicht ausgeführt | 0 | 0 |
| RBAC | bestanden mit Findings | 0 | 0 |
| Auth | bestanden mit Findings | 0 | 0 |
| Azure | bestanden mit Findings | 0 | 0 |
| Datenintegrität | bestanden | 0 | 0 |
| Backup/Restore | bestanden | 0 | 0 |
| Accessibility | nicht ausgeführt | 0 | 0 |
| Performance | nicht ausgeführt | 0 | 0 |
| Dokumentation | bestanden | 0 | 0 |
| Technische Schulden | bestanden mit Findings | 0 | 0 |

## 7. Findings

### sec:SEC-CRIT-001 · CRITICAL · Backend prüft keine Rolle oder Assignment
- **Kategorie**: security / backend-rbac
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historisch: direkter POST auf einen Endpoint ohne Auth. Seit v1.39.0 erzwingt `/api/sync` `Authorization: Bearer <supabase-jwt>` UND `public.has_permission(user, 'azure.import'|'azure.export')`.
- **Ursache**: Historisch: direkter POST auf einen Endpoint ohne Auth. Seit v1.39.0 erzwingt `/api/sync` `Authorization: Bearer <supabase-jwt>` UND `public.has_permission(user, 'azure.import'|'azure.export')`.
- **Auswirkung**: Blockiert Release-Phase: all
- **Komponenten**: backend/services/*, src/routes/api/*
- **Nachweis**: test-report/security-report.md#SEC-CRIT-001
- **Empfehlung**: Weitere Endpoints beim Anlegen sofort über `requireSupabaseAuth` + `has_permission` schützen. Muster: siehe `src/routes/api/sync.ts` (Prompt 2A.11).
- **Aufwand**: L · **Reihenfolge**: critical-security · **Status**: accepted

### sec:SEC-CRIT-002 · CRITICAL · Aktive Rolle wird ausschließlich im localStorage geführt
- **Kategorie**: security / identity
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historisch: `localStorage.setItem('northbit-active-user', existingId)` verlieh sofort Sysadmin-Rechte. Seit v1.39.0 leitet `useCurrentUser()` Rolle ausschließlich aus `public.user_roles` gegen `auth.uid()` (RLS-geschützt) ab; localStorage-Manipulation hat keinen Effekt.
- **Ursache**: Historisch: `localStorage.setItem('northbit-active-user', existingId)` verlieh sofort Sysadmin-Rechte. Seit v1.39.0 leitet `useCurrentUser()` Rolle ausschließlich aus `public.user_roles` gegen `auth.uid()` (RLS-geschützt) ab; localStorage-Manipulation hat keinen Effekt.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/hooks/useCurrentUser.ts, src/lib/user-management.ts
- **Nachweis**: test-report/security-report.md#SEC-CRIT-002
- **Empfehlung**: Bei künftigen UI-Gates strikt `useCurrentUser()` verwenden, niemals direkt gegen localStorage prüfen.
- **Aufwand**: L · **Reihenfolge**: critical-security · **Status**: accepted

### sec:SEC-HIGH-STATUS-001 · HIGH · /api/status ist ohne Auth erreichbar und listet fehlende ENV-Namen
- **Kategorie**: security / status
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: GET /api/status liefert 200 mit `security.envValidation.missing` als Klartext-Env-Namen.
- **Ursache**: GET /api/status liefert 200 mit `security.envValidation.missing` als Klartext-Env-Namen.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/routes/api/status.ts
- **Nachweis**: test-report/security-report.md#SEC-HIGH-STATUS-001
- **Empfehlung**: Bewusste Ausnahme dokumentieren (Health-Endpoint darf öffentlich sein) und sicherstellen, dass keine WERTE — nur Namen — ausgegeben werden. Bei Auth-Produktivierung Split in `/api/status/public` (Ping) und `/api/status/internal` (Details) erwägen.
- **Aufwand**: M · **Reihenfolge**: high-security · **Status**: accepted

### sec:SEC-HIGH-LOG-001 · HIGH · Logger-Redaction erfasst keine Connection-Strings mit AccountKey/SAS
- **Kategorie**: security / logging
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Feldnamen ohne token/secret/password (`connectionString`, `conn`) werden nicht maskiert. Nur der Wert wird gegen `JWT_RE` geprüft — Connection-Strings matchen nicht.
- **Ursache**: Feldnamen ohne token/secret/password (`connectionString`, `conn`) werden nicht maskiert. Nur der Wert wird gegen `JWT_RE` geprüft — Connection-Strings matchen nicht.
- **Auswirkung**: Blockiert Release-Phase: azure-production
- **Komponenten**: src/lib/logger.ts, backend/services/logger.mjs
- **Nachweis**: test-report/security-report.md#SEC-HIGH-LOG-001
- **Empfehlung**: Redaction um String-Wert-Regex erweitern: `/(Server=|AccountKey=|SharedAccessSignature=)/`. Test: logging.test.ts › SEC-HIGH-LOG-001 kippt bei Fix auf `[REDACTED]`.
- **Aufwand**: M · **Reihenfolge**: high-security · **Status**: accepted

### td:td-oversize-7e9a0b20 · HIGH · Modul überschreitet Größenschwelle (989 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: accepted-debt · **Gate-relevant**: nein
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Die Datei hat 989 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/routes/_authenticated/dashboard.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).

Akzeptanz: src/routes/_authenticated/dashboard.tsx ist in Sprint 05 von 3281 auf 979 Zeilen reduziert worden (Extraktion nach src/components/dashboard/), liegt aber weiter über der 500-Zeilen-Schwelle. Der verbleibende Split in Sub-Routen erfordert Route-Umbau (ADR-0019) und folgt im UI-Sprint. Sicherheits- oder Funktionsrisiko: keines – reine Wartbarkeit. (Ticket SPRINT-04-DASHBOARD-SPLIT, gültig bis 2026-12-31).
- **Aufwand**: M · **Reihenfolge**: high-functional · **Status**: accepted

### sec:SEC-HIGH-AUTH-001 · HIGH · Historisch: Keine Session-, Token- oder Provider-Infrastruktur
- **Kategorie**: security / auth
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historischer Befund vor v1.39.0. Aktuell existieren Auth-Seiten, Auth-Session, geschützte Dashboard-Route und serverseitige Bearer-Validierung auf /api/sync.
- **Ursache**: Historischer Befund vor v1.39.0. Aktuell existieren Auth-Seiten, Auth-Session, geschützte Dashboard-Route und serverseitige Bearer-Validierung auf /api/sync.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: -
- **Nachweis**: test-report/security-report.md#SEC-HIGH-AUTH-001
- **Empfehlung**: Echte Sign-in-E2E-Tests nur mit bereitgestellter Test-Session ausführen; ohne Test-Session authentifizierte Pfade als UNVERIFIED dokumentieren, nicht als fehlende Infrastruktur.
- **Aufwand**: M · **Reihenfolge**: auth-rbac-blocker · **Status**: accepted

### sec:SEC-HIGH-AZURE-001 · HIGH · Historisch: Azure-Sync akzeptierte einen statischen Shared-Token als einzige Auth
- **Kategorie**: security / azure
- **Klassifikation**: accepted-debt · **Gate-relevant**: ja
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historischer Befund. Der aktuelle Endpoint liest `Authorization: Bearer ...`, validiert `auth.getUser()` und prüft `has_permission(user, 'azure.import'|'azure.export')` vor Sync-Ausführung.
- **Ursache**: Historischer Befund. Der aktuelle Endpoint liest `Authorization: Bearer ...`, validiert `auth.getUser()` und prüft `has_permission(user, 'azure.import'|'azure.export')` vor Sync-Ausführung.
- **Auswirkung**: Blockiert Release-Phase: azure-production
- **Komponenten**: src/routes/api/sync.ts
- **Nachweis**: test-report/security-report.md#SEC-HIGH-AZURE-001
- **Empfehlung**: Dieses Muster für alle künftigen benutzerinitiierten Azure-Aktionen beibehalten; keinen X-Sync-Token-Fallback reintroduzieren.
- **Aufwand**: M · **Reihenfolge**: azure-blocker · **Status**: accepted

### sec:SEC-MED-REDIRECT-001 · MEDIUM · Kein zentraler Guard für Redirect-Ziele
- **Kategorie**: security / navigation
- **Klassifikation**: accepted-debt · **Gate-relevant**: nein
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Es gibt heute keinen Login-Flow und damit keinen `redirect`-Search-Param. Bei Auth-Einführung MUSS der Guard existieren, bevor der erste geschützte Redirect verwendet wird.
- **Ursache**: Es gibt heute keinen Login-Flow und damit keinen `redirect`-Search-Param. Bei Auth-Einführung MUSS der Guard existieren, bevor der erste geschützte Redirect verwendet wird.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: -
- **Nachweis**: test-report/security-report.md#SEC-MED-REDIRECT-001
- **Empfehlung**: Helper `isSafeRedirectTarget(url)` bereitstellen, der nur same-origin/relative Pfade ohne `//`, `javascript:` oder Backslashes zulässt. Testen in `session-gaps` (später).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: accepted

### sec:SEC-MED-CLAIMS-001 · MEDIUM · Keine Claims-Whitelist im Logger
- **Kategorie**: security / logging
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Ein zukünftiges `claims`-Feld würde vollständig geloggt (nur Feldnamen mit Secret-Match werden maskiert). Ohne Whitelist landen potentiell E-Mail, Vor-/Nachname, Groups im Log.
- **Ursache**: Ein zukünftiges `claims`-Feld würde vollständig geloggt (nur Feldnamen mit Secret-Match werden maskiert). Ohne Whitelist landen potentiell E-Mail, Vor-/Nachname, Groups im Log.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/lib/logger.ts, backend/services/logger.mjs
- **Nachweis**: test-report/security-report.md#SEC-MED-CLAIMS-001
- **Empfehlung**: Whitelist einführen (`sub`, `roles`, `tid`) und vor Auth-Produktivierung aktivieren.
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-endpoint-zod-34111d3b · MEDIUM · API-Endpoint ohne Eingabevalidierung
- **Kategorie**: API / API
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein `.parse()`/`.safeParse()`-Aufruf im Handler erkennbar.
- **Ursache**: Request-Body wird ohne Schema-Prüfung verarbeitet.
- **Auswirkung**: Malformierte Payloads erreichen Business-Logik; potenziell inkonsistente Speicherung.
- **Komponenten**: src/routes/api/public/auth-config.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-layer-b432b1b9 · MEDIUM · UI-Direktzugriff auf Azure-Interna
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Komponenten**: src/components/azure/AzureActionsPanel.tsx:7
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-layer-d1e551ce · MEDIUM · UI-Direktzugriff auf Persistenz-Schicht
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/store/dashboard-persistence"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Umgeht Store-Selectors und Debounce-Persistenz; erzeugt versteckte Kopplung an localStorage-Layout.
- **Komponenten**: src/routes/_authenticated/dashboard.tsx:92
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-layer-e4fb0e64 · MEDIUM · UI-Direktzugriff auf Azure-Interna
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Komponenten**: src/components/azure/AzureHistoryPanel.tsx:4
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-242b307c · MEDIUM · Modul überschreitet Größenschwelle (745 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 745 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ui/sidebar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-f3843ebe · MEDIUM · Modul überschreitet Größenschwelle (731 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 731 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/UserManualDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-manual-playwright-smoke-only · MEDIUM · E2E-Suite ist bewusst nur Smoke
- **Kategorie**: Tests / Tests
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: manual
- **Beschreibung**: Die Playwright-Suite (smoke, rbac-gating, import-export) prüft nur Erreichbarkeit und grobe DOM-Sichtbarkeit. Echte RBAC-Gating- und Import/Export-Flows werden nicht End-to-End geprüft.
- **Ursache**: Fehlende stabile data-testid-Anker in der UI; die E2E-Suite wurde zusammen mit der Testinstanz (v1.28.0) als Rahmen etabliert.
- **Auswirkung**: Regressionen in Gating- oder Import/Export-Flows werden nur durch Vitest-Komponenten erkannt, nicht durch echten Browser-Kontext.
- **Komponenten**: e2e/
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
- **Aufwand**: M · **Reihenfolge**: test-gap · **Status**: open

### td:td-endpoint-err-cdae73c5 · LOW · API-Endpoint ohne strukturierte Fehlerantwort
- **Kategorie**: API / API
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein erkennbarer 4xx/5xx-Response-Pfad.
- **Ursache**: Handler wirft ungefangen; Framework antwortet mit generischer 500-Antwort.
- **Auswirkung**: Client kann Fehler nicht klassifizieren, Correlation erschwert.
- **Komponenten**: src/routes/api/status.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-endpoint-err-ce5fa0be · LOW · API-Endpoint ohne strukturierte Fehlerantwort
- **Kategorie**: API / API
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein erkennbarer 4xx/5xx-Response-Pfad.
- **Ursache**: Handler wirft ungefangen; Framework antwortet mit generischer 500-Antwort.
- **Auswirkung**: Client kann Fehler nicht klassifizieren, Correlation erschwert.
- **Komponenten**: src/routes/api/sync.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-32eb5e8c · LOW · Modul überschreitet Größenschwelle (436 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 436 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/WorkingTimeModelsDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-38954b26 · LOW · Modul überschreitet Größenschwelle (560 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 560 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ImportExportDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-392d9209 · LOW · Modul überschreitet Größenschwelle (702 Zeilen)
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 702 Zeilen (Schwelle 600). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/lib/json-import-service.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-564261af · LOW · Modul überschreitet Größenschwelle (466 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 466 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ImportPreviewDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-92e5643a · LOW · Modul überschreitet Größenschwelle (423 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 423 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/compliance/ComplianceReportPrint.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-af210d92 · LOW · Modul überschreitet Größenschwelle (481 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 481 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/SystemStatusDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-d5f3942b · LOW · Modul überschreitet Größenschwelle (496 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 496 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/LogViewerDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-ebfd4b54 · LOW · Modul überschreitet Größenschwelle (563 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 563 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/UserManagementDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-oversize-feb81a2f · LOW · Modul überschreitet Größenschwelle (490 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 490 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/PerformanceReport.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-1634f273 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/collapsible.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-19eefab7 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/progress.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-242b307c · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/sidebar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-2452737a · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/lib/i18n/format.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-2900775b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/chart.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-2c46e416 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/carousel.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-432c9ba1 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/scroll-area.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-47d5b07c · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/pagination.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-4c5ab6a6 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/context-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-4fae0654 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/alert-dialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-539cbbad · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/toggle-group.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-60027755 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/form.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-7ed7cbb9 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/textarea.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-8152e2df · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/aspect-ratio.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-8b8d7a5b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/menubar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-906e6010 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/resizable.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-98f7d819 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/drawer.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-9b5a9f9b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/lib/rbac/permission-groups.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-adda4e46 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/accordion.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-af1ee499 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/navigation-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-b0c0d351 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/popover.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-bd7563ab · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/integrations/supabase/auth-middleware.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-d5b25a61 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/breadcrumb.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-da11a267 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/slider.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-deb46595 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/avatar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-ded2d8d0 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/table.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-e4656c7f · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/dropdown-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-e89d394d · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/hover-card.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-f35c0af6 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/calendar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### td:td-orphan-fee5a79a · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/command.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: open

### man:avkk-can-write-execute · LOW · avkk_can_write ist für die Rolle authenticated ausführbar
- **Kategorie**: RBAC / RBAC
- **Klassifikation**: accepted-debt · **Gate-relevant**: nein
- **Quelle**: manual (akzeptiert)
- **Beschreibung**: Der Datenbank-Linter meldet, dass public.avkk_can_write(uuid) von der Rolle authenticated ausgeführt werden darf. Das ist zwingend erforderlich, weil die Funktion in den RLS-Policies der AVKK-Tabellen ausgewertet wird; ohne EXECUTE scheitert jeder Schreibvorgang. Bewertung und Begründung: ADR-0025, Abschnitt „avkk_can_write“.
- **Ursache**: Notwendige Rechtevergabe für policybasierte Autorisierung, keine Fehlkonfiguration.
- **Auswirkung**: Ein angemeldeter Nutzer kann für eine geratene Subject-UUID die boolesche Antwort „darf ich schreiben“ erfragen. Die Funktion liefert ausschließlich true/false, keine Tabelleninhalte, keine Fremddaten und keine Existenzaussage über konkrete Sachdaten.
- **Komponenten**: public.avkk_can_write, RLS AVKK
- **Nachweis**: supabase linter: function_execute_grant
- **Empfehlung**: Beibehalten. EXECUTE bleibt auf authenticated und service_role beschränkt (kein anon). Funktion bleibt SECURITY DEFINER, STABLE, mit search_path = public und boolescher Rückgabe. Abgesichert durch src/__tests__/security/avkk-rls.test.ts.
- **ADR**: ADR-0025
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: accepted

### td:td-manual-msw-coverage-gap · LOW · MSW-Handler decken nur wenige Azure-Endpunkte
- **Kategorie**: Tests / Tests
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: manual
- **Beschreibung**: Aktuell sind nur die im Rahmen von 2A.1 benötigten Azure-Antworten gemockt. Weitere Azure-Aufrufe (Insert, Delete, Batch) würden im Testlauf ungefiltert ins Netz gehen — MSW onUnhandledRequest:error verhindert dies zwar, blockiert aber auch neue Test-Fälle.
- **Ursache**: Iterativer Aufbau der Mock-Landschaft.
- **Auswirkung**: Neue Azure-Feature-Tests scheitern zunächst an fehlenden Handlern statt an Business-Logik.
- **Komponenten**: src/__tests__/mocks/handlers/azure.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
- **Aufwand**: S · **Reihenfolge**: test-gap · **Status**: open

### td:td-manual-ci-playwright-cache · LOW · CI installiert Chromium bei jedem Lauf
- **Kategorie**: Tests / Tests
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: manual
- **Beschreibung**: bunx playwright install --with-deps chromium läuft in jedem Job neu (~200 MB Cache). Kein actions/cache@v4 auf ~/.cache/ms-playwright.
- **Ursache**: CI-Änderung in 2A.1 bewusst minimal gehalten.
- **Auswirkung**: CI-Laufzeit ~1–2 min höher, Netzwerkkosten unnötig.
- **Komponenten**: .github/workflows/ci.yml
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
- **Aufwand**: S · **Reihenfolge**: test-gap · **Status**: open

### sec:SEC-LOW-DOCS-001 · LOW · Handbuch weist Grenzen der Suite explizit aus
- **Kategorie**: security / docs
- **Klassifikation**: accepted-debt · **Gate-relevant**: nein
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: -
- **Ursache**: -
- **Auswirkung**: Blockiert Release-Phase: none
- **Komponenten**: src/lib/help-documentation.ts
- **Nachweis**: test-report/security-report.md#SEC-LOW-DOCS-001
- **Empfehlung**: Kapitel "Sicherheits- und RBAC-Tests" gepflegt halten, damit keine Zertifizierungs-Fehlannahmen entstehen.
- **Aufwand**: M · **Reihenfolge**: documentation · **Status**: accepted

### td:td-console-08e8609a · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-worker-entry)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Worker-/SSR-Einstiegspunkt. Der Frontend-Logger schreibt in PROD nach IndexedDB; im Cloudflare-Worker existiert kein IndexedDB, die Meldung ginge verloren. Nur gekürzte Fehlermeldungen (<=256 Zeichen), keine Objekte, keine Secrets.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/start.ts:13
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis 2026-12-31 (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-console-2c49302b · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Auto-generierte Integrationsdateien (Lovable Cloud). Änderungen würden beim nächsten Generierungslauf überschrieben. Ausgaben sind statische Konfig-Hinweise ohne Werte.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/integrations/supabase/auth-middleware.ts:45
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis dauerhaft (solange generiert) (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-console-43084e7a · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Auto-generierte Integrationsdateien (Lovable Cloud). Änderungen würden beim nächsten Generierungslauf überschrieben. Ausgaben sind statische Konfig-Hinweise ohne Werte.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/integrations/supabase/client.ts:54
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis dauerhaft (solange generiert) (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-console-665c1d8d · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Auto-generierte Integrationsdateien (Lovable Cloud). Änderungen würden beim nächsten Generierungslauf überschrieben. Ausgaben sind statische Konfig-Hinweise ohne Werte.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/integrations/supabase/client.server.ts:42
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis dauerhaft (solange generiert) (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-console-6c701bbd · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-worker-entry)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Worker-/SSR-Einstiegspunkt. Der Frontend-Logger schreibt in PROD nach IndexedDB; im Cloudflare-Worker existiert kein IndexedDB, die Meldung ginge verloren. Nur gekürzte Fehlermeldungen (<=256 Zeichen), keine Objekte, keine Secrets.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/server.ts:68
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis 2026-12-31 (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-console-74bd3646 · INFO · Dokumentierte Konsolen-Ausnahme (console-exc-worker-entry)
- **Kategorie**: Frontend / Frontend
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…) — begründete Ausnahme: Worker-/SSR-Einstiegspunkt. Der Frontend-Logger schreibt in PROD nach IndexedDB; im Cloudflare-Worker existiert kein IndexedDB, die Meldung ginge verloren. Nur gekürzte Fehlermeldungen (<=256 Zeichen), keine Objekte, keine Secrets.
- **Ursache**: Zentraler Logger an dieser Stelle technisch nicht nutzbar (siehe Begründung).
- **Auswirkung**: Begrenzt: Ausgaben sind gekürzt und secret-frei; kein zentraler Sink.
- **Komponenten**: src/server.ts:79
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausnahme bleibt gültig bis 2026-12-31 (docs/LOGGING.md#ausnahmen).
- **Aufwand**: S · **Reihenfolge**: architecture · **Status**: akzeptiert

### td:td-coverage-027fe478 · INFO · Kein Coverage-Report vorhanden
- **Kategorie**: Tests / Tests
- **Klassifikation**: confirmed · **Gate-relevant**: nein
- **Quelle**: auto
- **Beschreibung**: Für den aktuellen Buildstand liegt keine Coverage-Zusammenfassung vor. Coverage-Lücken können nicht bewertet werden.
- **Ursache**: `bun run test:coverage` wurde vor `test:debt` nicht ausgeführt.
- **Auswirkung**: Trend-Analyse der Testabdeckung blind.
- **Komponenten**: coverage/coverage-summary.json
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
- **Aufwand**: S · **Reihenfolge**: test-gap · **Status**: open

## 8. Sortierte Maßnahmenliste
- **architecture** (54): sec:SEC-MED-CLAIMS-001, td:td-endpoint-zod-34111d3b, td:td-layer-b432b1b9, td:td-layer-d1e551ce, td:td-layer-e4fb0e64, td:td-oversize-242b307c, td:td-oversize-f3843ebe, td:td-endpoint-err-cdae73c5, td:td-endpoint-err-ce5fa0be, td:td-oversize-32eb5e8c, td:td-oversize-38954b26, td:td-oversize-392d9209, td:td-oversize-564261af, td:td-oversize-92e5643a, td:td-oversize-af210d92, td:td-oversize-d5f3942b, td:td-oversize-ebfd4b54, td:td-oversize-feb81a2f, td:td-orphan-1634f273, td:td-orphan-19eefab7, td:td-orphan-242b307c, td:td-orphan-2452737a, td:td-orphan-2900775b, td:td-orphan-2c46e416, td:td-orphan-432c9ba1, td:td-orphan-47d5b07c, td:td-orphan-4c5ab6a6, td:td-orphan-4fae0654, td:td-orphan-539cbbad, td:td-orphan-60027755, td:td-orphan-7ed7cbb9, td:td-orphan-8152e2df, td:td-orphan-8b8d7a5b, td:td-orphan-906e6010, td:td-orphan-98f7d819, td:td-orphan-9b5a9f9b, td:td-orphan-adda4e46, td:td-orphan-af1ee499, td:td-orphan-b0c0d351, td:td-orphan-bd7563ab, td:td-orphan-d5b25a61, td:td-orphan-da11a267, td:td-orphan-deb46595, td:td-orphan-ded2d8d0, td:td-orphan-e4656c7f, td:td-orphan-e89d394d, td:td-orphan-f35c0af6, td:td-orphan-fee5a79a, td:td-console-08e8609a, td:td-console-2c49302b, td:td-console-43084e7a, td:td-console-665c1d8d, td:td-console-6c701bbd, td:td-console-74bd3646
- **test-gap** (4): td:td-manual-playwright-smoke-only, td:td-manual-msw-coverage-gap, td:td-manual-ci-playwright-cache, td:td-coverage-027fe478

## 9. Vergleich zum Vorgängerbericht
- Neu: 1
- Behoben: 0
- Verschlechtert: 0
- Unverändert: 67
- Wieder aufgetreten: 0
- Schweregrad geändert: 0
- Gate-Relevanz geändert: 0
- Status geändert: 0

## 10. Freigabeempfehlung (Legacy)
**Entwicklung fortsetzen** — Weiterentwicklung empfohlen.

## 11. Quality-Gate-Blocker (Prompt 2A.10)
_Keine — CI-Gate ist grün._

## Bekannte Grenzen
- Reine Aggregation: Qualität hängt an den Einzelberichten.
- Bereichs-Status `not-run` heißt fehlender Vorbericht, nicht „grün".
- Diff-Match über Finding-ID; Bereichsberichte ohne stabile IDs erhalten einen Titel-Hash.
