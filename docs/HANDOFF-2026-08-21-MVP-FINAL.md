# Sysing Dashboard — Übergabe für nächsten Chat

Stand: 2026-08-21  
Projekt: Sysing Dashboard  
Phase: Sprint 09C-FINAL / MVP-Abschluss  
Dashboard-Version: 1.59.5

## 1. Wann der neue Chat beginnen soll

Der neue Chat soll **nach Abschluss des aktuellen CI-/E2E-Aufräumblocks** beginnen. Dieser Schnittpunkt ist erreicht, weil:

- der aktuelle `main` den neuen synthetischen Supabase-E2E-Harness enthält,
- die lokale/isolierte E2E-Suite 54/54 PASS erreicht hat,
- der überholte E2E-PR #3 geschlossen wurde,
- der alte PDF-PR #2 durch einen sauberen, auf aktuellem `main` basierenden PR #4 ersetzt wurde,
- ADR-/Governance-Arbeit als separater PR #5 vorbereitet ist.

Der neue Chat startet damit nicht mitten in einer Fehleranalyse, sondern an einem klaren fachlichen Übergang: **PDF-Reporting-Abnahme → Projektcockpit → restliche F-11-Abnahme → MVP-Baseline**.

## 2. Verbindliche Quellen

Maßgeblich:

- GitHub-Repository: `bmarnau/sysingdashboard`
- lokaler Workspace: `C:\Users\bmarn\OneDrive\HTML\sysingdashboard`
- produktive Referenz: `https://sysingdashboard.lovable.app`
- Roadmap: `docs/ROADMAP-MVP-BSF.md`
- Rollenabnahme: `docs/ROLE-ACCEPTANCE-09C.md`
- Reporting-Abnahme: `docs/REPORTING-LAYOUT-ACCEPTANCE.md`
- Projektcockpit-Konzept: `docs/PROJECTMANAGER-PROJEKTCOCKPIT.md`
- CI-/Test-/Release-Governance: PR #5 / ADR-0029

GitHub bleibt Source of Truth. Vor jeder Entwicklungs- oder Fehleranalyse zuerst aktuellen `main` und relevante PRs prüfen.

## 3. Aktueller Hauptstand

Letzter bei Erstellung dieser Übergabe geprüfter `main`:

`3bed2619b29a6d695e62baca6640be8f8e3f37cd` — `E2E-Suite aktualisiert`

Wesentliche E2E-Änderungen:

- synthetische Supabase-Sessions für alle 7 Rollen,
- normaler produktiver Auth-Pfad bleibt aktiv,
- synthetische Supabase-Origin im Playwright-Harness,
- reale Supabase-Hosts im E2E-Harness blockiert,
- E2E-Specs auf geschützten `/dashboard`-Pfad umgestellt,
- Correlation-Test an 401-Auth-Härtung angepasst,
- Dialog-Loop öffnet zuerst das Servicemenü,
- kritischer axe-Befund `select-name` durch `aria-label` an Dashboard-Filtern geschlossen,
- Ergebnis der isolierten E2E-Suite: **54/54 PASS**.

Keine produktiven Supabase-Secrets oder Service-Role-Keys verwenden oder dokumentieren.

## 4. PR-Status

### PR #3 — E2E-Harness

Status: **CLOSED / SUPERSEDED**  
Nicht mergen.

Grund: Zweck ist auf aktuellem `main` neu umgesetzt; alter Branch ist stark divergent und enthält überholte Nebenänderungen.

### PR #2 — alter PDF-Paginierungsfix

Status: **CLOSED / SUPERSEDED durch PR #4**  
Nicht mergen.

### PR #4 — aktueller PDF-Paginierungsfix

Branch: `fix/report-pdf-pagination-v2`  
Basis: aktueller `main` zum Erstellzeitpunkt  
Status: **OPEN / DRAFT / NICHT MERGEN vor CI + manueller Sichtabnahme**

Enthält bewusst nur:

- `src/lib/report/renderers/pdf.ts`
- `src/__tests__/lib/report/pdf-renderer.test.ts`

Nicht übernommen wurden veraltete CI-/Setup-/Backup-/Formatierungsänderungen aus PR #2.

Ziel:

- kein `doc.addPage()` vor jedem Abschnitt,
- kontinuierlicher Inhaltsfluss,
- neue Seite nur bei Platzmangel,
- `lastAutoTable.finalY` nutzen,
- Spaltengewichte berücksichtigen,
- Regressionstest: kleine Mehrabschnittsberichte = Deckblatt + eine Inhaltsseite.

### PR #5 — ADR-/Release-Governance

Branch: `docs/adr-ci-release-governance`  
Status: **OPEN / DRAFT**

Enthält:

- ADR-0029 `CI-, Test- und Release-Governance für parallele KI-gestützte Entwicklung`,
- aktualisierten ADR-Index,
- `docs/POST-MVP-PLAN-STATUS.md`, das die neue Reihenfolge klarstellt,
- diese Übergabedatei.

ADR-0029 ergänzt ADR-0009 und ADR-0018 und supersediert den historischen LocalStorage-Seeding-Teil aus ADR-0012 für die heutige Supabase-Auth-Architektur.

### PR #1 — altes F-11-Projektcockpit

Status: **OPEN / DRAFT / DIVERGENT / NICHT DIREKT MERGEN**

Alter Branch: `feature/f11-project-cockpit`

Der fachlich relevante Inhalt muss gezielt auf aktuellen `main` übertragen werden; keine alten CI-/Setup-/Backup-Änderungen übernehmen.

Relevanter Scope aus PR #1:

- neues `ProjectDetailView`,
- Projekte öffnen unabhängig von `project.edit`,
- Bearbeitungsstift bleibt separat und permission-gebunden,
- Arbeitspakete auf Projekt filtern,
- Tätigkeiten transitiv über Projekt-Arbeitspakete filtern,
- AVKK-Projektkontext über bestehende Selektoren,
- Projektbericht im `ReportDialog` vorauswählbar,
- Selector-/KPI-Tests,
- keine neue RBAC-/RLS-Logik.

Wichtig: Der aktuelle `main` enthält inzwischen Accessibility-Ergänzungen wie `aria-label` in `ProjectsView`. Beim Übertragen dürfen diese nicht verloren gehen.

## 5. Nächste Reihenfolge im neuen Chat

### Schritt 1 — PR #5 prüfen und integrieren

- CI/Doku-Gates des PR #5 prüfen.
- Nur Dokumentation/Governance.
- Wenn grün: mergefähig machen und integrieren.

### Schritt 2 — PR #4 CI prüfen

- komplette CI auf PR #4 auswerten.
- Falls rot: nur ersten echten Fehler bearbeiten.
- Keine neuen Features.

### Schritt 3 — manuelle PDF-Abnahme, exakt ein Schritt nach dem anderen

Benutzer möchte manuelle Tests strikt sequenziell.

Erster Test:

1. Als Petra SYSING-102 `Netzwerkmodernisierung` als PDF erzeugen.
2. Prüfen: keine großen künstlichen Leerflächen, kein Clipping, sinnvolle Tabellenumbrüche, Header/Footer/Seitenzahlen korrekt.
3. Auf Benutzerantwort warten.

Danach erst:

4. Als Alex SYSING-101 persönlichen Bericht erzeugen und analog prüfen.

Erst nach beiden Sichttests PR #4 mergen.

### Schritt 4 — Projektcockpit auf aktuellen main übertragen

Nicht den alten PR #1 mergen.

Sauberen neuen Branch vom dann aktuellen `main` erstellen und nur die fachlich relevanten Dateien/Funktionen übertragen. Vorher Diff gegen aktuellen main prüfen, damit E2E-/A11y-/Auth-Fixes nicht überschrieben werden.

Danach vollständige CI.

### Schritt 5 — Projektcockpit manuell abnehmen

Erst Petra, dann Viewer — jeweils genau ein manueller Testschritt.

Petra erwartet:

- Projekt öffnen,
- Projektstammdaten/KPIs,
- zwei zugehörige Arbeitspakete im Demo-Kontext,
- nur projektspezifische Tätigkeiten,
- AVKK-Projektkontext,
- Projektbericht vorausgewählt,
- Bearbeiten nur gemäß `project.edit`.

Viewer erwartet:

- Projektdetail lesbar,
- keine zusätzlichen Schreibrechte.

### Schritt 6 — restliche F-11-Rollenabnahme

Noch sauber gegen `docs/ROLE-ACCEPTANCE-09C.md` verifizieren:

- Projektmanager vollständig,
- Geschäftsführer/Georg: Managementcockpit + Report + Detailgrenzen,
- Administrator/App Developer,
- Role Preview nur Darstellung, keine Scope-/Rechteänderung,
- bestehende Viewer-Negativabnahme erhalten.

Nicht über-crediten: Ein Screenshot beweist nur die tatsächlich sichtbaren Teilkriterien.

### Schritt 7 — MVP-Final-Gates und Baseline

Erst wenn alle offenen manuellen Punkte PASS sind:

- Tests,
- Typecheck,
- ESLint,
- Prettier,
- Build,
- docs:check,
- project-status:check,
- rbac:check,
- no-console,
- Security,
- Architecture,
- Tech Debt,
- E2E,
- technischer Prüfbericht,
- PROJECT-STATUS,
- ROLE-ACCEPTANCE,
- CHANGELOG,
- Entwicklungstagebuch,
- SYSING-001 TDF-Baseline und TDF-VREG.

Erst dann:

**MVP = 100 % / BASELINE**

Danach Tag/Release und Übergang zu BSF.

## 6. Roadmap nach MVP

Führende Reihenfolge laut `docs/ROADMAP-MVP-BSF.md`:

1. MVP Baseline
2. BSF Planungs-/Architekturbaseline
3. Kundenmodell
4. Kundenverantwortung
5. zentrale/synchronisierte Datenhaltung und Providergrenze
6. Canonical Import Model + SharePoint Contract
7. Betreiberhoheit / Docker / Portabilität
8. Managementcockpit 2
9. Kundenabrechnung Teamlead
10. Reporting 2
11. KI-/Agenten-Labor
12. SYSING-001 BSF-Fortschreibung / BSF-Abnahme
13. Integrations-Readiness-Gate
14. erst danach Microsoft Graph / Exchange Online

`docs/POST-MVP-PLAN.md` bleibt als fachliche Detailplanung für Graph erhalten, ist aber hinsichtlich des unmittelbaren Startzeitpunkts überholt. `docs/POST-MVP-PLAN-STATUS.md` dokumentiert diese Einordnung.

## 7. Verbindliche Arbeitsregeln

Workflow:

**Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → manuelle/inhaltliche Abnahme → nächster Prompt**

Zusätzlich nach ADR-0029:

- ein Scope = ein aktiver Branch/Variant = ein verantwortlicher Schreiber,
- keine parallelen KI-Werkzeuge auf denselben Dateien,
- `main` vor jeder Aufgabe neu prüfen,
- divergierte Alt-PRs nie blind mergen,
- Tests standardmäßig offline/nicht-produktiv,
- Release-/Report-Schemata als Verträge behandeln,
- Release-Härtung = Feature-Freeze,
- keine Secrets in Code, Prompt, Bericht oder Dokumentation.

## 8. Erster Satz für den neuen Chat

Empfohlener Startauftrag:

> Lies `docs/HANDOFF-2026-08-21-MVP-FINAL.md` und prüfe zuerst den aktuellen GitHub-main sowie PR #4 und PR #5. Setze den MVP-Abschluss exakt ab dem dokumentierten Übergabepunkt fort. Manuelle Tests weiterhin nur einzeln nacheinander.
