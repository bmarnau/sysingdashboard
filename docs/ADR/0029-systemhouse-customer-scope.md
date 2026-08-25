# ADR-0029 — Systemhaus- und Customer-Scope als providerneutrale BSF-Basis

Status: akzeptiert für BSF-01 (Planungs-/Architekturbaseline)

Datum: 2026-08-25

## Kontext

Der MVP des Sysing Dashboards ist formal abgeschlossen. Für den BSF-Ausbau werden als nächste fachliche Schritte das Kundenmodell, die Kundenverantwortung, eine Projektmanager-Leistungssicht und ein Teamlead-Leistungsnachweis priorisiert.

Die bestehende RBAC-v2-Vorbereitung aus ADR-0007 und ADR-0008 kennt unter anderem die Ressourcenarten `tenant` und `customer`. Diese Terminologie stammt aus der Pre-BSF-Phase. Gleichzeitig ist inzwischen fachlich entschieden, dass Kundenidentität nicht installations- oder systemhausübergreifend global ist und nicht an einen Microsoft-Tenant oder einen anderen Infrastrukturprovider gekoppelt werden darf.

Zusätzlich liegen Projekte, Arbeitspakete und Tätigkeiten im heutigen MVP user-scoped in `localStorage`. Eine echte Kundensicht über mehrere Personen und eine Projektmanager-Auswertung über Leistungen verschiedener Benutzer können darauf nicht belastbar aufgebaut werden.

## Entscheidung

### 1. Kanonischer fachlicher Scope ist das Systemhaus

Für BSF wird das **Systemhaus** als fachlicher Mandanten-/Betreiberscope verwendet.

Der logische Kundenschlüssel lautet:

```text
(systemhouseId, customerId)
```

`systemhouseId` und `customerId` sind fachliche Identitäten. Sie dürfen nicht aus einer Providerkennung abgeleitet oder mit ihr gleichgesetzt werden.

### 2. Providerkennungen sind Mappingdaten

Eine Microsoft Entra Tenant ID, eine Supabase-Projekt-ID, eine Azure-Ressourcenkennung oder eine SharePoint-Site-ID können später als Provider- oder Quellreferenzen gespeichert werden. Sie sind jedoch **nicht** der fachliche Primärscope des Sysing Dashboards.

Damit bleibt das Modell für Supabase, Microsoft Entra ID, Azure SQL, Azure Table Storage und einen autonomen Docker-/On-Premises-Betrieb verwendbar.

### 3. Neue BSF-Scopes verwenden Systemhaus-Semantik

Fachlich ist für kundenbezogene Scopes folgende Hierarchie maßgeblich:

```text
systemhouse:{systemhouseId}
systemhouse:{systemhouseId}/customer:{customerId}
```

Darunter können bei Bedarf projekt- oder objektbezogene Scopes fortgeführt werden.

Die endgültige technische Kodierung wird in BSF-02 gemeinsam mit dem Datenmodell festgelegt. Entscheidend ist, dass sie den Systemhaus-Scope eindeutig und serverseitig durchsetzbar abbildet.

### 4. Ältere `tenant`-Terminologie wird nicht rückwirkend umgeschrieben

ADR-0007, ADR-0008 und die vorbereitenden RBAC-v2-Typen bleiben historische Evidenz. `tenant` wird dort nicht stillschweigend in „Microsoft Tenant“ oder „Systemhaus“ umgedeutet.

Für BSF gilt stattdessen:

- neue fachliche Entwicklung verwendet `systemhouse` als kanonischen Begriff,
- vor einer Runtime-Änderung wird geprüft, ob `tenant:`-Scopes produktiv persistiert wurden,
- vorhandene persistierte Werte würden über eine explizite Kompatibilitäts-/Migrationsregel behandelt,
- der aktuelle Repository-Befund zeigt `tenant` nur in vorbereitenden RBAC-v2-Typen bzw. ADRs und keinen nachgewiesenen produktiv persistierten Assignment-Pfad.

### 5. Kundenverantwortung ist Beziehung und Scope, keine globale Rolle

Kundenverantwortung erweitert die Sichtbarkeit innerhalb des zulässigen Kundenraums. Sie erzeugt insbesondere keine impliziten Rechte auf:

- Benutzerverwaltung,
- Rollenverwaltung,
- Systemeinstellungen,
- globale Projektänderungen außerhalb des fachlichen Scopes.

UI-Gating dient der Bedienung. Die Sicherheitsgrenze bleibt serverseitige Berechtigungsprüfung einschließlich RLS bzw. einer providerneutralen Datenzugriffsschicht.

### 6. Projektmanager-Leistungssicht und Teamlead-Leistungsnachweis bleiben getrennt

Die Projektmanager-Leistungssicht ist read-only und wird auf den zulässigen Projekt-/Verantwortungsscope begrenzt.

Der Teamlead-Leistungsnachweis ist ein eigener Write-/Finalisierungs-/Audit-Scope. Projektmanager erhalten dadurch keine Finalisierungsrechte.

### 7. BSF-02 zieht nur die minimal notwendige gemeinsame Datenbasis vor

BSF-02 muss neben der Kundenentität genau den gemeinsamen bzw. synchronisierten Read-/Datenpfad schaffen, der für Kundenverantwortung und rollenübergreifende Leistungssichten erforderlich ist.

Der vollständige Umbau der Datenhaltung bleibt BSF-04. Dazu gehören insbesondere:

- vollständige Local-First-Grenze,
- Migrationsstrategie,
- umfassende zentrale/synchronisierte Datenhaltung,
- Konflikt- und Offline-Strategien,
- weitergehende Providertrennung.

Damit wird kein Big-Bang-Umbau vorgezogen.

## Konsequenzen

- BSF-02 kann Kundenmodell und minimale Mehrbenutzer-Datenbasis gemeinsam entwerfen, ohne die vollständige Datenhaltungsarchitektur vorwegzunehmen.
- BSF-03 kann Kundenverantwortung auf einem echten fachlichen Kundenraum aufbauen.
- BSF-03A kann Leistungen rollenübergreifend lesen, ohne lokale Benutzerbestände künstlich zusammenzuführen.
- BSF-03B kann einen getrennten Teamlead-Finalisierungspfad aufbauen.
- Microsoft-/Supabase-spezifische IDs bleiben austauschbare Providerinformationen.
- Historische ADRs bleiben nachvollziehbar; BSF-02 muss vor Runtime-Änderungen trotzdem eine explizite Kompatibilitätsprüfung durchführen.

## Nicht entschieden in ADR-0029

Noch nicht festgelegt sind:

- konkrete Tabellen und Spalten des Kundenmodells,
- Erzeugungs- und Administrationsprozess für `systemhouseId`,
- konkreter Sync-/Persistenzmechanismus für Projekte, Arbeitspakete und Tätigkeiten,
- genaue Customer-Registry-Implementierung,
- konkrete RLS-Policies,
- SharePoint-Matchingregeln,
- spätere Entra-/Azure-Providerkonfiguration.

Diese Punkte gehören in BSF-02, BSF-04 und BSF-05.

## Verifikation

Für BSF-01 wurden `docs/ARCHITECTURE.md`, `docs/DATA-SCHEMA.md`, ADR-0007, ADR-0008, ADR-0025, die RBAC-v2-Typen sowie das BSF-Konzeptregister gegeneinander geprüft.

Die Entscheidung ändert keinen Produktcode, keine Authentifizierung, keine RLS-Policy und keine Datenbank. Lovable wird in BSF-01 nicht eingesetzt.
