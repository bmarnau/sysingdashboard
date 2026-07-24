# Technischer Prüfbericht

_Generiert: 2026-07-24T05:45:53.296Z_

## 1. Prüfidentität
- Dashboard-Version: **1.41.3**
- Commit: `b3e5560`
- Build-Zeit: —
- Testzeit: 2026-07-24T05:45:53.167Z
- Umgebung: Node v22.22.0 · linux · CI=false

## 2. Gesamtstatus
**bestanden mit Findings**

## 3. Executive Summary
- Findings gesamt: 67 (CRITICAL 2 · HIGH 10 · MEDIUM 13 · LOW 41 · akzeptiert 7).
- Freigabeempfehlung: **für Pilot geeignet** — 7 HIGH-Findings — für Pilot geeignet, für Produktion nicht.

## 4. Testergebnisse nach Bereich

| Bereich | Status | CRIT offen | HIGH offen |
| --- | --- | ---: | ---: |
| Frontend | nicht ausgeführt | 0 | 0 |
| Backend | nicht ausgeführt | 0 | 0 |
| API | bestanden | 0 | 0 |
| UI/E2E | nicht ausgeführt | 0 | 0 |
| RBAC | bestanden mit Findings | 0 | 1 |
| Auth | bestanden mit Findings | 0 | 1 |
| Azure | bestanden mit Findings | 0 | 1 |
| Datenintegrität | bestanden | 0 | 0 |
| Backup/Restore | bestanden | 0 | 0 |
| Accessibility | nicht ausgeführt | 0 | 0 |
| Performance | nicht ausgeführt | 0 | 0 |
| Dokumentation | bestanden | 0 | 0 |
| Technische Schulden | bestanden mit Findings | 0 | 6 |

## 5. Findings

### sec:SEC-CRIT-001 · CRITICAL · Backend prüft keine Rolle oder Assignment
- **Kategorie**: security / backend-rbac
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historisch: direkter POST auf einen Endpoint ohne Auth. Seit v1.39.0 erzwingt `/api/sync` `Authorization: Bearer <supabase-jwt>` UND `public.has_permission(user, 'azure.import'|'azure.export')`.
- **Ursache**: Historisch: direkter POST auf einen Endpoint ohne Auth. Seit v1.39.0 erzwingt `/api/sync` `Authorization: Bearer <supabase-jwt>` UND `public.has_permission(user, 'azure.import'|'azure.export')`.
- **Auswirkung**: Blockiert Release-Phase: all
- **Komponenten**: backend/services/*, src/routes/api/*
- **Nachweis**: test-report/security-report.md#SEC-CRIT-001
- **Empfehlung**: Weitere Endpoints beim Anlegen sofort über `requireSupabaseAuth` + `has_permission` schützen. Muster: siehe `src/routes/api/sync.ts` (Prompt 2A.11).
- **Aufwand**: L · **Bearbeitungsreihenfolge**: critical-security · **Status**: accepted

### sec:SEC-CRIT-002 · CRITICAL · Aktive Rolle wird ausschließlich im localStorage geführt
- **Kategorie**: security / identity
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historisch: `localStorage.setItem('northbit-active-user', existingId)` verlieh sofort Sysadmin-Rechte. Seit v1.39.0 leitet `useCurrentUser()` Rolle ausschließlich aus `public.user_roles` gegen `auth.uid()` (RLS-geschützt) ab; localStorage-Manipulation hat keinen Effekt.
- **Ursache**: Historisch: `localStorage.setItem('northbit-active-user', existingId)` verlieh sofort Sysadmin-Rechte. Seit v1.39.0 leitet `useCurrentUser()` Rolle ausschließlich aus `public.user_roles` gegen `auth.uid()` (RLS-geschützt) ab; localStorage-Manipulation hat keinen Effekt.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/hooks/useCurrentUser.ts, src/lib/user-management.ts
- **Nachweis**: test-report/security-report.md#SEC-CRIT-002
- **Empfehlung**: Bei künftigen UI-Gates strikt `useCurrentUser()` verwenden, niemals direkt gegen localStorage prüfen.
- **Aufwand**: L · **Bearbeitungsreihenfolge**: critical-security · **Status**: accepted

### sec:SEC-HIGH-STATUS-001 · HIGH · /api/status ist ohne Auth erreichbar und listet fehlende ENV-Namen
- **Kategorie**: security / status
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: GET /api/status liefert 200 mit `security.envValidation.missing` als Klartext-Env-Namen.
- **Ursache**: GET /api/status liefert 200 mit `security.envValidation.missing` als Klartext-Env-Namen.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/routes/api/status.ts
- **Nachweis**: test-report/security-report.md#SEC-HIGH-STATUS-001
- **Empfehlung**: Bewusste Ausnahme dokumentieren (Health-Endpoint darf öffentlich sein) und sicherstellen, dass keine WERTE — nur Namen — ausgegeben werden. Bei Auth-Produktivierung Split in `/api/status/public` (Ping) und `/api/status/internal` (Details) erwägen.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-security · **Status**: accepted

### sec:SEC-HIGH-LOG-001 · HIGH · Logger-Redaction erfasst keine Connection-Strings mit AccountKey/SAS
- **Kategorie**: security / logging
- **Quelle**: auto
- **Beschreibung**: Feldnamen ohne token/secret/password (`connectionString`, `conn`) werden nicht maskiert. Nur der Wert wird gegen `JWT_RE` geprüft — Connection-Strings matchen nicht.
- **Ursache**: Feldnamen ohne token/secret/password (`connectionString`, `conn`) werden nicht maskiert. Nur der Wert wird gegen `JWT_RE` geprüft — Connection-Strings matchen nicht.
- **Auswirkung**: Blockiert Release-Phase: azure-production
- **Komponenten**: src/lib/logger.ts, backend/services/logger.mjs
- **Nachweis**: test-report/security-report.md#SEC-HIGH-LOG-001
- **Empfehlung**: Redaction um String-Wert-Regex erweitern: `/(Server=|AccountKey=|SharedAccessSignature=)/`. Test: logging.test.ts › SEC-HIGH-LOG-001 kippt bei Fix auf `[REDACTED]`.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-security · **Status**: open

### td:td-endpoint-auth-cdae73c5 · HIGH · API-Endpoint ohne erkennbaren Auth-Guard
- **Kategorie**: API / API
- **Quelle**: auto
- **Beschreibung**: Handler enthält weder `X-Sync-Token`, `requireSupabaseAuth` noch einen anderen Auth-Marker.
- **Ursache**: Endpoint wurde ohne Authentifizierungs-Prüfung angelegt.
- **Auswirkung**: Unbefugter Zugriff möglich, sobald der Endpoint öffentlich erreichbar wird.
- **Komponenten**: src/routes/api/status.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auth-Middleware oder Token-Prüfung ergänzen; für externe Caller `/api/public/*` + Signaturprüfung nutzen.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### td:td-cycle-1fa843a1 · HIGH · Zyklische Abhängigkeit (1 Kanten)
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Zyklus: src/__tests__/mocks/server.ts → src/__tests__/mocks/server.ts
- **Ursache**: Wechselseitiger Import zwischen Modulen; Fehlende gemeinsame Basis-Abstraktion.
- **Auswirkung**: Erschwert Tree-Shaking, kann zu undefined-Imports zur Laufzeit führen, blockiert saubere Test-Isolation.
- **Komponenten**: src/__tests__/mocks/server.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Gemeinsame Types/Utilities in ein drittes Modul extrahieren; Abhängigkeitsrichtung erzwingen.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### td:td-cycle-dc9fbe11 · HIGH · Zyklische Abhängigkeit (2 Kanten)
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Zyklus: src/lib/logger.ts → src/lib/logger.indexeddb.ts → src/lib/logger.ts
- **Ursache**: Wechselseitiger Import zwischen Modulen; Fehlende gemeinsame Basis-Abstraktion.
- **Auswirkung**: Erschwert Tree-Shaking, kann zu undefined-Imports zur Laufzeit führen, blockiert saubere Test-Isolation.
- **Komponenten**: src/lib/logger.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Gemeinsame Types/Utilities in ein drittes Modul extrahieren; Abhängigkeitsrichtung erzwingen.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### td:td-oversize-26e43c0a · HIGH · Modul überschreitet Größenschwelle (808 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 808 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ExportDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### td:td-oversize-99cca8a6 · HIGH · Modul überschreitet Größenschwelle (3256 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 3256 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/routes/index.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### td:td-oversize-ebfd4b54 · HIGH · Modul überschreitet Größenschwelle (840 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 840 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/UserManagementDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: high-functional · **Status**: open

### sec:SEC-HIGH-AUTH-001 · HIGH · Historisch: Keine Session-, Token- oder Provider-Infrastruktur
- **Kategorie**: security / auth
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historischer Befund vor v1.39.0. Aktuell existieren Auth-Seiten, Auth-Session, geschützte Dashboard-Route und serverseitige Bearer-Validierung auf /api/sync.
- **Ursache**: Historischer Befund vor v1.39.0. Aktuell existieren Auth-Seiten, Auth-Session, geschützte Dashboard-Route und serverseitige Bearer-Validierung auf /api/sync.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: -
- **Nachweis**: test-report/security-report.md#SEC-HIGH-AUTH-001
- **Empfehlung**: Echte Sign-in-E2E-Tests nur mit bereitgestellter Test-Session ausführen; ohne Test-Session authentifizierte Pfade als UNVERIFIED dokumentieren, nicht als fehlende Infrastruktur.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: auth-rbac-blocker · **Status**: accepted

### sec:SEC-HIGH-AZURE-001 · HIGH · Historisch: Azure-Sync akzeptierte einen statischen Shared-Token als einzige Auth
- **Kategorie**: security / azure
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Historischer Befund. Der aktuelle Endpoint liest `Authorization: Bearer ...`, validiert `auth.getUser()` und prüft `has_permission(user, 'azure.import'|'azure.export')` vor Sync-Ausführung.
- **Ursache**: Historischer Befund. Der aktuelle Endpoint liest `Authorization: Bearer ...`, validiert `auth.getUser()` und prüft `has_permission(user, 'azure.import'|'azure.export')` vor Sync-Ausführung.
- **Auswirkung**: Blockiert Release-Phase: azure-production
- **Komponenten**: src/routes/api/sync.ts
- **Nachweis**: test-report/security-report.md#SEC-HIGH-AZURE-001
- **Empfehlung**: Dieses Muster für alle künftigen benutzerinitiierten Azure-Aktionen beibehalten; keinen X-Sync-Token-Fallback reintroduzieren.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: azure-blocker · **Status**: accepted

### sec:SEC-MED-REDIRECT-001 · MEDIUM · Kein zentraler Guard für Redirect-Ziele
- **Kategorie**: security / navigation
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: Es gibt heute keinen Login-Flow und damit keinen `redirect`-Search-Param. Bei Auth-Einführung MUSS der Guard existieren, bevor der erste geschützte Redirect verwendet wird.
- **Ursache**: Es gibt heute keinen Login-Flow und damit keinen `redirect`-Search-Param. Bei Auth-Einführung MUSS der Guard existieren, bevor der erste geschützte Redirect verwendet wird.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: -
- **Nachweis**: test-report/security-report.md#SEC-MED-REDIRECT-001
- **Empfehlung**: Helper `isSafeRedirectTarget(url)` bereitstellen, der nur same-origin/relative Pfade ohne `//`, `javascript:` oder Backslashes zulässt. Testen in `session-gaps` (später).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: accepted

### sec:SEC-MED-CLAIMS-001 · MEDIUM · Keine Claims-Whitelist im Logger
- **Kategorie**: security / logging
- **Quelle**: auto
- **Beschreibung**: Ein zukünftiges `claims`-Feld würde vollständig geloggt (nur Feldnamen mit Secret-Match werden maskiert). Ohne Whitelist landen potentiell E-Mail, Vor-/Nachname, Groups im Log.
- **Ursache**: Ein zukünftiges `claims`-Feld würde vollständig geloggt (nur Feldnamen mit Secret-Match werden maskiert). Ohne Whitelist landen potentiell E-Mail, Vor-/Nachname, Groups im Log.
- **Auswirkung**: Blockiert Release-Phase: auth-production
- **Komponenten**: src/lib/logger.ts, backend/services/logger.mjs
- **Nachweis**: test-report/security-report.md#SEC-MED-CLAIMS-001
- **Empfehlung**: Whitelist einführen (`sub`, `roles`, `tid`) und vor Auth-Produktivierung aktivieren.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-console-375dfc5b · MEDIUM · Direktes console.error außerhalb der Logger-Fassade
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Komponenten**: src/routes/__root.tsx:40
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-console-629bd14d · MEDIUM · Direktes console.error außerhalb der Logger-Fassade
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Komponenten**: src/start.ts:12
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-console-6c701bbd · MEDIUM · Direktes console.error außerhalb der Logger-Fassade
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Komponenten**: src/server.ts:68
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-console-74bd3646 · MEDIUM · Direktes console.error außerhalb der Logger-Fassade
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Komponenten**: src/server.ts:79
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-console-da1180ce · MEDIUM · Direktes console.error außerhalb der Logger-Fassade
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Aufruf: console.error(…)
- **Ursache**: Logger-Nutzung wurde übersprungen (Convenience oder Legacy-Code).
- **Auswirkung**: Kein zentraler Sink (IndexedDB, Redaction). Sensible Werte können ungefiltert in Browser-Console landen.
- **Komponenten**: src/lib/help-documentation.ts:425
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-layer-b432b1b9 · MEDIUM · UI-Direktzugriff auf Azure-Interna
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Komponenten**: src/components/azure/AzureActionsPanel.tsx:7
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-layer-c1c89b30 · MEDIUM · UI-Direktzugriff auf Persistenz-Schicht
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/store/dashboard-persistence"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Umgeht Store-Selectors und Debounce-Persistenz; erzeugt versteckte Kopplung an localStorage-Layout.
- **Komponenten**: src/routes/index.tsx:112
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-layer-e4fb0e64 · MEDIUM · UI-Direktzugriff auf Azure-Interna
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Datei importiert ein verbotenes Modul: from "@/lib/azure/azure-history-store"
- **Ursache**: Fehlende Facade-Nutzung; Convenience-Import statt Store-/Service-Abstraktion.
- **Auswirkung**: Bricht die Azure-Facade auf; Änderungen am Azure-Schema propagieren ungefiltert in die UI.
- **Komponenten**: src/components/azure/AzureHistoryPanel.tsx:4
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Ausschließlich `@/lib/azure/azure-service` importieren.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-242b307c · MEDIUM · Modul überschreitet Größenschwelle (745 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 745 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ui/sidebar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-f3843ebe · MEDIUM · Modul überschreitet Größenschwelle (731 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 731 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/UserManualDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-manual-playwright-smoke-only · MEDIUM · E2E-Suite ist bewusst nur Smoke
- **Kategorie**: Tests / Tests
- **Quelle**: manual
- **Beschreibung**: Die Playwright-Suite (smoke, rbac-gating, import-export) prüft nur Erreichbarkeit und grobe DOM-Sichtbarkeit. Echte RBAC-Gating- und Import/Export-Flows werden nicht End-to-End geprüft.
- **Ursache**: Fehlende stabile data-testid-Anker in der UI; die E2E-Suite wurde zusammen mit der Testinstanz (v1.28.0) als Rahmen etabliert.
- **Auswirkung**: Regressionen in Gating- oder Import/Export-Flows werden nur durch Vitest-Komponenten erkannt, nicht durch echten Browser-Kontext.
- **Komponenten**: e2e/
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: test-gap · **Status**: open

### td:td-oversize-32eb5e8c · LOW · Modul überschreitet Größenschwelle (436 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 436 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/WorkingTimeModelsDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-38954b26 · LOW · Modul überschreitet Größenschwelle (560 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 560 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ImportExportDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-392d9209 · LOW · Modul überschreitet Größenschwelle (702 Zeilen)
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 702 Zeilen (Schwelle 600). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/lib/json-import-service.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-564261af · LOW · Modul überschreitet Größenschwelle (466 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 466 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/ImportPreviewDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-789d61fa · LOW · Modul überschreitet Größenschwelle (716 Zeilen)
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 716 Zeilen (Schwelle 600). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/lib/backup-service.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-af210d92 · LOW · Modul überschreitet Größenschwelle (454 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 454 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/SystemStatusDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-d5f3942b · LOW · Modul überschreitet Größenschwelle (496 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 496 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/LogViewerDialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-oversize-feb81a2f · LOW · Modul überschreitet Größenschwelle (490 Zeilen)
- **Kategorie**: Frontend / Frontend
- **Quelle**: auto
- **Beschreibung**: Die Datei hat 490 Zeilen (Schwelle 400). Wahrscheinlich mehrere Verantwortlichkeiten.
- **Ursache**: Fehlende Modul-Aufteilung; organisch gewachsen ohne Refactor.
- **Auswirkung**: Reduziert Lesbarkeit, erhöht Regressionsrisiko, erschwert Code-Reviews und Testabdeckung.
- **Komponenten**: src/components/PerformanceReport.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
- **Aufwand**: M · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-1634f273 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/collapsible.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-19eefab7 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/progress.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-242b307c · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/sidebar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-2452737a · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/lib/i18n/format.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-2900775b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/chart.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-2c46e416 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/carousel.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-432c9ba1 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/scroll-area.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-47d5b07c · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/pagination.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-4c5ab6a6 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/context-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-4fae0654 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/alert-dialog.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-539cbbad · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/toggle-group.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-60027755 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/form.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-7ed7cbb9 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/textarea.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-8152e2df · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/aspect-ratio.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-8b8d7a5b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/menubar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-906e6010 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/resizable.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-98f7d819 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/drawer.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-9b5a9f9b · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/lib/rbac/permission-groups.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-9d8b7a18 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/card.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-adda4e46 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/accordion.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-af1ee499 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/navigation-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-b0c0d351 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/popover.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-d5b25a61 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/breadcrumb.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-da11a267 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/slider.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-deb46595 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/avatar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-ded2d8d0 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/table.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-e4656c7f · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/dropdown-menu.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-e89d394d · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/hover-card.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-f35c0af6 · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/calendar.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-orphan-fee5a79a · LOW · Möglicherweise verwaistes Modul
- **Kategorie**: Architektur / Architektur
- **Quelle**: auto
- **Beschreibung**: Kein Import unter `src/**` referenziert dieses Modul (heuristisch via Basisname).
- **Ursache**: Modul wurde ersetzt/verschoben, aber die Datei ist geblieben.
- **Auswirkung**: Toter Code erhöht Bundle-Size, Wartungslast und Verwirrung bei Neu-Entwicklung.
- **Komponenten**: src/components/ui/command.tsx
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: architecture · **Status**: open

### td:td-manual-msw-coverage-gap · LOW · MSW-Handler decken nur wenige Azure-Endpunkte
- **Kategorie**: Tests / Tests
- **Quelle**: manual
- **Beschreibung**: Aktuell sind nur die im Rahmen von 2A.1 benötigten Azure-Antworten gemockt. Weitere Azure-Aufrufe (Insert, Delete, Batch) würden im Testlauf ungefiltert ins Netz gehen — MSW onUnhandledRequest:error verhindert dies zwar, blockiert aber auch neue Test-Fälle.
- **Ursache**: Iterativer Aufbau der Mock-Landschaft.
- **Auswirkung**: Neue Azure-Feature-Tests scheitern zunächst an fehlenden Handlern statt an Business-Logik.
- **Komponenten**: src/__tests__/mocks/handlers/azure.ts
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: test-gap · **Status**: open

### td:td-manual-ci-playwright-cache · LOW · CI installiert Chromium bei jedem Lauf
- **Kategorie**: Tests / Tests
- **Quelle**: manual
- **Beschreibung**: bunx playwright install --with-deps chromium läuft in jedem Job neu (~200 MB Cache). Kein actions/cache@v4 auf ~/.cache/ms-playwright.
- **Ursache**: CI-Änderung in 2A.1 bewusst minimal gehalten.
- **Auswirkung**: CI-Laufzeit ~1–2 min höher, Netzwerkkosten unnötig.
- **Komponenten**: .github/workflows/ci.yml
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
- **Aufwand**: S · **Bearbeitungsreihenfolge**: test-gap · **Status**: open

### sec:SEC-LOW-DOCS-001 · LOW · Handbuch weist Grenzen der Suite explizit aus
- **Kategorie**: security / docs
- **Quelle**: auto (akzeptiert)
- **Beschreibung**: -
- **Ursache**: -
- **Auswirkung**: Blockiert Release-Phase: none
- **Komponenten**: src/lib/help-documentation.ts
- **Nachweis**: test-report/security-report.md#SEC-LOW-DOCS-001
- **Empfehlung**: Kapitel "Sicherheits- und RBAC-Tests" gepflegt halten, damit keine Zertifizierungs-Fehlannahmen entstehen.
- **Aufwand**: M · **Bearbeitungsreihenfolge**: documentation · **Status**: accepted

### td:td-coverage-027fe478 · INFO · Kein Coverage-Report vorhanden
- **Kategorie**: Tests / Tests
- **Quelle**: auto
- **Beschreibung**: Für den aktuellen Buildstand liegt keine Coverage-Zusammenfassung vor. Coverage-Lücken können nicht bewertet werden.
- **Ursache**: `bun run test:coverage` wurde vor `test:debt` nicht ausgeführt.
- **Auswirkung**: Trend-Analyse der Testabdeckung blind.
- **Komponenten**: coverage/coverage-summary.json
- **Nachweis**: test-report/tech-debt.md
- **Empfehlung**: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
- **Aufwand**: S · **Bearbeitungsreihenfolge**: test-gap · **Status**: open

## 6. Sortierte Maßnahmenliste
- **critical-security** (2): sec:SEC-CRIT-001, sec:SEC-CRIT-002
- **high-security** (2): sec:SEC-HIGH-STATUS-001, sec:SEC-HIGH-LOG-001
- **high-functional** (6): td:td-endpoint-auth-cdae73c5, td:td-cycle-1fa843a1, td:td-cycle-dc9fbe11, td:td-oversize-26e43c0a, td:td-oversize-99cca8a6, td:td-oversize-ebfd4b54
- **auth-rbac-blocker** (1): sec:SEC-HIGH-AUTH-001
- **azure-blocker** (1): sec:SEC-HIGH-AZURE-001
- **architecture** (50): sec:SEC-MED-REDIRECT-001, sec:SEC-MED-CLAIMS-001, td:td-console-375dfc5b, td:td-console-629bd14d, td:td-console-6c701bbd, td:td-console-74bd3646, td:td-console-da1180ce, td:td-layer-b432b1b9, td:td-layer-c1c89b30, td:td-layer-e4fb0e64, td:td-oversize-242b307c, td:td-oversize-f3843ebe, td:td-oversize-32eb5e8c, td:td-oversize-38954b26, td:td-oversize-392d9209, td:td-oversize-564261af, td:td-oversize-789d61fa, td:td-oversize-af210d92, td:td-oversize-d5f3942b, td:td-oversize-feb81a2f, td:td-orphan-1634f273, td:td-orphan-19eefab7, td:td-orphan-242b307c, td:td-orphan-2452737a, td:td-orphan-2900775b, td:td-orphan-2c46e416, td:td-orphan-432c9ba1, td:td-orphan-47d5b07c, td:td-orphan-4c5ab6a6, td:td-orphan-4fae0654, td:td-orphan-539cbbad, td:td-orphan-60027755, td:td-orphan-7ed7cbb9, td:td-orphan-8152e2df, td:td-orphan-8b8d7a5b, td:td-orphan-906e6010, td:td-orphan-98f7d819, td:td-orphan-9b5a9f9b, td:td-orphan-9d8b7a18, td:td-orphan-adda4e46, td:td-orphan-af1ee499, td:td-orphan-b0c0d351, td:td-orphan-d5b25a61, td:td-orphan-da11a267, td:td-orphan-deb46595, td:td-orphan-ded2d8d0, td:td-orphan-e4656c7f, td:td-orphan-e89d394d, td:td-orphan-f35c0af6, td:td-orphan-fee5a79a
- **test-gap** (4): td:td-manual-playwright-smoke-only, td:td-manual-msw-coverage-gap, td:td-manual-ci-playwright-cache, td:td-coverage-027fe478
- **documentation** (1): sec:SEC-LOW-DOCS-001

## 7. Vergleich zum vorherigen Bericht
- Neu: 0
- Behoben: 0
- Verschlechtert: 0
- Unverändert: 67
- Wieder aufgetreten: 0

## 8. Freigabeempfehlung
**für Pilot geeignet** — 7 HIGH-Findings — für Pilot geeignet, für Produktion nicht.

## 9. Quality-Gate-Blocker (Prompt 2A.10)
- **high-security-finding** — High Security Finding: sec:SEC-HIGH-LOG-001 _(Logger-Redaction erfasst keine Connection-Strings mit AccountKey/SAS)_

## Bekannte Grenzen
- Reine Aggregation: Qualität hängt an den Einzelberichten.
- Bereichs-Status `not-run` heißt fehlender Vorbericht, nicht „grün".
- Diff-Match über Finding-ID; Bereichsberichte ohne stabile IDs erhalten einen Titel-Hash.
