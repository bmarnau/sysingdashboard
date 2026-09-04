# SYSING-001 — Sysing Dashboard Produktübersicht

## Dokumentmetadaten

- **document_id:** SYSING-001
- **title:** Sysing Dashboard Produktübersicht
- **subtitle:** Idee, Funktionen, Nutzen, Schnittstellen, NAVIS und Automatisierung
- **document_type:** Produkt- und Managementübersicht (Living Document)
- **owner:** Projekt Sysing Dashboard
- **version:** 0.3.0
- **release_date:** 2026-09-04
- **source_review_date:** 2026-09-04
- **ausgabeformate:** PDF und Word werden mit `node scripts/docs/build-sysing-001.mjs` aus dieser Markdown-Quelle erzeugt
- **release_candidate:** Dashboard v1.58.2 bleibt die historische MVP-Release-Candidate-Referenz; dieses Living Document enthält zusätzlich das BSF-/NAVIS-Zielbild
- **baseline_reference:** GitHub `main` geprüft am 2026-09-04; NAVIS-Planung ist Zielbild und noch keine produktive Funktion
- **classification:** intern

## 0. Lesehinweis und Kennzeichnung

Dieses Dokument beschreibt sowohl den heutigen Funktionsumfang als auch die beabsichtigte Weiterentwicklung. Jede Aussage trägt eine Kennzeichnung. Damit werden Ist-Zustand, bereits beschlossene Zielarchitektur und spätere Ideen bewusst getrennt.

| Kennzeichnung | Bedeutung |
| --- | --- |
| UMGESETZT | im Release Candidate bzw. aktuellen Produktstand vorhanden und geprüft |
| IN ERPROBUNG | vorhanden, aber noch nicht abschließend fachlich abgenommen |
| GEPLANT / POST-MVP | bewusst nach dem MVP eingeplant |
| BESCHLOSSENES ZIELBILD | fachlich/architektonisch festgelegte Richtung, noch nicht produktiv umgesetzt |
| MÖGLICHE SPÄTERE ERWEITERUNG | Ideenstand, keine Zusage und keine beschlossene Roadmap |
| BEKANNTE GRENZE | bewusste Einschränkung mit dokumentierter Begründung |

**Wichtige NAVIS-Kennzeichnung:** NAVIS ist der Eigenname des zukünftigen Agenten des Sysing Dashboards. NAVIS V1 ist als **ausschließlich lesender Agent (READ-only)** festgelegt. Diese Festlegung ist ein BESCHLOSSENES ZIELBILD, keine Aussage über eine heute bereits produktive Agentenfunktion.

## 1. Produktidee

Das Sysing Dashboard ist das persönliche Arbeits-, Steuerungs- und Berichtswerkzeug für Systemingenieure eines Systemhauses. Es führt Projekte, Arbeitspakete, Tätigkeiten, Zeiten, Verantwortung und Führungsinformationen an einer Stelle zusammen und macht daraus belastbare Aussagen für die eigene Arbeit, für die Projektsteuerung und für die Geschäftsführung.

Der fachliche Kern ist AVKK: **A**ufgabe, **V**erantwortung, **K**ompetenz (Voraussetzungen), **K**onsequenz. AVKK beantwortet nicht „wer arbeitet wie schnell", sondern „welche Aufgabe ist unklar, unbesetzt, ohne Voraussetzung oder mit hoher Konsequenz belastet". Personenbezogene Rankings und Leistungsbewertungen sind dauerhaft ausgeschlossen (ADR-0027).

Das langfristige Ziel erweitert diese Arbeitsoberfläche um NAVIS. Ein Benutzer soll NAVIS später beispielsweise auf dem Smartphone fragen können:

`Hallo NAVIS, was liegt heute für mich an?`

NAVIS beantwortet diese Frage nicht aus Modellgedächtnis oder durch freien Datenbankzugriff, sondern ausschließlich auf Basis eines autorisierten, nachvollziehbaren und providerneutralen READ-Vertrags des Sysing Dashboards.

## 2. Funktionsumfang und Zielbild

| Bereich | Stand |
| --- | --- |
| Authentifizierung über Lovable Cloud (Supabase), E-Mail/Passwort | UMGESETZT |
| Rollen- und Rechtemodell (RBAC v2, 7 Rollen) | UMGESETZT |
| Datenbankseitige Absicherung (RLS-Policies) | UMGESETZT |
| Inaktivitäts-Abmeldung (konfigurierbar) | UMGESETZT |
| Persönliches Arbeitsdashboard (Projekte, Arbeitspakete, Tätigkeiten, Zeiten) | UMGESETZT |
| AVKK-Arbeitsplatz „Mein AVKK" | UMGESETZT |
| AVKK-Management-Cockpit (Führungssicht) | UMGESETZT |
| Reference Data als Plattformdienst | UMGESETZT |
| Reporting-Schicht mit Corporate Templates | UMGESETZT |
| Ausgabeformate PDF, Druck, Word, JSON, CSV | UMGESETZT |
| Ausgabeformat Excel | GEPLANT / POST-MVP |
| Backup 2.0 mit Manifest und SHA-256 | UMGESETZT |
| Restore lokaler Daten | UMGESETZT |
| Automatischer Rückschreib-Restore der AVKK-Cloud-Daten | BEKANNTE GRENZE |
| JSON-Import/-Export mit Vorschau und Rollback | UMGESETZT |
| Downloadbereich mit Aufbewahrungsregel | UMGESETZT |
| Integriertes Benutzerhandbuch, Systemstatus, Log Viewer | UMGESETZT |
| Systemhaus-Demo-Datensatz für Schulung und Abnahme | UMGESETZT |
| Kontextindikatoren als produktive Erhebung | GEPLANT / POST-MVP |
| Microsoft Graph, Exchange Online, Entra ID | GEPLANT / POST-MVP |
| Azure SQL, Azure Table Storage, SharePoint | GEPLANT / POST-MVP |
| NAVIS als zukünftiger Sysing-Dashboard-Agent | BESCHLOSSENES ZIELBILD |
| NAVIS V1: persönlicher, autorisierter READ-only Zugriff | BESCHLOSSENES ZIELBILD |
| NAVIS-Schreibaktionen / autonome Aktionen | MÖGLICHE SPÄTERE ERWEITERUNG |

## 3. Nutzen je Rolle

**Systemingenieur (UMGESETZT).** Sieht den eigenen Arbeitsvorrat, Dringlichkeit, Zeiten und die eigenen AVKK-Sachverhalte inklusive fehlender Voraussetzungen. Erzeugt Leistungsnachweise und persönliche AVKK-Berichte.

**Projektmanager (UMGESETZT).** Sieht die eigenen Projekte mit Lage „im Plan", „gefährdet", „kritisch" und „überfällig", die zugehörigen Arbeitspakete und Tätigkeiten sowie AVKK-Lücken und deren Konsequenzen mit Drill-down.

**Geschäftsführer (UMGESETZT).** Sieht die Portfoliolage, kritische und gefährdete Projekte, wesentliche Konsequenzen und den Handlungsbedarf, ohne in die Detailarbeit einsteigen zu müssen.

**Administrator / App-Entwickler (UMGESETZT).** Verwaltet Benutzer und Rollen, nutzt Role Preview zur Darstellungsprüfung, betreut Backup, Import/Export, Systemstatus und Prüfberichte. Role Preview verändert ausschließlich die Darstellung und umgeht weder RBAC noch RLS.

**NAVIS-Nutzer (BESCHLOSSENES ZIELBILD).** Kann in natürlicher Sprache den eigenen autorisierten Arbeitskontext abfragen. NAVIS V1 liest ausschließlich erlaubte Informationen, fasst sie zusammen und nennt Datenstand/Evidence. NAVIS V1 verändert keinerlei Fach-, Kommunikations- oder Kalenderdaten.

## 4. Architektur in Kurzform

- Frontend und serverseitige Funktionen in einer TanStack-Start-Anwendung (ADR-0001).
- Authentifizierung und Datenhaltung über Supabase; Zugriff ausschließlich unter RLS mit den Rechten des angemeldeten Benutzers (ADR-0025).
- Fachlogik, Auth-Adapter und Providerimplementierungen sind getrennt, damit ein späterer Wechsel zu Entra ID oder Azure SQL keine Fachlogik anfasst (ADR-0007, ADR-0020).
- Der BSF-02C Shared-Read-Pfad bildet die Grundlage für spätere kontrollierte Mehrbenutzer-Lesezugriffe (ADR-0032).
- Reporting arbeitet auf einem neutralen Dokumentmodell mit austauschbarer Template-Provider-Kette und garantiertem neutralem Fallback (ADR-0028).
- Backups tragen ein Manifest 2.0 mit Prüfsummen je Eintrag (ADR-0022).
- Führungsdaten werden historisiert statt gelöscht (ADR-0026).
- NAVIS darf später ausschließlich über einen engen READ-Vertrag auf die Fachdomäne zugreifen. Direkter SQL-/Tabellenzugriff aus dem Agenten ist ausgeschlossen (ADR-0034, Proposed).

### 4.1 NAVIS ist der Agent, nicht die Schnittstelle

Die Begriffe werden verbindlich getrennt:

| Begriff | Bedeutung |
| --- | --- |
| NAVIS | Eigenname des zukünftigen Sysing-Dashboard-Agenten |
| NAVIS READ Gateway | technische Eingangsschicht für kontrollierte Agentenabfragen |
| PersonalWorkQueryService | providerneutraler Fachservice für Fragen zum persönlichen Arbeitskontext |
| Repository | fachlich neutrale Datenzugriffsgrenze |
| Supabase Adapter | heutige providerbezogene Umsetzung des Repository-Vertrags |
| RLS | letzte datenbankseitige Zugriffsschranke |

Damit kann NAVIS später bestehen bleiben, selbst wenn Supabase durch Entra ID/Azure SQL ergänzt oder ersetzt wird.

## 5. Informationshoheit (Zielbild)

Welches System ist perspektivisch für welche Information zuständig:

| System | Zuständigkeit | Stand |
| --- | --- | --- |
| Legacy SharePoint | reale operative Projekte, Arbeitspakete, Tätigkeiten | GEPLANT / POST-MVP als Quelle |
| Sysing Dashboard | AVKK, Steuerung, Aggregation, Managementsicht, Arbeitskontext | UMGESETZT |
| Supabase | Daten- und Authentifizierungsplattform des MVP | UMGESETZT |
| Exchange Online | E-Mail-Kommunikation | GEPLANT / POST-MVP |
| Microsoft Graph | Integrationsschnittstelle zu Microsoft 365 | GEPLANT / POST-MVP |
| KI-Modell | sprachliche Analyse und Formulierung auf bereitgestelltem Kontext | BESCHLOSSENES ZIELBILD für NAVIS |
| NAVIS | zukünftiger Agent; V1 liest nur autorisierten persönlichen Arbeitskontext | BESCHLOSSENES ZIELBILD |

NAVIS wird nicht selbst zur führenden Datenquelle. Führend bleiben die Fachsysteme bzw. die im Sysing Dashboard normalisierten und autorisierten Daten. Eine Antwort von NAVIS muss auf diese Quellen zurückführbar sein.

## 6. Zukunftsbild und Informationsflüsse

### 6.1 Legacy SharePoint (GEPLANT / POST-MVP)

Heute existiert ein älterer lokaler SharePoint mit den realen operativen Systemhausdaten: Projekte, Arbeitspakete, Tätigkeiten. **AVKK existiert dort nicht.** AVKK ist eine zusätzliche Fachschicht des Sysing Dashboards und darf niemals als SharePoint-Bestand dargestellt werden.

```text
Legacy SharePoint
Projekte / Arbeitspakete / Tätigkeiten
        |
        v
SharePoint Provider / Mapping
        |
        v
Sysing Domain Model
        |
        v
AVKK als zusätzliche Sysing-Fachschicht
        |
        v
persönliche Sicht / Projektsteuerung / Management
        |
        v
Reporting / Kommunikation / spätere KI
```

### 6.2 Integrationsstrategie SharePoint (GEPLANT / POST-MVP)

Erstes Zielbild ist **READ / SYNC**: Lesen und Abgleichen operativer Arbeitsobjekte in Richtung Sysing. Eine automatische bidirektionale Synchronisation ist **nicht** beschlossen; ein Zurückschreiben nach SharePoint wäre eine eigene Architekturentscheidung mit eigenem ADR. Für ein belastbares Mapping werden später Screenshots, Feldlisten und reale Strukturinformationen des bestehenden SharePoints ausgewertet.

### 6.3 Microsoft Graph und Exchange Online (GEPLANT / POST-MVP)

```text
Exchange Online -> Microsoft Graph -> Mail Ingestion -> TaskCandidate
        -> Benutzerprüfung -> Tätigkeit / Arbeitspaket -> AVKK
```

In der ersten Stufe entsteht **keine** produktive Aufgabe ohne Benutzerprüfung.

### 6.4 E-Mail-Ausgang (GEPLANT / POST-MVP)

```text
Sysing / Projekt / AVKK -> Kommunikationsvorlage -> Mailentwurf
        -> Benutzerprüfung -> Microsoft Graph -> Exchange Online
```

### 6.5 KI-Copilot (MÖGLICHE SPÄTERE ERWEITERUNG)

```text
SharePoint  \
Exchange     >  normalisierte Sysing-Informationen -> KI-Copilot (READ / PROPOSE)
AVKK        /                                        |
                                                     v
                              Analyse / Zusammenfassung / Vorschläge
                                                     |
                                                     v
                                            Benutzerentscheidung
```

Diese mögliche Copilot-Stufe ist fachlich von NAVIS V1 zu unterscheiden. **NAVIS V1 erhält ausschließlich READ-Rechte.** PROPOSE oder EXECUTE sind nicht Bestandteil der ersten NAVIS-Version.

### 6.6 NAVIS-Labor (BESCHLOSSENES ZIELBILD)

Das in BSF-10 geplante Agenten-Labor erhält ein konkretes Lernziel: die Frage `Guten Morgen NAVIS – was liegt heute an?` sicher, nachvollziehbar und zunächst mit Mock-/Demodaten zu beantworten.

```text
Mock-/Demodaten
      |
      v
PersonalWorkQueryService
      |
      v
enger NAVIS-READ-Vertrag
      |
      v
NAVIS
      |
      v
verständliche Antwort + Evidence + Datenstand
```

Die erste Laborstufe bleibt read-only. Sie darf keine Aufgabe erzeugen, keinen Status ändern, keine Zeit buchen, keine Mail senden und keine sonstige Produktivaktion ausführen.

### 6.7 NAVIS V1 — verbindliches READ-only Zielbild

Der spätere produktive Weg einer Frage wird so geplant:

```text
Benutzer auf Smartphone / Desktop
        |
        |  "Hallo NAVIS, was liegt heute für mich an?"
        v
NAVIS / Chat-Oberfläche
        |
        | OAuth 2.0 / OpenID Connect
        | kurzlebiger Benutzerkontext
        v
Sysing NAVIS READ Gateway
        |
        | Identität + erlaubter Tool-Aufruf
        v
PersonalWorkQueryService
        |
        | deterministische Fachregel
        v
providerneutrales Repository
        |
        v
Supabase Adapter (MVP)
        |
        v
RBAC + Customer/Systemhouse-Scope + RLS
        |
        v
nur erlaubte Datensätze
        |
        v
strukturierte Antwortdaten + Evidence/Freshness
        |
        v
NAVIS formuliert die Antwort
```

**Sicherheitskern:** ChatGPT/NAVIS erhält keinen generischen Datenbankzugriff. Ein Sprachmodell darf weder SQL formulieren und ausführen noch frei Tabellen lesen. Es darf nur einen kleinen, serverseitig kontrollierten Werkzeugvertrag aufrufen.

### 6.8 Authentifizierung und Autorisierung — Lernabschnitt

**Authentifizierung** beantwortet: `Wer bist du?`

Für NAVIS wird eine benutzerbezogene Anmeldung über OAuth 2.0 / OpenID Connect vorgesehen. Heute kann die Identität auf Supabase Auth abgebildet werden; später kann Entra ID diese Rolle übernehmen. Der Agent arbeitet mit einem kurzlebigen Benutzerkontext, nicht mit einem dauerhaften Generalschlüssel.

**Autorisierung** beantwortet: `Was darfst du sehen?`

Nach der Identitätsfeststellung werden Rollen, Permissions, aktive Systemhouse-Mitgliedschaft, Customer Access und RLS geprüft. Eine bekannte Kunden- oder Objekt-ID erzeugt niemals automatisch Zugriff.

**API Key ist nicht Benutzeridentität.** Ein API-Key kann eine aufrufende Anwendung technisch kennzeichnen, ersetzt aber keine benutzerbezogene Authentifizierung und keine Autorisierung. **API-key-only ist für NAVIS V1 ausgeschlossen.** Falls später ein technischer Dienst zusätzlich authentifiziert werden muss, bleibt dies getrennt von der Benutzeridentität.

**Service Role ist ausgeschlossen.** Service-Role-Keys dürfen weder in ChatGPT/NAVIS, im Smartphone-Client, in Prompts noch in einem allgemeinen MCP-/Tool-Client hinterlegt werden.

### 6.9 Warum mehrere Sicherheitsstufen sinnvoll sind

NAVIS V1 folgt dem Prinzip Defense in Depth:

```text
1. Benutzer anmelden
        |
2. Token / Identität prüfen
        |
3. erlaubtes READ-Tool prüfen
        |
4. Fachscope bestimmen
        |
5. Repository/Adapter aufrufen
        |
6. RLS prüft Datensatzebene
        |
7. nur erlaubte Daten zurückgeben
```

RBAC und RLS sind deshalb keine Doppelarbeit. RBAC beschreibt funktionale Rechte und fachliche Scopes; RLS bildet die letzte datenbankseitige Schutzgrenze.

### 6.10 PersonalWorkQueryService — was bedeutet „für mich heute"?

Die Bedeutung darf nicht vom Sprachmodell frei erfunden werden. Der Fachservice bestimmt sie deterministisch.

Eine mögliche V1-Regel lautet:

```text
Meine relevante Arbeit heute =
    mir fachlich zugeordnete offene Arbeitspakete
  + heute fällige offene Arbeitspakete
  + überfällige, noch nicht abgeschlossene Arbeitspakete
  + meine gültigen Verantwortlichkeiten, soweit für die Frage erforderlich
```

Die endgültige Regel wird vor Implementierung als Fachvertrag festgelegt und getestet. „Heute" verwendet eine explizite Benutzer-/Systemzeitzone. „Für mich" wird ausschließlich aus der authentifizierten Identität und serverseitigen Zuordnung abgeleitet; NAVIS darf keine frei wählbare `userId` verwenden, um den Scope zu wechseln.

Für diese Funktion muss der zentrale/read-seitige Datenvertrag ausreichend Informationen enthalten, insbesondere Status, Fälligkeit, Priorität, Zuordnung/Verantwortung, Customer-/Projekt-/AP-Bezug und Freshness. Fehlende Felder werden im zuständigen BSF-Datenmodell ergänzt und nicht als Agenten-Sonderdatenbank dupliziert.

### 6.11 Enger Werkzeugvertrag

Beispielhafte V1-Operationen:

```text
getMyWorkForToday()
getMyOverdueWork()
getMyOpenWorkPackages()
getMyCustomerContext(customerId)
```

Die Namen sind Planungsbeispiele; der finale Vertrag wird versioniert. Verbindlich ist das Prinzip:

- nur READ,
- selbst-/scope-bezogen,
- keine generische SQL-/Tabellenabfrage,
- kein frei übergebener Benutzerkontext,
- serverseitige Autorisierung bei jedem Aufruf,
- minimale, strukturierte Antwortdaten,
- nachvollziehbare Quelle und Datenstand.

### 6.12 Evidence, Provenance und Freshness

NAVIS soll nicht nur eine plausible Antwort liefern, sondern eine belegbare Antwort. Dafür werden mindestens vorgesehen:

- stabile fachliche Objekt-IDs bzw. sichere Referenzen,
- Customer-/Projekt-/Arbeitspaket-Kontext nur im erlaubten Scope,
- Datenstand/Freshness,
- Quelle/Provider bzw. normalisierte Herkunft,
- nachvollziehbarer Read-Aufruf im Audit,
- keine unnötige Speicherung kompletter Chat-Inhalte.

Beispiel einer strukturierten internen Antwort:

```text
date: 2026-09-04
dueToday: 2
overdue: 1
freshness: 2026-09-04T09:42:00+02:00
items: [autorisierte Arbeitspaket-Referenzen]
```

NAVIS formuliert daraus natürliche Sprache, verändert aber den fachlichen Inhalt nicht.

### 6.13 NAVIS V1 — ausdrücklich nicht erlaubt

NAVIS V1 darf nicht:

- Arbeitspakete oder Tätigkeiten anlegen, ändern oder löschen,
- Status oder Prioritäten verändern,
- Zeiten erfassen oder Leistungsdaten buchen,
- AVKK-Verantwortungen verändern,
- Mails versenden oder Mailentwürfe produktiv ablegen,
- Kalendertermine anlegen oder ändern,
- SharePoint schreiben,
- beliebiges SQL oder generische Datenbankabfragen ausführen,
- RLS/RBAC durch Service-Role oder technische Generalschlüssel umgehen.

Jede spätere PROPOSE- oder EXECUTE-Fähigkeit benötigt eine neue, ausdrücklich abgenommene Architektur- und Sicherheitsentscheidung. READ-Rechte werden nicht still durch zusätzliche Tool-Scopes zu Schreibrechten erweitert.

### 6.14 Providerneutralität und späterer Microsoft-Kontext

Microsoft Graph ist **keine Voraussetzung** für die erste NAVIS-Frage zum Sysing Dashboard. NAVIS liest den Sysing-Fachkontext über den providerneutralen READ-Vertrag.

Später können weitere Quellen getrennt hinzukommen:

```text
                         +-> Sysing Dashboard
                         |     Projekte / AP / AVKK
Benutzer -> NAVIS -------+
                         |
                         +-> Microsoft 365 Provider
                               Mail / Kalender / SharePoint
```

Jede Quelle besitzt eigene Berechtigungen, Provideradapter, Audit- und Datenschutzgrenzen. NAVIS wird nicht selbst zum Datenspeicher und erhält keinen pauschalen Zugriff auf Microsoft 365.

### 6.15 Lern- und Reifeweg für NAVIS

| Stufe | Inhalt | Rechte |
| --- | --- | --- |
| L0 | Architektur und Werkzeugvertrag mit synthetischen Daten | READ |
| L1 | isoliertes NAVIS-Labor mit Mock-/Demodaten, Evidence und Negativtests | READ |
| L2 | kontrollierter Pilot auf freigegebenen realen Daten nach Security-Gate | READ |
| L3 | mobile/desktop Nutzung mit OAuth/OIDC, Audit und produktivem READ-Gateway | READ |
| L4 | mögliche Vorschlagsfunktionen nach neuer Entscheidung | noch nicht beschlossen |
| L5 | mögliche eng begrenzte Aktionen nach eigener Freigabe | noch nicht beschlossen |

**NAVIS V1 endet bei READ.** Die Stufen L4/L5 gehören nicht zu V1.

## 7. NAVIS verstehen — der Weg einer Frage

Dieser Abschnitt dient ausdrücklich auch als Lernteil zur Systemarchitektur.

### 7.1 Schritt 1 — Der Benutzer stellt eine Frage

Beispiel: `Hallo NAVIS, was liegt heute für mich an?`

Das Sprachmodell kennt zu diesem Zeitpunkt noch keine vertraulichen Arbeitsdaten. Die Frage beschreibt nur die gewünschte Absicht.

### 7.2 Schritt 2 — Wer fragt?

OAuth/OIDC bzw. der angebundene Auth-Provider liefert eine geprüfte Identität. Der Server ordnet diese Identität dem Sysing-Profil zu. Ein API-Key allein genügt hierfür nicht.

### 7.3 Schritt 3 — Welches Werkzeug darf benutzt werden?

NAVIS darf nur registrierte READ-Werkzeuge aufrufen. Die Schnittstelle ist enger als eine allgemeine REST-/SQL-Schnittstelle.

### 7.4 Schritt 4 — Was bedeutet die Frage fachlich?

Der PersonalWorkQueryService übersetzt „meine Arbeit heute" in eine geprüfte Fachregel. Das Modell entscheidet nicht selbst, welche Datensätze „meine" sind.

### 7.5 Schritt 5 — Woher kommen die Daten?

Der Service verwendet ein providerneutrales Repository. Heute kann ein Supabase-Adapter dahinterliegen, später beispielsweise Azure SQL. Die Fachlogik bleibt gleich.

### 7.6 Schritt 6 — Darf genau dieser Datensatz gelesen werden?

RBAC/Scope und RLS prüfen den Zugriff. Cross-Systemhouse, Cross-Customer und IDOR/BOLA müssen fail-closed bleiben.

### 7.7 Schritt 7 — Was erhält NAVIS?

Nur die minimal notwendigen strukturierten Informationen samt Evidence/Freshness. Keine komplette Datenbank und kein Service-Role-Schlüssel.

### 7.8 Schritt 8 — Wie entsteht die Antwort?

NAVIS formuliert die strukturierten Daten verständlich. Beispiel:

> Guten Morgen. Für heute sind drei Arbeitspakete relevant. Eines ist heute fällig, zwei sind noch offen; zusätzlich ist ein Arbeitspaket seit gestern überfällig. Datenstand: 09:42 Uhr.

Die Sprache kann variieren. Die zugrunde liegenden Fakten und Berechtigungsgrenzen dürfen dadurch nicht verändert werden.

## 8. NAVIS Sicherheits- und Abnahmekriterien

NAVIS V1 ist erst freigabefähig, wenn mindestens folgende Kriterien erfüllt sind:

1. Benutzerbezogene Authentifizierung über OAuth/OIDC bzw. einen äquivalent sicheren angebundenen Auth-Flow; API-key-only ist ausgeschlossen.
2. Kurzlebige Benutzer-Tokens und definierte Abmeldung/Widerrufsmöglichkeit.
3. Kein Service-Role-Key und kein produktives Secret im Agenten, Client, Prompt oder Repository.
4. Ausschließlich explizit registrierte READ-Tools.
5. Identität wird serverseitig aus dem geprüften Token abgeleitet; kein unautorisierter `userId`-Wechsel.
6. RBAC, aktive Mitgliedschaft, Customer Scope und RLS bleiben wirksam.
7. Cross-Systemhouse-, Cross-Customer- und IDOR/BOLA-Negativtests sind grün.
8. Prompt-Injection-/Tool-Missbrauchstests zeigen keinen Scope-Escape und keine Schreibaktion.
9. Antwortdaten enthalten geeignete Evidence/Provenance/Freshness.
10. Audit protokolliert den fachlich notwendigen Zugriff, ohne unnötig vollständige Chat-Inhalte zu speichern.
11. Providerneutraler Vertrag ist mit Supabase implementierbar und für Azure SQL/Entra ID austauschbar.
12. Docker-/On-Premises-Betrieb wird durch die Agentenarchitektur nicht blockiert.
13. Mobile/desktop Abfrage `Was liegt heute für mich an?` liefert nur den eigenen autorisierten Arbeitskontext.
14. NAVIS V1 besitzt technisch keine Schreibwerkzeuge.

## 9. Betrieb und Portabilität

- Betrieb heute auf der Lovable-Cloud-Plattform mit Supabase; die Anwendung bleibt containerfähig ausgelegt (UMGESETZT als Architekturprinzip, Docker-Betrieb IN ERPROBUNG).
- Keine Windows-Pfad-Hardcodierung in der Fachlogik; Vorlagen kommen über die Template-Provider-Kette (UMGESETZT).
- Secrets ausschließlich über die Secret-Verwaltung, niemals im Code (UMGESETZT).
- NAVIS darf keine Lovable-spezifische Laufzeitabhängigkeit erzeugen. Gateway, Fachservice, Repository und Auth-Adapter werden so getrennt, dass ein autonomer Unternehmensbetrieb möglich bleibt (BESCHLOSSENES ZIELBILD).

## 10. Bekannte Grenzen und offene Planungsaufgaben

1. AVKK-Daten werden historisiert und nicht gelöscht (ADR-0026). Demo- und Testdaten dürfen deshalb **niemals** in eine Produktivinstanz eingespielt werden.
2. AVKK-Daten werden im Backup vollständig transportiert und geprüft, aber beim Restore nicht automatisch in die Cloud zurückgeschrieben.
3. Kontextindikatoren sind fachlich beschrieben, aber nicht produktiv erhoben.
4. Für den Leistungsnachweis existiert weiterhin ein eigener PDF-Pfad neben der zentralen Reporting-Schicht.
5. Excel ist als Ausgabeformat geplant, aber nicht umgesetzt.
6. Der heutige Shared-Projection-/Read-Vertrag muss für die spätere Frage „was liegt heute für mich an?" nachweisen, dass Fälligkeit, Status, Priorität und persönliche Zuordnung/Verantwortung ausreichend zentral/read-seitig verfügbar sind. Fehlende Felder sind im regulären Domänen-/Projection-Modell zu ergänzen, nicht in einer NAVIS-Sonderpersistenz.
7. Der produktive OAuth/OIDC-Flow und die konkrete ChatGPT-/NAVIS-Clientintegration werden erst im zuständigen Integrations-/Security-Sprint festgelegt.

## 11. Glossar NAVIS und sichere Agentenarchitektur

| Begriff | Kurzdefinition |
| --- | --- |
| NAVIS | Eigenname des zukünftigen Agenten des Sysing Dashboards |
| READ | Daten lesen/auswerten, ohne fachliche oder externe Seiteneffekte |
| PROPOSE | Änderung oder Aktion vorschlagen; nicht Bestandteil von NAVIS V1 |
| EXECUTE | produktive Änderung/Aktion durchführen; nicht Bestandteil von NAVIS V1 |
| OAuth 2.0 | Standardrahmen zur delegierten Autorisierung und Tokenvergabe |
| OpenID Connect (OIDC) | Identitätsschicht auf OAuth 2.0; liefert geprüften Benutzerkontext |
| Access Token | kurzlebiger Nachweis für einen autorisierten Zugriff |
| API Key | technischer Schlüssel; für NAVIS V1 kein Ersatz für Benutzeridentität |
| READ Gateway | kontrollierte Eingangsschicht für NAVIS-Werkzeugaufrufe |
| PersonalWorkQueryService | Fachservice für den persönlichen Arbeitskontext |
| Repository | providerneutraler Vertrag für Datenzugriff |
| Adapter | providerbezogene Umsetzung, z. B. Supabase oder später Azure SQL |
| RBAC | rollen-/permissionbasierte funktionale Autorisierung |
| RLS | datenbankseitige Zeilen-/Datensatzautorisierung |
| Evidence | belegbare Referenz, aus der eine Aussage abgeleitet wurde |
| Provenance | Herkunft und Verarbeitungspfad von Daten |
| Freshness | Zeitpunkt/Alter des zugrunde liegenden Datenstands |
| MCP | mögliches Protokoll für Tool-Anbindung; kein Ersatz für Auth, RBAC oder RLS |

## 12. Kontrollfragen zum Lernen

1. Warum reicht ein API-Key für die Frage „was liegt heute **für mich** an?" nicht aus?
2. Was ist der Unterschied zwischen Authentifizierung und Autorisierung?
3. Warum darf NAVIS nicht direkt auf Supabase-Tabellen oder SQL zugreifen?
4. Welche Aufgabe hat der PersonalWorkQueryService?
5. Warum brauchen wir RBAC **und** RLS?
6. Warum darf der Client keine frei wählbare `userId` an NAVIS übergeben?
7. Was ändert sich für NAVIS, wenn später Azure SQL statt Supabase verwendet wird?
8. Warum ist Microsoft Graph für NAVIS V1 nicht zwingend erforderlich?
9. Welche Informationen sollten Evidence und Freshness enthalten?
10. Welche Fähigkeiten sind in NAVIS V1 ausdrücklich verboten?

**Lernziel:** Wer diese zehn Fragen erklären kann, versteht die wesentlichen Trust Boundaries von NAVIS V1.

## 13. Verweise

`docs/AVKK.md`, `docs/AVKK-CONTEXT-INDICATORS.md`, `docs/REFERENCE-DATA.md`,
`docs/DATA-SCHEMA.md`, `docs/DEMO-DATA.md`, `docs/MVP-PLAN.md`,
`docs/MVP-ACCEPTANCE-REPORT.md`, `docs/PROJECT-GOVERNANCE.md`,
`docs/GESAMTPLAN-SYSING-DASHBOARD.md`, `docs/NAVIS-READ-V1-PLAN.md`,
`docs/ADR/0032-bsf-02c-shared-projection.md`, `docs/ADR/0034-navis-read-only-agent-access.md`,
`docs/ADR/`.
