# Sysing Dashboard — MVP-Plan und Abnahmestrategie

Stand: 2026-08-10

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
- vollständige Benutzer-, Administrator- und Betriebsdokumentation.

## 3. Geplanter Weg bis MVP

| Sprint | Schwerpunkt                                         | MVP-Beitrag                      |
| ------ | --------------------------------------------------- | -------------------------------- |
| 07B    | AVKK-Datenbank, Reference Data, Services, RBAC/RLS  | Fachliche Datenbasis             |
| 08     | Persönlicher AVKK-Arbeitsplatz                      | Operative Nutzung                |
| 08A    | Kontext- und Frühwarnindikatoren                    | Weiche Faktoren und Risikosicht  |
| 09     | AVKK-Management-Cockpit                             | Führungssicht und AVKK-Erklärung |
| 09A    | Report-Service, PDF/Word/Druck, Corporate Templates | Reporting und Ausgabe            |
| 09B    | MVP-Gesamttest und Release Candidate                | Systemweite Abnahme              |

Planungsbasis: sechs weitere größere Prompts ab Abschluss von Sprint 07A. Realistische Bandbreite: fünf bis sieben, abhängig vom Umfang der fachlichen UI und der Integrationsbefunde.

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
- keine abgeschnittenen oder überlappenden Inhalte.

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
- Restore,
- Altformat-Kompatibilität,
- beschädigtes Backup,
- Prüfsummenfehler,
- AVKK-Daten,
- Reference Data,
- Kontextdaten,
- Restore nach Änderungen,
- kein Teilzustand bei Fehlern.

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
- Backup/Restore verifiziert,
- alle Kern-User-Journeys erfolgreich,
- alle verpflichtenden Quality Gates grün.

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

Ausgangsschätzung nach Sprint 07A: etwa 65–70 % Reifegrad und rund sechs verbleibende größere Prompts bis zur MVP-Abnahme.

## 8. Post-MVP

Nach erfolgreichem Sprint 09B beginnt die Integrationsphase. Die detaillierte Planung ist in [`docs/POST-MVP-PLAN.md`](./POST-MVP-PLAN.md) festgehalten.

Priorität 1 ist die benutzerbezogene Auswertung eingehender Microsoft-365-E-Mails über Microsoft Graph. Eine erkannte Nachricht erzeugt zunächst ausschließlich einen `TaskCandidate`; ein produktives Arbeitspaket entsteht erst nach ausdrücklicher Benutzerprüfung und -bestätigung.

Geplante erste Post-MVP-Sprints:

| Sprint | Schwerpunkt                                                                          |
| ------ | ------------------------------------------------------------------------------------ |
| 10A    | Microsoft Graph Basis, delegierter persönlicher Mailzugriff und Provider-Abstraktion |
| 10B    | Mail-Ingestion, Delta-Synchronisation, deterministische Erkennung und TaskCandidate  |
| 10C    | Dashboard „Aufgabenvorschläge“, Benutzerprüfung, Arbeitspaket- und AVKK-Übernahme    |
| 10D    | Automatisierung, optionale Change Notifications, Recovery und Gesamttest             |

Danach folgen als getrennte Integrations- und Enterprise-Ausbaustufen insbesondere:

- SharePoint-Verknüpfung,
- Kalenderintegration,
- optionale KI-gestützte Mail-/Aufgabenextraktion,
- Microsoft Entra ID als Dashboard-Identitätsprovider,
- Azure SQL,
- Azure Table Storage,
- erweiterter Container-/Enterprise-Betrieb.

Die Graph-Mail-Integration darf die bestehende Provider-Trennung nicht aufheben. Die Supabase-basierte MVP-Authentifizierung bleibt zunächst bestehen; Microsoft OAuth wird für Graph als separater Integrationskontext behandelt.
