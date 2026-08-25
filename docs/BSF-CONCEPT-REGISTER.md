# Sysing Dashboard — BSF-Konzeptregister

Stand: 2026-08-25  
Status: aktive fachliche Planungsgrundlage für BSF  
Geltung: keine MVP-Nacharbeit; GitHub bleibt Source of Truth

## 1. Zweck

Dieses Register bündelt fachliche Entscheidungen, die bereits getroffen wurden und in den zugeordneten BSF-Sprints umgesetzt werden sollen. Es verhindert, dass solche Entscheidungen nur in Chats oder dauerhaft offenen Draft-PRs erhalten bleiben.

Verbindliche Regel:

> Ein Eintrag in diesem Register ist eine gesicherte Planungsgrundlage, aber noch keine Implementierungsfreigabe. Umsetzung erfolgt erst im zugeordneten Sprint nach Analyse, Architekturabgleich, RBAC/RLS-Prüfung, Tests, Dokumentation und Abnahme.

Die Planungs-/Architekturbaseline aus BSF-01 wird durch `docs/BSF-01-ARCHITECTURE-BASELINE.md` und ADR-0029 ergänzt.

## 2. C-01 — Kundenverantwortung

Quelle: PR #27 `Docs/Concept: Kundenverantwortung für spätere Umsetzung sichern`  
Zielsprint: **BSF-03**, mit Vorarbeit in BSF-02  
Status: fachlich vorgemerkt; BSF-01-Scopegrenzen bestätigt

### Gesicherte Entscheidungen

- Interne Sysing-Benutzer außer `viewer` können Kundenverantwortung erhalten.
- Ein Sysing-Benutzer kann `0..n` Kunden verantworten.
- Ein Kunde besitzt zunächst `0..1` primär verantwortlichen Sysing-Benutzer.
- Eine spätere Mehrfachverantwortung je Kunde soll architektonisch möglich bleiben.
- Es gibt perspektivisch einen Einstieg **Meine Kunden**.
- Kundenverantwortung ist ein fachlicher Scope bzw. eine Beziehung und keine neue globale Rolle.
- Kundenverantwortung ist nicht gleich AVKK-Verantwortung.
- Sichtbarkeit aufgrund Kundenverantwortung erzeugt nicht automatisch globale Schreibrechte.
- Der verantwortliche Sysing soll im zulässigen Scope alle Projekte, Arbeitspakete und Tätigkeiten des Kunden sehen können.
- Teamlead kann alle Kunden sehen und einen Kunden als Arbeits-/Filterscope auswählen; das ist keine Impersonation.
- Kundenverantwortung darf keine impliziten Rechte auf Benutzerverwaltung, Rollen oder Systemeinstellungen erzeugen.
- Verantwortungswechsel müssen historisiert und auditierbar sein.
- Durchsetzung muss serverseitig über RBAC/RLS bzw. providerneutrale Datenzugriffsschichten erfolgen.
- Die fachliche Kundenidentität folgt ADR-0029 und ist an `(systemhouseId, customerId)` gebunden.
- BSF-03 setzt voraus, dass BSF-02 einen serverseitig nutzbaren gemeinsamen Kunden-/Objekt-Read-Pfad bereitstellt.

### Offene Discovery-Fragen

- Stellvertretung und zeitlich begrenzte Vertretung,
- Vergabe- und Änderungsrecht für Kundenverantwortung,
- genaue Wirkung auf Projekt-/Objektschreibrechte,
- Kundenberichte und Managementcockpit,
- spätere Mehrfachverantwortung je Kunde.

## 3. C-02 — Leistungsnachweis V1 und Projektmanager-Controlling

Quelle: PR #29 `Docs/Concept: Abrechnung V1 als kundenbezogenen Leistungsnachweis sichern`  
Zielsprints: **BSF-03A Projektmanager-Controlling** und **BSF-03B Teamlead-Leistungsnachweis**  
Status: fachlich vorgemerkt; aus dem historischen BSF-08-Platz vorgezogen

### Gesicherte Entscheidungen Teamlead

Version 1 ist ein **kundenbezogener Leistungs-/Zeitnachweis, keine kaufmännische Rechnung**.

Nicht Bestandteil von V1:

- Rechnungsnummern,
- Preise oder Stundensätze,
- Netto/Brutto,
- Umsatzsteuer,
- Zahlungsziel,
- Faktura- oder OP-Logik.

Fachlicher Ablauf:

- Nur Teamlead führt Abrechnungsvorbereitung und Finalisierung durch.
- Grundlage sind Kunde und ein fester Zeitraum.
- Abrechenbare und nicht abrechenbare Tätigkeiten bleiben in der Prüfsicht sichtbar.
- Teamlead kann vor Finalisierung die Abrechenbarkeit ändern.
- Summe ausschließlich der abrechenbaren Zeit.
- Finalisierung erzeugt einen unveränderbaren, schreibgeschützten Snapshot.
- Report/Export pro Kunde und Zeitraum.
- Der Name des Leistungserbringers bleibt intern nachvollziehbar, erscheint aber **nicht** in der endgültigen Kundenausgabe.
- Doppelabrechnung muss serverseitig verhindert werden.
- Korrektur erfolgt über geregelten Ersatz-/Korrekturprozess, nicht durch Entsperren finaler Nachweise.
- Status-, Abrechenbarkeits- und Finalisierungsänderungen sind auditierbar.
- Kundenverantwortung und Teamlead-Abrechnung bleiben getrennte Scopes.

### Gesicherte Entscheidungen Projektmanager

Projektmanager erhält eine **reine Auswertungs-/Controllingsicht**, keine Teamlead-Abrechnungsrechte.

Mindestens sichtbar bzw. filterbar:

- Zeitraum von/bis,
- Kunde,
- Projekt,
- geleistete Tätigkeiten,
- abrechenbare Zeit,
- nicht abrechenbare Zeit,
- Summen abrechenbar und nicht abrechenbar je Kunde,
- Summen abrechenbar und nicht abrechenbar je Projekt,
- Filter `abrechenbar / nicht abrechenbar / alle`,
- Drill-down Kunde → Projekt → Tätigkeiten.

Die Sicht wird serverseitig auf den zulässigen Projekt-/Verantwortungsscope begrenzt. Sie erzeugt kein Recht zur Finalisierung eines Leistungsnachweises.

BSF-01 bestätigt zusätzlich: Die Projektmanager-Sicht ist read-only; der Teamlead-Leistungsnachweis ist ein separater Write-/Finalisierungs-/Audit-Scope.

### Offene Discovery-Fragen

- Rundungsregeln,
- Zeitzone und exakte Zeitraumgrenzen,
- Korrektur-/Ersatzworkflow,
- Exportformat und Layout,
- Aufbewahrung und Historisierung finaler Leistungsnachweise.

## 4. C-03 — systemhausgebundene Kundenidentität

Quelle: PR #51 `Docs/Concept: systemhausgebundene Kundenidentität sichern`  
Architekturentscheidung: **ADR-0029**  
Zielsprints: **BSF-02**, **BSF-05**, Integration Readiness  
Cross-Project: `bmarnau/report-family-platform`  
Status: BSF-01-Architekturbaseline bestätigt

### Gesicherte Entscheidungen

SharePoint, Sysing Dashboard und Reportfamilie sollen innerhalb eines Systemhauses denselben fachlichen Kunden über eine gemeinsame technische Identität behandeln können.

Die Identität ist jedoch **nicht systemhausübergreifend global**.

Logischer Schlüssel:

```text
(systemhouseId, customerId)
```

Dabei gilt:

- `customerId` kann technisch eine UUID sein.
- Ihre fachliche Eindeutigkeit gilt innerhalb eines `systemhouseId`-Scopes.
- `systemhouseId` bleibt providerneutral und wird nicht fest mit einer Microsoft Tenant ID gekoppelt.
- Microsoft Entra Tenant ID, Supabase-Projekt-ID und andere Providerkennungen sind Mapping-/Providerdaten, keine fachlichen Primärscopes.
- Neue BSF-Scopes verwenden fachlich Systemhaus-Semantik; die ältere `tenant`-Terminologie aus ADR-0007/0008 bleibt historische Pre-BSF-Evidenz.
- Vor Runtime-Änderungen ist zu prüfen, ob alte `tenant:`-Scopes oder andere persistierte Altwerte tatsächlich migriert werden müssen.
- Ein anderes Systemhaus besitzt einen getrennten Kundenidentitätsraum, auch wenn dort dieselbe Reportfamilie eingesetzt wird.
- Keine automatische Cross-Systemhaus- oder Cross-Tenant-Zuordnung.
- Kundenname ist kein stabiler technischer Schlüssel.
- SharePoint kann fachliche Kundenquelle bleiben, auch wenn dort zunächst keine gemeinsame `customerId` vorhanden ist.
- Eine separate Customer-Identity-/Mapping-Schicht kann technische Identität und Quellzuordnung verwalten, ohne Master aller Kundenstammdaten werden zu müssen.
- Unsichere Matches dürfen nicht automatisch zusammengeführt werden.
- Mappingentscheidungen und Aliase müssen nachvollziehbar und auditierbar sein.
- RBAC/RLS und Datenzugriff müssen den Systemhaus-Scope serverseitig erzwingen.
- Die Architektur muss providerneutral, containerfähig und ohne unersetzbare Lovable-Cloud-Abhängigkeit bleiben.

### Minimale Datenabhängigkeit aus BSF-01

Projekte, Arbeitspakete und Tätigkeiten sind im MVP user-scoped lokal. BSF-02 muss deshalb zusätzlich zur Customer-Entität genau die minimale gemeinsame bzw. synchronisierte Daten-/Read-Basis schaffen, die BSF-03 und BSF-03A für echte Mehrbenutzersichten benötigen.

Der vollständige Datenhaltungsumbau bleibt BSF-04.

### Empfohlene Quellreferenz

Für externe Quellen wie SharePoint ist mindestens eine stabile Referenz vorzusehen:

```text
systemhouseId
customerId
sourceSystem
sourceInstance
sourceRecordId
```

`sourceInstance` verhindert, dass gleichlautende IDs aus unterschiedlichen Sites, Installationen oder Systemhäusern verwechselt werden.

### Cross-Project-Auswirkung

Im Repository `bmarnau/report-family-platform` beschreibt `RF_ARCH_CUSTOMER_IDENTITY_MAPPING.md` aktuell eine „globale customerId“.

Für die spätere gemeinsame Architektur ist zu präzisieren:

> Global bedeutet report- und anwendungsübergreifend innerhalb genau eines Systemhauses, nicht global über mehrere Systemhäuser oder Installationen hinweg.

Die dort bereits vorgesehene Customer Registry kann grundsätzlich bestehen bleiben, benötigt aber einen expliziten Systemhaus-/Mandantenscope.

### Offene Discovery-Fragen für BSF-02/05

- Wie wird `systemhouseId` erzeugt und administriert?
- Wo wird die Customer Identity Registry betrieben?
- Wer erzeugt die `customerId`?
- Wie wird ein vorhandener SharePoint-Kunde erstmalig zugeordnet?
- Welche Quellfelder dienen nur als Match-Kandidaten, welche als starke externe IDs?
- Wie werden Dubletten korrigiert und Merge-Entscheidungen auditiert?
- Wie konsumieren Sysing Dashboard und Reportfamilie denselben versionierten Contract?

## 5. Sprintzuordnung

### C-01 Kundenverantwortung

- Hauptsprint: **BSF-03**
- Vor-/Folgesprints: BSF-02, BSF-07
- Pflicht-Gate: RBAC/RLS-Kundenscope PASS

### C-02 Leistungsnachweis/Controlling

- Projektmanager-Controlling: **BSF-03A**
- Teamlead-Leistungsnachweis V1: **BSF-03B**
- historischer Planungsplatz BSF-08 erzeugt keinen zweiten Implementierungssprint
- Pflicht-Gate: Teamlead-Finalisierung und Projektmanager-Auswertung sauber getrennt

### C-03 Kundenidentität

- Architektur-Baseline: **BSF-01 / ADR-0029**
- Hauptsprints: **BSF-02 / BSF-05**
- Vor-/Folgesprints: BSF-03, Integration Readiness
- Pflicht-Gate: kein Cross-Systemhaus-Matching; stabile Quellzuordnung

## 6. Gemeinsame Architekturregeln

Für alle drei Konzepte gelten:

- Fachlogik, Authentifizierung, Datenzugriff und Provideradapter getrennt halten.
- Berechtigungen nicht nur über UI-Filter erzwingen.
- RBAC/RLS und serverseitige Scopes sind maßgeblich.
- Auditierbarkeit bei Verantwortungs-, Mapping- und Finalisierungsänderungen.
- Keine produktiven Secrets in Code, Prompts, Berichten oder Mappingdaten.
- Supabase bleibt MVP-/BSF-Ausgangsprovider; spätere Entra-ID-/Azure-SQL-/Azure-Storage-Fähigkeit darf nicht verbaut werden.
- Docker-/On-Premises-Betrieb muss möglich bleiben.
- Lovable Cloud darf keine technisch unersetzbare Laufzeitabhängigkeit werden.
- Lovable wird für UI-/Preview-Nutzen eingesetzt, nicht als Quelle für Architektur-, Datenmodell- oder Sicherheitsentscheidungen.

## 7. Wiederaufnahme-Regel

Beim Start eines zugeordneten BSF-Sprints ist dieses Register zusammen mit `docs/ROADMAP-MVP-BSF.md`, `docs/SPRINT-PLAN-MVP-BSF.md`, `docs/BSF-CURRENT-PRIORITIES.md`, den relevanten ADRs und dem aktuellen GitHub-`main` zu prüfen.

Erst danach wird ein konkreter Implementierungs-Prompt formuliert.

Jeder Implementierungs-Prompt endet mit:

`Analyse → Umsetzung → Tests → Dokumentation → Abnahmekriterien → Abschlussbericht`

## 8. Abgrenzung zum MVP

C-01, C-02 und C-03 sind **keine offenen MVP-Funktionen**. Der MVP ist abgeschlossen; diese Konzepte bilden die priorisierte BSF-Planungsgrundlage.
