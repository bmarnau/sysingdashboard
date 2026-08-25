# ADR-0031 — Systemhouse-Membership und Customer-Zugriff als serverseitige BSF-Grenze

- Status: vorgeschlagen für BSF-02
- Datum: 2026-08-25
- Vorgänger: ADR-0029, ADR-0030

## Kontext

ADR-0029 definiert `systemhouseId` als providerneutralen fachlichen Betreiberscope. ADR-0030 und PR #81 schaffen das DDL-freie Customer-/Shared-Data-Fundament. Die aktuelle produktive Datenbankautorisierung basiert jedoch weiterhin überwiegend auf globalen Rollen und `has_permission(uuid, text)`. Die vorbereitenden RBAC-v2-Scopes sind noch keine persistierte Runtime-Sicherheitsgrenze.

Für gemeinsame Customer-, Projekt-, Arbeitspaket- und Tätigkeitsdaten reicht deshalb weder `TO authenticated` noch eine reine globale Rollenprüfung. Gleichzeitig darf BSF-02 die fachliche Kundenverantwortung aus BSF-03 nicht vorwegnehmen.

## Entscheidung

### 1. Membership und fachliche Verantwortung werden getrennt

BSF-02 führt eine technische Systemhouse-Membership als Voraussetzung jeder gemeinsamen Datensicht ein. Sie beantwortet ausschließlich die Frage, ob ein Benutzer dem fachlichen Systemhaus zugeordnet ist.

Eine Membership ist ausdrücklich nicht gleichbedeutend mit Kundenverantwortung und verleiht nicht automatisch Zugriff auf alle Customers.

### 2. Customer-Zugriff benötigt einen eigenen serverseitigen Scope

Für kundenbezogene gemeinsame Daten wird zusätzlich ein expliziter Customer-Zugriffsscope benötigt. Dieser technische Scope kann später durch Kundenverantwortung, Projektzuordnung oder andere fachliche Regeln gespeist werden.

Damit bleibt folgende Trennung erhalten:

```text
Systemhouse-Membership
  -> Benutzer gehört zum Systemhaus

Customer-Access-Scope
  -> Benutzer darf einen bestimmten Customer-Datenraum lesen oder bearbeiten

Customer-Responsibility
  -> fachliche Verantwortungsbeziehung aus BSF-03
```

### 3. Kein implizites Read-Recht aus `dashboard.view`

Die bestehende globale Berechtigung `dashboard.view` wird nicht zu einem globalen Shared-Customer-Read-Recht umgedeutet. Gemeinsame Customer-Daten benötigen zusätzlich einen serverseitig nachgewiesenen Systemhouse- und Customer-Scope.

### 4. Schreibrechte benötigen zwei Bedingungen

Ein Schreibzugriff auf gemeinsame kundenbezogene Daten benötigt mindestens:

1. ein bestehendes fachliches Schreibrecht für die Ressource und
2. einen zulässigen serverseitigen Customer-Scope.

Ein Customer-Scope alleine erzeugt keine globale Schreibberechtigung. Eine globale Rolle alleine darf den Customer-Scope nicht umgehen, außer bei ausdrücklich dokumentierten Systemadministrator-/Servicepfaden.

### 5. Cross-Systemhouse bleibt harte Grenze

Customer-Scopes sind immer an `systemhouseId` gebunden. Eine `customerId` darf außerhalb ihres Systemhauses niemals ausreichen, um Zugriff zu begründen.

Die fachliche Identität bleibt:

```text
(systemhouseId, customerId)
```

### 6. Deny by default vor vollständiger Scope-Zuordnung

Neue gemeinsame Tabellen werden nicht mit einer permissiven Übergangspolicy produktiv freigegeben. Solange ein Benutzer keinen explizit zulässigen Customer-Scope besitzt, ist der Zugriff auf customerbezogene gemeinsame Zeilen leer oder verweigert.

Unaufgelöste Legacy-Customer-Zuordnungen aus der BSF-02-Migration werden nicht automatisch sichtbar gemacht.

### 7. Providergrenze bleibt erhalten

Die Domänenbegriffe Membership und Customer Access bleiben providerneutral. Supabase implementiert für den MVP Tabellen, Funktionen und RLS-Policies. Eine spätere Azure-SQL-/Entra- oder On-Premises-Implementierung muss denselben fachlichen Contract abbilden können.

Microsoft Entra Tenant IDs, Gruppen-IDs oder Supabase-Projektkennungen bleiben Provider-/Mappinginformationen und keine fachlichen Primärschlüssel.

## Vorgesehene technische Bausteine

Die spätere DDL darf nach dieser ADR folgende Bausteine konkretisieren:

- `systemhouse`
- `systemhouse_membership`
- `customer`
- ein technischer Customer-Zugriffsscope beziehungsweise eine äquivalente serverseitige Zuordnung
- gemeinsame Project-/WorkPackage-/Activity-Projektionen aus PR #81
- kleine, klar geprüfte Autorisierungsfunktionen für Membership und Customer-Scope

Die endgültigen Tabellen- und Funktionsnamen werden erst im Implementierungs-PR festgelegt.

## Sicherheitsregeln für die spätere RLS

Mindestens gelten folgende Regeln:

- kein `anon`-Zugriff,
- explizite Grants und RLS werden getrennt definiert,
- `TO authenticated` ist nur Transport-/Rollenebene und keine fachliche Autorisierung,
- Cross-Systemhouse SELECT/INSERT/UPDATE/DELETE ist nicht möglich,
- Cross-Customer-Zugriff ohne Scope ist nicht möglich,
- Viewer erhält keine neue Schreibberechtigung,
- UPDATE darf `systemhouseId`, `customerId` oder Parent-Beziehungen nicht in einen unzulässigen Scope verschieben,
- erratene IDs führen nicht zu Fremddaten,
- Service-/Admin-Ausnahmen sind separat dokumentiert und getestet,
- SECURITY-DEFINER-Funktionen werden nur bei nachgewiesener Notwendigkeit eingesetzt und nicht zur Umgehung fehlerhafter Policies.

## Supabase-Stand 2026-08-25

Für die Umsetzung ist zu berücksichtigen, dass neue Tabellen im `public`-Schema nicht mehr zuverlässig automatisch über die Data API exponiert werden. Erreichbarkeit über Grants und Zeilenzugriff über RLS sind getrennte Kontrollen und müssen im Implementierungs-PR beide explizit geprüft werden.

## Nicht entschieden

- konkrete Kundenverantwortungsbeziehung aus BSF-03,
- Projektmanager-Leistungssicht aus BSF-03A,
- Teamlead-Finalisierung aus BSF-03B,
- vollständige zentrale Datenstrategie aus BSF-04,
- Entra-Gruppenmapping,
- produktive Provider-Migration.

## Konsequenzen

- BSF-02 kann eine sichere gemeinsame Datenbasis schaffen, ohne Kundenverantwortung fachlich vorwegzunehmen.
- BSF-03 kann später Customer Responsibility auf einen bereits serverseitig durchsetzbaren Scope abbilden.
- Cross-Systemhouse- und Cross-Customer-Negativtests werden vor der ersten produktiven Datenfreigabe verbindlich.
- Eine permissive Zwischenlösung auf Basis globaler Rollen wird ausgeschlossen.
