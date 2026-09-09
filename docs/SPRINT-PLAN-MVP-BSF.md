# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-09-09  
Status: operative Planung auf Basis von `docs/GESAMTPLAN-SYSING-DASHBOARD.md`

## 1. Zweck

Dieses Dokument übersetzt den strategischen Gesamtplan in eine konkrete Sprintfolge. Der Gesamtplan bleibt die fachlich maßgebliche Langfristquelle; für den täglichen Arbeitsfokus gilt zusätzlich `docs/BSF-CURRENT-PRIORITIES.md` und als dauerhafter Wiederanlaufpunkt Issue #35.

Arbeitsregel je Sprint:

`Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → Abnahme → nächster Prompt`

GitHub ist Source of Truth. Lovable wird gezielt für UI, Preview und gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md` als regulärer Ausführungspfad für freigegebene DB-/RLS-/Grant-/Function-Änderungen eingesetzt.

## 2. Operative Leitplanken

- Keine parallelen Fachsprints eröffnen, solange ein zwingender Vorgänger nicht abgeschlossen ist.
- Wochenplanung konkretisiert die Reihenfolge, ändert sie aber nicht stillschweigend.
- Suffixe wie `BSF-03A`, `BSF-03B`, `BSF-03C`, `BSF-03D`, `BSF-03E` und `BSF-04A` bleiben aus Traceability-Gründen erhalten.
- DB-/RLS-/Grant-/Function-Änderungen nur über ausdrücklich freigegebene Lovable-Läufe.
- Lovable arbeitet nicht direkt auf `main`; Merge/Release erfolgt über GitHub-PR und Required Checks.
- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Secrets in Code, Prompts, Logs oder Dokumentation.
- Lovable Cloud darf keine technisch unersetzbare Laufzeitabhängigkeit werden.

## 3. Aktueller Wochen-/Sprintfokus

### BSF-02 / BSF-02C — DONE

Abgeschlossen und integriert:

- Shared Projection Project/WorkPackage/Activity,
- Composite Customer/Systemhouse-Identität,
- Least-Privilege-Grants,
- Customer-/Systemhouse-RLS,
- transaktionale `SECURITY INVOKER` Publish-RPC,
- providerneutraler Runtime Publish-/Read-Pfad,
- T01–T30 und T31–T51 einschließlich Atomic Rollback PASS,
- offizieller Supabase Security Advisor ohne neue BSF-02C-Warnung,
- Import/Export-/Backup-Restore-/AVKK-Regression,
- vollständige Exact-Head-CI inkl. E2E, Accessibility, Technical Debt und Quality Gate,
- #88 und Parent #76 geschlossen.

Normaler Pfad:

`Browser → authentifizierte Serverfunktion → gleicher User-JWT → Supabase RPC/Adapter → Grants + RLS`

Keine Service Role im normalen User-Pfad.

### BSF-03 — Kundenverantwortung und „Meine Kunden“ (#105) — IN ARBEIT

Der verbindliche Fach-/Security-Vertrag ist über PR #118 integriert.

Kernvertrag:

- Customer Responsibility ist fachliche Beziehung/Scope, keine globale Rolle,
- `systemhouse_membership`, `customer_access` und `customer_responsibility` bleiben getrennt,
- Customer Identity = `(systemhouseId, customerId)`,
- Responsibility allein eröffnet weder Customer-Daten noch Schreibrechte,
- `Meine Kunden` = aktives Konto ∩ aktive Membership ∩ aktuelle Responsibility ∩ Customer Access >= read ∩ `dashboard.view`,
- Cross-Systemhouse/Cross-Customer/IDOR/BOLA fail-closed,
- Permission `customer.responsibility.manage` nur für Systemadministrator, Administrator und Teamlead,
- zulässige Responsibility-Ziele: Systemadministrator, Administrator, Teamlead, Projektmanager, Engineer,
- Viewer und Customer ausgeschlossen.

#### BSF-03 1A — nächster Ausführungsschritt

- additive Tabelle `public.customer_responsibility`,
- Lifecycle/Historie statt Hard Delete,
- Composite Customer/Systemhouse-FK,
- Zieluser-/Rollenvalidierung,
- RBAC-Mirror für `customer.responsibility.manage`,
- RLS sofort aktiv,
- explizite Least-Privilege-Grants,
- kein DELETE / kein `FOR ALL`,
- keine neue SECURITY-DEFINER-Exposition,
- Generated Types,
- technische Implementierungsdokumentation.

#### BSF-03 1B — danach

- persistentes SQL-Testartefakt,
- R01–R18 vollständig,
- Cross-Scope-/IDOR-/Viewer-/Read-only-/Historien-/Uniqueness-Nachweise,
- BSF-02C-Regression,
- offizieller Supabase Security Advisor,
- Null-Residuen,
- keine neue BSF-03-Warnung.

#### BSF-03 Runtime/UI — erst nach 1A/1B

- `Meine Kunden`,
- Kundendetail,
- Shared-Projection-Read-Pfad wiederverwenden,
- Rollen-Preview nur Darstellung, nie Security Boundary,
- Accessibility/E2E,
- Import/Export-/Backup-Auswirkungen prüfen.

Gate: BSF-03 erst DONE, wenn Security, Runtime/UI, vollständige Exact-Head-CI und Dokumentation abgenommen sind.

## 4. Verbindliche operative Reihenfolge

`BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`

## 5. Operative Sprintfolge

### 09C-FINAL — DONE

F-11 und letzter MVP-Nachlauf abgeschlossen.

### MVP-BASELINE — DONE

MVP = 100 % / Baseline, Governance und Release-Gates vorhanden.

### BSF-01 — DONE

Providergrenzen, Systemhouse-/Customer-Scope, Rollen-/Scope-Modell und Mehrbenutzer-Baseline festgelegt.

### BSF-02 / BSF-02C — DONE

Minimaler gemeinsamer Customer-/Read-/Runtime-Pfad mit echter RLS-/Security-Abnahme integriert.

### BSF-03 — IN ARBEIT

Kundenverantwortung und „Meine Kunden“ nach obigem 1A → 1B → Runtime/UI-Pfad.

### BSF-03D — Arbeitspaket-Kategorien (#103)

Bewusst vor BSF-03A:

- systemhausweite editierbare Stammdaten,
- Default keine Kategorie,
- optional maximal eine Hauptkategorie je Arbeitspaket,
- freie Tags separat,
- stabile Key-/ID-Identität,
- bevorzugt Reference Data `workpackage.category`, sofern Systemhouse-Scope bestätigt,
- Kategorie erzwingt weder Billable noch Priorität noch Status,
- Import/Export/Backup rückwärtskompatibel.

Gate: sicher pflegbar, Cross-Systemhouse DENY, Viewer kein Write.

### BSF-03A — Projektmanager-Leistungssicht / Controlling (#106)

- read-only,
- Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie,
- billable/non-billable,
- Summen und Drill-down,
- keine Teamlead-Finalisierung,
- keine Abrechnungsfreigabe,
- keine fremde Leistungsmanipulation,
- serverseitiger Customer-/Project-Scope.

Gate: vollständige read-only Auswertung im zulässigen Scope.

### BSF-03B — Leistungsnachweis Teamlead V1 (#107)

- Leistungsnachweis, keine Rechnung,
- Kunde + fester Zeitraum,
- billable/non-billable gemeinsam in Prüfsicht,
- Teamlead darf Billable vor Finalisierung ändern,
- Summe abrechenbarer Zeit,
- unveränderbarer finaler Snapshot,
- Doppelverwendung verhindern,
- Audit/Korrektur-/Ersetzungsprozess,
- Kundenausgabe ohne automatische Nennung des Leistungserbringers.

Gate: Finalisierung und Historie serverseitig reproduzierbar und unveränderbar.

### BSF-03E — Vertretungs- und Personensicht (#63)

- Management-Personensicht,
- Customer Responsibility, Project Responsibility und temporäre Vertretung getrennt und kombinierbar,
- Verantwortung übertragen/hinzufügen/beenden nur auditierbar und RBAC/RLS-konform,
- keine Krankheitsgründe, Diagnosen oder Gesundheitsdaten,
- keine zweite konkurrierende Responsibility-Logik.

### BSF-03C — Kunden-PDF / Kundenpaket (#98)

- operative Kundensicht als PDF,
- Kunde, Zeitraum, Datenstand, Projekte/AP/Kategorien/Tätigkeiten/Status,
- Datenminimierung,
- reproduzierbarer Snapshot,
- keine internen IDs/Notizen/Sicherheitsdetails,
- keine automatische Nennung des Leistungserbringers,
- optional später gemeinsames Kundenpaket mit Reportfamilie ohne Vermischung der Fachlogik.

### BSF-DOC-01 — Dokumentationskonsolidierung

- Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- Entwicklungstagebuch,
- technischer Prüfbericht,
- relevante Dokumentationsdrift = 0.

### BSF-DOC-02 — SYSING-001 fortschreiben

- bestehendes Living Document im TDF-Format,
- Ist/Zielbild sauber trennen,
- Architektur, Sicherheit, Betrieb, Informationsflüsse, Rollen, AVKK, Customer-/Leistungssicht und Portabilität,
- Word/PDF aus derselben führenden Quelle.

### BSF-DOC-03 — SYSING-001 aus dem Board erreichbar

- read-only,
- keine zweite divergierende Dokumentquelle,
- Hilfe / Handbuch / SYSING-001 als getrennte Ebenen.

### BSF-04 — zentrale/synchronisierte Datenstrategie (#108)

- Source of Truth,
- vollständige Local-First-Grenze,
- zentrale vs. synchronisierte Daten,
- Konflikt-/Staleness-/Offline-Verhalten,
- Migration bestehender Daten,
- Provideradapter,
- Backup/Restore,
- stabile IDs/AVKK,
- Docker-/On-Premises-Fähigkeit als Architekturziel,
- spätere Entra-/Azure-SQL-/Azure-Storage-Fähigkeit.

Gate: dauerhafte kanonische Persistenzstrategie für reale Mehrbenutzernutzung.

### BSF-04A — Vorlagen und wiederkehrende AP/Tätigkeiten (#102)

Stufe 1 Vorlagen:

- Tätigkeitstemplates,
- AP-Templates,
- optionale Customer-/Projekt-/Kategorie-Defaults,
- Vorlage ist nur Vorschlag,
- editierbare Vorschau,
- neue echte Instanzen erhalten eigene IDs,
- keine rückwirkende Änderung vorhandener Instanzen.

Stufe 2 Serien:

- explizite Zeitzone,
- Start-/Enddatum,
- begrenzter Erzeugungshorizont,
- Vorkommen verschiebbar/überspringbar,
- idempotent, keine Dubletten,
- keine automatische Ist-Leistung/Finalisierung/Abrechnung,
- Scheduler später Docker-/On-Premises-fähig.

### BSF-05 — Canonical Import Model / SharePoint-Vertrag

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

- partielle Quelldaten zulassen,
- keine erfundenen Defaults,
- stabile Quell-IDs,
- Provenienz/Freshness,
- sichere Customer-Mappings,
- Idempotenz,
- READ/SYNC zuerst,
- SharePoint ist Quelle, nicht Fachmodell.

### BSF-06 — Betreiberhoheit und Docker

- Docker-Container,
- Supabase/Postgres-Portabilität,
- Backup/Restore,
- sichere Runtime-Konfiguration/Secrets,
- Betriebs- und Installationsdokumentation,
- Exit-/Migrationspfad,
- Vorbereitung Azure SQL / Azure Storage / Entra ID,
- keine technisch unersetzbare Lovable-Runtime.

**Gate:** autonomer Unternehmensbetrieb technisch nachgewiesen.

### BSF-07 — Managementcockpit 2

Rollenbezogene Führungs-/Arbeitssichten für Systemingenieur, Kundenverantwortliche, Projektmanager, Teamlead und Administration/Führung; read/write serverseitig getrennt.

### BSF-08 — historischer Planungsplatz

Nur Traceability. Fachscope ist in BSF-03A/03B aufgegangen.

### BSF-09 — Reporting 2

- kunden-/projektbezogene Reports,
- PDF, JSON/CSV, ggf. Excel,
- Snapshot/Provenienz,
- AP-Kategorie als Auswertungsdimension,
- providerneutraler Reportvertrag.

### BSF-10 — NAVIS / KI-/Agenten-Labor

- isoliertes read-only Lern-/Demolabor,
- kontrollierte Quellen oder Mockdaten,
- Human-in-the-loop,
- keine autonomen produktiven Aktionen,
- Evidence/Provenance,
- providerneutraler Tool-/Agentenvertrag.

### BSF-FINAL

Gesamtprüfung Auth, RBAC, RLS, Datenbank, Customer-/Leistungsmodell, Import, Reporting, Betrieb, Docker-Portabilität, Azure-/Entra-Migrationsfähigkeit, Tests, Sicherheit und Dokumentation.

Gate: `BSF = 100 % / BASELINE`.

### INTEGRATION-READINESS

Source of Truth, Mapping, Provenienz, Audit, Konfliktregeln, Schreibgrenzen, Providertrennung, Security/Datenschutz und Betriebsfolgen.

Gate: formales GO/NO-GO vor produktiver externer Integration.

### INTEGRATION 10A–10D

Microsoft Graph / Exchange / SharePoint und spätere Automationen erst nach Readiness; READ/SYNC zuerst, Write nur nach eigenem Freigabegate.

## 6. Installierbarkeit und Gerätebetrieb

Es sind zwei Ziele zu unterscheiden:

### A. Nutzung auf beliebigen Endgeräten

Als Webanwendung kann das Dashboard grundsätzlich browserbasiert auf Windows, macOS, Linux, Tablets und Smartphones genutzt werden, sobald die jeweilige veröffentlichte Umgebung erreichbar ist. Das ist **keine autonome Installation** auf dem Endgerät.

Für einen belastbaren produktiven Multi-Device-Betrieb werden insbesondere BSF-03 bis BSF-04 benötigt, weil Customer-Scope und dauerhafte zentrale/synchronisierte Datenhaltung vorher noch im Ausbau sind.

### B. Saubere autonome Installation / Self-Hosting

Der verbindliche Meilenstein dafür ist **BSF-06 — Betreiberhoheit und Docker**.

Ab dessen erfolgreichem Gate soll eine Organisation das Sysing Dashboard unabhängig von Lovable Cloud als dokumentierten Docker-/On-Premises-Stack installieren, konfigurieren, sichern, wiederherstellen und betreiben können.

BSF-06 ist deshalb Pflicht vor BSF-FINAL und keine spätere Komfortfunktion.

## 7. Verbindliche Übergänge

1. MVP → BSF-01: DONE.
2. BSF-01 → BSF-02/02C: DONE.
3. BSF-02C → BSF-03: DONE; BSF-03 ist aktiv.
4. BSF-03 → BSF-03D: Customer-/Responsibility-Scope stabilisieren.
5. BSF-03D → BSF-03A: Kategorie vor Controlling verfügbar machen.
6. BSF-03A → BSF-03B: read-only Controlling vor Teamlead-Finalisierung.
7. BSF-03B → BSF-03E → BSF-03C: Responsibility-/Personensicht vor Kunden-PDF konsolidieren.
8. BSF-03C → DOC-01 → DOC-02 → DOC-03: Fachausbau dokumentarisch konsolidieren.
9. DOC-03 → BSF-04 → BSF-04A: dauerhafte Datenstrategie vor Templates/Serien.
10. BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10.
11. BSF-06 vor BSF-FINAL: Betreiberhoheit und Portabilität sind Pflicht.
12. BSF-FINAL → INTEGRATION-READINESS → produktive Integrationen.

## 8. Definition of Done

Ein Fachpunkt gilt nur als abgeschlossen, wenn neben Code und Tests alle betroffenen Dokumentations-/Evidenzflächen aktuell sind:

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`, wenn betroffen,
- technischer Prüfbericht / CI-/Quality-Gate-Evidenz,
- SYSING-001 ab seiner BSF-Fortschreibung,
- Security-/RBAC-/RLS-Nachweise,
- vollständige Required Checks auf dem Exact Head.

Historische datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben. Der strategische Gesamtplan und diese operative Planung werden bei Status- oder Reihenfolgeänderungen synchron fortgeschrieben.
