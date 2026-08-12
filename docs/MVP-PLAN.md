# Sysing Dashboard — MVP-Plan und Abnahmestrategie

Stand: 2026-08-12

## 1. Ziel

Der MVP ist erreicht, wenn das Sysing Dashboard ohne Azure-, Entra-ID- oder Microsoft-Graph-Anbindung als vollständig nutzbare Supabase-basierte Anwendung betrieben werden kann.

Nicht MVP-blockierend sind Microsoft Graph, Outlook-/SharePoint-Integration, Entra ID, Azure SQL, Azure Table Storage und KI-Agenten. Diese Themen beginnen nach der MVP-Freigabe.

## 2. MVP-Mindestumfang

Der MVP umfasst mindestens:

- produktive Supabase-Nutzung,
- reales Benutzerkonto und Profile,
- Authentifizierung, Sessionmanagement und automatische Abmeldung,
- RBAC und RLS,
- Tätigkeiten, Arbeitspakete und Projekte,
- AVKK mit Aufgabe, Verantwortung, Kompetenz und Konsequenz,
- AVKK-Reference-Data in Supabase,
- persönlicher AVKK-Arbeitsplatz,
- Kontext- und Frühwarnindikatoren in der für den MVP freigegebenen Ausprägung,
- AVKK-Management-Cockpit inklusive verständlicher Erklärung des AVKK-Modells,
- Backup/Restore mit Manifest 2.0,
- Auditierung,
- konfigurierbarer Report-Service,
- PDF-, Druck- und Exportfunktionen,
- Corporate Document Templates über einen konfigurierbaren Template-Provider,
- technischer Prüfbericht, Entwicklungstagebuch und Project Manifest,
- vollständige Benutzer-, Administrator- und Betriebsdokumentation,
- TDF-konforme Produktübersicht `SYSING-001`, die Idee, Funktionen, Nutzen, Schnittstellen, Automatisierung, Architektur, Grenzen und Weiterentwicklung des Sysing Dashboards verständlich zusammenfasst.

## 3. Geplanter Weg bis MVP

| Sprint | Schwerpunkt | MVP-Beitrag |
| --- | --- | --- |
| 07B | AVKK-Datenbank, Reference Data, Services, RBAC/RLS | Fachliche Datenbasis |
| 08 | Persönlicher AVKK-Arbeitsplatz | Operative Nutzung |
| 08B | AVKK Backup/Restore-Prüfung und JSON-Export | Datenportabilität und Integrität |
| 09 | Rollenbasiertes AVKK-Management-Cockpit und Systemhaus-Demo-Daten | Führungssicht und manuelle fachliche Abnahme |
| 09A | Report-Service, PDF/Word/Druck, Corporate Templates | Reporting und Ausgabe; erste veröffentlichungsfähige SYSING-001-Ausgabe vorbereiten |
| 09B | MVP-Gesamttest, TDF-Produktübersicht finalisieren und Release Candidate | Systemweite Abnahme und Produkt-/Managementdokumentation |
| 09C | Optionales Hardening | Nur Findings aus 09B, falls erforderlich |

## 3.1 TDF-Produktübersicht SYSING-001

Bis zur MVP-Freigabe wird das Dokument

`docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.1.0.md`

als Living Document gepflegt.

Zweck: Eine verständliche, management- und produktorientierte Gesamtdarstellung des Sysing Dashboards, die technische Detaildokumente nicht ersetzt, sondern deren wesentliche Aussagen zusammenführt.

Pflichtinhalte:

- Ausgangsidee und Problemstellung,
- Zielgruppen und Rollen,
- Kernfunktionen,
- AVKK-Konzept,
- persönliche, Projekt- und Managementsichten,
- Nutzen und Vorteile je Rolle,
- Architekturprinzipien,
- Sicherheit, RBAC und RLS auf verständlicher Ebene,
- Backup, Portabilität und Nachweise,
- Reporting und Dokumentausgabe,
- aktuelle und geplante Schnittstellen,
- Microsoft-Graph-/E-Mail-Zielbild nach MVP,
- Automatisierungsstufen von deterministischen Regeln über KI-Copilot bis zu kontrollierten Agenten,
- Systemhaus-Demo- und Testkonzept,
- bekannte Grenzen und Risiken,
- Entwicklungsweg und Post-MVP-Roadmap.

Das Dokument folgt den relevanten TDF-Standards, insbesondere Dokumentbenennung und SemVer, Managementdarstellung, Architektur, Visualisierung, Rendering/Publishing, Export und AI/Retrieval Readiness.

### Pflegepflicht nach Sprint 09

Nach Sprint 09 werden mindestens aktualisiert:

- tatsächlich implementierte Rollensichten,
- Managementkennzahlen,
- Drill-down,
- Systemhaus-Demo-Szenarien,
- Kontextindikatorstatus,
- MVP-Reifegrad.

### Pflegepflicht nach Sprint 09A

Nach Sprint 09A werden mindestens aktualisiert:

- produktive Reportformate,
- Template-Provider,
- Corporate Document Templates,
- PDF-/Word-/Druckarchitektur,
- Exportmöglichkeiten,
- veröffentlichungsfähige TDF-Ausgabevorbereitung.

### Pflicht in Sprint 09B

Vor MVP-Freigabe:

1. Produktübersicht gegen den tatsächlichen Release Candidate prüfen.
2. Jede Aussage als `umgesetzt`, `geplant/post-MVP` oder `bekannte Grenze` korrekt einordnen.
3. Versions- und Statusangaben synchronisieren.
4. TDF-Qualitätsgates anwenden.
5. Aus derselben freigegebenen Quelle mindestens eine PDF-Fassung erzeugen; Word zusätzlich, wenn der Report-/Dokumentenservice dies im MVP unterstützt.
6. PDF/Word visuell prüfen.
7. Datei- und Dokumentversion gemäß TDF synchronisieren.
8. Produktübersicht als Bestandteil des MVP-Abnahmepakets referenzieren.

Die Produktübersicht wird damit ein verbindliches MVP-Artefakt und bleibt nach MVP als fortlaufende Produkt- und Managementdokumentation bestehen.

## 4. Sprint 09B — MVP-Gesamttest und Release Candidate

Sprint 09B entwickelt keine neuen Fachfunktionen. Er prüft die gesamte Anwendung als integriertes System und erstellt die MVP-Freigabeempfehlung.

### 4.1 UI-Gesamttest

Vollständig prüfen:

- Seiten, Ansichten und Navigation,
- Menüs und Servicemenüs,
- Dialoge,
- Formulare und Validierungen,
- Tabellen,
- Tabs,
- Filter und Suche,
- Buttons und Aktionen,
- Tooltips und Hilfetexte,
- Lade-, Fehler- und Empty-States,
- Desktop, Tablet und Smartphone,
- helle und dunkle Darstellung,
- Tastaturbedienung und Fokusführung.

### 4.2 Authentifizierung und Sicherheit

Prüfen:

- Login und Fehlversuche,
- Passwort-Reset,
- Reload und Session-Wiederherstellung,
- automatische und manuelle Abmeldung,
- mehrere Tabs,
- gesperrte Benutzer,
- Rollen- und Berechtigungswechsel,
- direkte URL-Aufrufe,
- RBAC und RLS,
- administrative Funktionen,
- keine Secrets oder sensitiven Sitzungsdaten in Client, Logs oder Reports.

### 4.3 AVKK und Kontextindikatoren

End-to-End prüfen:

- Aufgabe bzw. Subject auswählen oder anlegen,
- Verantwortung zuordnen,
- Kompetenz bewerten,
- Konsequenz bewerten,
- Reference Data laden und anwenden,
- Historie und Audit,
- persönliche Arbeitsansicht,
- Managementansicht,
- Kontextindikatoren und deren Berechtigungen,
- Datenschutzgrenzen und keine automatisierte personenbezogene Leistungsbewertung.

### 4.4 PDF, Druck und Dokumentvorlagen

Alle produktiven Pflichtberichte erzeugen und visuell prüfen:

- vollständiger Inhalt,
- Corporate Document Templates,
- Deckblatt, Kopf- und Fußzeilen,
- Tabellen und Seitenumbrüche,
- Seitenzahlen,
- Sonderzeichen,
- lange Texte,
- leere Datenmengen,
- große Datenmengen,
- Druckvorschau,
- keine abgeschnittenen oder überlappenden Inhalte,
- finale TDF-Produktübersicht SYSING-001.

Der Template-Speicherort darf nicht als lokaler Windows-Pfad in der Fachlogik hardcodiert sein. Der Report-Service verwendet einen konfigurierbaren Template-Provider.

### 4.5 Exporte

Mindestens die bis dahin als produktiv freigegebenen Formate prüfen:

- PDF,
- CSV,
- JSON,
- Word, sofern in Sprint 09A produktiv umgesetzt,
- Excel, sofern in Sprint 09A produktiv umgesetzt.

Prüfkriterien: Vollständigkeit, Zeichencodierung, Dateinamen, Berechtigungen, fachliche Konsistenz und Wiederverwendbarkeit.

### 4.6 Backup und Restore

Prüfen:

- Backup erzeugen,
- Manifest 2.0,
- Restore-Prüfung und Quarantäne-Vertrag,
- Altformat-Kompatibilität,
- beschädigtes Backup,
- Prüfsummenfehler,
- AVKK-Daten,
- Reference Data,
- Kontextdaten, sofern MVP-Bestandteil,
- kein stiller Teilzustand bei Fehlern.

Die bekannte Grenze, dass AVKK-Restore aktuell bewusst nicht automatisch in Supabase zurückschreibt, muss vor MVP als GO/NO-GO-Entscheidung explizit bewertet werden.

### 4.7 Reporting und fachliche Plausibilität

Nicht nur technische Ausgabe prüfen, sondern auch:

- stimmen Kennzahlen und Summen,
- stimmen Filter und Gruppierungen,
- stimmen AVKK-Werte zwischen UI, Datenbank und Report,
- sind Managementaussagen nachvollziehbar,
- werden fehlende Kompetenzen und kritische Konsequenzen korrekt dargestellt,
- werden Kontextindikatoren fachlich getrennt von AVKK, aber gemeinsam auswertbar behandelt.

## 5. MVP-Abnahmebericht

Sprint 09B erzeugt:

`docs/MVP-ACCEPTANCE-REPORT.md`

Der Bericht enthält mindestens:

- getestete Version,
- Testdatum und Testumgebungen,
- getestete Rollen,
- Anzahl automatisierter Tests,
- Anzahl E2E-/UI-Tests,
- UI-Teststatus,
- Auth-/Sessionstatus,
- AVKK-Teststatus,
- Kontextindikatorstatus,
- PDF-/Druckstatus,
- Exportstatus,
- Backup-/Restorestatus,
- RBAC-/RLS-Status,
- Status und Version der TDF-Produktübersicht SYSING-001,
- bekannte Einschränkungen,
- Findings nach Schweregrad,
- Empfehlungen,
- Freigabeentscheidung.

Freigabestatus:

- **GO** — MVP freigegeben.
- **GO WITH FINDINGS** — MVP nutzbar; nicht blockierende Restpunkte sind dokumentiert und terminiert.
- **NO-GO** — mindestens ein blockierender Fehler verhindert die Freigabe.

## 6. Mindestbedingungen für MVP-Freigabe

- 0 offene Critical Findings,
- 0 offene Blocker,
- keine bekannten Datenverlustfehler,
- keine offenen Auth-/RLS-Sicherheitslücken,
- keine fehlerhaften Pflichtreports,
- Backup/Restore-Vertrag verifiziert und bekannte Restore-Grenzen explizit freigegeben oder behoben,
- alle Kern-User-Journeys erfolgreich,
- alle verpflichtenden Quality Gates grün,
- SYSING-001 inhaltlich mit dem Release Candidate synchron und als TDF-konforme PDF-Fassung geprüft.

Medium- und Low-Findings dürfen nur mit dokumentierter Bewertung, Verantwortlichkeit und Zieltermin übernommen werden.

## 7. Reifegrad- und MVP-Statusbericht nach jedem Sprint-Prompt

Nach jedem Sprintabschluss wird zusätzlich zum technischen Abschlussbericht ein kompakter Managementstatus erstellt.

Pflichtformat:

```text
Projektphase:
Aktueller Reifegrad: <Schätzung in %>
MVP-Ziel: vollständig funktionsfähiges Sysing Dashboard auf Supabase ohne Azure/MS Graph
Dieser Sprint: abgeschlossen | teilweise | blockiert
Wesentliche Fortschritte:
- ...
Offene MVP-Themen:
- ...
Kritische Risiken:
- ...
Geschätzte verbleibende Prompts bis MVP: <Zahl oder Bandbreite>
Nächster Sprint: <ID und Titel>
MVP-Prognose: im Plan | gefährdet | blockiert
```

Der Reifegrad ist eine konsistente Managementschätzung und keine mathematisch exakte Kennzahl. Er muss durch die noch offenen MVP-Funktionsblöcke und Risiken begründet sein.

## 8. Post-MVP

Nach erfolgreicher MVP-Freigabe beginnt die Integrationsphase. Die detaillierte Planung ist in [`docs/POST-MVP-PLAN.md`](./POST-MVP-PLAN.md) festgehalten.

Priorität 1 ist die benutzerbezogene Auswertung eingehender Microsoft-365-E-Mails über Microsoft Graph. Eine erkannte Nachricht erzeugt zunächst ausschließlich einen `TaskCandidate`; ein produktives Arbeitspaket entsteht erst nach ausdrücklicher Benutzerprüfung und -bestätigung.

Geplante erste Post-MVP-Sprints:

| Sprint | Schwerpunkt |
| --- | --- |
| 10A | Microsoft Graph Basis, delegierter persönlicher Mailzugriff und Provider-Abstraktion |
| 10B | Mail-Ingestion, Delta-Synchronisation, deterministische Erkennung und TaskCandidate |
| 10C | Dashboard „Aufgabenvorschläge“, Benutzerprüfung, Arbeitspaket- und AVKK-Übernahme |
| 10D | Automatisierung, optionale Change Notifications, Recovery und Gesamttest |

Danach folgen als getrennte Integrations- und Enterprise-Ausbaustufen insbesondere:

- kontrollierter E-Mail-Ausgang mit Vorlagen und Benutzerfreigabe,
- SharePoint-Verknüpfung,
- Kalenderintegration,
- optionale KI-gestützte Mail-/Aufgabenextraktion,
- KI-Copilot mit READ/PROPOSE,
- später kontrollierte Agentenaktionen,
- Microsoft Entra ID als Dashboard-Identitätsprovider,
- Azure SQL,
- Azure Table Storage,
- erweiterter Container-/Enterprise-Betrieb.

Die Graph-Mail-Integration darf die bestehende Provider-Trennung nicht aufheben. Die Supabase-basierte MVP-Authentifizierung bleibt zunächst bestehen; Microsoft OAuth wird für Graph als separater Integrationskontext behandelt.
