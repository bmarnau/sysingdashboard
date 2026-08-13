# Sysing Dashboard — MVP-Plan und Abnahmestrategie

Stand: 2026-08-13

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
- TDF-konforme Produktübersicht `SYSING-001`, die Idee, Funktionen, Nutzen, Schnittstellen, Automatisierung, Architektur, Grenzen und Weiterentwicklung des Sysing Dashboards verständlich zusammenfasst,
- vollständige Prüfung des ADR-Bestands auf Aktualität, offene Architekturentscheidungen, bekannte Kompromisse und noch zu treffende MVP-/Post-MVP-Entscheidungen,
- einen vollständigen, reproduzierbaren und vollständig fiktiven Systemhaus-Demo-Datensatz als verbindliches MVP-Abnahmeartefakt.

## 3. Geplanter Weg bis MVP

| Sprint | Schwerpunkt                                                                                                         | MVP-Beitrag                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 07B    | AVKK-Datenbank, Reference Data, Services, RBAC/RLS                                                                  | Fachliche Datenbasis                                                                |
| 08     | Persönlicher AVKK-Arbeitsplatz                                                                                      | Operative Nutzung                                                                   |
| 08B    | AVKK Backup/Restore-Prüfung und JSON-Export                                                                         | Datenportabilität und Integrität                                                    |
| 09     | Rollenbasiertes AVKK-Management-Cockpit                                                                             | Führungssicht und manuelle fachliche Abnahme                                        |
| 09A    | Report-Service, PDF/Word/Druck, Corporate Templates; Demo-Datensatz für Reporting vorbereiten                       | Reporting und Ausgabe; erste veröffentlichungsfähige SYSING-001-Ausgabe vorbereiten |
| 09B    | MVP-Gesamttest mit vollständigem Systemhaus-Demo-Datensatz, TDF-Produktübersicht finalisieren und Release Candidate | Systemweite Abnahme, ADR-Review und Produkt-/Managementdokumentation                |
| 09C    | Optionales Hardening                                                                                                | Nur Findings aus 09B, falls erforderlich                                            |

## 3.1 TDF-Produktübersicht SYSING-001

Bis zur MVP-Freigabe wird das Dokument

`docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md`

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

## 3.2 ADR-Review als verbindlicher MVP-Prüfpunkt

Architecture Decision Records (ADR) sind vor der MVP-Freigabe als eigener Prüfschritt zu betrachten. Ziel ist nicht, vorhandene ADRs nachträglich umzuschreiben, sondern sicherzustellen, dass die tatsächlich gültigen Architekturentscheidungen, bewussten Kompromisse und offenen Entscheidungen nachvollziehbar dokumentiert sind.

Spätestens in Sprint 09B ist der gesamte ADR-Bestand zu prüfen auf Aktualität, Widersprüche, ersetzte Entscheidungen, offene Architekturentscheidungen, accepted Findings, Provider-Trennung, Rollen-/Scope-Modell, Kontextindikatoren, Reporting/TDF, Restore-/Quarantäne-Vertrag sowie bereits festgelegte Post-MVP-Integrationsentscheidungen.

Wenn eine wesentliche langfristige Architekturentscheidung noch nicht als ADR dokumentiert ist, wird vor MVP-Freigabe ein ADR angelegt. Reine Implementierungsdetails benötigen keinen eigenen ADR.

## 3.2.1 Release-Candidate-Scope

Für den Release Candidate gilt folgender festgeschriebener Umfang:

- **Enthalten**: AVKK-Arbeitsplatz, Führungssicht, Reporting (PDF, Druck, JSON, CSV, Word), Backup/Restore 2.0, JSON-Import/-Export, RBAC mit sieben Rollen, Systemstatus, Handbuch, Demo-Datensatz.
- **Bewusst nicht enthalten**: Excel-Ausgabe, produktive Azure-DevOps-Synchronisation, Mehrsprachigkeit über Deutsch hinaus.
- **Bekannte Grenze**: Eingespielte AVKK-Demofälle lassen sich nur stilllegen, nicht löschen (ADR-0026). Vorführungen gehören deshalb in eine Demo- oder Entwicklungsinstanz, nicht in eine Produktivinstanz.

## 3.3 Systemhaus-Demo-Datensatz als verbindliches MVP-Abnahmeartefakt

Vor MVP-Freigabe muss ein vollständiger, reproduzierbarer Beispieldatensatz verfügbar sein, mit dem die wesentlichen Funktionen des Sysing Dashboards fachlich und technisch manuell überprüft werden können.

Der Datensatz ist kein loses Bündel einzelner Demo-Einträge, sondern ein zusammenhängendes fiktives Systemhaus-Szenario mit konsistenten Beziehungen zwischen Kunden, Projekten, Arbeitspaketen, Tätigkeiten, Verantwortungen und AVKK-Daten.

### Mindestinhalt

Der Datensatz enthält mindestens:

- mehrere vollständig fiktive Kunden,
- mehrere Projekte unterschiedlicher Größe und Lage,
- zugehörige Arbeitspakete,
- zugehörige Tätigkeiten,
- unterschiedliche Bearbeitungs- und Terminstatus,
- Rollen- und Verantwortungszuordnungen,
- vollständige AVKK-Beispiele,
- Reference-Data-Bezüge,
- mindestens einen vollständig unkritischen Fall,
- mindestens ein gefährdetes Projekt bzw. Arbeitspaket,
- mindestens einen kritischen Fall,
- überfällige und bald fällige Tätigkeiten,
- Beispiele für fehlende Zeit,
- fehlendes Material,
- fehlende Berechtigung,
- fehlende Information,
- teilweise vorhandene Unterstützung,
- hohe Kundenkonsequenz,
- hohe Projekt- oder Terminwirkung,
- geeignete Historien-/Auditzustände, soweit dies für die jeweilige Abnahme fachlich erforderlich ist.

Geeignete Szenarien sind beispielsweise Microsoft-365-Rollout, Firewall-/Netzwerk-Erneuerung, Infrastrukturmigration, Backup-/Restore-Projekt sowie Server-/Storage-Migration.

### Rollensichten

Derselbe fachliche Datenbestand muss mindestens aus folgenden Perspektiven prüfbar sein:

- **Systemingenieur:** eigene Projekte, Arbeitspakete und Tätigkeiten nach Dringlichkeit und Handlungsbedarf,
- **Projektmanager:** zugeordnete Projekte mit Planstatus, Risiken und Drill-down,
- **Geschäftsführer:** verdichtete Portfolio-/Unternehmenssicht,
- **App-Entwickler/Admin:** Role Preview der vorgesehenen Rollendarstellungen innerhalb des realen Berechtigungsscopes,
- **Benutzer ohne Berechtigung:** negativer Zugriffstest.

### Technische Anforderungen

Der Datensatz muss:

- deterministisch bzw. nachvollziehbar erzeugbar sein,
- eindeutig als Demo/Test gekennzeichnet sein,
- wiederholt eingespielt werden können,
- vollständig und kontrolliert entfernt bzw. zurückgesetzt werden können,
- RBAC und RLS respektieren,
- keine produktiven Daten überschreiben oder löschen,
- keine realen Kunden-, Mitarbeiter-, E-Mail-, Vertrags-, Zugangs- oder Unternehmensdaten enthalten,
- keine Secrets, Tokens oder Schlüssel enthalten.

Bevorzugt wird ein versionierter Seed-/Fixture-Mechanismus oder ein vergleichbar kontrollierter Testdatenpfad. Komponentenbezogene Ad-hoc-Testdaten im Frontend sind kein Ersatz.

### Nutzung in Sprint 09A

Der Datensatz soll in Sprint 09A bereits als Referenz für Reports, PDF-/Word-/Druckausgaben, JSON-/CSV-Exporte und Corporate Templates verwendet bzw. dafür vorbereitet werden. Damit werden nicht nur technische Dateien, sondern fachlich nachvollziehbare Systemhaus-Fälle ausgegeben.

### Verbindliche Nutzung in Sprint 09B

In Sprint 09B wird der vollständige Datensatz als gemeinsame Grundlage des MVP-Gesamttests verwendet. Mindestens zu prüfen sind:

1. Rollensichten und Scopes,
2. Navigation und Drill-down,
3. Filter und Sortierung,
4. AVKK-Erfassung und -Auswertung,
5. Managementkennzahlen,
6. Handlungsbedarf und Gefährdungslogik,
7. Reports und Exporte,
8. PDF-/Druck-/ggf. Word-Ausgaben,
9. Backup-/Restore-Vertrag,
10. RBAC/RLS,
11. Role Preview ohne Rechteausweitung,
12. fachliche Konsistenz derselben Fälle zwischen UI, Datenbank, Managementsicht und Ausgabe.

Der MVP-Abnahmebericht dokumentiert die verwendete Demo-Datensatz-Version und die damit ausgeführten manuellen Tests.

## 4. Sprint 09B — MVP-Gesamttest und Release Candidate

Sprint 09B entwickelt keine neuen Fachfunktionen. Er prüft die gesamte Anwendung als integriertes System und erstellt die MVP-Freigabeempfehlung.

### 4.1 UI-Gesamttest

Vollständig mit dem definierten Systemhaus-Demo-Datensatz prüfen:

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
- Kontextindikatoren entsprechend dem tatsächlich freigegebenen MVP-Status,
- Datenschutzgrenzen und keine automatisierte personenbezogene Leistungsbewertung.

### 4.4 PDF, Druck und Dokumentvorlagen

Alle produktiven Pflichtberichte mit fachlich repräsentativen Demo-Fällen erzeugen und visuell prüfen:

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

Mindestens die bis dahin als produktiv freigegebenen Formate mit dem Demo-Datensatz prüfen:

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

Nicht nur technische Ausgabe prüfen, sondern anhand derselben Demo-Fälle auch:

- stimmen Kennzahlen und Summen,
- stimmen Filter und Gruppierungen,
- stimmen AVKK-Werte zwischen UI, Datenbank und Report,
- sind Managementaussagen nachvollziehbar,
- werden fehlende Kompetenzen und kritische Konsequenzen korrekt dargestellt,
- werden Kontextindikatoren fachlich getrennt von AVKK behandelt.

### 4.8 ADR-Review

Den definierten ADR-Review vollständig durchführen und das Ergebnis im MVP-Abnahmebericht referenzieren. Offene Architekturentscheidungen mit möglicher MVP-Auswirkung dürfen nicht stillschweigend in die Post-MVP-Phase verschoben werden.

## 5. MVP-Abnahmebericht

Sprint 09B erzeugt:

`docs/MVP-ACCEPTANCE-REPORT.md`

Der Bericht enthält mindestens:

- getestete Version,
- Testdatum und Testumgebungen,
- verwendete Version des Systemhaus-Demo-Datensatzes,
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
- ADR-Review-Status und offene Architekturentscheidungen,
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
- vollständiger Systemhaus-Demo-Datensatz reproduzierbar erzeugbar, eindeutig gekennzeichnet und kontrolliert entfernbar,
- Rollensichten und zentrale MVP-Funktionen anhand dieses Datensatzes manuell geprüft,
- ADR-Bestand geprüft und alle MVP-relevanten offenen Architekturentscheidungen entschieden oder ausdrücklich als nicht blockierend freigegeben,
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

| Sprint | Schwerpunkt                                                                          |
| ------ | ------------------------------------------------------------------------------------ |
| 10A    | Microsoft Graph Basis, delegierter persönlicher Mailzugriff und Provider-Abstraktion |
| 10B    | Mail-Ingestion, Delta-Synchronisation, deterministische Erkennung und TaskCandidate  |
| 10C    | Dashboard „Aufgabenvorschläge“, Benutzerprüfung, Arbeitspaket- und AVKK-Übernahme    |
| 10D    | Automatisierung, optionale Change Notifications, Recovery und Gesamttest             |

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
