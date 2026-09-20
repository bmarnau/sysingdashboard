# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-09-20  
Status: **verbindliche operative Kiosk-first-Planung; BSF-KIOSK-02 FINAL DONE / Merge pending; BSF-03B NEXT**  
Strategische Grundlage: `docs/GESAMTPLAN-SYSING-DASHBOARD.md`  
Interne Neuplanung: `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`  
Tagesfokus: `docs/BSF-CURRENT-PRIORITIES.md`  
Dauerhafter Wiederanlaufpunkt: Issue #35

## 1. Zweck

Dieses Dokument ist die operative Sprintfolge für die weitere Entwicklung des Sysing Dashboards.

Mit Stand 2026-09-14 wird der noch offene interne BSF-Pfad neu geordnet. Der **Info-Kiosk wird bewusst früh vorgezogen**, zunächst mit Demo-/Mock-Daten und einer austauschbaren Providergrenze. Produktive externe Schnittstellen, MCP und Agenten sind nicht Bestandteil dieses internen Hauptpfads.

Historische Abschlussdetails bleiben in den jeweiligen Closure-Dokumenten, Issues, PRs und der Git-Historie erhalten und werden hier nicht wiederholt.

Arbeitsregel je Sprint:

`Analyse → Architekturabgleich → Umsetzung → Tests → Dokumentation → Abnahmekriterien → Abschlussbericht → Abnahme → nächster Sprint`

GitHub bleibt Source of Truth. Kein Merge/Release ohne die vorgesehenen GitHub-Gates.

## 2. Leitplanken

- Keine parallelen Fachsprints, wenn ein zwingender Vorgänger noch offen ist.
- Der Kiosk ist read-only und erhält kein konkurrierendes Fachmodell.
- Demo-Daten werden eindeutig als Demo/Test gekennzeichnet.
- Keine Auth-/RBAC-/RLS-Entscheidung in UI-Komponenten.
- Keine Service Role im normalen Benutzerpfad.
- Keine Lovable-Cloud-only Runtimeabhängigkeit.
- Fachlogik, Authentifizierung, Datenzugriff und Provideradapter bleiben getrennt.
- `(systemhouseId, customerId)` bleibt der fachliche Customer-Scope.
- Produktive Graph-/SharePoint-/Exchange-/PRTG-/MCP-/Agenten-Anbindungen folgen erst nach interner Baseline und Integration Readiness.
- Credits werden nicht künstlich verbraucht; Lovable wird gezielt für UI/Preview eingesetzt.
- Keine produktiven Secrets, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts, Logs oder Dokumentation.

## 3. Aktueller Stand

### Abgeschlossen

- MVP / Governance — **DONE**
- BSF-01 Architekturbaseline — **DONE**
- BSF-02 / BSF-02C Customer + Shared Projection — **DONE**
- BSF-03 Kundenverantwortung / Meine Kunden — **DONE**
- BSF-03D Arbeitspaket-Kategorien / #103 — **DONE**
- BSF-KIOSK-01 Info-Kiosk Demo-Pilot / #135 — **DONE**

BSF-03D wurde über PR #134 auf `main` integriert. Post-Merge Security sowie vollständige CI einschließlich E2E, Accessibility, Technical Debt und Technical Report & Quality Gate sind PASS.

### Jetzt

- **BSF-03A / #106 — DONE / PR #144 gemergt**
- **BSF-KIOSK-02 / #136 — FINAL DONE / MERGE PENDING**
- **BSF-03B / #107 — NEXT nach KIOSK-02-Merge**

## 4. Verbindliche operative Reihenfolge

```text
BSF-03A / #106 — DONE
→ BSF-KIOSK-02 / #136 — FINAL DONE / MERGE PENDING
→ BSF-03B / #107 — NEXT NACH MERGE
→ BSF-03E / #63
→ BSF-07 Managementcockpit 2
→ BSF-KIOSK-03 / #137
→ BSF-03C / #98
→ BSF-DOC-01
→ BSF-DOC-02
→ BSF-DOC-03
→ BSF-04 / #108
→ BSF-04A / #102
→ BSF-05A / #138
→ BSF-06 / #121
→ BSF-09 Reporting 2
→ BSF-FINAL-INTERNAL
→ INTEGRATION-READINESS
→ externe Integrationen / MCP / Agenten / NAVIS
```

BSF-10 KI-/Agenten-Labor ist damit **kein zwingender Vorgänger der internen Gesamtbaseline** mehr. Der Themenblock wird nach `BSF-FINAL-INTERNAL` und dem Integration-Readiness-Gate neu eingeordnet.

## 5. BSF-KIOSK-01 — Info-Kiosk Demo-Pilot (#135)

### Ziel

Frühestmöglicher sichtbarer Kioskbetrieb mit Demodaten, ohne strukturelle Vorwegnahme späterer Integrationen.

### Architektur

```text
Kiosk UI
  → KioskDataProvider
      → DemoKioskDataProvider
```

### Scope

- eigene Kiosk-/Wallboard-Route,
- read-only,
- Großmonitor-/Vollbildlayout,
- Projekte,
- Arbeitspakete,
- Tätigkeiten,
- Infrastruktur,
- Support-Postfach,
- datensparsame Urlaub-/Abwesenheits-/Verfügbarkeitsdarstellung,
- Datenstand/Zeitstempel,
- definierter Demo-Refresh,
- Empty/Error/Unknown-Zustände,
- klare Demo-Kennzeichnung.

### Nicht-Scope

- Live-SharePoint,
- Microsoft Graph,
- Live-Exchange,
- Live-PRTG,
- MCP,
- NAVIS/Agenten,
- externer Producer als Runtime-Abhängigkeit,
- Kiosk-Sonderrolle oder Auth-Bypass.

### Gate

UI hängt ausschließlich vom `KioskDataProvider`-Vertrag ab; Demo-Daten sind austauschbar; Accessibility, E2E, Security und vollständige CI/Quality Gates PASS.

### Lovable

**Hoher sinnvoller Einsatz:** Layout, Großbild, responsive Wallboard-Zustände und Demo-Preview.

## 6. BSF-03A — Projektmanager-Leistungssicht / Controlling (#106)

### Ziel

Serverseitig abgesicherte read-only Leistungssicht für den zulässigen Customer-/Project-Scope.

### Scope

- Zeitraum,
- Kunde,
- Projekt,
- Arbeitspaket,
- AP-Kategorie,
- billable/non-billable,
- Tätigkeiten,
- Stunden und Summen,
- Drill-down,
- reproduzierbare Aggregation.

### Architektur

- vorhandenen Shared-Projection-Pfad erweitern,
- `categoryKey` regulär mitführen,
- keinen zweiten Reporting-Datenpfad aufbauen,
- `Project.lead` nicht als Sicherheitsidentität verwenden,
- serverseitige Scope-Prüfung; UI-Gating ist keine Sicherheitsgrenze.

### Nicht-Scope

- Teamlead-Finalisierung,
- Änderung der Abrechenbarkeit,
- Kunden-Leistungsnachweis,
- autonome Reporting-/Agentenlogik.

### Lovable

Gezielt für Filter, Tabellen, Summen, Drill-down und Rollen-Preview.

## 7. BSF-KIOSK-02 — interner Read-Provider (#136)

**Status 20.09.2026:** FINAL DONE. Lovable K02-L1 gegen Kandidat `528b5bc` mit exaktem Tree-Match, 11 targeted Vitest-Dateien / 69 Tests, Golden Dataset V1, 9/9 Kiosk-E2E/Security-Specs sowie 1920×1080 und 1366×768 vollständig PASS. Quellenbadges 3× INTERN / 3× DEMO, Zeitraum, Source-Freshness, Datenminimierung, Read-only, Console/Network und Fail-closed PASS. Keine DB-/Auth-/RBAC-/RLS-Drift. PR #147 wartet nur noch auf den final grünen Dokumentations-Head und separate Merge-Freigabe.

### Ziel

Den Kiosk ohne UI-Neubau an vorhandene interne Read-/Projection-Verträge anbinden.

```text
Kiosk UI
  → KioskDataProvider
      → InternalReadKioskDataProvider
          → serverseitige Read-/Projection-Verträge
```

### Regeln

- Demo-Provider bleibt für die technische `kiosk`-Session mit ausschließlich `kiosk.view` erhalten,
- interner Modus läuft nur in normalen Leitungs-Sessions und benötigt serverseitig `project.controlling.view`,
- Customer-/Systemhouse-Scope vor der Aggregation eindeutig auflösen und wiederverwenden,
- `categoryKey` reguläre Dimension,
- fehlende interne Daten explizit `unknown/not available`; kein stiller Demo-Ersatz für interne Projekt-/AP-/Tätigkeitswerte,
- Infrastruktur/Support/Abwesenheit dürfen klar gekennzeichnete Demo-Domänen bleiben, solange keine belastbare interne Quelle existiert,
- keine stillen Ersatzwerte.

### Gate

Interne Daten und Demodaten können über dieselbe UI angezeigt werden; Cross-Scope-/IDOR-Negativtests, Security, E2E und vollständige CI PASS.

## 8. BSF-03B — Leistungsnachweis Teamlead V1 (#107)

- Leistungsnachweis, ausdrücklich keine kaufmännische Rechnung,
- Kunde + fester Zeitraum,
- billable und non-billable gemeinsam sichtbar,
- Teamlead kann vor Finalisierung die Abrechenbarkeit ändern,
- Summe abrechenbarer Zeit,
- Finalisierung erzeugt unveränderbaren Snapshot,
- Doppelverwendung serverseitig verhindern,
- Audit und geregelter Korrektur-/Ersetzungsprozess,
- finale Kundenausgabe ohne automatische Nennung des Leistungserbringers.

Gate: Teamlead-Write-/Finalisierungspfad strikt von PM-Controlling getrennt.

Lovable: gezielt für Prüfsicht, Dialog und Preview.

## 9. BSF-03E — Vertretungs- und Personensicht (#63)

- Customer Responsibility, Project Responsibility und temporäre Vertretung bleiben getrennte, kombinierbare Beziehungen,
- Personensicht für berechtigte Projekt-/Teamleitung,
- kontrollierte Übertragung/Ergänzung/Beendigung,
- Gültigkeitszeiträume und Audit,
- keine Krankheitsgründe, Diagnosen oder Gesundheitsdaten,
- keine neue globale Rolle,
- bestehende Responsibility-Logik wiederverwenden.

Gate: kein Cross-Systemhouse/Cross-Customer/IDOR, keine Rechteausweitung für Engineer/Viewer.

## 10. BSF-07 — Managementcockpit 2, vorgezogen

### Entscheidung

BSF-07 wird bewusst **vor BSF-03C und vor BSF-04/06** umgesetzt.

### Begründung

Der Kiosk braucht fachlich definierte Managementinformationen. Diese Semantik darf nicht in der Kiosk-UI entstehen. Die Customer-/Responsibility-/Leistungsgrundlagen aus BSF-03/03A/03B/03E reichen aus, um Managementcockpit 2 intern zu definieren, ohne auf Docker oder externe Provider zu warten.

### Scope

- rollenbezogene Führungs-/Arbeitssichten,
- Systemingenieur,
- Kundenverantwortlicher,
- Projektmanager,
- Teamlead,
- Administration/Führung,
- Customer-/Projekt-/Leistung-/AVKK-Kontext,
- definierte Management-KPIs und Datenminimierung,
- read/write serverseitig klar getrennt.

Gate: Managementsemantik reproduzierbar, serverseitig autorisiert und nicht von Kiosk-/UI-Logik abhängig.

Lovable: hoher Einsatz für UI/Preview sinnvoll.

## 11. BSF-KIOSK-03 — Management-Kiosk (#137)

### Ziel

Freigegebene Managementdaten aus BSF-07 in einer passiven Großbildansicht darstellen.

### Regeln

- Managementcockpit definiert Semantik,
- Kiosk bleibt read-only,
- keine neue Autorisierungslogik,
- Datenminimierung für offene Bildschirmstandorte,
- keine personenbezogene Leistungsbewertung,
- sensible Informationen nur nach expliziter Freigabe,
- Demo-/Fallback-Provider bleibt erhalten.

Gate: Managementwerte entsprechen den freigegebenen Definitionen; Datenschutz, E2E, Accessibility, Security und Quality Gates PASS.

Lovable: hoher Einsatz für Wallboard-Layout/Preview.

## 12. BSF-03C — Kunden-PDF / Kundenpaket (#98)

- operative Kundensicht als PDF,
- Kunde, Zeitraum, Datenstand, Projekte, AP, Kategorien, Tätigkeiten, Status und freigegebene Leistungsinformationen,
- Datenminimierung,
- reproduzierbarer Snapshot,
- keine internen IDs/Notizen/Sicherheitsdetails,
- Name des Leistungserbringers nicht automatisch in finalen Leistungsinformationen,
- optionale spätere Kombination mit Reportfamilie ohne Vermischung der Fachlogik.

Gate: TDF-konformes Rendering und Customer-Scope nachweisbar.

## 13. BSF-DOC-01 bis BSF-DOC-03

### BSF-DOC-01

- kontextsensitive Hilfe,
- Benutzerhandbuch,
- technische Dokumentation,
- Entwicklungstagebuch,
- technischer Prüfbericht,
- keine relevante Dokumentationsdrift.

### BSF-DOC-02

- SYSING-001 als Living Document im TDF-Format,
- Ist-/Zielbild sauber trennen,
- Architektur, Sicherheit, Betrieb, Rollen, Customer-/Leistungssicht und Kiosk aufnehmen,
- Word/PDF aus derselben führenden Quelle,
- Lovable-Einsatz: **0**.

### BSF-DOC-03

- freigegebene SYSING-001-Version read-only im Board erreichbar,
- keine zweite divergierende Dokumentquelle.

## 14. BSF-04 — zentrale/synchronisierte Datenstrategie (#108)

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

Gate: dauerhafte kanonische Persistenzstrategie für reale Mehrbenutzernutzung.

## 15. BSF-04A — Vorlagen und wiederkehrende AP/Tätigkeiten (#102)

### Vorlagen

- Tätigkeitstemplates,
- AP-Templates mit mehreren Tätigkeitstemplates,
- optionale Customer-/Projekt-/Kategorie-Defaults,
- Vorlage bleibt Vorschlag,
- echte Instanzen erhalten neue IDs,
- keine rückwirkende Änderung bestehender Instanzen.

### Wiederkehrende Serien

- explizite Zeitzone,
- Start-/Enddatum,
- begrenzter Erzeugungshorizont,
- verschiebbar/überspringbar,
- idempotente Erzeugung,
- keine automatische Ist-Leistung,
- keine automatische Finalisierung/Abrechnung,
- Scheduler später Docker-/On-Premises-fähig.

Gate: Vorschlag → editierbare Vorschau → bewusste Instanziierung; Serien ohne Dubletten.

## 16. BSF-05A — Canonical Import Model intern (#138)

### Ziel

Providerneutralen Importvertrag intern vollständig definieren und testen, noch ohne produktive externe Verbindung.

### Kette

```text
SOURCE SAMPLE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST CONTRACT
```

### Scope

- versionierter Canonical-Vertrag,
- Identitäts-/Beziehungsfelder,
- partielle Quelldaten,
- `unknown` / `not provided` / `not applicable`,
- Provenienz/Freshness,
- Match-/Resolution-Status,
- Idempotenz,
- lokale positive/negative Beispiele,
- fail-safe Customer-/Systemhouse-Matching.

### Nicht-Scope

Produktiver SharePoint-/Graph-/Exchange-/PRTG-/MCP-Connector oder externer Producer.

Gate: wiederholbare lokale Verarbeitung ohne erfundene Werte und ohne stille Cross-Scope-Zusammenführung.

## 17. BSF-06 — Betreiberhoheit, Docker und Installierbarkeit (#121)

- reproduzierbarer Docker-/Container-Stack,
- sichere Runtime-Konfiguration/Secrets,
- Setup/Update/Rollback,
- Backup/Restore,
- Betriebs-/Installationsdokumentation,
- Logging/Health,
- Exit-/Migrationspfad,
- keine technisch unersetzbare Lovable Runtime,
- Endgeräte-/Browser-/PWA-Entscheidung,
- Vorbereitung Entra ID / Azure SQL / Azure Storage.

Gate: autonomer Unternehmensbetrieb nachgewiesen.

## 18. BSF-09 — Reporting 2

- kunden-/projektbezogene Berichte und Exporte,
- PDF, JSON/CSV, ggf. Excel,
- definierte Reportverträge,
- Snapshot/Provenienz,
- AP-Kategorie als Auswertungsdimension,
- keine unnötige Kopplung an UI oder Provider.

Gate: reproduzierbare portable Reporting-Baseline.

## 19. BSF-FINAL-INTERNAL

Gesamtprüfung des **internen** Produkts:

- Authentifizierung,
- Rollen/RBAC/RLS,
- Customer-/Responsibility-Scope,
- PM-Controlling,
- Teamlead-Leistungsnachweis,
- Kiosk/Managementcockpit,
- Kunden-PDF,
- Datenstrategie,
- Templates,
- Canonical Import Model intern,
- Docker/Portabilität,
- Reporting,
- Dokumentation/SYSING-001,
- Security und vollständige Quality Gates.

Gate: **interne BSF-Baseline freigegeben**, ohne produktive externe Integrationen als Voraussetzung.

## 20. INTEGRATION-READINESS und externe Phase

Erst nach `BSF-FINAL-INTERNAL`:

- Source-of-Truth-/Providerentscheidungen,
- Matching,
- Provenienz,
- Audit,
- Konfliktregeln,
- Schreibgrenzen,
- Transport-/Secret-/Betriebsmodell,
- GO/NO-GO je produktiver Integration.

Danach können getrennt geplant werden:

- SharePoint,
- Microsoft Graph / Exchange,
- PRTG,
- MCP,
- NAVIS / Agenten,
- KI-/Agenten-Labor,
- spätere Automationen.

Die vorhandene externe Wallboard-/Contract-Spur in Issue #123 / #125 und Draft-PR #124 bleibt als spätere Integrationsvorarbeit erhalten, blockiert den internen Kiosk nicht.

## 21. Lovable-Steuerung

| Bereich  | Lovable-Einsatz |
| -------- | --------------- |
| KIOSK-01 | hoch            |
| BSF-03A  | mittel/gezielt  |
| KIOSK-02 | mittel          |
| BSF-03B  | mittel          |
| BSF-03E  | gezielt         |
| BSF-07   | hoch            |
| KIOSK-03 | hoch            |
| BSF-03C  | gezielt         |
| DOC-02   | 0               |
| BSF-04   | gering          |
| BSF-04A  | mittel          |
| BSF-05A  | gering          |
| BSF-06   | gering          |
| BSF-09   | gezielt         |

Lovable ist Werkzeug für UI, Preview und kontrollierte plattformnahe Arbeit, nicht Quelle der Fach-/Security-/Architekturentscheidung.

## 22. Definition of Done

Ein Sprint gilt erst als DONE, wenn alle betroffenen Punkte belegt sind:

- Funktion/Fachvertrag umgesetzt,
- Tests PASS,
- Security/RBAC/RLS PASS soweit betroffen,
- E2E und Accessibility bei UI-Scope PASS,
- Import/Export/Backup-Auswirkungen geprüft soweit betroffen,
- Technical Debt PASS,
- Technical Report & Quality Gate PASS,
- technische Dokumentation aktuell,
- Benutzerhilfe aktuell soweit betroffen,
- Entwicklungstagebuch/Closure-Nachweis aktuell,
- `docs/CURRENT-STATUS.md` und `docs/PROJECT-STATUS.yaml` soweit betroffen synchron,
- technischer Prüfbericht aktuell,
- Exact-Head-/Main-Nachweis gemäß Governance.

## 23. Wiederanlaufregel

Bei neuem Chat oder neuer Arbeitssitzung:

1. Issue #35 lesen.
2. `docs/BSF-CURRENT-PRIORITIES.md` lesen.
3. `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md` lesen.
4. diesen Sprintplan lesen.
5. aktuellen `main` und offene PRs/Issues prüfen.
6. aktiven Sprint nicht aus Chat-Erinnerung ableiten.
7. keine externe Integration vor `BSF-FINAL-INTERNAL`/`INTEGRATION-READINESS` in den internen Hauptpfad ziehen.
