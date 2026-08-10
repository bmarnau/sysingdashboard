# Sysing Dashboard — Post-MVP-Plan

Stand: 2026-08-10

## 1. Ziel der Post-MVP-Phase

Nach erfolgreicher MVP-Abnahme in Sprint 09B beginnt die Integrationsphase. Die erste priorisierte externe Schnittstelle ist die Auswertung eingehender Microsoft-365-E-Mails über Microsoft Graph, um daraus geprüfte Aufgabenkandidaten für das Sysing Dashboard zu erzeugen.

Grundsatz: Eine E-Mail darf niemals autonom ein produktives Arbeitspaket erzeugen. Sie erzeugt zunächst einen `TaskCandidate`. Erst nach Benutzerprüfung und ausdrücklicher Bestätigung wird daraus ein Arbeitspaket bzw. eine AVKK-Zuordnung.

Auf die sichere Eingangsintegration folgen ausgehende Kommunikation, KI-Copilot-Funktionen und erst danach kontrollierte Agentenfunktionen. Azure SQL, Azure Table Storage und die vollständige Umstellung der Dashboard-Authentifizierung auf Microsoft Entra ID bleiben davon getrennte spätere Ausbaustufen.

## 2. Warum Microsoft Graph Mail zuerst

Die Mail-Integration liefert früh sichtbaren Nutzen bei begrenztem Integrationsumfang:

- neue Aufgabenzuweisungen werden schneller sichtbar,
- vorhandene Arbeitspaket- und AVKK-Strukturen werden direkt wiederverwendet,
- der Benutzer behält die Entscheidungshoheit,
- die Schnittstelle lässt sich klar von der Fachlogik trennen,
- ausgehende Kommunikation kann später denselben Provider nutzen,
- SharePoint- und Kalenderintegration können auf derselben Providerbasis aufsetzen.

Die erste Ausbaustufe soll benutzerbezogen arbeiten: Der angemeldete Benutzer autorisiert den Zugriff auf sein eigenes Microsoft-365-Postfach. Eine tenantweite oder zentrale Postfachüberwachung ist nicht Bestandteil der ersten Graph-Sprints.

## 3. Zielarchitektur Eingang

```text
Microsoft-365-Postfach
        ↓
Microsoft Graph
        ↓
GraphMailProvider
        ↓
MailIngestionService
        ↓
TaskCandidateService
        ↓
TaskCandidate
        ↓
Dashboard: Aufgabenvorschläge
        ↓
Benutzer prüft / ergänzt / verwirft
        ↓
WorkPackageService + AvkkService
        ↓
Supabase + Audit
```

Verbindliche Trennung:

- `GraphMailProvider` kennt OAuth, Graph-Endpunkte, Paging, Delta-Links und Graph-Fehler.
- `MailIngestionService` normalisiert Nachrichten und verhindert Dubletten.
- `TaskCandidateService` interpretiert Nachrichten fachlich und erzeugt neutrale Entwürfe.
- `WorkPackageService` und `AvkkService` übernehmen ausschließlich vom Benutzer bestätigte Entwürfe.
- React-Komponenten greifen nicht direkt auf Microsoft Graph zu.

## 4. Microsoft-Identität und Berechtigungsmodell

Die Graph-Anbindung ist nicht gleichbedeutend mit einer Migration der Dashboard-Anmeldung von Supabase zu Entra ID.

Für die erste Ausbaustufe wird ein separater Microsoft-Identitäts-/OAuth-Kontext vorgesehen. Ziel ist delegierter Zugriff im Namen des angemeldeten Benutzers.

Stand der Microsoft-Dokumentation zum Planungszeitpunkt 2026-08-10:

- Microsoft Graph unterstützt für Nachrichten Delta-Abfragen pro Mailfolder.
- Für delegierte Mailzugriffe ist `Mail.ReadBasic` die geringste Berechtigung für bestimmte Leseoperationen; für Change Notifications auf Nachrichten wird `Mail.Read` benötigt.
- Delegierte Outlook-Subscriptions beziehen sich auf Ordner im Postfach des angemeldeten Benutzers.
- Application Permissions ermöglichen tenantweiten bzw. benutzerunabhängigen Zugriff, erfordern aber Admin-Consent und werden für die erste Ausbaustufe nicht bevorzugt.

Leitprinzip: Least Privilege. Die tatsächlich erforderlichen Scopes werden pro Sprint anhand der konkret genutzten Graph-Operationen nochmals gegen die aktuelle Microsoft-Dokumentation geprüft. Für ausgehende E-Mails wird der minimal erforderliche Send-Scope separat bewertet; Leserechte dürfen nicht allein wegen des Versands erweitert werden.

Keine Client-Secrets oder langfristigen Tokens im Browser, in Logs oder in Dokumentation speichern.

## 5. Mail-Erkennung ohne KI als erste Stufe

Die erste produktive Erkennung soll deterministisch und nachvollziehbar sein.

Mögliche Signale:

- bekannte Absender oder Absenderdomänen,
- definierte Betreffmuster,
- feste SharePoint-/Workflow-Textbausteine,
- Arbeitspaket-/Projektkennungen,
- URLs oder Referenz-IDs,
- Datum/Fälligkeit in standardisierten Textmustern.

Vorteile:

- reproduzierbar,
- testbar,
- datenschutzfreundlich,
- geringe Halluzinationsgefahr,
- klare Fehlersuche.

KI-basierte Extraktion ist eine spätere Ergänzung, nicht Voraussetzung für die erste produktive Mailintegration.

## 6. TaskCandidate-Datenmodell

Der neutrale Entwurf soll mindestens folgende Informationen aufnehmen können:

- `id`
- `sourceProvider`
- `sourceMessageId`
- `sourceInternetMessageId`, sofern verfügbar
- `receivedAt`
- `sender`
- `subject`
- `sourceReference`
- `suggestedTitle`
- `suggestedDescription`
- `suggestedProject`
- `suggestedDueDate`
- `suggestedResponsibleUser`
- `recognitionRule`
- `confidence`
- `status`
- `createdAt`
- `reviewedAt`
- `reviewedBy`

Statuswerte mindestens:

- `new`
- `needs-review`
- `accepted`
- `rejected`
- `duplicate`
- `error`

Der Original-Mailinhalt wird nur gespeichert, wenn dies fachlich und datenschutzrechtlich erforderlich ist. Bevorzugt werden minimale normalisierte Metadaten und ein referenzierbarer Quellbezug.

## 7. AVKK-Übergabe

Die Mail liefert typischerweise vor allem Informationen für:

- **A – Aufgabe**: Titel, Beschreibung, Projektbezug, Termin.
- **V – Verantwortung**: möglicher Verantwortlicher bzw. Zuordnungsempfänger.

**K – Kompetenz** und **K – Konsequenz** werden nicht automatisch als gesicherte Tatsachen aus der Mail übernommen, sofern sie nicht eindeutig strukturiert enthalten sind.

Beim Übernehmen eines TaskCandidate soll das Dashboard deshalb gezielt fehlende AVKK-Informationen ergänzen lassen.

Beispiel:

```text
A – aus Mail erkannt
V – eigener Benutzer vorgeschlagen
K – noch zu bewerten
K – noch zu bewerten
```

## 8. Dubletten und Idempotenz

Ein und dieselbe E-Mail darf nicht mehrfach zu identischen Aufgabenkandidaten führen.

Geeignete Schlüssel:

- Provider + Graph Message ID,
- Internet Message ID, sofern stabil verfügbar,
- kombinierter Fallback aus Quelle, Betreff, Absender und Empfangszeit nur als nachrangige Strategie.

Alle Übernahmen müssen idempotent bzw. gegen versehentliche Mehrfachübernahme geschützt sein.

## 9. Abrufstrategie

### Stufe 1 — kontrolliertes Pull/Delta

Für die erste produktive Ausbaustufe wird ein kontrollierter Pull mit Microsoft-Graph-Delta-Abfragen bevorzugt.

Vorteile:

- geringere Infrastrukturkomplexität,
- kein öffentlich erreichbarer Webhook-Endpunkt zwingend erforderlich,
- Delta-Link erlaubt inkrementelles Lesen,
- gut reproduzierbar und testbar.

Der gespeicherte Delta-Link ist providerbezogener Synchronisationszustand und darf keine fachliche Bedeutung erhalten.

### Stufe 2 — Change Notifications

Nach stabiler Pull-/Delta-Integration kann auf Change Notifications erweitert werden.

Dabei müssen zwingend berücksichtigt werden:

- Subscription-Ablauf und rechtzeitige Verlängerung,
- `reauthorizationRequired`,
- entfernte Subscriptions,
- verpasste Notifications,
- Recovery über Delta-Abfragen,
- Validierung des Notification-Endpunkts.

Change Notifications ersetzen Delta-Synchronisation nicht vollständig; Delta bleibt Recovery-Mechanismus.

## 10. Sicherheit und Datenschutz

Verbindliche Regeln:

- Least-Privilege Graph Permissions.
- Microsoft-Tokens nicht in `localStorage` persistieren, sofern eine sicherere serverseitige/sessiongebundene Alternative verfügbar ist.
- Keine Mailinhalte in Standardlogs.
- Keine Anhänge im ersten Integrationsschritt herunterladen, solange kein konkreter fachlicher Bedarf besteht.
- HTML-Mailinhalt nicht ungeprüft rendern.
- Externe Links als externe Inhalte behandeln.
- Keine automatische Übernahme produktiver Aufgaben.
- Keine automatische externe Kommunikation in den ersten Versand-/KI-Stufen.
- Jede Übernahme und jeder Versand wird auditiert.
- Benutzer kann eine Verbindung widerrufen.
- Verbindungstatus und Berechtigungsumfang müssen transparent sichtbar sein.

Vor produktiver Einführung sind Datenschutz-/Betriebsanforderungen des Unternehmens zu prüfen.

## 11. Geplante Sprints 10A–10D: Eingang und Aufgabenkandidaten

### Sprint 10A — Microsoft Graph Basis und persönlicher Mailzugriff

Ziel: Provider- und Authentifizierungsgrundlage.

Umfang:

- Entra App Registration dokumentieren,
- separaten Graph-OAuth-Kontext anbinden,
- delegierte Berechtigungen nach Least Privilege,
- `GraphMailProvider` implementieren,
- Verbindung herstellen / widerrufen,
- Mailfolder identifizieren,
- Testabruf der benötigten Nachrichteneigenschaften,
- keine Task-Erkennung,
- keine automatische Synchronisation.

Abnahme:

- Benutzer kann sein eigenes M365-Postfach sicher verbinden,
- Token-/Secret-Handhabung geprüft,
- Provider ist von Fachlogik getrennt,
- Zugriff auf fremde Postfächer nicht möglich,
- technische und datenschutzbezogene Grenzen dokumentiert.

### Sprint 10B — Mail-Ingestion, Delta-Sync und TaskCandidate

Ziel: Neue relevante Nachrichten zuverlässig erkennen und als Entwurf speichern.

Umfang:

- Delta-Abfrage für Inbox bzw. konfigurierten Ordner,
- sichere Speicherung des Delta-Zustands,
- Normalisierung relevanter Mailfelder,
- deterministische Erkennungsregeln,
- `TaskCandidate`-Tabellen und Services,
- Dublettenerkennung,
- Audit,
- manueller Synchronisationslauf,
- Fehler- und Retry-Modell.

Noch keine autonome Übernahme in Arbeitspakete.

### Sprint 10C — Dashboard „Aufgabenvorschläge“ und bestätigte Übernahme

Ziel: Benutzergeführter Workflow.

Umfang:

- Inbox/Queue für TaskCandidates,
- Ansicht Originalquelle / erkannte Werte,
- Confidence und Erkennungsgrund,
- Bearbeiten,
- Annehmen,
- Ablehnen,
- als Dublette markieren,
- Übergabe an WorkPackageService,
- AVKK-Vervollständigung,
- Auditspur Mail → Candidate → Arbeitspaket.

Abnahme: Kein produktives Arbeitspaket ohne ausdrückliche Benutzeraktion.

### Sprint 10D — Automatisierung, Change Notifications und Robustheit

Ziel: zuverlässiger laufender Betrieb.

Umfang:

- optional Change Notifications,
- Subscription Renewal,
- Lifecycle Notifications,
- Delta-Recovery bei verpassten Events,
- periodischer Fallback-Sync,
- Retry/Backoff,
- Monitoring ohne Mailinhalts-Leak,
- Last-/Fehlertests,
- End-to-End-Gesamttest,
- Betriebsdokumentation.

Nur umsetzen, wenn 10A–10C stabil sind.

## 12. Ausgehende E-Mail-Kommunikation

Nach stabiler Eingangsintegration soll das Dashboard aus strukturierten Daten heraus E-Mail-Entwürfe erzeugen und über Microsoft Graph versenden können.

Grundsatz der ersten Ausbaustufe: **Das System bereitet vor, der Benutzer versendet.** Kein automatischer externer Versand ohne explizite Freigabe.

### 12.1 Zielarchitektur Versand

```text
Arbeitspaket / Projekt / AVKK / Status
          ↓
CommunicationService
          ↓
CommunicationTemplateService
          ↓
MailDraft
          ↓
Benutzer prüft / ändert / bestätigt
          ↓
GraphMailProvider
          ↓
Microsoft 365
          ↓
Audit
```

`CommunicationService` ist fachlich und providerneutral. `GraphMailProvider` übernimmt nur die Microsoft-spezifische Übertragung. Dadurch bleibt später ein anderer Mailprovider grundsätzlich möglich.

### 12.2 Vorgesehene Kommunikationsvorlagen

Mindestens als erste Kandidaten:

- Auftrags-/Aufgabenbestätigung,
- Statusmeldung,
- Rückfrage wegen fehlender Informationen,
- Terminbestätigung,
- Terminverschiebung,
- Hinweis auf Blockade oder fehlende Voraussetzung,
- Fertigmeldung,
- Eskalations-/Risikohinweis.

Vorlagen sollen versioniert, konfigurierbar und von Fachlogik getrennt sein. Sie können strukturierte Platzhalter verwenden, zum Beispiel:

- Empfänger/Ansprechpartner,
- Projekt,
- Arbeitspaket,
- Status,
- nächster Schritt,
- Fälligkeit,
- Terminprognose,
- verantwortliche Person,
- freigegebene AVKK-Risikoinformationen.

Nicht jede interne AVKK-Information ist automatisch für externe Empfänger geeignet. Die Report-/Kommunikationsdefinition muss festlegen, welche Daten nach außen gelangen dürfen.

### 12.3 MailDraft-Datenmodell

Ein Entwurf soll mindestens enthalten können:

- `id`
- `sourceType` / `sourceId`
- `templateId` / `templateVersion`
- `recipientTo`
- `recipientCc`
- `subject`
- `body`
- `bodyFormat`
- `status`
- `createdBy`
- `createdAt`
- `approvedBy`
- `approvedAt`
- `sentAt`
- `providerMessageId`
- `generationMode` (`template`, später `ai-assisted`)

Statuswerte mindestens:

- `draft`
- `ready-for-review`
- `approved`
- `sending`
- `sent`
- `failed`
- `cancelled`

### 12.4 Audit und Nachweis

Für jeden externen Versand nachvollziehbar festhalten:

- aus welchem Arbeitspaket/Projekt der Entwurf entstand,
- welche Template-Version verwendet wurde,
- wer den Entwurf erstellt bzw. ausgelöst hat,
- wer ihn freigegeben hat,
- wann versendet wurde,
- Provider-Referenz und Ergebnisstatus.

Mailinhalte nur in dem Umfang auditieren/speichern, der fachlich und datenschutzrechtlich erforderlich ist.

## 13. Sprint 11A — CommunicationService und Graph-Mailversand

Ziel: Sicheren, benutzerbestätigten Versand aus dem Dashboard ermöglichen.

Umfang:

- providerneutralen `CommunicationService` definieren,
- `MailDraft`-Modell und Persistenz,
- Send-Funktion im `GraphMailProvider`,
- minimalen Graph-Send-Scope prüfen,
- Draft → Review → Send Workflow,
- Empfänger- und Eingabevalidierung,
- RBAC/RLS,
- Audit,
- Fehler-/Retry-Verhalten,
- keine KI,
- keine automatische Versendung.

Abnahme: Kein Versand ohne explizite Benutzerfreigabe; erfolgreicher Versand und Fehlerfälle sind nachvollziehbar auditiert.

## 14. Sprint 11B — Kommunikationsvorlagen und automatische Inhaltsvorbereitung

Ziel: Wiederkehrende Kommunikation aus strukturierten Dashboarddaten vorbereiten.

Umfang:

- versionierte Kommunikationsvorlagen,
- Template-IDs und Status (`draft`, `review`, `released`, `retired`),
- Platzhaltervertrag,
- Vorschau,
- zulässige externe Datenfelder,
- Vorlagen für Status, Termin, Rückfrage, Abschluss und Risiko,
- Rollen/Berechtigungen zur Vorlagenverwaltung,
- Tests für fehlende Platzhalter und falsche Empfänger,
- Benutzer kann generierten Text vor Versand bearbeiten,
- Audit der verwendeten Template-Version.

Automatischer Inhalt bedeutet in diesem Sprint deterministische Templatebefüllung, nicht freie KI-Generierung.

## 15. KI-Integrationsstrategie

KI wird bewusst nach stabilen Fach-, Graph- und Kommunikationsverträgen integriert. Ziel ist zunächst ein **Copilot**, kein autonomer Agent.

### 15.1 Drei Aktionsklassen

Jede KI-/Agentenfunktion wird einer Aktionsklasse zugeordnet:

- **READ** — analysieren, klassifizieren, zusammenfassen; keine Fach- oder Kommunikationsdaten verändern.
- **PROPOSE** — Änderungen, AVKK-Werte, Aufgaben oder Kommunikationsentwürfe vorschlagen; Benutzer entscheidet.
- **EXECUTE** — produktive Daten ändern, externe Nachrichten versenden oder andere externe Aktionen ausführen.

Erste KI-Stufe: nur READ + PROPOSE. EXECUTE ist standardmäßig verboten und wird später je Aktionstyp, Rolle und Risiko separat freigegeben.

### 15.2 KI-Anwendungsfälle

Priorisierte Anwendungsfälle:

1. unstrukturierte E-Mail → strukturierter TaskCandidate-Vorschlag,
2. Zusammenfassung langer Mailthreads,
3. Vorschlag für Titel, Beschreibung, Termin oder Projektzuordnung,
4. Hinweise auf fehlende Informationen,
5. Vorschläge für AVKK-Ergänzungen — niemals als ungeprüfte Wahrheit,
6. Formulierung eines Mailentwurfs aus bestätigten Dashboarddaten,
7. Managementzusammenfassung bestätigter Daten,
8. spätere Risiko-/Handlungsvorschläge aus AVKK und Kontextindikatoren.

### 15.3 Confidence und Provenance

KI-Vorschläge müssen kenntlich machen:

- dass sie KI-generiert sind,
- auf welchen Quellen sie beruhen,
- welche Felder sicher aus strukturierten Daten stammen,
- welche Felder inferiert wurden,
- Confidence bzw. Unsicherheit, sofern sinnvoll,
- dass eine menschliche Prüfung erforderlich ist.

Ein KI-Vorschlag darf nicht unbemerkt einen bestätigten Datenwert überschreiben.

### 15.4 Datenschutz und Datenminimierung

Vor Auswahl eines KI-Providers wird eine eigene Architektur-/Datenschutzentscheidung benötigt. Zu prüfen sind mindestens:

- Datenstandort und Auftragsverarbeitung,
- welche Mail-/Projekt-/Personendaten übertragen werden dürfen,
- Retention durch den Provider,
- Training auf Kundendaten,
- Mandantentrennung,
- Verschlüsselung,
- Logging/Telemetry,
- Löschkonzept,
- Providerwechsel und lokaler/Enterprise-Betrieb.

Fachlogik darf nicht direkt an einen konkreten KI-Anbieter gekoppelt werden. Vorgesehen ist eine providerneutrale `AiAssistantProvider`-/Service-Abstraktion.

## 16. Sprint 12A — KI-Copilot für Mail und Kommunikation

Ziel: KI als kontrollierte Assistenz für Eingang und Ausgang nutzen.

Umfang:

- providerneutrale AI-Service-Schnittstelle,
- READ/PROPOSE-Policy,
- KI-basierte TaskCandidate-Extraktion als Ergänzung/Fallback zu deterministischen Regeln,
- Thread-Zusammenfassung,
- Mailentwurf aus bestätigten Dashboarddaten,
- Quellen-/Provenance-Anzeige,
- Kennzeichnung KI-generierter Inhalte,
- Benutzerreview zwingend,
- Prompt-/Output-Validierung,
- Schutz gegen Prompt Injection aus E-Mail-Inhalten,
- Datenschutz-/Security-ADR,
- keine autonomen externen Aktionen.

Die deterministische Erkennung bleibt erhalten. KI ersetzt sie nicht stillschweigend.

## 17. Agentenphase nach dem KI-Copilot

Erst nach belastbarer Erfahrung mit READ/PROPOSE kann eine Agentenphase beginnen.

Beispiel eines späteren Agentenablaufs:

```text
Arbeitspaket morgen fällig
+ Kompetenz „Material“ fehlt
+ Konsequenz „Kunde“ hoch
+ letzte Statusmeldung vor mehreren Tagen
        ↓
Agent analysiert
        ↓
Vorschläge:
- Verantwortlichen erinnern
- Kundeninformation vorbereiten
- Terminrisiko markieren
- Managementhinweis erzeugen
        ↓
Policy-/RBAC-Prüfung
        ↓
Benutzerfreigabe oder später explizit erlaubte Aktion
        ↓
Audit
```

### 17.1 Voraussetzungen für EXECUTE

Bevor eine Agentenfunktion EXECUTE-Rechte erhält, müssen mindestens definiert sein:

- erlaubter Aktionstyp,
- erlaubte Rollen,
- erlaubte Datenbereiche,
- Risikoklasse,
- Freigabeschwelle,
- Rate-/Mengenlimit,
- Idempotenz,
- Abbruch-/Widerrufsmöglichkeit,
- Auditspur,
- Fehler-/Rollback-Verhalten,
- Not-Aus / Feature Flag.

Externe Kommunikation und produktive Datenänderungen gelten grundsätzlich als höheres Risiko als reine Analyse.

## 18. Empfohlene Post-MVP-Roadmap

| Sprint | Schwerpunkt | Automatisierungsgrad |
| --- | --- | --- |
| 10A | Graph/OAuth und persönlicher Mailzugriff | Verbindung / READ |
| 10B | Delta-Sync, Mail-Ingestion, TaskCandidate | deterministische READ/PROPOSE-Vorbereitung |
| 10C | Aufgabenvorschläge und bestätigte Übernahme | PROPOSE + menschliche Freigabe |
| 10D | Change Notifications, Recovery, Robustheit | technische Automatisierung, keine autonome Fachentscheidung |
| 11A | CommunicationService und Graph-Versand | Entwurf + explizites SEND durch Benutzer |
| 11B | versionierte Kommunikationsvorlagen | automatische deterministische Inhaltsvorbereitung |
| 12A | KI-Copilot Mail/Kommunikation | KI READ + PROPOSE |
| 12B+ | kontrollierte Agentenfunktionen | EXECUTE nur nach eigener Policy/Freigabe |

Parallel bzw. danach können SharePoint- und Kalenderprovider ergänzt werden. Die Reihenfolge ist bei Sprintabschluss anhand des realen Nutzens und der Risiken neu zu bewerten.

## 19. Weitere spätere Erweiterungen

Nach erfolgreicher Mailintegration und je nach Priorität:

1. SharePoint-Verknüpfung zu in E-Mails referenzierten Arbeitspaketen/Projekten.
2. Kalenderintegration für Fälligkeiten und Termine.
3. Managementzusammenfassungen auf Basis bestätigter Dashboarddaten.
4. Tenantweite bzw. Funktionspostfach-Szenarien nur nach gesonderter Berechtigungs- und Datenschutzentscheidung.
5. Vollständige Entra-ID-Integration des Dashboard-Logins als eigener Architektur-/Migrationsschritt.
6. Azure SQL / Azure Table Storage als getrennte Datenplattformmigration.

## 20. Teststrategie

Jeder Graph-Sprint benötigt zusätzlich zu den bestehenden Quality Gates:

- Provider-Contract-Tests,
- OAuth-/Scope-Negativtests,
- Graph-Fehlercodes und Throttling,
- Paging/Delta-Link-Tests,
- Dublettentests,
- Wiederanlauf nach abgelaufenem/entzogenem Zugriff,
- RBAC/RLS für TaskCandidates und MailDrafts,
- Auditnachweis,
- Test mit synthetischen Mails ohne reale personenbezogene Inhalte.

Für 10C/10D zusätzlich Browser-E2E:

- Verbindung vorhanden,
- Sync auslösen,
- Candidate erscheint,
- Candidate prüfen,
- übernehmen,
- Arbeitspaket und AVKK prüfen,
- Reload,
- Audit prüfen,
- Dublette wird nicht erneut übernommen.

Für 11A/11B zusätzlich:

- Draft erzeugen,
- Templateversion nachweisen,
- Empfänger validieren,
- Benutzerfreigabe erzwingen,
- Send-Erfolg und Send-Fehler,
- Doppelversand verhindern,
- Audit prüfen.

Für KI-/Agentensprints zusätzlich:

- Prompt-Injection-Tests mit bösartigem Mailinhalt,
- Halluzinations-/Unsupported-Claim-Fälle,
- Provenance-Prüfung,
- READ/PROPOSE/EXECUTE-Policy-Negativtests,
- keine Aktion bei fehlender Freigabe,
- Providerfehler und Timeout,
- Datenminimierung,
- Regression gegen deterministische Regeln.

## 21. Offene Architekturentscheidungen vor Sprint 10A

Vor Umsetzung müssen mindestens folgende Fragen verbindlich entschieden werden:

- Wo und wie werden Microsoft Refresh Tokens sicher gespeichert?
- Wird der Graph-Token serverseitig gehalten oder über einen serverseitigen Token-Broker bezogen?
- Welche konkrete Entra-App-/Redirect-URI-Struktur passt zur produktiven Runtime und zum späteren Docker-Betrieb?
- Reicht `Mail.ReadBasic` für 10A/10B oder ist aufgrund benötigter Nachrichteneigenschaften `Mail.Read` notwendig?
- Welche Mailfolder werden überwacht: Inbox, dedizierter Unterordner oder benutzerkonfigurierbarer Ordner?
- Welche Felder dürfen langfristig im TaskCandidate gespeichert werden?
- Welche Aufbewahrungsfrist gilt für abgelehnte Candidates?
- Ist ein Unternehmens-Admin-Consent erforderlich?

Vor 11A zusätzlich:

- minimal erforderlicher Graph-Send-Scope,
- Umgang mit Absenderidentität/Send-as-Szenarien,
- zulässige Empfängerdomänen bzw. Warnregeln,
- Retention von MailDrafts und Versandnachweisen.

Vor 12A zusätzlich:

- AI-Provider und Deploymentmodell,
- Datenschutz-/AVV-Anforderungen,
- zulässige Datenklassen,
- Modell-/Prompt-Versionierung,
- Evaluationskriterien und Freigabeschwellen.

Diese Entscheidungen gehören vor Implementierung jeweils in ADRs.

## 22. Definition of Done der Kommunikations- und Assistenzphase

### Graph-Eingang produktionsreif

- persönliche M365-Verbindung sicher herstellbar und widerrufbar,
- Least-Privilege-Berechtigungen nachgewiesen,
- inkrementeller Mailabruf stabil,
- Dubletten zuverlässig verhindert,
- TaskCandidates nachvollziehbar erzeugt,
- Benutzer bestätigt jeden produktiven Import,
- AVKK-Vervollständigung funktioniert,
- RBAC/RLS und Audit greifen,
- kein Mailinhalt unbeabsichtigt in Logs,
- Recovery-Pfade getestet.

### Graph-Ausgang produktionsreif

- MailDrafts aus strukturierten Daten erzeugbar,
- Vorlagen versioniert,
- Empfänger und Berechtigungen geprüft,
- kein Versand ohne erforderliche Freigabe,
- Doppelversand verhindert,
- Versand und Fehler auditierbar,
- Provider bleibt austauschbar.

### KI-Copilot produktionsreif

- KI-Funktionen klar als READ/PROPOSE klassifiziert,
- Benutzerreview zwingend,
- Provenance sichtbar,
- Prompt-Injection-Schutz getestet,
- Datenschutzentscheidung dokumentiert,
- kein autonomes EXECUTE,
- deterministische Fallback-/Basislogik bleibt funktionsfähig.

### Agentenfunktionen produktionsreif

Nur je einzelnem Aktionstyp nach separater Freigabe, Policy, Sicherheitsprüfung, Audit und Not-Aus-Möglichkeit.
