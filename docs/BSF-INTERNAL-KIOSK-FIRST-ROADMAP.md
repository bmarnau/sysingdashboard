# Sysing Dashboard — Interne Kiosk-first-Roadmap

Stand: 2026-09-14  
Status: **verbindliche interne Neuplanung zur Freigabe per PR**  
Geltung: Sysing Dashboard, interne BSF-Entwicklung bis zur internen Gesamtbaseline

## 1. Zweck

Diese Roadmap ordnet die noch offenen **internen** Aufgaben des Sysing Dashboards neu. Ziel ist, den Info-Kiosk so früh wie fachlich und technisch vertretbar nutzbar zu machen, ohne spätere Architekturentscheidungen vorwegzunehmen oder strukturellen Schaden zu erzeugen.

Der Kiosk soll früh als sichtbarer Demonstrations- und Arbeitsstand funktionieren. Dafür werden zunächst ausschließlich **Demo-/Mock-Daten** verwendet. Produktive externe Schnittstellen bleiben getrennt.

## 2. Definition „intern“

Für diese Planung bedeutet **intern**:

- keine produktive Microsoft-Graph-Anbindung,
- keine produktive SharePoint-/Exchange-/PRTG-Anbindung,
- kein MCP-Server/-Client als Laufzeitvoraussetzung,
- kein NAVIS-/Agenten-Zugriff,
- keine autonome KI-Aktion,
- keine externe Producer-Abhängigkeit,
- keine Lovable-Cloud-only Laufzeitabhängigkeit.

Interne Aufgaben dürfen dagegen bereits providerneutrale Verträge, Adaptergrenzen, Mock-Provider und spätere Erweiterungspunkte vorbereiten.

## 3. Architekturregel für den Info-Kiosk

Der Kiosk erhält **kein eigenes konkurrierendes Fach- oder Datenmodell** und keine eigene Kiosk-Datenbank.

Verbindlicher Entwicklungsweg:

```text
Kiosk UI
  -> KioskDataProvider
      -> DemoKioskDataProvider          (frühe Stufe)
      -> InternalReadKioskDataProvider  (spätere interne Stufe)
      -> externe Provider erst nach Integration Readiness
```

Damit bleibt die Kiosk-Oberfläche unabhängig von späteren Datenquellen.

Weitere Regeln:

- read-only,
- keine Auth-/RBAC-/RLS-Umgehung,
- keine Service Role im normalen Benutzerpfad,
- Demo-Daten müssen sichtbar als Demo/Test gekennzeichnet sein,
- keine künstliche Behauptung von Live-Daten,
- keine Fachlogik in UI-Komponenten,
- keine direkte Kopplung der UI an Supabase-, Lovable-, Graph-, MCP- oder andere Providerdetails,
- spätere Echt-Daten verwenden bestehende interne Read-/Projection-Verträge.

## 4. Verbindliche neue Reihenfolge der internen Aufgaben

Ab dem abgeschlossenen BSF-03D gilt:

1. **BSF-KIOSK-01 — Info-Kiosk Demo-Pilot**
2. **BSF-03A — Projektmanager-Leistungssicht / Controlling (#106)**
3. **BSF-KIOSK-02 — internes Read-Modell für den Kiosk**
4. **BSF-03B — Teamlead-Leistungsnachweis V1 (#107)**
5. **BSF-03E — Vertretungs- und Personensicht (#63)**
6. **BSF-07 — Managementcockpit 2, vorgezogen**
7. **BSF-KIOSK-03 — Management-Kiosk auf internen Echt-Daten**
8. **BSF-03C — Kunden-PDF / Kundenpaket (#98)**
9. **BSF-DOC-01 — Dokumentationskonsolidierung**
10. **BSF-DOC-02 — SYSING-001 im TDF-Format**
11. **BSF-DOC-03 — SYSING-001 aus dem Board erreichbar**
12. **BSF-04 — zentrale/synchronisierte Datenstrategie (#108)**
13. **BSF-04A — Vorlagen und wiederkehrende AP/Tätigkeiten (#102)**
14. **BSF-05A — Canonical Import Model intern, ohne produktiven Connector**
15. **BSF-06 — Betreiberhoheit, Docker, Backup/Restore, Installierbarkeit**
16. **BSF-09 — Reporting 2**
17. **BSF-FINAL-INTERNAL — interne Gesamtprüfung und Baseline**
18. **INTEGRATION-READINESS**
19. **erst danach:** produktive externe Integrationen, MCP und Agenten/NAVIS

BSF-10 als KI-/Agenten-Labor gehört damit **nicht mehr in den zwingenden internen Hauptpfad vor BSF-FINAL-INTERNAL**. Der Themenblock wird nach der internen Baseline und dem Integration-Readiness-Gate neu eingeordnet.

## 5. Kiosk-Reifestufen

### BSF-KIOSK-01 — Demo-Pilot

Ziel: Der Kiosk ist früh auf einem Großmonitor vorzeigbar und bedienungsarm nutzbar.

Mindestens:

- eigene Kiosk-/Wallboard-Route,
- read-only,
- Vollbild-/Großmonitor-taugliches Layout,
- Demo-/Mock-Daten,
- sichtbarer Demo-Hinweis,
- Projekte,
- Arbeitspakete,
- Tätigkeiten,
- Infrastruktur,
- Support-Postfach,
- Urlaub/Abwesenheit bzw. Verfügbarkeit in datensparsamer Form,
- Zeitstempel/Datenstand,
- definierter Refresh-Mechanismus für Demo-Daten,
- klare Empty-/Error-/Unknown-Zustände,
- keine produktive externe Schnittstelle.

Abnahme:

- funktioniert unabhängig von SharePoint, Graph, PRTG, Exchange, MCP und Agenten,
- Demo-Daten sind austauschbar,
- UI hängt nur vom `KioskDataProvider`-Vertrag ab,
- keine neuen globalen Rechte,
- Accessibility und responsive Großbilddarstellung geprüft,
- vollständige CI/Quality Gates PASS.

### BSF-KIOSK-02 — internes Read-Modell

Ziel: Der Kiosk kann erste interne Daten aus den bereits vorhandenen, serverseitig abgesicherten Read-/Projection-Verträgen lesen.

Regeln:

- Demo-Provider bleibt für Tests/Schulungen verfügbar,
- interner Provider nutzt bestehende Shared-Projection-/Customer-Scope-Pfade,
- `categoryKey` aus BSF-03D wird reguläre WorkPackage-Dimension,
- keine zweite Reporting-/Aggregationsebene erfinden,
- fehlende Daten als unknown/not available darstellen,
- Infrastructure/Support/Abwesenheit dürfen weiterhin Demo sein, solange keine interne belastbare Quelle existiert.

### BSF-KIOSK-03 — Management-Kiosk

Ziel: Nach dem vorgezogenen BSF-07 werden die freigegebenen Managementkennzahlen und Führungsinformationen im Kiosk konsistent dargestellt.

Regeln:

- Managementcockpit definiert die fachliche Bedeutung,
- Kiosk ist passive/read-only Präsentationsschicht,
- keine neue Berechtigungslogik im Kiosk,
- keine personenbezogene Leistungsbewertung,
- Datenschutz und Datenminimierung gelten auch für Großbildbetrieb,
- sensible Informationen müssen für offene Bildschirmstandorte explizit freigegeben sein.

## 6. BSF-03A bleibt unmittelbare fachliche Grundlage

BSF-03A folgt direkt nach KIOSK-01 und bleibt der nächste fachliche Datensprint.

Verbindlich:

- read-only Projektmanager-Controlling,
- Zeitraum, Kunde, Projekt, Arbeitspaket, Kategorie, billable/non-billable,
- Summen und Drill-down,
- serverseitige Scope-Begrenzung,
- kein Teamlead-Finalisierungsrecht,
- vorhandenen Shared-Projection-Pfad erweitern statt zweiten Datenpfad bauen.

Die heutige Anzeigeeigenschaft `Project.lead` ist keine stabile Sicherheitsidentität und darf nicht zur Autorisierung verwendet werden. Eigenständige Project Responsibility wird erst im dafür vorgesehenen Verantwortungs-/Personenscope modelliert.

## 7. BSF-07 wird vorgezogen

BSF-07 Managementcockpit 2 wird aus dem späten Abschnitt vor BSF-03C/Dokumentationsblock vorgezogen.

Begründung:

- der Kiosk benötigt fachlich definierte Managementkennzahlen,
- Führungslogik soll nicht in der Kiosk-UI entstehen,
- die bereits abgeschlossenen Customer-/Responsibility-Grundlagen und BSF-03A/03B/03E liefern vorher die nötigen fachlichen Bausteine,
- Docker und externe Integrationen sind für einen internen browserbasierten Management-Kiosk noch keine Voraussetzung.

## 8. BSF-05 wird intern/extern getrennt

### BSF-05A — intern

- providerneutrales Canonical Import Model,
- Schema-/Contract-Regeln,
- partielle Daten zulassen,
- Provenienz/Freshness/Unknown-Semantik,
- Match-/Identity-Regeln,
- Tests mit lokalen Beispieldaten,
- keine produktive externe Verbindung.

### Externe Provider — nach Integration Readiness

SharePoint, Microsoft Graph, Exchange Online, PRTG, MCP oder andere produktive Datenquellen werden erst nach dem internen Baseline- und Readiness-Pfad angebunden.

Damit wird der bestehende externe Wallboard-Vertrag aus Issue #123 / Draft-PR #124 nicht verworfen, aber **aus dem internen Hauptpfad entkoppelt**.

## 9. Lovable-Planung

Lovable wird gezielt dort eingesetzt, wo sichtbarer UI-/Preview-Nutzen entsteht.

| Sprint | Lovable-Einsatz |
|---|---|
| BSF-KIOSK-01 | **hoch** — Layout, Wallboard, Großbild, Demo-Zustände |
| BSF-03A | mittel — Filter, Tabellen, Summen, Rollen-Preview |
| BSF-KIOSK-02 | mittel — Kiosk-UI gegen internen Read-Provider |
| BSF-03B | mittel — Prüfsicht/Finalisierungsdialog |
| BSF-03E | gezielt — Personensicht/Vertretung |
| BSF-07 | **hoch** — Führungs-/Managementsichten |
| BSF-KIOSK-03 | **hoch** — finale Management-Wallboard-Darstellung |
| BSF-03C | gezielt — PDF-/Preview-Layout |
| BSF-DOC-02 | **0** |
| BSF-04 / 05A / 06 | gering; Architektur/Backend/Governance zuerst |
| BSF-09 | gezielt — Reporting-Preview |

Credits werden nicht künstlich verbraucht. Git-/CI-/Architektur-/Security-Arbeiten werden nicht zu Lovable verschoben, wenn dafür ein geeigneterer Weg vorhanden ist.

## 10. Nicht-Scope des internen Hauptpfads

Bis einschließlich BSF-FINAL-INTERNAL nicht zwingend:

- produktiver Graph-Zugriff,
- produktiver SharePoint-Import,
- produktiver Exchange-/PRTG-Zugriff,
- MCP-Laufzeitintegration,
- NAVIS-/Agentenzugriff,
- autonome KI-Aktionen,
- externer Producer als Betriebsabhängigkeit.

Providerneutrale Vorbereitung ist erlaubt und erwünscht; produktive Kopplung nicht.

## 11. Definition of Done je Sprint

Jeder Sprint folgt weiterhin:

`Analyse → Architekturabgleich → Umsetzung → Tests → Dokumentation → Abnahmekriterien → Abschlussbericht`

DONE erst bei:

- funktionalem Nachweis,
- RBAC/RLS-/Security-Nachweis soweit betroffen,
- Import/Export-/Backup-Auswirkungen geprüft soweit betroffen,
- Accessibility bei UI-Scope,
- E2E bei relevanten Nutzerpfaden,
- Technical Debt und Technical Report & Quality Gate PASS,
- Dokumentationsflächen synchron,
- Exact-Head-/Main-Nachweis gemäß Governance.

Keine produktiven Secrets, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts, Berichten oder Dokumentation.

## 12. Prioritätsregel

Wenn ältere Planungsdokumente oder alte Issues eine abweichende Reihenfolge nennen, gilt nach Merge dieser Roadmap die hier definierte **interne Kiosk-first-Reihenfolge** als neuere operative Planungsgrundlage. Historische Abschlussdokumente bleiben unverändert.

Der dauerhafte Wiederanlaufpunkt bleibt Issue #35. Der jeweils aktive Sprint muss dort auf diese Roadmap verweisen.
