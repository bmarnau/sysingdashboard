# Systemhaus-gebundene Kundenidentität — Konzeptnotiz

Stand: 2026-08-24  
Status: **für spätere BSF-/Integrationslösung vorgemerkt, keine MVP-Umsetzung**

## 1. Ausgangslage

Im selben Systemhaus werden langfristig mindestens drei Sichten auf denselben fachlichen Kunden verwendet:

1. der lokale SharePoint-Bestand als fachliche Quelle,
2. die Kundenentität im Sysing Dashboard,
3. die Kundenentität der Reportfamilie (`bmarnau/report-family-platform`).

Der lokale SharePoint-Bestand besitzt heute keine gemeinsame technische Kunden-ID, die in allen drei Systemen verwendet werden kann.

Ziel ist trotzdem: **Ein Kunde des Systemhauses muss in SharePoint, Sysing Dashboard und Reportfamilie zuverlässig als derselbe Kunde erkannt werden.**

## 2. Zentrale Präzisierung

Die gemeinsame Kundenidentität darf **nicht systemhausübergreifend global** verstanden werden.

Sie gilt ausschließlich innerhalb des Kundenraums eines bestimmten Systemhauses.

Beispiel:

```text
Systemhaus A
  Kunde Müller GmbH -> customerId A-4711

Systemhaus B
  Kunde Müller GmbH -> customerId B-8150
```

Dass es sich rechtlich um dieselbe Müller GmbH handeln könnte, bedeutet **nicht**, dass beide Installationen dieselbe technische Kundenidentität verwenden müssen oder dürfen.

Damit lautet die eigentliche Identität logisch:

```text
(systemhouseId, customerId)
```

Die `customerId` darf technisch weiterhin eine UUID sein. Ihre Eindeutigkeit und Bedeutung ist aber an den `systemhouseId`-/Mandantenkontext gebunden.

## 3. Warum dieser Scope wichtig ist

Die Reportfamilie kann auch bei einem anderen Systemhaus betrieben werden. Dort existiert ein eigener Kundenbestand, eine eigene SharePoint-Quelle, eigene Berechtigungen und gegebenenfalls eine andere Zuordnung desselben realen Unternehmens.

Eine installationsübergreifend globale Kundenzuordnung würde deshalb unnötige Kopplung, Datenschutzrisiken und fehlerhafte Mandantenvermischung erzeugen.

Grundregel:

> **Keine Kundenauflösung, kein Mapping und keine Suche ohne vorher feststehenden Systemhaus-/Mandantenscope.**

## 4. Rollen von SharePoint und Customer Identity Registry

SharePoint kann fachliche Quelle der Kundenstammdaten bleiben, obwohl dort zunächst keine gemeinsame `customerId` gespeichert ist.

Dafür werden zwei Verantwortungen getrennt:

### SharePoint

- fachliche Quelle für den Kundenbestand,
- z. B. Name, Anschrift, Status, vorhandene Kundennummern und weitere Stammdaten,
- muss nicht sofort technisch umgebaut werden.

### Systemhaus Customer Identity Registry

- verwaltet die systemhausinterne technische Kundenidentität,
- verbindet Quellobjekte mit `customerId`,
- hält stabile Alias-/Mappinginformationen,
- dient Sysing Dashboard und Reportfamilie als gemeinsamer Identitätsvertrag,
- ist **nicht automatisch Master aller fachlichen Kundenattribute**.

Damit können Source of Truth und Identity Authority getrennt werden:

```text
SharePoint = fachliche Kundenquelle
Identity Registry = technische systemübergreifende Zuordnung innerhalb eines Systemhauses
```

## 5. Mögliches späteres Mapping

Ein mögliches providerneutrales Modell:

```text
Systemhouse
- systemhouseId

CustomerIdentity
- systemhouseId
- customerId
- status

CustomerSourceMapping
- systemhouseId
- customerId
- sourceSystem
- sourceInstance
- sourceRecordId
- createdAt
- lastSeenAt
```

Wichtige Constraints:

```text
UNIQUE(systemhouseId, customerId)
UNIQUE(systemhouseId, sourceSystem, sourceInstance, sourceRecordId)
```

`sourceInstance` verhindert beispielsweise, dass gleichlautende SharePoint-Item-IDs aus zwei verschiedenen Systemhäusern oder Sites miteinander verwechselt werden.

## 6. SharePoint ohne vorhandene gemeinsame ID

Der fehlende gemeinsame Schlüssel im heutigen SharePoint ist kein Grund, eine Identität aus dem Kundennamen abzuleiten.

Sinnvolle spätere Einführungsstrategie:

1. SharePoint-Datensatz einlesen.
2. vorhandenes Mapping über stabile Quell-ID suchen.
3. falls kein Mapping vorhanden ist: Match-Kandidaten über vorhandene Daten ermitteln, z. B. interne Kundennummer, Domain, Name/Ort.
4. eindeutigen starken Treffer verwenden oder unsicheren Treffer zur manuellen Prüfung vorlegen.
5. systemhausgebundene `customerId` erzeugen bzw. zuordnen.
6. Mapping dauerhaft speichern.
7. danach Sysing Dashboard und Reportfamilie mit derselben Identität versorgen.

Unsichere Namensähnlichkeit darf nicht automatisch Kunden zusammenführen.

Optional kann SharePoint später eine zusätzliche technische ID-Spalte erhalten. Das ist aber **keine Voraussetzung** für die erste saubere Mappinglösung.

## 7. Zielbild

```text
                         Systemhaus A
                             |
                     systemhouseId = A
                             |
          +------------------+------------------+
          |                                     |
  SharePoint Kundenquelle               Customer Identity Registry
  Item 123: Müller GmbH                 customerId = 4711
          |                                     |
          +-------------- Mapping --------------+
                             |
                    +--------+--------+
                    |                 |
             Sysing Dashboard   Reportfamilie
             Kunde 4711         Kunde 4711


                         Systemhaus B
                             |
                     systemhouseId = B
                             |
                    eigene Registry
                             |
                eigene Kundenidentitäten
```

Die beiden Kundenräume sind technisch getrennt.

## 8. Architekturleitplanken

- `systemhouseId`/Mandantenscope ist Bestandteil jedes Identitäts- und Mappingzugriffs.
- Keine cross-tenant Suche oder automatische Zusammenführung.
- `systemhouseId` selbst soll providerneutral sein und nicht zwingend einer Microsoft-Tenant-ID entsprechen.
- Microsoft Tenant ID, ERP-ID, Docusnap-ID oder andere externe IDs können Aliase sein, nicht die fachliche Primäridentität.
- RBAC/RLS müssen den Systemhaus-/Mandantenscope serverseitig erzwingen.
- Kundenname ist kein stabiler technischer Schlüssel.
- Umbenennung eines Kunden darf seine Identität nicht ändern.
- Mappingänderungen und manuelle Zusammenführungsentscheidungen müssen auditierbar sein.
- Sysing Dashboard und Reportfamilie behalten getrennte Fachlogik; gekoppelt wird nur über einen kleinen stabilen Customer-Identity-Contract.
- Die Lösung muss unabhängig von Lovable Cloud sowie später mit Supabase/Postgres, Azure SQL und containerisiertem Betrieb umsetzbar bleiben.

## 9. Auswirkung auf die weitere Sysing-Planung

Diese Notiz sollte spätestens in folgenden BSF-Schritten wieder aufgenommen werden:

### BSF-02 — Kundenmodell

Das Kundenmodell muss bereits den Systemhaus-/Mandantenscope berücksichtigen. Eine nur lokal erzeugte `customerId` ohne definierten Namespace wäre zu kurz gedacht.

### BSF-03 — Kundenverantwortung

Kundenverantwortung bezieht sich immer auf Kunden des eigenen Systemhauses und darf den Mandantenscope nicht erweitern.

### BSF-05 — Canonical Import Model / SharePoint-Contract

Der Importvertrag muss neben fachlichen Kundendaten auch die stabile Quellreferenz und das Mapping zur systemhausgebundenen Kundenidentität behandeln.

### Integration Readiness

Vor einer echten Kopplung von Sysing Dashboard, Reportfamilie und SharePoint müssen Source of Truth, Identity Authority, Matchregeln, Dublettenbehandlung, Provenienz und Audit explizit abgenommen werden.

## 10. Verhältnis zur Reportfamilie

Im Repository `bmarnau/report-family-platform` existiert bereits `RF_ARCH_CUSTOMER_IDENTITY_MAPPING.md` mit der Formulierung einer „globalen customerId“ innerhalb der Reportfamilie.

Diese Formulierung ist ab jetzt enger zu verstehen:

> **„global“ bedeutet report- und anwendungsübergreifend innerhalb genau eines Systemhauses, nicht global über mehrere Systemhäuser oder Installationen hinweg.**

Eine korrespondierende Architekturpräzisierung wird in der Reportfamilie separat dokumentiert.

## Abschluss

Für die spätere Lösung wird keine weltweit oder systemhausübergreifend gemeinsame Kunden-ID angestrebt. Benötigt wird eine **systemhausgebundene kanonische Kundenidentität**, die den lokalen SharePoint-Kundensatz, das Sysing Dashboard und die Reportfamilie innerhalb dieses Systemhauses stabil verbindet.
