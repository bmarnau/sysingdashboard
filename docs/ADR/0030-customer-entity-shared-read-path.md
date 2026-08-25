# ADR-0030 — Customer-Entität und minimaler gemeinsamer Read-Pfad

Status: vorgeschlagen für BSF-02  
Datum: 2026-08-25  
Vorgänger: ADR-0029

## Kontext

BSF-01 hat den providerneutralen fachlichen Scope als `(systemhouseId, customerId)` festgelegt. Der aktuelle MVP speichert Projekte, Arbeitspakete und Tätigkeiten weiterhin user-scoped im Browser. Das Export-/Importschema enthält zwar bereits ein `CustomerSchema`, erzeugt Customers heute jedoch synthetisch aus `project.client`; eine echte operative Customer-Entität existiert nicht.

Kundenverantwortung und rollenübergreifende Leistungssichten benötigen dagegen einen serverseitig durchsetzbaren gemeinsamen Datenraum. Ein vollständiger Big-Bang-Umbau der Local-First-Datenhaltung ist für BSF-02 ausdrücklich nicht vorgesehen; dieser bleibt BSF-04.

## Entscheidung

### 1. Customer wird echte Domänenentität

BSF-02 führt eine stabile Customer-Entität ein. Fachlich gilt:

```text
Systemhouse 1 --- n Customer
Customer    1 --- n Project
Project     1 --- n WorkPackage
WorkPackage 1 --- n Activity
Activity    n --- 1 Engineer/Profile
```

Kanonische Identität:

```text
(systemhouseId, customerId)
```

Der Anzeigename ist änderbar und niemals technischer Primärschlüssel.

### 2. Systemhouse-ID bleibt providerneutral

`systemhouseId` darf weder aus einer Microsoft Entra Tenant ID noch aus Supabase-Projekt-, Azure-Ressourcen- oder SharePoint-IDs abgeleitet werden. Providerkennungen sind optionale Mappingdaten außerhalb der fachlichen Identität.

### 3. Zentralisiert wird nur der für Mehrbenutzersichten nötige Schnitt

BSF-02 führt eine gemeinsame serverseitig lesbare Projektion für Customer, Project, WorkPackage und Activity ein. Sie muss mindestens folgende Beziehungen stabil bereitstellen:

```text
systemhouseId
  -> customerId
    -> projectId
      -> workPackageId
        -> activityId
          -> engineerId
```

Die bestehende Local-First-Nutzung darf während BSF-02 weiter bestehen, solange ein deterministischer, getesteter Übergang zwischen lokaler Arbeitskopie und gemeinsamer Projektion definiert ist.

### 4. Bestehende Objekt-IDs bleiben stabil

Projekt-, Arbeitspaket- und Tätigkeits-IDs werden bei der Überführung nicht neu erfunden, sofern kein harter technischer Grund besteht. Das schützt insbesondere AVKK-Referenzen auf `subject_type` + `subject_id`.

### 5. `project.client` wird Legacy-/Anzeigeinformation

Bestehende `project.client`-Werte werden für die initiale Customer-Zuordnung ausgewertet, aber nicht als Identität übernommen. Für Bestandsdaten ist eine explizite Zuordnung/Migrationsregel erforderlich. Gleichnamige Kunden in unterschiedlichen Systemhäusern dürfen nicht kollidieren.

### 6. Export-Customer ist nicht automatisch Produkt-Customer

Das bestehende `CustomerSchema` im JSON-Export bleibt zunächst Kompatibilitätsformat. Synthetisch erzeugte Export-Customers dürfen erst nach eindeutiger Zuordnung zu `(systemhouseId, customerId)` in operative Customers überführt werden.

### 7. Sicherheitsgrenze bleibt serverseitig

Neue gemeinsame Tabellen oder Views müssen sowohl über explizite Grants als auch RLS/Server-Autorisierung abgesichert sein. `TO authenticated` allein genügt nicht als fachliche Autorisierung. Cross-Systemhouse- und Cross-Customer-Zugriffe werden als Negativtests festgeschrieben.

Views dürfen nur eingesetzt werden, wenn ihre Sicherheitssemantik ausdrücklich geprüft ist; bei exponierten Views ist `security_invoker = true` vorzusehen, sofern technisch unterstützt.

### 8. Datenzugriff bleibt adapterbasiert

Customer-/Projekt-/Leistungsfachlogik darf keine Supabase-spezifischen Abfragen direkt in UI-Komponenten enthalten. Der gemeinsame Datenpfad wird hinter einer fachlichen Repository-/Service-Grenze gekapselt, damit spätere Azure-SQL-/On-Premises-Provider austauschbar bleiben.

## Vorgesehene minimale Datenobjekte

Die endgültigen SQL-Spalten werden erst nach Testspezifikation festgeschrieben. Fachlich werden mindestens benötigt:

- `systemhouse`
  - stabile interne ID
  - Name/Anzeigename
  - Status
- `customer`
  - stabile interne ID
  - `systemhouseId`
  - Name/Anzeigename
  - Status
- gemeinsame operative Projektion für `project`
  - bestehende Projekt-ID
  - `customerId`
  - fachlich notwendige Anzeige-/Statusfelder
- gemeinsame operative Projektion für `work_package`
  - bestehende ID
  - `projectId`
- gemeinsame operative Projektion für `activity`
  - bestehende ID
  - `workPackageId`
  - `engineerId`
  - Datum, Dauer, Abrechenbarkeit und für spätere Leistungssichten notwendige Felder

## Migrationsregeln

1. Vor jeder Überführung wird der lokale Bestand nur gelesen und inventarisiert.
2. `project.client` wird normalisiert und als Kandidat für Customer-Matching verwendet.
3. Keine automatische Zusammenführung allein aufgrund gleicher Anzeigenamen über Systemhausgrenzen hinweg.
4. Objekt-IDs bleiben erhalten.
5. Nicht eindeutig zuordenbare Daten werden nicht verworfen; sie benötigen einen expliziten Migrations-/Klärstatus.
6. Import/Export- und Backup-Kompatibilität wird vor Aktivierung des neuen Runtime-Pfads getestet.
7. AVKK-Referenzen werden vor und nach Migration auf Verwaisung geprüft.

## RLS-/Autorisierungsbaseline

Vor Produktivierung müssen mindestens folgende Negativfälle grün sein:

- Benutzer A in Systemhaus A kann keine Customers aus Systemhaus B lesen.
- Benutzer ohne zulässigen Customer-/Projekt-Scope kann operative Fremddaten nicht lesen.
- erratene UUIDs liefern keine Fremddaten.
- Viewer kann keine Customer-/Projekt-/Activity-Daten verändern.
- UPDATE kann Systemhaus-/Customer-Zuordnung nicht in einen unzulässigen Scope verschieben.
- UI-Manipulation kann keine serverseitigen Grenzen umgehen.

## Konsequenzen

- BSF-03 kann Kundenverantwortung auf einer echten Customer-Identität aufbauen.
- BSF-03A kann rollenübergreifend lesen, ohne Browserdaten verschiedener Benutzer künstlich zusammenzuführen.
- BSF-03B kann später auf denselben stabilen Activity-Beziehungen aufsetzen.
- BSF-04 bleibt notwendig, weil Local-First, vollständige Synchronisation, Konflikte, Offline-Verhalten und umfassende Providerstrategie noch nicht gelöst werden.

## Nicht entschieden

- endgültige SQL-Tabellennamen und alle Spalten,
- vollständige bidirektionale Synchronisation,
- Offline-/Konfliktstrategie,
- Customer-Verantwortungsmodell selbst,
- Projektmanager- und Teamlead-UI,
- Entra-/Azure-Produktivmapping.

## Verifikation

Vor Umsetzung werden Repository, bestehende Migrationen, Import/Export, Backup/Restore, AVKK-Integritätsprüfungen und RBAC/RLS-Testinfrastruktur gegeneinander geprüft. Supabase-spezifische DDL wird erst nach Prüfung der aktuellen Supabase-Dokumentation und Breaking Changes erstellt.
