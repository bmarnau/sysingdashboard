# BSF-01 — Planungs- und Architekturbaseline

Stand: 2026-08-25  
Status: Baseline zur Abnahme  
Issue: #73  
ADR: `docs/ADR/0029-systemhouse-customer-scope.md`

## 1. Ziel

BSF-01 schafft die verbindliche Architekturgrundlage für die unmittelbar priorisierten BSF-Schritte:

1. BSF-02 — Kundenmodell + minimal notwendige gemeinsame Daten-/Read-Basis,
2. BSF-03 — Kundenverantwortung / Kundensicht,
3. BSF-03A — Projektmanager-Leistungssicht / Controlling,
4. BSF-03B — Leistungsnachweis Teamlead V1.

BSF-01 ist bewusst kein Implementierungssprint. Es werden keine Datenbankmigration, keine RLS-Policy, keine Runtime-RBAC-Änderung und keine neue Benutzeroberfläche eingeführt.

## 2. Verifizierter Ausgangszustand

### Daten

- Projekte, Arbeitspakete und Tätigkeiten werden im MVP user-scoped lokal gespeichert.
- AVKK- und Reference-Data-Bestandteile nutzen Supabase als zentrale Datenbasis mit serverseitigen Schutzmechanismen.
- Eine rollenübergreifende Sicht auf Tätigkeiten mehrerer Benutzer ist aus rein user-lokalen Beständen nicht belastbar ableitbar.

### Authentifizierung und Berechtigungen

- Supabase ist der aktive MVP-Auth-/Datenprovider.
- RBAC/RLS und serverseitige Prüfungen bilden die Sicherheitsgrenze.
- UI-Gating ist ausschließlich Bedienlogik.
- RBAC v2 enthält vorbereitend `tenant`- und `customer`-Scopes, ist für die hier betrachteten neuen Customer-Scopes aber noch nicht als produktiver persistierter Sicherheitsvertrag nachgewiesen.

### Providergrenze

- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben getrennt.
- Lovable Cloud ist Referenz-/Implementierungsumgebung, aber keine unersetzbare fachliche Laufzeitabhängigkeit.
- Docker-/On-Premises-Betrieb sowie spätere Entra-ID-, Azure-SQL- und Azure-Storage-Fähigkeit bleiben Architekturziele.

## 3. Baseline-Entscheidungen

### B-01 — Systemhaus ist fachlicher Scope

Die fachliche Identität eines Kunden lautet:

```text
(systemhouseId, customerId)
```

`systemhouseId` ist providerneutral. Eine Microsoft Tenant ID ist kein fachlicher Primärscope.

Details und Konsequenzen sind in ADR-0029 festgelegt.

### B-02 — Kunde wird vor Kundenverantwortung eingeführt

BSF-02 muss zuerst eine stabile Customer-Entität und eindeutige Beziehungen zu Projekt, Arbeitspaket und Tätigkeit schaffen.

Kundenname oder externe Anzeigenamen dürfen nicht als stabiler technischer Schlüssel dienen.

### B-03 — Minimale gemeinsame Datenbasis wird in BSF-02 vorgezogen

Kundenverantwortung und Projektmanager-Leistungssicht benötigen Daten, die nicht ausschließlich im lokalen Benutzerkontext existieren.

Deshalb umfasst BSF-02 zusätzlich einen **minimalen gemeinsamen bzw. synchronisierten Read-/Datenpfad** für die fachlich benötigten Kunden-, Projekt-, Arbeitspaket- und Tätigkeitsbeziehungen.

Nicht vorgezogen werden die vollständige zentrale Datenstrategie und umfassende Local-First-Ablösung. Diese bleiben BSF-04.

### B-04 — Kundenverantwortung ist keine Rolle

Kundenverantwortung ist eine fachliche Zuordnung mit Scope-Wirkung.

Sie kann Sichtrechte im Kundenraum begründen, erzeugt aber keine globalen System-, Benutzer- oder Rollenverwaltungsrechte. Die genaue Schreibwirkung muss je Ressource explizit definiert werden.

### B-05 — Projektmanager-Leistungssicht ist read-only

BSF-03A stellt eine reine Auswertungs-/Controllingsicht bereit.

Mindestens erforderlich sind:

- Zeitraum,
- Kunde,
- Projekt,
- Tätigkeiten,
- abrechenbare Zeit,
- nicht abrechenbare Zeit,
- Summen je Kunde und Projekt,
- Filter und Drill-down.

Der Zugriff wird serverseitig auf den zulässigen Projekt-/Verantwortungsscope begrenzt.

### B-06 — Teamlead-Leistungsnachweis ist separater Write-Scope

BSF-03B bleibt getrennt von der Projektmanager-Sicht.

Nur der Teamlead erhält den fachlichen Finalisierungspfad. Finalisierung, Doppelabrechnungsschutz, Audit und Korrektur-/Ersatzprozess werden nicht aus einem reinen UI-Recht abgeleitet.

### B-07 — Providertrennung wird nicht aufgeweicht

Für BSF gilt weiterhin:

- Domänenmodelle und Fachregeln providerneutral,
- Supabase-Adapter klar isoliert,
- keine Auth-/RLS-Entscheidung in UI-Komponenten,
- keine produktiven Secrets im Client oder Repository,
- keine unersetzbare Lovable-Laufzeitlogik,
- spätere Entra-/Azure-/Docker-Option offenhalten.

## 4. Gate für BSF-02

BSF-02 darf implementiert werden, wenn folgende Punkte als verbindliche Eingabe gelten:

- `(systemhouseId, customerId)` ist der fachliche Kundenschlüssel,
- `systemhouseId` ist providerneutral,
- Customer-Entität besitzt stabile interne Identität,
- Kunde → Projekt → Arbeitspaket → Tätigkeit wird explizit modelliert,
- der minimale gemeinsame Mehrbenutzer-Read-/Datenpfad wird zusammen mit dem Kundenmodell entworfen,
- bestehende user-lokale Daten dürfen nicht ungeprüft verloren gehen,
- vor Runtime-Änderung wird geprüft, ob alte `tenant:`-Scopes oder andere persistierte Altwerte migriert werden müssen,
- RBAC/RLS-Negativfälle werden vor Implementierung als Testfälle formuliert,
- Supabase ist Implementierungsprovider, nicht Domänenmodell.

## 5. Gate für BSF-03

Kundenverantwortung darf erst aufgesetzt werden, wenn BSF-02 folgende Nachweise liefert:

- Customer-ID und Systemhaus-Scope stabil,
- Zuordnung Kunde → operative Objekte serverseitig lesbar,
- mindestens ein negativer Cross-Customer-/Cross-Scope-Test vorhanden,
- Sichtbarkeit und Schreibberechtigung getrennt modelliert,
- Viewer erhält keine Rechteausweitung,
- Audit-/Historisierungsbedarf für Verantwortungswechsel ist technisch berücksichtigt.

## 6. Gate für BSF-03A und BSF-03B

### Projektmanager

- read-only,
- nur zulässiger Projekt-/Verantwortungsscope,
- keine Finalisierung,
- keine verdeckte personenbezogene Leistungsbewertung.

### Teamlead

- eigener Finalisierungs-/Audit-Pfad,
- unveränderbarer Snapshot nach Abschluss,
- Doppelabrechnungsschutz serverseitig,
- Korrektur über geregelten Ersatzprozess,
- endgültige Kundenausgabe ohne Namen des Leistungserbringers.

## 7. Lovable-Einsatz

BSF-01 verwendet **0 Lovable-Credits**.

Begründung: Die Entscheidungen dieses Sprints betreffen Architektur, Scope, Daten- und Sicherheitsgrenzen. Lovable wird erst nach Freigabe dieser Baseline für gezielte UI-/Preview-Arbeit in BSF-02 und BSF-03 eingesetzt.

## 8. Auswirkungen auf die weitere Roadmap

Die strategische Roadmap bleibt bestehen. Die priorisierte operative Reihenfolge wird durch `docs/BSF-CURRENT-PRIORITIES.md` gesteuert.

BSF-04 bleibt der Sprint für die **vollständige** zentrale/synchronisierte Datenhaltungsstrategie. Dass BSF-02 einen minimalen gemeinsamen Daten-/Read-Pfad benötigt, ist eine fachliche Abhängigkeit und keine Vorwegnahme des gesamten BSF-04-Scopes.

## 9. Abnahmekriterien BSF-01

BSF-01 ist PASS, wenn:

1. ADR-0029 akzeptiert und widerspruchsfrei ist,
2. `tenant` vs. `systemhouse` eindeutig eingeordnet ist,
3. gemeinsame Datenbasis als notwendige Abhängigkeit dokumentiert ist,
4. Kundenverantwortung, PM-Sicht und Teamlead-Leistungsnachweis als getrennte Scopes festgelegt sind,
5. Provider-/Docker-/Azure-/Entra-Grenzen bestätigt sind,
6. Konzeptregister und Entwicklungstagebuch synchron sind,
7. aktuelle Prioritätenliste BSF-01/BSF-02 korrekt ausweist,
8. Security-Workflow PASS ist,
9. vollständige CI einschließlich `14 · Technical Report & Quality Gate` PASS ist.

## 10. Nicht-Scope

- Produktcode,
- Supabase-Migrationen,
- konkrete Customer-Tabelle,
- konkrete RLS-Policies,
- UI-Implementierung,
- Versionserhöhung,
- Issue #63,
- produktive SharePoint-/Graph-Integration.
