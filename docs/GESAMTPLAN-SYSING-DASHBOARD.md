# Sysing Dashboard — Strategischer Gesamtplan

Stand: 2026-09-03  
Status: strategische Gesamtplanung, unabhängig von Wochenplänen  
Repository: `bmarnau/sysingdashboard`  
Ausgangs-`main`: `87ac1e3dab38c383b9ae92a1d19ea43d22b1c37d`

## 1. Zweck

Dieser Gesamtplan beschreibt die fachlich und technisch sinnvolle Reihenfolge der weiteren Entwicklung des Sysing Dashboards unabhängig von Kalenderwochen, Tagesbudgets oder kurzfristigen Blockern.

Wochenpläne dürfen Arbeitspakete daraus priorisieren, ändern aber nicht automatisch die strategische Reihenfolge.

GitHub bleibt Source of Truth. Bestehende Sprint-/Issue-Nummern werden aus Traceability-Gründen nicht rückwirkend umnummeriert. Die hier dargestellte Reihenfolge ist fachlich maßgeblich; Suffixe wie `BSF-03A`, `BSF-03B`, `BSF-03C`, `BSF-03D` und `BSF-03E` sind daher nicht zwingend alphabetisch abzuarbeiten.

## 2. Unveränderte Architekturprinzipien

Für alle folgenden Schritte gelten weiterhin:

- Supabase ist der aktive MVP-Provider für Daten und Authentifizierung.
- Fachlogik, Authentifizierung, Datenzugriff und Provideradapter bleiben getrennt.
- Fachliche Kundenidentität: `(systemhouseId, customerId)`.
- `systemhouseId` ist providerneutral und nicht Microsoft Entra Tenant ID.
- keine Service Role im Browser.
- RBAC und RLS werden getrennt geprüft; UI-Gating ist keine Sicherheitsgrenze.
- Cross-Systemhouse, Cross-Customer und IDOR/BOLA müssen fail-closed sein.
- keine produktiven Secrets, Tokens oder Passwörter in Code, Prompts oder Dokumentation.
- Lovable Cloud darf keine technisch unersetzbare Laufzeitabhängigkeit werden.
- Docker-/On-Premises-Betrieb und spätere Entra-/Azure-SQL-/Azure-Storage-Fähigkeit bleiben Zielbedingungen.
- bestehende Project-/WorkPackage-/Activity-IDs bleiben soweit möglich stabil, insbesondere wegen AVKK.
- Änderungen erfolgen über Branch -> PR -> Required Checks -> dokumentierte Abnahme.
- jeder größere Arbeitsauftrag endet mit einem Abschlussbericht.

Arbeitsregel:

`Analysieren -> minimal umsetzen -> testen -> dokumentieren -> Abschlussbericht -> Abnahme`

## 3. Bereits erreichte Grundlage

### MVP / Governance — DONE

- MVP-Baseline erreicht.
- geschützter `main`-Pfad mit PR-/CI-Governance aktiv.
- Auth, RBAC, RLS, Reference Data, AVKK und technische Quality Gates vorhanden.
- SEC-02 Least-Privilege-Härtung Reference Data abgeschlossen.

### BSF-01 — DONE

- providerneutrale Systemhouse-/Customer-Scope-Baseline festgelegt.
- Kundenverantwortung als Scope/Beziehung, nicht als globale Rolle festgelegt.
- Projektmanager-Leistungssicht read-only abgegrenzt.
- Teamlead-Leistungsnachweis als eigener Write-/Finalisierungs-/Audit-Scope definiert.

### BSF-02 Fundament — weitgehend DONE / BSF-02C noch aktiv

- Customer-/Systemhouse-Domänenfundament vorhanden.
- Membership-/Customer-Access-Basis vorhanden.
- providerneutraler Shared-Projection-Contract über PR #101 auf `main`.
- Shared-Projection-DDL, Grants, RLS und T01–T30 über PR #110 abgenommen und auf `main`.
- offen bleibt der vollständige Runtime-Abschluss: transaktionaler Publish-Pfad, Shared Read-Service, Runtime-/Regressionstests und finale Abnahme von #88/#76.

## 4. Strategische Entwicklungsreihenfolge

### Phase 1 — BSF-02C abschließen: gemeinsamer Customer-Read-Pfad

**Status: AKTIV**

Ziel:

`Systemhouse -> Customer -> Project -> WorkPackage -> Activity -> Leistungserbringer`

Minimaler Scope:

- Shared-Projection-Tabellen bzw. kleinster bestätigter Persistenzpfad,
- Composite-Identität über Systemhouse + Customer + stabile Source-ID,
- Customer-Scope-RLS,
- Least-Privilege-Grants,
- transaktionaler Publish-Pfad im selben User-JWT,
- Cross-Systemhouse/Cross-Customer/IDOR-Negativtests,
- Import/Export-/Backup-Kompatibilität,
- AVKK-ID-Stabilität,
- vollständige CI/Security/Quality-Gates.

Nicht vorziehen:

- vollständige Local-First-Ablösung,
- BSF-04-Gesamtmigration,
- Customer-UI jenseits der notwendigen Testbarkeit.

**Gate:** BSF-02/02C vollständig DONE und Parent #76 schließbar.

---

### Phase 2 — BSF-03: Kundenverantwortung und „Meine Kunden“

Ziel:

Ein Systemingenieur kann für einen oder mehrere Kunden verantwortlich sein und erhält dadurch die fachlich erlaubte Kundensicht.

Umfang:

- Beziehung `User <-> Customer Responsibility`,
- „Meine Kunden“,
- Kundenkontext öffnen,
- Projekte/AP/Tätigkeiten im zulässigen Customer-Scope sehen,
- Sichtrecht und Schreibrecht strikt getrennt,
- nachvollziehbarer Sichtgrund,
- RLS/Serverprüfung statt UI-only.

**Gate:** Kundenverantwortung erzeugt keine globalen Rechte; Cross-Customer bleibt DENY.

---

### Phase 3 — BSF-03D: editierbare AP-Kategorien

**Bewusst vor die Leistungsauswertungen gezogen**, weil Kategorien dort sofort als Filter-/Analysemerkmal nutzbar sind.

Ziel:

Arbeitspakete können optional genau eine systemhausweit gepflegte Hauptkategorie erhalten.

Fachvertrag:

- Kategorien sind systemhausweite Stammdaten,
- bei allen Kunden auswählbar,
- nicht kundenspezifisch,
- durch berechtigte Benutzer editierbar,
- Standard bei neuem AP: `keine Kategorie`,
- maximal eine Hauptkategorie pro AP,
- freie Tags bleiben zusätzlich bestehen.

Beispielwerte:

- Regeltätigkeit,
- Störung,
- Änderung,
- Angebot.

Bevorzugte Umsetzung:

- Reference-Data-Katalog `workpackage.category`,
- stabiler Key/ID statt Namensidentität,
- deaktivieren/historisieren statt Hard Delete,
- Import/Export rückwärtskompatibel,
- bestehende AP ohne Kategorie bleiben gültig.

**Gate:** Kategorie ist filterbar, aber erzwingt weder Billable, Priorität noch Status.

---

### Phase 4 — BSF-03A: Projektmanager-Leistungssicht / Controlling

Ziel:

Projektmanager sehen Leistungen im zulässigen Scope rein lesend.

Mindestens:

- Zeitraum,
- Kunde,
- Projekt,
- Arbeitspaket,
- AP-Kategorie,
- Tätigkeiten,
- abrechenbar / nicht abrechenbar,
- Summen,
- Drill-down.

Keine Teamlead-Rechte:

- keine Finalisierung,
- keine Abrechnungsfreigabe,
- keine fremde Leistungsmanipulation.

**Gate:** vollständige read-only Auswertung innerhalb des zulässigen Customer-/Projekt-Scope.

---

### Phase 5 — BSF-03B: Teamlead Leistungsnachweis V1

Ziel:

Ein kontrollierter kundenbezogener Leistungsnachweis — ausdrücklich noch keine Rechnung.

Umfang:

- Kunde + fester Zeitraum,
- alle relevanten Tätigkeiten in Prüfsicht,
- abrechenbar und nicht abrechenbar sichtbar,
- Abrechenbarkeit vor Finalisierung änderbar,
- Summe abrechenbarer Zeit,
- finaler unveränderbarer Snapshot,
- Doppelabrechnungsschutz,
- Audit,
- Export/Report pro Kunde und Zeitraum,
- Name des Leistungserbringers nicht in der endgültigen Kundenfassung.

**Gate:** Vorbereitung, Finalisierung und Historie serverseitig nachvollziehbar; finalisierte Fassung unveränderbar.

---

### Phase 6 — BSF-03E: Vertretungs- und Personensicht für Verantwortlichkeiten

Ziel:

Verantwortlichkeiten werden nach den Kernfunktionen aus BSF-03/03D/03A/03B auch aus Personen- und Vertretungssicht nachvollziehbar, ohne eine zweite konkurrierende Responsibility-Logik einzuführen.

Umfang:

- Management-Personensicht auf Customer-/Project-Verantwortlichkeiten,
- Verantwortung hinzufügen, übertragen oder beenden,
- temporäre Vertretung mit optionaler zeitlicher Gültigkeit,
- Customer Responsibility, Project Responsibility und Vertretung bleiben getrennte, kombinierbare Beziehungen,
- bestehende Personen-/AVKK-Identitäten wiederverwenden,
- Audit sowie RBAC/RLS für jede Änderung,
- keine Krankheitsgründe, Diagnosen oder sonstigen Gesundheitsdaten.

Nicht Bestandteil:

- neue globale Rolle für Vertretung,
- Vertretungslogik auf Activity-Ebene,
- parallele zweite Kundenverantwortungsimplementierung.

**Gate:** Personen- und Vertretungssicht verwendet dieselbe Responsibility-Basis wie BSF-03; keine impliziten globalen Rechte und keine Gesundheitsdaten.

---

### Phase 7 — BSF-03C: Kunden-PDF / Kundenpaket

Ziel:

Operative Kundensicht als PDF, fachlich getrennt von der Reportfamilie.

Sysing Dashboard liefert z. B.:

- Kunde / Zeitraum / Datenstand,
- Projekte,
- Arbeitspakete,
- Kategorien,
- Tätigkeiten,
- Status und offene Arbeit,
- freigegebene Leistungs-/Zeitinformationen.

Später optional gemeinsames Kundenpaket mit der Reportfamilie, jedoch ohne Vermischung der Fachlogik.

**Gate:** belastbare Kunden-/Leistungs-/Verantwortungsbasis einschließlich BSF-03E, Datenminimierung, Customer-Scope, reproduzierbarer Snapshot und TDF-konformes Rendering.

---

### Phase 8 — Dokumentationsblock BSF-DOC-01 bis BSF-DOC-03

#### BSF-DOC-01 — Dokumentationskonsolidierung

- Benutzerhilfe,
- technische Dokumentation,
- Entwicklungstagebuch,
- technischer Prüfbericht,
- keine relevante Dokumentationsdrift.

#### BSF-DOC-02 — SYSING-001 fortschreiben

- Living Document im TDF-Format,
- Ist/Zielbild sauber getrennt,
- Architektur, Sicherheit, Betrieb, Customer-/Leistungssicht,
- Screenshots/Diagramme,
- Versions- und Bestandregression.

#### BSF-DOC-03 — SYSING-001 aus dem Board erreichbar

- read-only,
- keine zweite divergierende Dokumentquelle,
- klare Trennung Hilfe / Handbuch / SYSING-001.

**Gate:** Dokumentation bildet den realen Produktstand vollständig ab.

---

### Phase 9 — BSF-04: vollständige zentrale/synchronisierte Datenstrategie

Ziel:

Die bisher nur minimal vorgezogene Shared-Projection wird in eine dauerhafte Datenstrategie überführt.

Entscheidungen:

- welche Daten zentral führend sind,
- welche Daten synchronisiert bleiben,
- Local-First-Grenze,
- Konflikt-/Staleness-/Offline-Verhalten,
- Migration bestehender Daten,
- Provideradapter,
- Backup/Restore,
- Docker-/On-Premises-Fähigkeit.

**Gate:** stabile kanonische Persistenzstrategie für reale Mehrbenutzernutzung.

---

### Phase 10 — BSF-04A: Vorlagen und wiederkehrende AP/Tätigkeiten (#102)

Diese Funktion folgt bewusst **nach** BSF-04, damit Templates und Serien nicht als temporäre Local-First-Sonderlösung gebaut werden.

#### Stufe 1 — Vorlagenbibliothek

Der Benutzer kann selbst erstellen:

- Tätigkeitstemplates,
- AP-Templates mit mehreren Tätigkeitstemplates,
- optionale Customer-/Projekt-/Kategorie-Defaults.

Wichtiger Grundsatz:

> Eine Vorlage ist immer nur ein Vorschlag.

Ablauf:

1. Vorlage auswählen,
2. Werte werden vorbelegt,
3. Benutzer kann Kunde, Projekt, AP-Kategorie, Datum, Dauer, Tätigkeiten, Billable-Default usw. ändern,
4. Vorschau,
5. erst nach Bestätigung entstehen echte AP-/Activity-Instanzen mit eigenen IDs.

Beispiel:

`Training Azure`

- AP-Vorschlag,
- vier Trainingstage,
- jeweils 8 h geplant,
- Customer ggf. vorbelegt,
- alles vor dem Anlegen änderbar.

#### Stufe 2 — Wiederkehrende Serien

Beispiel:

`Morgenmeeting` -> jeden Mittwoch -> 08:00–09:00.

Regeln:

- explizite Zeitzone,
- Start-/Enddatum,
- begrenzter Erzeugungshorizont,
- Vorkommen können verschoben/übersprungen werden,
- idempotente Erzeugung, keine Dubletten,
- keine automatische Ist-Leistung,
- keine automatische Finalisierung oder Abrechnung.

Template-Änderungen verändern bereits erzeugte Instanzen niemals rückwirkend.

**Gate:** Vorschlag -> editierbare Vorschau -> bewusste Instanziierung; Serien idempotent.

---

### Phase 11 — BSF-05: Canonical Import Model und SharePoint-Vertrag

Ziel:

Reale Systemhausdaten kontrolliert aus externen Quellen übernehmen bzw. synchronisieren.

Grundsatz:

`SOURCE -> NORMALIZE -> VALIDATE -> MATCH -> ENRICH -> REVIEW -> PERSIST -> AVKK`

Umfang:

- partielle Quelldaten zulassen,
- keine erfundenen Defaults,
- stabile Quell-IDs,
- Provenienz/Freshness,
- sichere Customer-Mappings,
- Idempotenz,
- READ/SYNC zuerst,
- SharePoint als eine mögliche Quelle, nicht als Fachmodell.

**Gate:** wiederholbarer, nachvollziehbarer Import ohne stille Cross-Customer-/Cross-Systemhouse-Zusammenführung.

---

### Phase 12 — BSF-06: Betreiberhoheit und Docker

Ziel:

Nachweis, dass das Produkt unabhängig von Lovable Cloud betrieben werden kann.

Umfang:

- Docker-Container,
- Supabase/Postgres-Portabilität,
- Backup/Restore,
- Konfiguration/Secrets über sichere Runtime-Konfiguration,
- Betriebsdokumentation,
- Exit-/Migrationspfad,
- Vorbereitung Azure SQL / Azure Storage / Entra ID.

**Gate:** autonomer Unternehmensbetrieb technisch nachgewiesen.

---

### Phase 13 — BSF-07: Managementcockpit 2

Ziel:

Rollenbezogene Führungs- und Arbeitssichten auf der stabilen Customer-/Leistungsbasis.

Sichten für:

- Systemingenieur,
- Kundenverantwortlichen,
- Projektmanager,
- Teamlead,
- Administration/Führung.

Mögliche Inhalte:

- Kundenstatus,
- Projekte/AP,
- AP-Kategorien,
- Leistungsaufwand,
- offene Punkte,
- AVKK,
- Risiken/Frühindikatoren.

**Gate:** Führungssichten sind read-/write-seitig klar getrennt und serverseitig autorisiert.

---

### Phase 14 — BSF-09: Reporting 2

Ziel:

Konsolidierte kunden-/projektbezogene Berichte und Exporte.

Umfang:

- PDF,
- JSON/CSV,
- ggf. Excel,
- definierte Reportverträge,
- Snapshot/Provenienz,
- AP-Kategorie als Auswertungsdimension,
- keine unnötige Kopplung an UI oder Provider.

**Gate:** reproduzierbare und portable Reporting-Baseline.

---

### Phase 15 — BSF-10: KI-/Agenten-Labor

Ziel:

Kleines isoliertes Lern-/Demolabor für NAVIS bzw. spätere Agentenfunktionen.

Nur:

- Mock-/Demodaten bzw. klar kontrollierte read-only Quellen,
- Human-in-the-loop,
- keine autonomen produktiven Aktionen,
- nachvollziehbare Evidence-/Freigabekette,
- providerneutraler Tool-/Agentenvertrag.

Beispiel-Zielbild:

`Guten Morgen NAVIS – was liegt heute an?`

Antworten basieren auf nachweisbaren Customer-/Projekt-/AP-/AVKK-Daten statt frei erfundener Zusammenfassungen.

**Gate:** vertrauenswürdige, belegbare read-only Demonstration ohne produktive Autonomie.

---

### Phase 16 — BSF-FINAL

Gesamtprüfung:

- Authentifizierung,
- RBAC,
- RLS,
- Supabase,
- Datenbank,
- Customer-/Leistungsmodell,
- Templates/Kategorien soweit bis dahin umgesetzt,
- Import,
- Reporting,
- Betrieb,
- Docker-Portabilität,
- Azure-/Entra-Migrationsfähigkeit,
- Tests,
- Sicherheit,
- Dokumentation.

**Gate:** `BSF = 100 % / BASELINE`.

---

### Phase 17 — INTEGRATION-READINESS

Vor jeder produktiven externen Integration:

- Source of Truth,
- Mapping,
- Provenienz,
- Konfliktregeln,
- Schreibgrenzen,
- Audit,
- Providertrennung,
- Security/Datenschutz,
- Betriebsfolgen.

**Gate:** formales GO/NO-GO.

---

### Phase 18 — produktive Integrationen / Automation

Erst nach Integration Readiness:

- Microsoft Graph,
- Exchange Online,
- SharePoint produktiv,
- weitere Provider,
- kontrollierte Automatisierung,
- später ggf. produktive Agentenfunktionen.

Keine Integration darf die providerneutrale Facharchitektur umgehen.

## 5. Fachliche Querschnittsregeln

### 5.1 AP-Kategorie, Tags und Templates bleiben getrennt

- AP-Kategorie = eine kontrollierte fachliche Hauptklassifikation.
- Tags = freie Mehrfachverschlagwortung.
- Template = Vorschlag zur Erzeugung echter Instanzen.

Ein AP-Template darf eine Kategorie vorschlagen, aber der Benutzer kann sie vor dem Anlegen ändern oder entfernen.

### 5.2 Planned != Actual

Geplante Zeiten aus Vorlagen oder AP-Schätzungen sind keine erbrachten Leistungen.

Beispiel:

- geplant 8 h Training,
- tatsächlich 7,5 h,
- Leistungsnachweis verwendet die reale bestätigte Tätigkeit.

### 5.3 Kategorie != Billing

`Störung`, `Regeltätigkeit`, `Änderung` oder `Angebot` bestimmen nicht automatisch:

- billable/non-billable,
- Priorität,
- Status,
- Finalisierung.

Diese Dimensionen bleiben getrennt.

### 5.4 Keine rückwirkende Template-Wirkung

Änderungen an Templates/Kategorien verändern bereits gespeicherte AP-/Activity-Instanzen nicht still rückwirkend.

Deaktivierte Kategorien bleiben bei historischen AP nachvollziehbar.

## 6. Empfohlener roter Faden

```text
BSF-02C Shared Read
  -> BSF-03 Meine Kunden
  -> BSF-03D AP-Kategorien
  -> BSF-03A PM-Controlling
  -> BSF-03B Leistungsnachweis
  -> BSF-03E Vertretungs-/Personensicht
  -> BSF-03C Kunden-PDF
  -> Dokumentationsblock
  -> BSF-04 zentrale/synchronisierte Datenstrategie
  -> BSF-04A Templates + Wiederholungen
  -> BSF-05 Import/SharePoint
  -> BSF-06 Docker/Betreiberhoheit
  -> BSF-07 Managementcockpit 2
  -> BSF-09 Reporting 2
  -> BSF-10 KI-/Agenten-Labor
  -> BSF-FINAL
  -> Integration Readiness
  -> produktive Integrationen/Automation
```

## 7. Priorisierungsregel bei neuen Ideen

Neue Ideen werden künftig anhand von fünf Fragen eingeordnet:

1. Welchen realen Nutzwert bringt die Funktion?
2. Welche bestehende Daten-/Security-Basis benötigt sie?
3. Würde eine frühe Umsetzung später Migration/Sonderlogik erzeugen?
4. Muss sie vor einer späteren Sicht/Reportfunktion vorhanden sein?
5. Ist sie Fachlogik, Plattformlogik, Integration oder Komfortfunktion?

Eine neue Idee darf die aktuelle Implementierung nur dann verdrängen, wenn sie ein echter Blocker oder eine notwendige Vorbedingung des nächsten Schritts ist.

## 8. Abschlussregel

Nach jedem vollständig abgeschlossenen strategischen Punkt wird dieser Gesamtplan auf Drift geprüft. Änderungen der Reihenfolge werden ausdrücklich begründet und über PR dokumentiert; historische Entscheidungen werden nicht still überschrieben.
