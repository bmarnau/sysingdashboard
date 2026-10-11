# BSF-07 — Managementcockpit 2: Design- und P0-Vertrag

Stand: 2026-10-11  
Status: **P0 DESIGN CONTRACT — Produktimplementierung HOLD bis BSF-03E DONE**  
Parent: `#140`  
P0: `#174`  
Golden-Gate-Plan: `#175` / Draft-PR `#176`

## 1. Ziel

BSF-07 stellt eine gemeinsame, rollen- und scopebewusste Management-Informationsarchitektur bereit, ohne eine zweite KPI-, Responsibility- oder Berechtigungslogik aufzubauen.

Die Implementierung soll vorhandene, bereits abgesicherte Read-Modelle providerneutral komponieren:

- AVKK Management,
- Project Controlling,
- Customer Responsibility / „Meine Kunden“,
- BSF-03E Responsibility / WorkPackage Work View.

Dieses Dokument ist der fachliche und technische P0-Vertrag vor Produktcode.

## 2. Nicht-Scope

Vor dem Golden Gate ausdrücklich nicht Bestandteil von BSF-07:

- Docker / Containerbetrieb,
- Microsoft Graph,
- produktive Entra-ID-Anbindung,
- SharePoint / Exchange / PRTG,
- automatische externe Synchronisationen,
- MCP / Agenten / NAVIS,
- neue persistierte Management-Snapshot-Tabelle,
- neue globale Rolle,
- neue pauschale Managementcockpit-Permission ohne belegten Sicherheitsbedarf,
- Personenranking, Mitarbeiterscore, Top/Flop oder automatische Leistungsbewertung.

## 3. Architekturentscheidung

### 3.1 Keine zweite Fachlogik

BSF-07 berechnet bestehende Kennzahlen nicht erneut. Es komponiert Ergebnisse aus bestehenden Source-of-Truth-Verträgen.

Providergrenzen bleiben erhalten:

```text
UI
  -> ManagementCockpitService / providerneutraler Composer
       -> AVKK Management Service
       -> Project Controlling Service
       -> My Customers / Customer Responsibility
       -> BSF-03E WorkPackage/Responsibility Read Model
            -> vorhandene Provideradapter / User-JWT / RLS
```

Der Composer enthält keine Supabase-spezifische Fachlogik.

### 3.2 Keine Rechteunion

Teilbereiche behalten ihren eigenen serverautorisierten Scope.

Verboten:

```text
Scope(A) UNION Scope(B) -> erweiterter Managementscope
```

Erlaubt:

- getrennte Teilbereiche mit eigenem Scope,
- kombinierte Darstellung nur auf eindeutig korrelierbarer Schnittmenge,
- Drill-down nur innerhalb des Ursprungs-Scopes,
- fail-closed bei nicht eindeutiger Korrelation.

## 4. Capability-Vertrag

BSF-07 führt keine pauschale `managementcockpit.view`-Permission ein.

### PersonalWork

- persönlicher Dashboard-/Arbeitskontext,
- keine Managementberechtigung,
- Systemingenieur-Grundsicht bleibt im persönlichen Dashboard.

### CustomerPortfolio

Nur bei:

```text
active user
AND active systemhouse membership
AND own active customer responsibility
AND own customer_access >= read
AND dashboard.view
```

`customer.responsibility.manage` ist nicht gleich CustomerPortfolio.

### ProjectControlling

- benötigt `project.controlling.view`,
- ausschließlich serverautorisierter Customer-/Project-Scope.

### AvkkManagement

- benötigt `avkk.management.view`,
- ausschließlich serverautorisierter Customer-/Subject-Scope.

### PerformanceStatement

- bleibt durch `performance.statement.manage` getrennt,
- keine implizite Cockpit-Schreibfunktion.

### ResponsibilityManagement

- bestehende Responsibility-/Assignment-Verträge,
- nur bei konkretem funktionalem Bedarf.

## 5. Route- und Sichtvertrag

Die spätere Route `/managementcockpit` ist nur für Benutzer vorgesehen, denen der Server mindestens eine Management-/Portfolio-Capability liefert:

- CustomerPortfolio,
- ProjectControlling,
- AvkkManagement.

Ein Engineer ohne diese Capabilities erhält keinen Managementcockpit-Datenpfad.

Die fünf Design-/Darstellungsperspektiven bleiben:

1. Systemingenieur — persönliche Arbeitspriorität im bestehenden Dashboard,
2. Kundenverantwortlicher — ausschließlich eigene autorisierte Kunden,
3. Projektmanager — Project Controlling im realen Scope,
4. Teamlead — AVKK-/Projekt-/AP-Verdichtung ohne Personenbewertung,
5. Administration/Führung — nur tatsächlich autorisierte Portfolio-Verdichtung.

## 6. Role Preview

Role Preview ist reine Darstellungssimulation auf bereits autorisierten Daten.

Es ändert niemals:

- Identität,
- JWT,
- Rolle,
- Permission,
- RLS,
- serverseitigen Scope.

Role Preview darf keine zusätzlichen Objekte laden.

## 7. Datenzustandsvertrag

Jeder Teilbereich besitzt genau einen Zustand:

```text
AVAILABLE
EMPTY
PARTIAL
UNKNOWN
UNAVAILABLE
DENIED
```

### AVAILABLE

Quelle erfolgreich gelesen; Werte fachlich nutzbar.

### EMPTY

Autorisierte Anfrage erfolgreich; Ergebnis fachlich leer.

### PARTIAL

Werte sind nutzbar, aber der bestehende Completeness-Vertrag meldet Lücken.

### UNKNOWN

Benötigte Information ist nicht belastbar bestimmbar. Kein Ersatzwert.

### UNAVAILABLE

Quelle/Service nicht verfügbar. Kein Demo-Fallback.

### DENIED

Nicht autorisiert. Keine Counts, IDs, Titel, Namen oder Existenzhinweise leaken.

### Fachzustände, keine Datenfehler

- `UNASSIGNED` = Responsibility-Zustand,
- `NO_DUE_DATE` = Termin-Zustand,
- kein AVKK-Dossier = fachlich nicht angelegt/unvollständig,
- `generatedAt` ist Berechnungszeit, nicht Datenstand.

## 8. Source-of-Truth-Katalog

### AVKK

Source of Truth: `src/lib/avkk/management.ts`.

Verwendet werden insbesondere:

- `ManagementSummary`,
- `ACTION_RULES`,
- `PRIORITY_RULE`,
- Kompetenz-, Konsequenz- und Responsibility-Aggregationen.

Erlaubte AVKK-Managementaussagen:

- kritisch,
- gefährdet,
- Unterstützung erforderlich,
- Terminrisiko,
- fehlende Voraussetzung,
- hohe Kundenkonsequenz,
- hohe Projektkonsequenz,
- Verantwortung fehlt.

### Project Controlling

Source of Truth: `ProjectControllingResult`.

Erlaubt:

- Activities, Customers, Projects, WorkPackages,
- Total Hours, Billable Hours, Non-Billable Hours,
- Billable Quote,
- Completeness,
- Freshness.

### Customer Portfolio

Source of Truth: bestehender „Meine Kunden“-Vertrag / `is_my_customer`.

Responsibility allein erzeugt keine Kundendatenrechte.

### Responsibility / WorkPackage

Source of Truth nach BSF-03E-Merge:

- autorisierte WorkPackage-Grundmenge,
- Owner / Deputy / `UNASSIGNED`,
- DueGroup,
- stabile Customer-/Systemhouse-Identität.

## 9. Nicht freigegebene KPI

Bis ein separater Fachvertrag existiert, nicht implementieren:

- kombinierter Managementscore,
- Kundengesundheit in Prozent,
- „Projekt im Plan“ in Prozent,
- Mitarbeiterproduktivität,
- Mitarbeiterauslastung als Personenvergleich,
- Stress-/Belastungsscore,
- Eskalationswahrscheinlichkeit,
- Trendpfeile ohne historische Snapshot-Basis,
- Freshness-Ampel ohne dokumentierte Fachschwelle.

## 10. Korrelation

Keine Korrelation über Namen, Titel, Labels oder Fuzzy Matching.

Verbindlicher Zielschlüssel:

```text
(systemhouseId, customerId, subjectType, subjectId)
```

Regeln:

- genau 1 Match -> korrelierbar,
- 0 Match -> `UNKNOWN / NOT_CORRELATABLE`,
- mehr als 1 Match -> `UNKNOWN / AMBIGUOUS`,
- niemals Best Guess.

## 11. Project-Controlling PARTIAL und Freshness

`ProjectControllingCompleteness` bleibt Source of Truth für PARTIAL:

- categoryUnobservedRows,
- categoryUnknownRows,
- rowsWithoutProject,
- rowsWithoutWorkPackage.

PARTIAL verändert Summen nicht künstlich.

`ProjectControllingFreshness` bleibt Source of Truth:

- oldestPublishedAt,
- latestPublishedAt,
- observedRows.

BSF-07 führt ohne separaten Fachvertrag keine neue frisch/veraltet-Ampel ein.

## 12. Golden-Dataset-Erweiterung

Aktueller Stand bleibt bis zur Implementierung:

- schemaVersion `sysing.golden.v1`,
- datasetVersion `1.1.0`,
- referenceTime `2026-09-14T00:00:00Z`.

Geplante additive Version für BSF-07: `1.2.0`.

Bestehende 1.1.0-Controlling-Werte bleiben unverändert:

- 8 Activities,
- 2 Customers,
- 3 Projects,
- 5 WorkPackages,
- 25 h total,
- 20 h billable,
- 5 h non-billable,
- 80 % billable.

Geplante additive Dateien:

- `people.json`,
- `scope-context.json`,
- `responsibilities.json`,
- `avkk.json`,
- `expected/management-cockpit.json`.

Bestehende fünf WorkPackages werden weiterverwendet. Keine neuen Tätigkeiten sind für BSF-07 erforderlich.

### Geplante Management-Fälle

<!-- prettier-ignore -->
| WorkPackage | Due | Responsibility | AVKK-Zielbild |
|---|---|---|---|
| golden-wp-a1 | 2026-09-10 | Owner + Deputy | kritisch, gefährdet, Support, Kundenkonsequenz Rank 4 |
| golden-wp-a2 | 2026-09-30 | Owner | vollständig, unauffällig |
| golden-wp-a3 | 2026-09-14 | UNASSIGNED | heute fällig, atRisk, Projektkonsequenz Rank 3 |
| golden-wp-a4 | null | UNASSIGNED | kein Dossier, NO_DUE_DATE, kein künstlicher Fehler |
| golden-wp-b1 | 2026-09-16 | Owner + Deputy | atRisk, Support, Kundenkonsequenz Rank 3 |

Unabhängig geplante ManagementSummary-Expected-Results:

```text
total = 5
withDossier = 4
open = 4
atRisk = 3
critical = 1
overdue = 1
competenceGap = 3
highConsequence = 3
incomplete = 4
withoutResponsibility = 2
supportNeeded = 2
```

Handlungsbedarf:

```text
kritisch = 1
gefaehrdet = 3
unterstuetzung = 2
terminrisiko = 2
voraussetzung-fehlt = 2
konsequenz-kunde = 2
konsequenz-projekt = 1
verantwortung-fehlt = 1
```

Diese Werte werden nicht aus Produktionscode generiert.

## 13. RED-Testvertrag

Vor P1-Code werden Tests für mindestens folgende Gruppen angelegt:

- MC01–MC08 Datenzustände,
- MC09–MC12 Fachzustände/Freshness,
- MC13–MC20 Capability/Role Preview,
- MC21–MC24 keine Rechteunion/Cross-Scope,
- MC25–MC28 Korrelation,
- MC29–MC32 KPI-Herkunft / verbotene KPI,
- MC33–MC35 Drill-down.

Ab P2 zusätzlich:

- unauthenticated,
- ungültige IDs,
- forged role/preview,
- Customer-/Systemhouse-IDOR,
- Scope-Union-Angriffe,
- beendete Responsibility,
- inaktive Membership,
- kein Service-Role-Normalpfad,
- Providerfehler ohne Rohdatenleak.

Browser/E2E ab P3/P4:

- fünf Sichtprofile,
- Datenzustände,
- keine Personenrankings,
- 1280 / 820 / 390,
- Keyboard/Fokus,
- Axe,
- Console Errors = 0.

## 14. Implementierungsfolge

### P0 — Vertrag / RED

Dieses Dokument, Issue #174 und unabhängige Golden-Erwartungen finalisieren.

### P1 — Pure Domain Composition

- providerneutraler ManagementCockpitService,
- keine React-/Supabase-Abhängigkeit,
- vorhandene Domainverträge konsumieren,
- RED -> GREEN.

### P2 — Server Read Composition

- User-JWT,
- bestehende Repositories/Services,
- fail-closed Scope,
- IDOR/BOLA/Cross-Customer/Cross-Systemhouse.

### P3 — UI

- read-only Managementcockpit,
- Handlungsbedarf vor Statistik,
- Datenzustände sichtbar,
- Drill-down nachvollziehbar,
- keine technischen IDs/Rohfehler.

### P4 — Rollen-/Browserabnahme

- Projectmanager, Teamlead, Administration/Führung, CustomerPortfolio,
- persönliche Engineer-Sicht im Dashboard regressieren,
- Viewer/Customer/Kiosk negativ,
- responsive / accessibility.

### P5 — Closure

- vollständige CI + Security,
- Golden Dataset,
- technischer Prüfbericht,
- Hilfe/Handbuch,
- Status-/Roadmap-Sync,
- Changelog/SemVer bei Produktabschluss,
- Closure und Go/No-Go für KIOSK-03.

## 15. Definition of Done P0

P0 ist DONE, wenn:

- Datenzustände eindeutig,
- Capability-/Route-Vertrag eindeutig,
- KPI-Herkunft je sichtbarem Feld definiert,
- Korrelation fail-closed definiert,
- RED-Matrix reproduzierbar definiert,
- Golden-1.2.0-Erweiterung reviewbar,
- keine neue Rolle/Permission/DB ohne Bedarf,
- keine Produktimplementierung erfolgt,
- Design-Dokument versioniert und Gates grün.

## 16. Governance / Blocker

Produktimplementierung bleibt HOLD bis:

1. PR #171 signiert restacked,
2. neuer Exact Head CI + Security PASS,
3. PR #171 gemergt,
4. BSF-03E P5 abgeschlossen.

Planungs-/Vertragsarbeit darf parallel fortgesetzt werden.

Alle späteren Änderungen folgen PROJECT-GOVERNANCE, AQGS, Golden-Gate-Plan und den projektweiten Doku-/Maintenance-Standards.
