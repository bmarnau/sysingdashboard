# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-09-03  
Status: operative Planung auf Basis von `docs/GESAMTPLAN-SYSING-DASHBOARD.md`

## 1. Zweck

Dieses Dokument übersetzt den strategischen Gesamtplan in eine konkrete Sprintfolge. Der Gesamtplan bleibt die fachlich maßgebliche Langfristquelle; diese Planung dient Durchführung, Wochenfokus, Aufwandseinschätzung und späterer Wiederaufnahme.

Für den täglichen Arbeitsfokus ist zusätzlich `docs/BSF-CURRENT-PRIORITIES.md` maßgeblich.

Arbeitsregel je Sprint:

`Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → manuelle/inhaltliche Abnahme → nächster Prompt`

GitHub ist Source of Truth. Lovable wird gezielt für UI, Preview, plattformspezifische Runtime-Prüfungen und gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md` als alleiniger regulärer Ausführungspfad für DB-/RLS-/Grant-/Function-Änderungen eingesetzt.

## 2. Operative Leitplanken

- Keine parallelen Fachsprints eröffnen, solange ein zwingender technischer Vorgänger nicht abgeschlossen ist.
- Wochenplanung konkretisiert die strategische Reihenfolge, ändert sie aber nicht stillschweigend.
- Suffixe wie `BSF-03A`, `BSF-03B`, `BSF-03C`, `BSF-03D`, `BSF-03E` und `BSF-04A` werden aus Traceability-Gründen nicht umnummeriert.
- Die Reihenfolge ist fachlich, nicht alphabetisch.
- DB-/RLS-/Grant-/Function-Änderungen ausschließlich über ausdrücklich freigegebene Lovable-Prompts.
- Lovable arbeitet nur auf isolierter Nicht-`main`-Variant; Merge/Release erfolgt ausschließlich über GitHub-PR und Required Checks.
- Credits werden nicht künstlich verbraucht. Vor jedem Lovable-Lauf werden Notwendigkeit und aktuelle Verfügbarkeit geprüft.

### 2.1 Wochenfokus 31.08.–06.09.2026

Die Woche bleibt bis zum Abschluss von BSF-02C auf einem einzigen Hauptpfad:

1. **BSF-02C Phase A — DONE**
   - Shared Projection für Project/WorkPackage/Activity,
   - Least-Privilege-Grants,
   - Customer-/Systemhouse-RLS,
   - T01–T30 real PASS,
   - PR #110 gemergt,
   - `main` danach `18d4f460955831ce35fa8186a11578bbbe5dee18`.

2. **BSF-02C Phase B Runtime — IN ARBEIT / PR #111 DRAFT**
   - providerneutraler Repository-/Service-Vertrag,
   - Supabase-Adapter,
   - User-JWT Publish-/Read-Pfad,
   - `snapshotComplete: true` für Reconciliation,
   - skipped/unresolved != gelöscht,
   - Engineer darf eigene Activities ohne `project.edit` gegen bereits aktive WorkPackage-Projections publizieren.

3. **BSF-02C Phase B2 — JETZT AKTIV / LOVABLE-DB-GATE**
   - nachgewiesene Lücke: mehrere Data-API-Writes sind einzeln RLS-geschützt, aber als Snapshot nicht atomar,
   - erforderlich: eine transaktionale `SECURITY INVOKER`-RPC im selben User-JWT,
   - additive Migration, Function-Grant und reale Negativ-/Atomizitätstests ausschließlich über freigegebenen Lovable-Prompt,
   - kritisches Gate: absichtlich später Fehler innerhalb desselben RPC-Aufrufs muss alle frühen Writes zurückrollen.

4. **B2 separat integrieren**
   - unabhängiger Diff-/Security-/RLS-Review,
   - eigener DB-PR,
   - kein Vermischen mit Preview/Auth-Overlays.

5. **PR #111 auf die abgenommene RPC umstellen und BSF-02C abschließen**
   - Runtime-/Security-/Import-Export-/Backup-Restore-/AVKK-Regression,
   - vollständige Exact-Head-CI inkl. E2E, Accessibility, Technical Debt und Quality Gate,
   - #88 und Parent #76 erst danach schließen.

6. **BSF-03 nur beginnen, wenn BSF-02C vollständig DONE ist.**

### 2.2 Verbindliche operative Reihenfolge ab Abschluss BSF-02C

`BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`

Diese Reihenfolge synchronisiert die operative Planung mit `docs/GESAMTPLAN-SYSING-DASHBOARD.md` und den aktuellen Issues #63, #98, #102, #103, #105, #106, #107 und #108.

## 3. Operative Sprintfolge

### 09C-FINAL — F-11 abschließen

- Schwerpunkt: letzter Systemstatus-Retest, Role-Preview-N/A, Doku-Konsolidierung.
- Gate: F-11 vollständig abgezeichnet.
- Status: **DONE**.

### MVP-BASELINE — formaler MVP-Abschluss

- Schwerpunkt: finaler Release-Gate-Lauf, PROJECT-STATUS, MVP-Abnahme, CHANGELOG und SYSING-001.
- Gate: **MVP = 100 % / BASELINE**.
- Status: **DONE**.

### BSF-01 — Planungs- und Architekturbaseline

- Schwerpunkt: ADR-Review, Providergrenzen, Rollen-/Scope-Modell, minimale Datenabhängigkeiten und BSF-Gates.
- Gate: eindeutige Systemhouse-/Customer-Scope- und Mehrbenutzer-Datenbasis-Entscheidung.
- Status: **DONE**.

### BSF-02 — Customer-Entität + minimale gemeinsame Daten-/Read-Basis (#76)

- Schwerpunkt: Kunde als stabile Fachentität; Zuordnung von Projekten, Arbeitspaketen und Tätigkeiten.
- Kundenidentität ist systemhausgebunden: `(systemhouseId, customerId)`.
- `systemhouseId` ist providerneutral und nicht Microsoft Tenant ID.
- BSF-02A/B-Grundlage ist vorhanden; BSF-02C ist der letzte offene Teil.
- Die vollständige zentrale/synchronisierte Datenstrategie und Local-First-Ablösung bleiben BSF-04.
- Gate: minimaler gemeinsamer Read-/Datenpfad für Kunden- und Leistungssichten real nutzbar.
- Status: **IN ARBEIT**.

### BSF-02C — Shared Projection + realer Runtime-Pfad (#88)

- Phase A DB/RLS: **DONE** via PR #110.
- Phase B Runtime: **IN ARBEIT** in Draft-PR #111.
- Phase B2: transaktionale Publish-RPC als separate Lovable-DB-Änderung erforderlich.
- Normaler Pfad bleibt:

`Browser → authentifizierte Serverfunktion → gleicher User-JWT → Supabase RPC/Adapter → Grants + RLS`

- keine Service Role im normalen Publish-Pfad,
- `snapshotComplete: true` zwingend für Reconciliation,
- skipped/unresolved wird nicht als gelöscht behandelt,
- Activity-Publish eigener Engineer getrennt vom Project-/WorkPackage-Strukturscope,
- Snapshot-Publish muss atomar sein.
- Gate: positive/negative Runtime-Tests, Atomic Rollback, Import/Export, Backup/Restore, AVKK, Security und vollständige CI PASS.
- Status: **IN ARBEIT / B2 BLOCKED BIS LOVABLE-ABNAHME**.

### BSF-03 — Kundenverantwortung und „Meine Kunden“ (#105)

- Schwerpunkt: `Meine Kunden`, mehrere Kunden je Systemingenieur, Sicht- und Schreibscope getrennt.
- Kundenverantwortung ist eine fachliche Beziehung/Scope, keine neue globale Rolle.
- Systemingenieur kann für mehrere Kunden verantwortlich sein; ein Kunde kann einen verantwortlichen Systemingenieur haben.
- Customer-Sicht benötigt serverseitigen Scope; Cross-Customer bleibt DENY.
- Lovable-Einsatz: bevorzugt 1–2 Credits für UI/Preview nach festgelegtem Sicherheitsvertrag.
- Gate: Kundensicht/RBAC/RLS PASS; Sichtbarkeit erzeugt keine impliziten globalen Schreibrechte.
- Status: **NÄCHSTER PUNKT NACH #88/#76**.

### BSF-03D — Arbeitspaket-Kategorien (#103)

Bewusst **vor BSF-03A**, damit Kategorien sofort als Filter-/Analysemerkmal verfügbar sind.

- systemhausweite editierbare Stammdaten,
- bei allen Kunden desselben Systemhauses verwendbar,
- Standard: keine Kategorie,
- optional maximal eine Hauptkategorie je Arbeitspaket,
- freie Tags bleiben separat,
- stabile Key-/ID-Identität statt Namensidentität,
- bevorzugt Reference Data `workpackage.category`, sofern Systemhouse-Scope bestätigt,
- Kategorie erzwingt weder Billable noch Priorität noch Status,
- Templates dürfen später nur einen editierbaren Kategorie-Default tragen.
- Gate: Kategorie sicher pflegbar und filterbar; Viewer kein Write.

### BSF-03A — Projektmanager-Leistungssicht / Controlling (#106)

- reine Read-only-Auswertung,
- Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie,
- abrechenbar / nicht abrechenbar,
- Summen und Drill-down,
- keine Teamlead-Finalisierung,
- keine Abrechnungsfreigabe,
- keine fremde Leistungsmanipulation,
- serverseitige Begrenzung auf zulässigen Customer-/Projekt-Scope.
- Lovable-Einsatz: bevorzugt 2–4 Credits für Filter, Tabellen, Summen und Rollen-Preview.
- Gate: vollständige read-only Auswertung im zulässigen Scope.

### BSF-03B — Leistungsnachweis Teamlead V1 (#107)

- Leistungsnachweis, ausdrücklich keine kaufmännische Rechnung,
- Kunde + fester Zeitraum,
- abrechenbare und nicht abrechenbare Tätigkeiten sichtbar,
- Teamlead kann vor Finalisierung abrechenbar ↔ nicht abrechenbar ändern,
- Summe abrechenbarer Zeit,
- Finalisierung erzeugt unveränderbaren Snapshot,
- Doppelverwendung serverseitig verhindern,
- Audit und geregelter Korrektur-/Ersetzungsprozess,
- finaler Kundenoutput enthält nicht automatisch den Namen des Leistungserbringers.
- Lovable-Einsatz: bevorzugt 2–4 Credits für Prüfsicht, Finalisierungsdialog und Export-Preview.
- Gate: Teamlead-Finalisierung und Projektmanager-Auswertung sauber getrennt.

### BSF-03E — Vertretungs- und Personensicht (#63)

- folgt nach den Kernfunktionen BSF-03/03D/03A/03B,
- Personensicht für Management,
- Customer Responsibility, Project Responsibility und temporäre Vertretung bleiben getrennte, kombinierbare Beziehungen,
- Verantwortungen übertragen/hinzufügen/beenden nur auditierbar und RBAC/RLS-konform,
- keine Krankheitsgründe, Diagnosen oder Gesundheitsdaten,
- bestehende Responsibility-Logik wiederverwenden, keine zweite konkurrierende Logik.
- Gate: Vertretung und Personensicht ohne neue globale Rollen-/Write-Rechte.

### BSF-03C — Kunden-PDF / optionales Kundenpaket mit Reportfamilie (#98)

- operative Kundensicht als PDF, fachlich getrennt von der Reportfamilie,
- Kunde, Zeitraum, Datenstand, Projekte, AP, Kategorien, Tätigkeiten, Status und freigegebene Leistungsinformationen,
- Datenminimierung,
- reproduzierbarer Snapshot,
- keine internen IDs/Notizen/Sicherheitsdetails in der Kundenausgabe,
- Name des Leistungserbringers nicht automatisch in finalen Leistungsinformationen,
- später optional gemeinsames Kundenpaket, aber keine Vermischung der Fachlogik.
- Gate: TDF-konformes Rendering und Customer-Scope nachweisbar.

### BSF-DOC-01 — Dokumentationskonsolidierung

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- Entwicklungstagebuch,
- technischer Prüfbericht,
- keine bekannte relevante Dokumentationsdrift.
- Gate: Dokumentationsflächen bilden den realen Produktstand konsistent ab.

### BSF-DOC-02 — SYSING-001 im TDF-Format fortschreiben

- bestehendes Living Document kontrolliert fortschreiben,
- Ist- und Zielbild sauber trennen,
- Architektur, Sicherheit, Betrieb, Informationsflüsse, Rollen, AVKK, Customer-/Leistungssicht und Portabilität abbilden,
- TDF-Traceability, Quellen/Provenienz, Versionsregression und Abschlusscheck anwenden,
- Word/PDF aus derselben führenden Quelle erzeugen.
- Lovable-Einsatz: **0**.
- Gate: TDF-konformes SYSING-001 gegen realen Produktstand geprüft.

### BSF-DOC-03 — SYSING-001 aus dem Board erreichbar

- read-only Zugriff über Hilfe/Dokumentation,
- keine zweite divergierende Dokumentquelle,
- kontextsensitive Hilfe, Benutzerhandbuch und SYSING-001 als getrennte Ebenen.
- Lovable-Einsatz: bevorzugt 1–2 Credits für Navigation/Preview.
- Gate: freigegebene SYSING-001-Version im Board erreichbar.

### BSF-04 — zentrale/synchronisierte Datenstrategie (#108)

- vollständige Local-First-Grenze,
- Source of Truth,
- zentrale vs. synchronisierte Daten,
- Konflikt-/Staleness-/Offline-Verhalten,
- Migration bestehender Daten,
- Provideradapter,
- Backup/Restore,
- stabile IDs/AVKK,
- Docker-/On-Premises-Fähigkeit,
- spätere Entra-/Azure-SQL-/Azure-Storage-Fähigkeit.
- Gate: dauerhafte kanonische Persistenzstrategie für reale Mehrbenutzernutzung.

### BSF-04A — Vorlagen und wiederkehrende AP/Tätigkeiten (#102)

Diese Funktion folgt bewusst **nach BSF-04**.

Stufe 1 — Vorlagenbibliothek:

- Tätigkeitstemplates,
- AP-Templates mit mehreren Tätigkeitstemplates,
- optionale Customer-/Projekt-/Kategorie-Defaults,
- Vorlage ist nur ein Vorschlag,
- Benutzer kann Werte vor Instanziierung ändern,
- echte Instanzen erhalten neue IDs,
- Template-Änderungen verändern vorhandene Instanzen nie rückwirkend.

Stufe 2 — wiederkehrende Serien:

- explizite Zeitzone,
- Start-/Enddatum,
- begrenzter Erzeugungshorizont,
- Vorkommen verschiebbar/überspringbar,
- idempotente Erzeugung ohne Dubletten,
- keine automatische Ist-Leistung,
- keine automatische Finalisierung oder Abrechnung,
- Scheduler später Docker-/On-Premises-fähig, keine Lovable-only Runtime.

Gate: Vorschlag → editierbare Vorschau → bewusste Instanziierung; Serien idempotent.

### BSF-05 — Canonical Import Model und SharePoint-Vertrag

Providerneutrale Importkette:

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

Für Customer-Matching zusätzlich:

`SYSTEMHOUSE SCOPE → SOURCE MAPPING → CUSTOMER RESOLUTION`

- partielle Quelldaten zulassen,
- keine erfundenen Defaults,
- stabile Quell-IDs,
- Provenienz/Freshness,
- sichere Customer-Mappings,
- Idempotenz,
- READ/SYNC zuerst,
- SharePoint ist Quelle, nicht Fachmodell.
- Gate: wiederholbarer Import ohne stille Cross-Customer-/Cross-Systemhouse-Zusammenführung.

### BSF-06 — Betreiberhoheit und Docker

- Supabase/Postgres-Portabilität,
- Backup/Restore,
- Docker,
- sichere Runtime-Konfiguration/Secrets,
- Betriebsdokumentation,
- Exit-/Migrationspfad,
- Vorbereitung Azure SQL / Azure Storage / Entra ID.
- Gate: autonomer Unternehmensbetrieb ohne technisch unersetzbare Lovable-Runtime nachgewiesen.

### BSF-07 — Managementcockpit 2

- rollenbezogene Führungs-/Arbeitssichten,
- Systemingenieur,
- Kundenverantwortlicher,
- Projektmanager,
- Teamlead,
- Administration/Führung,
- Customer-/Projekt-/Leistung-/AVKK-Kontext.
- Gate: read/write-seitig klar getrennt und serverseitig autorisiert.

### BSF-08 — historischer Planungsplatz

BSF-08 bleibt nur als Traceability-Hinweis erhalten. Der fachliche Scope wurde bereits in BSF-03A und BSF-03B vorgezogen. Es entsteht kein zweiter Leistungsnachweis-/Controlling-Sprint.

### BSF-09 — Reporting 2

- kunden-/projektbezogene Berichte und Exporte,
- PDF, JSON/CSV, ggf. Excel,
- definierte Reportverträge,
- Snapshot/Provenienz,
- AP-Kategorie als Auswertungsdimension,
- keine unnötige Kopplung an UI oder Provider.
- Gate: reproduzierbare portable Reporting-Baseline.

### BSF-10 — KI-/Agenten-Labor

- isoliertes NAVIS-/Agenten-Lernlabor,
- Mock-/Demodaten bzw. kontrollierte read-only Quellen,
- Human-in-the-loop,
- keine autonomen produktiven Aktionen,
- nachvollziehbare Evidence-/Freigabekette,
- providerneutraler Tool-/Agentenvertrag.
- Gate: sichere Demonstration ohne Produktivautonomie.

### BSF-FINAL — Gesamtprüfung und Baseline

- Rollen/RBAC/RLS,
- Customer-/Leistungssichten,
- Import,
- Docker/Portabilität,
- Reporting,
- Dokumentation/SYSING-001,
- vollständige Gesamtfreigabe.
- Gate: **BSF = 100 % / BASELINE**.

### INTEGRATION-READINESS

- Source of Truth,
- Matching,
- Provenienz,
- Audit,
- Konfliktregeln,
- Schreibgrenzen,
- Providertrennung.
- Gate: GO/NO-GO für produktive Integration.

### INTEGRATION 10A–10D

- Microsoft Graph / Exchange / SharePoint und spätere Automationen gemäß eigenem Post-BSF-Plan,
- zunächst read-only bzw. kontrollierte Synchronisation,
- Schreibpfade erst nach eigenem Freigabegate.

## 4. Leistungsnachweis und Projektmanager-Controlling — fachlicher Vertrag

### Teamlead / Leistungsnachweis V1

- V1 ist Leistungsnachweis, keine Rechnung.
- Nur Teamlead bereitet vor und finalisiert.
- Kunde + fester Zeitraum.
- Abrechenbare und nicht abrechenbare Tätigkeiten sichtbar.
- Abrechenbarkeit vor Finalisierung änderbar.
- Summe abrechenbarer Zeit.
- Finaler unveränderbarer Snapshot.
- Doppelverwendung verhindern.
- Audit und geregelter Korrektur-/Ersetzungsprozess.
- Report/Export pro Kunde und Zeitraum.
- Name des Leistungserbringers erscheint nicht automatisch in der endgültigen Kundenausgabe.

### Projektmanager / Controlling

Projektmanager erhält eine reine Auswertungssicht, keine Teamlead-Abrechnungsrechte:

- Zeitraum von/bis,
- Kunde,
- Projekt,
- Arbeitspaket,
- AP-Kategorie,
- geleistete Tätigkeiten,
- abrechenbare und nicht abrechenbare Zeit,
- Summen,
- Filter,
- Drill-down,
- serverseitige Begrenzung auf zulässigen Customer-/Projekt-Scope.

## 5. Verbindliche Übergänge

1. **MVP → BSF-01:** abgeschlossen.
2. **BSF-01 → BSF-02/02C:** abgeschlossen bzw. aktuell im letzten 02C-Runtime-Schritt.
3. **BSF-02C → BSF-03:** #88 und Parent #76 müssen vollständig DONE sein.
4. **BSF-03 → BSF-03D:** Customer-/Responsibility-Scope vor AP-Kategorie-Nutzung stabilisieren.
5. **BSF-03D → BSF-03A:** AP-Kategorie vor Controlling verfügbar machen.
6. **BSF-03A → BSF-03B:** read-only Controlling vor Teamlead-Finalisierung stabilisieren.
7. **BSF-03B → BSF-03E → BSF-03C:** Verantwortungs-/Personensicht vor bzw. unmittelbar vor der abschließenden kundenbezogenen PDF-Sicht konsolidieren.
8. **BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03:** Fachausbauten dokumentarisch konsolidieren.
9. **BSF-DOC-03 → BSF-04 → BSF-04A:** dauerhafte Datenstrategie vor Templates/Serien.
10. **BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10:** strategische Folge gemäß Gesamtplan.
11. **BSF-06 vor BSF-FINAL:** Betreiberhoheit und Portabilität sind Pflicht, nicht Nacharbeit.
12. **BSF-FINAL → INTEGRATION-READINESS:** produktive Microsoft-/Automationsintegration erst nach BSF-Baseline und eigenem Readiness-Gate.

## 6. Definition of Done

Ein Fachpunkt gilt nur dann als abgeschlossen, wenn neben Code und Tests auch alle betroffenen Dokumentationsflächen aktuell sind.

Je nach Scope gehören dazu:

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- `docs/ENTWICKLUNGSTAGEBUCH.md`,
- `docs/CURRENT-STATUS.md`, wenn betroffen,
- technischer Prüfbericht bzw. CI-/Quality-Gate-Evidenz,
- SYSING-001 ab seiner BSF-Fortschreibung,
- Security-/RBAC-/RLS-Nachweise,
- vollständige Required Checks auf dem Exact Head.

## 7. Abgrenzung

Produktive Microsoft-Graph-/Exchange-/SharePoint-Schreibintegration und produktive Agentenautomation sind nicht Bestandteil der laufenden BSF-Fachschritte. Sie beginnen erst nach BSF-FINAL und INTEGRATION-READINESS.

Historische datierte Abschlussdokumente werden nicht rückwirkend umgeschrieben. Der strategische Gesamtplan und diese operative Planung werden dagegen bei bewussten Reihenfolgeänderungen synchron fortgeschrieben.
