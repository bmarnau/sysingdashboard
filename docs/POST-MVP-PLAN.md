# Sysing Dashboard — Post-MVP-Plan

Stand: 2026-08-10

## 1. Ziel der Post-MVP-Phase

Nach erfolgreicher MVP-Abnahme in Sprint 09B beginnt die Integrationsphase. Die erste priorisierte externe Schnittstelle ist die Auswertung eingehender Microsoft-365-E-Mails über Microsoft Graph, um daraus geprüfte Aufgabenkandidaten für das Sysing Dashboard zu erzeugen.

Grundsatz: Eine E-Mail darf niemals autonom ein produktives Arbeitspaket erzeugen. Sie erzeugt zunächst einen `TaskCandidate`. Erst nach Benutzerprüfung und ausdrücklicher Bestätigung wird daraus ein Arbeitspaket bzw. eine AVKK-Zuordnung.

Azure SQL, Azure Table Storage und die vollständige Umstellung der Dashboard-Authentifizierung auf Microsoft Entra ID bleiben davon getrennte spätere Ausbaustufen.

## 2. Warum Microsoft Graph Mail zuerst

Die Mail-Integration liefert früh sichtbaren Nutzen bei begrenztem Integrationsumfang:

- neue Aufgabenzuweisungen werden schneller sichtbar,
- vorhandene Arbeitspaket- und AVKK-Strukturen werden direkt wiederverwendet,
- der Benutzer behält die Entscheidungshoheit,
- die Schnittstelle lässt sich klar von der Fachlogik trennen,
- SharePoint- und Kalenderintegration können später auf derselben Providerbasis aufsetzen.

Die erste Ausbaustufe soll benutzerbezogen arbeiten: Der angemeldete Benutzer autorisiert den Zugriff auf sein eigenes Microsoft-365-Postfach. Eine tenantweite oder zentrale Postfachüberwachung ist nicht Bestandteil der ersten Graph-Sprints.

## 3. Zielarchitektur

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

Leitprinzip: Least Privilege. Die tatsächlich erforderlichen Scopes werden pro Sprint anhand der konkret genutzten Graph-Operationen nochmals gegen die aktuelle Microsoft-Dokumentation geprüft.

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
- Jede Übernahme wird auditiert.
- Benutzer kann eine Verbindung widerrufen.
- Verbindungstatus und Berechtigungsumfang müssen transparent sichtbar sein.

Vor produktiver Einführung sind Datenschutz-/Betriebsanforderungen des Unternehmens zu prüfen.

## 11. Geplante Sprints nach MVP

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

## 12. Spätere Erweiterungen

Nach erfolgreicher Mailintegration:

1. SharePoint-Verknüpfung zu den in E-Mails referenzierten Arbeitspaketen/Projekten.
2. Kalenderintegration für Fälligkeiten und Termine.
3. KI-gestützte Extraktion unstrukturierter E-Mails als optionaler Fallback.
4. Managementzusammenfassungen auf Basis bestätigter Dashboarddaten.
5. Tenantweite bzw. Funktionspostfach-Szenarien nur nach gesonderter Berechtigungs- und Datenschutzentscheidung.
6. Vollständige Entra-ID-Integration des Dashboard-Logins als eigener Architektur-/Migrationsschritt.

## 13. Teststrategie

Jeder Graph-Sprint benötigt zusätzlich zu den bestehenden Quality Gates:

- Provider-Contract-Tests,
- OAuth-/Scope-Negativtests,
- Graph-Fehlercodes und Throttling,
- Paging/Delta-Link-Tests,
- Dublettentests,
- Wiederanlauf nach abgelaufenem/entzogenem Zugriff,
- RBAC/RLS für TaskCandidates,
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

## 14. Offene Architekturentscheidungen vor Sprint 10A

Vor Umsetzung müssen mindestens folgende Fragen verbindlich entschieden werden:

- Wo und wie werden Microsoft Refresh Tokens sicher gespeichert?
- Wird der Graph-Token serverseitig gehalten oder über einen serverseitigen Token-Broker bezogen?
- Welche konkrete Entra-App-/Redirect-URI-Struktur passt zur produktiven Runtime und zum späteren Docker-Betrieb?
- Reicht `Mail.ReadBasic` für 10A/10B oder ist aufgrund benötigter Nachrichteneigenschaften `Mail.Read` notwendig?
- Welche Mailfolder werden überwacht: Inbox, dedizierter Unterordner oder benutzerkonfigurierbarer Ordner?
- Welche Felder dürfen langfristig im TaskCandidate gespeichert werden?
- Welche Aufbewahrungsfrist gilt für abgelehnte Candidates?
- Ist ein Unternehmens-Admin-Consent erforderlich?

Diese Entscheidungen gehören vor Implementierung in eine ADR.

## 15. Definition of Done der Graph-Mail-Integrationsphase

Die Mailintegration gilt erst als produktionsreif, wenn:

- persönliche M365-Verbindung sicher hergestellt und widerrufen werden kann,
- Least-Privilege-Berechtigungen nachgewiesen sind,
- inkrementeller Mailabruf stabil funktioniert,
- Dubletten zuverlässig verhindert werden,
- TaskCandidates nachvollziehbar erzeugt werden,
- Benutzer jeden produktiven Import ausdrücklich bestätigt,
- AVKK-Vervollständigung funktioniert,
- RBAC/RLS und Audit greifen,
- kein Mailinhalt unbeabsichtigt in Logs gelangt,
- Fehler-/Recovery-Pfade getestet sind,
- technische Dokumentation, Betriebsdokumentation und Prüfbericht aktualisiert sind.
