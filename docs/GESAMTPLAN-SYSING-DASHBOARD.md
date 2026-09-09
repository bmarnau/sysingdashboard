# Sysing Dashboard — Strategischer Gesamtplan

Stand: 2026-09-09  
Status: strategische Gesamtplanung, unabhängig von Wochenplänen  
Repository: `bmarnau/sysingdashboard`

## 1. Zweck

Dieser Gesamtplan beschreibt die fachlich und technisch sinnvolle Reihenfolge der weiteren Entwicklung des Sysing Dashboards unabhängig von Kalenderwochen, Tagesbudgets oder kurzfristigen Blockern.

Wochenpläne dürfen Arbeitspakete daraus priorisieren, ändern aber nicht automatisch die strategische Reihenfolge. GitHub bleibt Source of Truth. Bestehende Sprint-/Issue-Nummern werden aus Traceability-Gründen nicht rückwirkend umnummeriert.

## 2. Unveränderte Architekturprinzipien

Für alle folgenden Schritte gelten:

- Supabase ist der aktive MVP-Provider für Daten und Authentifizierung.
- Fachlogik, Authentifizierung, Datenzugriff und Provideradapter bleiben getrennt.
- Fachliche Kundenidentität: `(systemhouseId, customerId)`.
- `systemhouseId` ist providerneutral und nicht Microsoft Entra Tenant ID.
- keine Service Role im Browser oder normalen User-Pfad.
- RBAC und RLS werden getrennt geprüft; UI-Gating ist keine Sicherheitsgrenze.
- Cross-Systemhouse, Cross-Customer und IDOR/BOLA müssen fail-closed sein.
- keine produktiven Secrets, Tokens oder Passwörter in Code, Prompts oder Dokumentation.
- Lovable Cloud darf keine technisch unersetzbare Laufzeitabhängigkeit werden.
- Docker-/On-Premises-Betrieb und spätere Entra-/Azure-SQL-/Azure-Storage-Fähigkeit bleiben Zielbedingungen.
- bestehende Project-/WorkPackage-/Activity-IDs bleiben soweit möglich stabil, insbesondere wegen AVKK.
- Änderungen erfolgen über Branch → PR → Required Checks → dokumentierte Abnahme.
- jeder größere Arbeitsauftrag endet mit einem Abschlussbericht.

Arbeitsregel:

`Analysieren → minimal umsetzen → testen → dokumentieren → Abschlussbericht → Abnahme`

## 3. Bereits erreichte Grundlage

### MVP / Governance — DONE

- MVP-Baseline erreicht.
- geschützter `main`-Pfad mit PR-/CI-Governance aktiv.
- Auth, RBAC, RLS, Reference Data, AVKK und technische Quality Gates vorhanden.
- SEC-02 Least-Privilege-Härtung abgeschlossen.

### BSF-01 — DONE

- providerneutrale Systemhouse-/Customer-Scope-Baseline,
- Kundenverantwortung als Scope/Beziehung statt globale Rolle,
- Projektmanager-Leistungssicht read-only abgegrenzt,
- Teamlead-Leistungsnachweis als eigener Write-/Finalisierungs-/Audit-Scope definiert.

### BSF-02 / BSF-02C — DONE

- Customer-/Systemhouse-Domänenfundament,
- Membership-/Customer-Access-Basis,
- providerneutraler Shared-Projection-Contract,
- Shared-Projection-DDL, Grants und RLS,
- transaktionale `SECURITY INVOKER` Publish-RPC,
- realer providerneutraler Runtime Publish-/Read-Pfad,
- T01–T30 und T31–T51 einschließlich Atomic Rollback PASS,
- offizieller Supabase Security Advisor ohne neue BSF-02C-Warnung,
- vollständige Security-/CI-/E2E-/Accessibility-/Technical-Debt-/Quality-Gates PASS,
- #88 und Parent #76 geschlossen.

Gemeinsamer fachlicher Pfad:

`Systemhouse → Customer → Project → WorkPackage → Activity → Leistungserbringer`

## 4. Strategische Entwicklungsreihenfolge

### Phase 1 — BSF-02C: gemeinsamer Customer-Read-Pfad — DONE

Das Gate ist erfüllt. Die vollständige Local-First-Ablösung wurde bewusst nicht vorgezogen und bleibt BSF-04.

---

### Phase 2 — BSF-03: Kundenverantwortung und „Meine Kunden“ — AKTIV

Ziel:

Ein Systemingenieur kann für einen oder mehrere Kunden verantwortlich sein und erhält eine fachlich und technisch abgesicherte Kundensicht.

Verbindlicher Vertrag:

- eigene Entität `CustomerResponsibility`,
- `systemhouse_membership`, `customer_access` und `customer_responsibility` bleiben getrennt,
- Responsibility allein eröffnet weder Customer-Daten noch Schreibrechte,
- `Meine Kunden` ist fail-closed die Schnittmenge aus aktivem Konto, aktiver Membership, aktueller Responsibility, Customer Access >= read und `dashboard.view`,
- Sichtrecht und Schreibrecht strikt getrennt,
- Cross-Systemhouse/Cross-Customer/IDOR/BOLA DENY,
- Permission `customer.responsibility.manage` in V1 nur für Systemadministrator, Administrator und Teamlead,
- zulässige Responsibility-Ziele: Systemadministrator, Administrator, Teamlead, Projektmanager, Engineer,
- Viewer und Customer ausgeschlossen.

Aktueller Implementierungspfad:

1. **1A** Schema / RBAC / RLS / Grants / Generated Types / technische Doku.
2. **1B** R01–R18 / offizieller Security Advisor / Null-Residuen / Regression.
3. Danach Runtime/UI `Meine Kunden` und Kundendetail über den bestehenden Shared-Projection-Read-Pfad.

**Gate:** Kundenverantwortung erzeugt keine globalen Rechte; Cross-Customer bleibt DENY; vollständige Exact-Head-Abnahme PASS.

---

### Phase 3 — BSF-03D: editierbare AP-Kategorien (#103)

Bewusst vor den Leistungsauswertungen.

- systemhausweite editierbare Stammdaten,
- nicht kundenspezifisch,
- Default `keine Kategorie`,
- maximal eine Hauptkategorie pro AP,
- freie Tags bleiben separat,
- bevorzugt Reference Data `workpackage.category`,
- stabile Key-/ID-Identität,
- deaktivieren/historisieren statt Hard Delete,
- Kategorie erzwingt weder Billable, Priorität noch Status.

**Gate:** sicher pflegbar/filterbar, Cross-Systemhouse DENY, Viewer kein Write.

---

### Phase 4 — BSF-03A: Projektmanager-Leistungssicht / Controlling (#106)

- Zeitraum, Kunde, Projekt, Arbeitspaket, AP-Kategorie,
- Tätigkeiten, billable/non-billable,
- Summen und Drill-down,
- ausschließlich read-only,
- keine Teamlead-Finalisierung,
- keine Abrechnungsfreigabe,
- serverseitiger Customer-/Project-Scope.

**Gate:** vollständige read-only Auswertung innerhalb des zulässigen Scopes.

---

### Phase 5 — BSF-03B: Teamlead Leistungsnachweis V1 (#107)

- Leistungsnachweis, keine Rechnung,
- Kunde + fester Zeitraum,
- billable/non-billable gemeinsam sichtbar,
- Abrechenbarkeit vor Finalisierung kontrolliert änderbar,
- Summe abrechenbarer Zeit,
- finaler unveränderbarer Snapshot,
- Doppelverwendungsschutz,
- Audit/Korrektur-/Ersetzungsprozess,
- Kundenfassung ohne automatische Nennung des Leistungserbringers.

**Gate:** Vorbereitung, Finalisierung und Historie serverseitig reproduzierbar; finalisierte Fassung unveränderbar.

---

### Phase 6 — BSF-03E: Vertretungs- und Personensicht (#63)

- Management-Personensicht,
- Customer Responsibility, Project Responsibility und temporäre Vertretung getrennt und kombinierbar,
- Verantwortung hinzufügen, übertragen oder beenden,
- optional zeitliche Gültigkeit,
- Audit sowie RBAC/RLS,
- keine Krankheitsgründe, Diagnosen oder Gesundheitsdaten,
- keine zweite konkurrierende Responsibility-Logik.

**Gate:** gleiche Responsibility-Basis wie BSF-03; keine impliziten globalen Rechte.

---

### Phase 7 — BSF-03C: Kunden-PDF / Kundenpaket (#98)

- operative Kundensicht als PDF,
- Kunde / Zeitraum / Datenstand,
- Projekte, Arbeitspakete, Kategorien, Tätigkeiten, Status und freigegebene Leistungsinformationen,
- Datenminimierung,
- reproduzierbarer Snapshot,
- keine internen IDs/Notizen/Sicherheitsdetails,
- keine automatische Nennung des Leistungserbringers,
- später optional gemeinsames Kundenpaket mit Reportfamilie ohne Vermischung der Fachlogik.

**Gate:** belastbare Customer-/Leistungs-/Responsibility-Basis und TDF-konformes Rendering.

---

### Phase 8 — Dokumentationsblock BSF-DOC-01 bis BSF-DOC-03

#### BSF-DOC-01 — Dokumentationskonsolidierung

- Benutzerhilfe,
- technische Dokumentation,
- Entwicklungstagebuch,
- technischer Prüfbericht,
- relevante Dokumentationsdrift = 0.

#### BSF-DOC-02 — SYSING-001 fortschreiben

- Living Document im TDF-Format,
- Ist/Zielbild sauber getrennt,
- Architektur, Sicherheit, Betrieb, Customer-/Leistungssicht, Informationsflüsse und Portabilität,
- Word/PDF aus derselben führenden Quelle.

#### BSF-DOC-03 — SYSING-001 aus dem Board erreichbar

- read-only,
- keine zweite divergierende Dokumentquelle,
- klare Trennung Hilfe / Handbuch / SYSING-001.

**Gate:** Dokumentation bildet den realen Produktstand vollständig ab.

---

### Phase 9 — BSF-04: zentrale/synchronisierte Datenstrategie (#108)

Ziel:

Die minimale Shared Projection wird in eine dauerhafte Datenstrategie überführt.

Entscheidungen:

- welche Daten zentral führend sind,
- welche synchronisiert bleiben,
- Local-First-Grenze,
- Konflikt-/Staleness-/Offline-Verhalten,
- Migration bestehender Daten,
- Provideradapter,
- Backup/Restore,
- stabile IDs/AVKK,
- Docker-/On-Premises-Fähigkeit als Architekturziel.

**Gate:** stabile kanonische Persistenzstrategie für reale Mehrbenutzernutzung.

---

### Phase 10 — BSF-04A: Vorlagen und wiederkehrende AP/Tätigkeiten (#102)

Stufe 1 Vorlagenbibliothek:

- Tätigkeitstemplates,
- AP-Templates,
- optionale Customer-/Projekt-/Kategorie-Defaults,
- Vorlage = Vorschlag,
- editierbare Vorschau,
- echte Instanzen erhalten neue IDs,
- Template-Änderungen wirken nie rückwirkend.

Stufe 2 Serien:

- Zeitzone,
- Start-/Enddatum,
- begrenzter Erzeugungshorizont,
- Vorkommen verschiebbar/überspringbar,
- idempotent, keine Dubletten,
- keine automatische Ist-Leistung/Finalisierung/Abrechnung,
- Scheduler später Docker-/On-Premises-fähig.

**Gate:** Vorschlag → editierbare Vorschau → bewusste Instanziierung; Serien idempotent.

---

### Phase 11 — BSF-05: Canonical Import Model und SharePoint-Vertrag

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`

- partielle Quelldaten zulassen,
- keine erfundenen Defaults,
- stabile Quell-IDs,
- Provenienz/Freshness,
- sichere Customer-Mappings,
- Idempotenz,
- READ/SYNC zuerst,
- SharePoint ist mögliche Quelle, nicht Fachmodell.

**Gate:** wiederholbarer Import ohne stille Cross-Customer-/Cross-Systemhouse-Zusammenführung.

---

### Phase 12 — BSF-06: Betreiberhoheit und Docker

Ziel:

Nachweis, dass das Produkt unabhängig von Lovable Cloud betrieben und sauber installiert werden kann.

Umfang:

- Docker-Container bzw. dokumentierter Container-Stack,
- Supabase/Postgres-Portabilität,
- Backup/Restore,
- sichere Runtime-Konfiguration und Secrets,
- Betriebs- und Installationsdokumentation,
- reproduzierbarer Setup-/Update-/Restore-Pfad,
- Exit-/Migrationspfad,
- Vorbereitung Azure SQL / Azure Storage / Entra ID.

**Gate:** autonomer Unternehmensbetrieb technisch nachgewiesen.

Damit ist **BSF-06 der strategische Installierbarkeits-Meilenstein** für Self-Hosting/On-Premises. Browserbasierte Nutzung auf verschiedenen Endgeräten ist früher möglich, aber noch kein nachgewiesener autonomer Installationsbetrieb.

---

### Phase 13 — BSF-07: Managementcockpit 2

Rollenbezogene Führungs- und Arbeitssichten für Systemingenieur, Kundenverantwortliche, Projektmanager, Teamlead und Administration/Führung.

**Gate:** read/write klar getrennt und serverseitig autorisiert.

---

### Phase 14 — BSF-09: Reporting 2

- PDF,
- JSON/CSV,
- ggf. Excel,
- definierte Reportverträge,
- Snapshot/Provenienz,
- AP-Kategorie als Auswertungsdimension,
- providerneutraler Reportvertrag.

**Gate:** reproduzierbare portable Reporting-Baseline.

---

### Phase 15 — BSF-10: NAVIS / KI-/Agenten-Labor

- isoliertes read-only Lern-/Demolabor,
- Mock-/Demodaten oder klar kontrollierte read-only Quellen,
- Human-in-the-loop,
- keine autonomen produktiven Aktionen,
- Evidence/Provenance,
- providerneutraler Tool-/Agentenvertrag.

**Gate:** vertrauenswürdige read-only Demonstration ohne Produktivautonomie.

---

### Phase 16 — BSF-FINAL

Gesamtprüfung:

- Authentifizierung,
- RBAC,
- RLS,
- Supabase/Datenbank,
- Customer-/Leistungsmodell,
- Kategorien/Templates soweit umgesetzt,
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

Vor produktiver externer Integration:

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

- AP-Kategorie = kontrollierte fachliche Hauptklassifikation.
- Tags = freie Mehrfachverschlagwortung.
- Template = Vorschlag zur Erzeugung echter Instanzen.

### 5.2 Planned != Actual

Geplante Zeiten aus Vorlagen oder AP-Schätzungen sind keine erbrachten Leistungen.

### 5.3 Kategorie != Billing

Kategorie bestimmt nicht automatisch billable/non-billable, Priorität, Status oder Finalisierung.

### 5.4 Keine rückwirkende Template-Wirkung

Änderungen an Templates/Kategorien verändern bereits gespeicherte AP-/Activity-Instanzen nicht still rückwirkend.

## 6. Empfohlener roter Faden

```text
BSF-02C Shared Read — DONE
  -> BSF-03 Meine Kunden — AKTIV
  -> BSF-03D AP-Kategorien
  -> BSF-03A PM-Controlling
  -> BSF-03B Leistungsnachweis
  -> BSF-03E Vertretungs-/Personensicht
  -> BSF-03C Kunden-PDF
  -> Dokumentationsblock
  -> BSF-04 zentrale/synchronisierte Datenstrategie
  -> BSF-04A Templates + Wiederholungen
  -> BSF-05 Import/SharePoint
  -> BSF-06 Docker/Betreiberhoheit / Installierbarkeit
  -> BSF-07 Managementcockpit 2
  -> BSF-09 Reporting 2
  -> BSF-10 NAVIS / Agenten-Labor
  -> BSF-FINAL
  -> Integration Readiness
  -> produktive Integrationen/Automation
```

## 7. Installierbarkeit und Endgeräte

Es gelten zwei unterschiedliche Reifegrade:

1. **Browserbasierte Nutzung auf verschiedenen Endgeräten** kann bereits vor BSF-06 möglich sein, solange die zentrale veröffentlichte Umgebung erreichbar ist. Das umfasst typischerweise Desktop, Notebook, Tablet und Smartphone mit geeignetem Browser.
2. **Saubere autonome Installation / Self-Hosting** ist erst mit dem Gate von **BSF-06** strategisch nachgewiesen. Erst dann sollen Installation, Konfiguration, Containerbetrieb, Backup/Restore, Updates und Exit-Pfad unabhängig von Lovable Cloud reproduzierbar dokumentiert und getestet sein.

Für einen belastbaren produktiven Multi-Device-Betrieb ist zusätzlich die stabile zentrale/synchronisierte Datenstrategie aus **BSF-04** eine wesentliche Voraussetzung.

## 8. Priorisierungsregel bei neuen Ideen

Neue Ideen werden anhand von fünf Fragen eingeordnet:

1. Welchen realen Nutzwert bringt die Funktion?
2. Welche bestehende Daten-/Security-Basis benötigt sie?
3. Würde eine frühe Umsetzung später Migration/Sonderlogik erzeugen?
4. Muss sie vor einer späteren Sicht/Reportfunktion vorhanden sein?
5. Ist sie Fachlogik, Plattformlogik, Integration oder Komfortfunktion?

Eine neue Idee verdrängt die aktuelle Implementierung nur, wenn sie ein echter Blocker oder eine notwendige Vorbedingung des nächsten Schritts ist.

## 9. Abschlussregel

Nach jedem vollständig abgeschlossenen strategischen Punkt wird dieser Gesamtplan auf Drift geprüft. Änderungen der Reihenfolge werden ausdrücklich begründet und über PR dokumentiert; historische Entscheidungen werden nicht still überschrieben.
