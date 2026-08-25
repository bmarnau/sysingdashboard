# BSF-02 — Customer-Entität und minimale gemeinsame Datenbasis

Stand: 2026-08-25  
Status: Design abgenommen; Implementierungsfundament in Arbeit  
Issue: #76  
ADR: `docs/ADR/0030-customer-entity-shared-read-path.md`  
Design-Abnahme: PR #77, Security #428 PASS, CI #437 PASS

## 1. Ziel

BSF-02 schafft die erste echte Customer-Entität und einen minimalen gemeinsamen Mehrbenutzer-Datenpfad. Dieser Datenpfad ist ausschließlich so groß wie für die unmittelbar folgenden Funktionen nötig:

- BSF-03 Kundenverantwortung / Kundensicht,
- BSF-03A Projektmanager-Leistungssicht,
- später BSF-03B Teamlead-Leistungsnachweis.

Der vollständige Umbau der Datenhaltung bleibt BSF-04.

## 2. Bestätigter Ausgangszustand

- Projekte, Arbeitspakete und Tätigkeiten sind im operativen MVP user-scoped lokal gespeichert.
- `src/lib/json-schema.ts` besitzt ein Export-`CustomerSchema`, erzeugt Customers aber synthetisch aus `project.client`.
- `Project.customerId` und `Activity.engineerId` sind optionale Brückenfelder des Import-/Export-Layers.
- Supabase enthält aktuell zentrale Identitäts-, Rollen-, Settings-, Audit-, Reference-Data- und AVKK-Tabellen.
- AVKK referenziert lokale operative Objekte über stabile `subject_id`-Werte ohne FK.
- Das verbundene Supabase-Projekt war bei der BSF-02-Aufnahme `INACTIVE`; es wurde für die Design- und Fundamentphase nicht reaktiviert oder verändert.

## 3. Fachlicher Contract

Kanonische Kette:

```text
Systemhaus
  -> Kunde
    -> Projekt
      -> Arbeitspaket
        -> Tätigkeit
          -> Leistungserbringer
```

Kanonischer Kundenschlüssel:

```text
(systemhouseId, customerId)
```

Eigenschaften:

- IDs sind stabil und providerneutral.
- Anzeigenamen dürfen geändert werden.
- Providerkennungen sind Mappinginformationen.
- Kundenverantwortung wird noch nicht in BSF-02 implementiert.
- Projektmanager- und Teamlead-Rechte werden noch nicht implementiert, aber der Datenpfad muss sie später sicher unterstützen.

## 4. Minimaler zentraler Umfang

BSF-02 soll keine vollständige Serverkopie sämtlicher Dashboard-Zustände erzwingen. Zentral/synchronisiert werden nur die Daten, die rollenübergreifend benötigt werden.

### Muss zentral lesbar sein

- Customer-Identität und Status,
- Projekt-ID und Customer-Zuordnung,
- WorkPackage-ID und Projekt-Zuordnung,
- Activity-ID und WorkPackage-Zuordnung,
- Activity-Leistungserbringer,
- Activity-Datum und Dauer,
- Activity-Abrechenbarkeit/Billing-Status soweit für spätere Leistungssichten erforderlich.

### Darf vorerst lokal bleiben

Nicht fachlich für BSF-03/03A benötigte UI-Zustände, Ansichtspräferenzen und weitere lokale Komfortdaten bleiben Local-First.

## 5. Migrationsstrategie

### Phase M1 — Inventur

- lokale Projekte, Arbeitspakete und Tätigkeiten lesen,
- eindeutige bestehende IDs sichern,
- `project.client`-Werte inventarisieren,
- AVKK-Referenzen auf dieselben Objekt-IDs erfassen.

### Phase M2 — Customer-Kandidaten

- eindeutige Kundenkandidaten aus vorhandenen `client`-Werten bilden,
- Normalisierung nur zur Unterstützung des Matchings verwenden,
- keine Identität aus Anzeigenamen ableiten,
- nicht eindeutige Fälle kennzeichnen statt automatisch zusammenzuführen.

### Phase M3 — stabile Zuordnung

- jedem eindeutig auflösbaren Objekt eine echte `customerId` über eine explizite Zuordnung geben,
- bestehende Projekt-/WorkPackage-/Activity-IDs erhalten,
- Customer-/Systemhouse-Scope später serverseitig persistieren,
- zulässige Bestandsobjekte ohne Parent-Beziehung erhalten.

### Phase M4 — Kompatibilitätsprüfung

- Import/Export testen,
- Backup/Restore testen,
- AVKK-Orphan-Check vor/nach Migration,
- Rollback-/Fehlerfall prüfen,
- keine lokalen Daten löschen, bevor gemeinsamer Pfad und Wiederherstellung nachgewiesen sind.

## 6. Security-Contract vor DDL

Die spätere Supabase-Implementierung erhält explizite Grants und RLS. Grants und RLS sind getrennte Schutzschichten.

Vor DDL/Runtime-Freigabe werden Testfälle definiert:

1. Cross-Systemhouse SELECT = verweigert/leer.
2. Cross-Customer SELECT = verweigert/leer, wenn Scope fehlt.
3. Viewer INSERT/UPDATE/DELETE = verweigert.
4. Unzulässige Customer-Umschreibung per UPDATE = verweigert.
5. Direkter Zugriff über erratene IDs = keine Fremddaten.
6. UI-Manipulation = keine Rechteausweitung.
7. Service-/Admin-Pfade werden separat getestet und nicht aus Clientrechten abgeleitet.

## 7. Providergrenze

Geplante Softwaregrenze:

```text
UI
  -> Customer/Operational Data Service
    -> providerneutrale Repository-Schnittstelle
      -> Supabase Adapter (MVP)
      -> später Azure SQL / anderer Adapter
```

Regeln:

- keine Supabase-Abfragen direkt in fachlichen React-Komponenten,
- keine Service-Role-Keys im Browser,
- keine Lovable-spezifische Laufzeitabhängigkeit,
- keine Entra-Tenant-ID als Domänen-ID,
- Docker-/On-Premises-Betrieb bleibt möglich.

## 8. Supabase-spezifisches Umsetzungsgate

Vor der ersten DDL-Änderung:

- aktuelles Supabase-Changelog auf relevante Breaking Changes prüfen,
- Data-API-Exposition/Grants des konkreten Projekts feststellen,
- bestehende Migrationen und Default Privileges prüfen,
- Security-/Performance-Advisors vor und nach DDL ausführen,
- RLS-Tests zusammen mit Policies implementieren.

Aktueller externer Hinweis: Seit 30. Mai 2026 ist bei neuen Supabase-Projekten das automatische Exponieren neuer Tabellen über Data API nicht mehr der Default. Deshalb werden Grants nicht vorausgesetzt, sondern explizit geprüft/definiert.

## 9. Testmatrix

### Unit

- Customer-Domänenvalidierung,
- Mapping Legacy-`client` -> Customer-Kandidat,
- IDs bleiben stabil,
- Konflikt-/Ambiguitätsfälle,
- Parent-Beziehungen `linked` / `none` / `missing` getrennt von der Customer-Auflösung.

### Integration

- Customer -> Project -> WorkPackage -> Activity lesen,
- Mehrbenutzer-Read-Pfad,
- Import/Export-Kompatibilität,
- Backup/Restore-Kompatibilität,
- AVKK-Orphan-Prüfung.

### Security/RLS

- Cross-Systemhouse,
- Cross-Customer,
- Viewer write denied,
- unzulässiger Scope-Wechsel,
- IDOR/BOLA-Negativfälle.

### E2E

- bestehender MVP unverändert nutzbar,
- bestehende Benutzer-/Rollenflüsse regressionsfrei,
- später Customer-Anzeige nur aus zulässigem Datenraum.

## 10. Lovable-Einsatz

Für das Daten-/Security-Design und das providerneutrale Fundament: **0 Credits**.

Optional maximal 1 Credit erst dann, wenn eine isolierte Customer-UI-Preview einen echten visuellen Nutzen liefert. Kein Auth-/RLS-/Migrationsthema an Lovable delegieren.

## 11. Abnahme vor Implementierungsphase

Die Design-Abnahme ist mit PR #77 erfolgt:

- ADR-0030 konsistent mit ADR-0029,
- Customer-/Systemhouse-ID providerneutral,
- minimaler gemeinsamer Datenumfang klar begrenzt,
- Migrationsweg ohne Datenverlust beschrieben,
- AVKK-ID-Stabilität berücksichtigt,
- Import/Export/Backup betroffen und in Tests aufgenommen,
- Security-Negativfälle vor DDL definiert,
- Supabase-/Azure-/Docker-Providergrenze gewahrt,
- keine produktive Datenbankänderung in der Designphase,
- Security #428 PASS,
- CI #437 inklusive E2E, Accessibility, Technical Debt und Technical Report & Quality Gate PASS.

## 12. Aktueller technischer Schritt

Das erste Implementierungsfundament entsteht providerneutral und ohne DDL:

1. Customer-/Shared-Data-Domänentypen,
2. verlustfreie Migrationsplanung mit explizitem Legacy-Name -> Customer-ID-Mapping,
3. keine automatische Customer-ID-Erzeugung aus Namen oder synthetischen Export-IDs,
4. stabile Projekt-/WorkPackage-/Activity-IDs,
5. zulässige Parent-losen Datensätze bleiben erhalten; fehlende Parent-Referenzen werden separat markiert,
6. `systemhouse:` additiv im vorbereitenden RBAC-v2-Scope bei Erhalt historischer `tenant:`-Scopes,
7. Architektur-Scanner bindet `customer-data` in die bestehende Service/Repository/Adapter-Grenze ein.

Erst nach grüner Abnahme dieses Fundaments folgt die konkrete Membership-/DDL-/RLS-Stufe.
