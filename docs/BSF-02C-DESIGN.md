# BSF-02C — Design der gemeinsamen Customer-Read-Projektion

Status: DESIGN READY  
Datum: 2026-08-25  
Issue: #88  
ADR: ADR-0032

## 1. Ziel

BSF-02C liefert die minimale serverseitig lesbare Mehrbenutzerbasis für:

```text
Systemhouse
  -> Customer
    -> Project
      -> WorkPackage
        -> Activity
          -> Leistungserbringer/Profile
```

Die bestehende Local-First-Datenhaltung bleibt bis BSF-04 bestehen. BSF-02C ist eine
abgeleitete Shared Projection und keine vollständige Zentralisierung.

## 2. Verbindliche Ausgangslage

Bereits umgesetzt:

- providerneutrale Identität `(systemhouseId, customerId)`,
- `systemhouse`, `systemhouse_membership`, `customer`, `customer_access`,
- deny-by-default Customer Access,
- getrennte Read-/Write-Scope-Semantik,
- Account-Aktivitätsprüfung über `is_account_active`,
- kein impliziter Systemadministrator- oder `dashboard.view`-Bypass.

Operative Project-/WorkPackage-/Activity-Daten liegen weiterhin user-scoped im
Browser-Storage. Der Server kann Daten anderer Benutzer deshalb nicht on demand lesen.

## 3. Architekturentscheidung

Gewählt wird eine persistente, abgeleitete Shared Projection.

Nicht gewählt werden:

- vollständige kanonische Zentraldatenhaltung — BSF-04,
- reine Read-API ohne Persistenz — technisch nicht ausreichend,
- Umdeutung von `/api/sync` — bleibt Azure Import/Export.

## 4. Vorgesehene Projection-Objekte

Arbeitsnamen bis zur Lovable-DDL-Verifikation:

- `shared_project_projection`,
- `shared_work_package_projection`,
- `shared_activity_projection`.

Jede Projection-Zeile benötigt mindestens:

- `systemhouse_id`,
- `customer_id`,
- bestehende Source-ID,
- nur die für gemeinsame Sichten nötigen Fachfelder,
- Publisher/Provenance,
- Publish-Zeitpunkt,
- Aktiv-/Withdraw-Status,
- geeignete Revision oder Source-Hash.

Die konkrete Spaltenliste wird erst im DDL-Plan finalisiert.

## 5. Identitätsstrategie

Die bestehenden Source-IDs bleiben wegen AVKK stabil und werden nicht neu erfunden.
Gleichzeitig ist eine Source-ID allein nicht nachweislich systemhausweit eindeutig:

- Fixture-IDs wie `P-101` werden von mehreren Benutzer-Buckets verwendet,
- `newId()` ist nicht als globale Identitätsgarantie ausgelegt,
- Local-First-Kopien können auseinanderlaufen.

Deshalb gilt vor DDL:

1. `published_by` ist Provenance, nicht automatisch fachliche Identität.
2. Ein Unique-Key mit `published_by` darf nicht dazu führen, dass zwei berechtigte
   Publisher dasselbe fachliche Project/WP als parallele Projektwelten erzeugen.
3. Die Lovable-DDL-Planung muss pro Entity nachweisen, welche Kombination die reale
   Übergangsidentität bildet.
4. Falls nur publisher-scoped Eindeutigkeit beweisbar ist, wird diese Grenze ausdrücklich
   dokumentiert und darf in gemeinsamen Reads nicht still als eine kanonische Identität
   ausgegeben werden.
5. AVKK `subject_type + subject_id` darf nicht unkontrolliert brechen.

## 6. Customer- und Parent-Integrität

Customer-Zuordnung muss eindeutig auf `(systemhouse_id, customer_id)` aufgelöst sein.
Ein Anzeigename oder `project.client` ist keine Sicherheits- oder Identitätsquelle.

Parent-Semantik:

- ausdrücklich `none` -> `NULL` Parent zulässig,
- `linked` -> Parent muss serverseitig vorhanden und Customer-konsistent sein,
- `missing` -> nicht veröffentlichen; als unresolved/skipped melden.

Wo technisch sinnvoll, sollen Composite-FKs Cross-Systemhouse-/Cross-Customer-Kombinationen
strukturell verhindern.

## 7. Publish-Autorität

### Project

Minimal erforderlich:

- aktives Konto,
- aktive Membership,
- Customer Access `write`,
- `project.edit`.

### WorkPackage

Bis eine belastbare serverseitige WorkPackage-Ownership existiert, gilt ebenfalls:

- aktives Konto,
- aktive Membership,
- Customer Access `write`,
- `project.edit`.

`workpackage.edit` allein reicht für gemeinsames Struktur-Publishing nicht.

### Activity

Minimal erforderlich:

- aktives Konto,
- aktive Membership,
- Customer Access `write`,
- `activity.edit`,
- `engineer_id = auth.uid()`.

Ein manipulierter Browser darf keine Activity einem fremden Engineer zuschreiben.
Ein Admin-/Migrationspfad für fremde Activities ist nicht Teil von BSF-02C.

## 8. Publish-Transport

Bevorzugter Weg:

```text
Browser
  -> dedizierte Server-Function/Route
  -> Supabase mit demselben User-JWT
  -> Grants + RLS
```

Die Server-Route validiert Payload, Session und fachliche Konsistenz erneut.

Wichtig: Die Route ist nicht die einzige Security Boundary. Falls `authenticated`
DML-Rechte auf Projection-Tabellen erhält, müssen die RLS-Policies selbst zusätzlich
prüfen:

- aktives Konto,
- Membership,
- Customer Access `write`,
- fachliche Permission,
- Activity-Ownership bzw. Publisherregel.

Ein direkter Data-API-Aufruf darf die Server-Route nicht umgehen können.

Service Role wird im normalen Publish-Pfad nicht verwendet.

## 9. Read-Contract

Ein Customer-bezogener Read verlangt mindestens:

- aktives Konto,
- aktive Membership,
- Customer Access `read` oder `write`,
- gegebenenfalls vorhandene fachliche Read-Permission.

Cross-Systemhouse, Cross-Customer, IDOR/BOLA und erratene IDs müssen leer bzw. DENY
liefern. Eine globale Rolle allein genügt nicht.

Leistungserbringer wird über stabile interne Profile-/User-ID referenziert, nicht über
Name oder E-Mail.

## 10. Stale Projection / Delete

Local-First-Löschung, Customer-Wechsel oder Parent-Wechsel dürfen keine verwaisten
Shared-Zeilen hinterlassen.

BSF-02C verwendet deshalb Soft Withdraw oder eine äquivalente Aktivkennzeichnung mit
publisher-eigener Snapshot-Reconciliation.

Regeln:

- kein globaler Cascade-Delete aus einem Browser-Snapshot,
- ein Publisher zieht nur Zeilen zurück, für die er autoritativ ist,
- fremde Publisher-Zeilen werden nicht gelöscht,
- historisch/auditierbar bleibt sichtbar, wann eine Projektion zurückgezogen wurde.

## 11. Concurrency

BSF-02C implementiert keine vollständige Sync-/Conflict-Engine. Trotzdem muss stille
unkontrollierte Überschreibung verhindert oder sichtbar gemacht werden.

Mindestens vorzusehen:

- `published_by`,
- `published_at`,
- `updated_at`,
- Revision oder `source_hash`,
- definierte Upsert-/Conflict-Regel.

Last-Writer-Wins ohne Nachweis/Provenance ist nicht zulässig.

## 12. Unresolved-Daten

Der bestehende providerneutrale Migrationsplan bleibt Grundlage:

```text
Local data
  -> buildSharedDataMigrationPlan()
  -> resolved / publishable
  -> Shared Projection

unresolved / missing
  -> Report/Status
  -> keine Shared-Customer-Sichtbarkeit
```

Unresolved Daten werden weder verworfen noch geraten.

## 13. Import, Export, Backup und AVKK

BSF-02C ist additiv:

- JSON Import/Export bleibt auf bestehendem Local-First-Contract,
- Backup/Restore bleibt auf bestehendem Contract,
- Projection wird nicht zur kanonischen Restore-Quelle,
- bestehende Project-/WP-/Activity-IDs bleiben soweit technisch möglich unverändert,
- AVKK-Verwaisungsprüfungen müssen vor und nach Einführung der Projektion bestehen.

## 14. Vorgesehene RLS-/Grant-Regeln

Deny by default:

- `anon`: keine Rechte,
- `authenticated`: nur minimal erforderliche SELECT/DML-Rechte,
- `service_role`: nicht im normalen Browser-/Publish-Pfad.

RLS Read nutzt den BSF-02B-Customer-Contract.

RLS Write muss Customer Scope und fachliche Permission selbst erzwingen; ein bloßes
`TO authenticated` plus Server-Routenprüfung ist nicht ausreichend.

Keine globale Rolle und kein `dashboard.view` erzeugt Customer-Zugriff.

## 15. Verbindliche negative Tests vor Merge

Mindestens:

1. anon DENY,
2. authenticated ohne Membership DENY,
3. Membership ohne Customer Access DENY,
4. Customer `read` -> Read PASS,
5. Customer `read` -> Publish DENY,
6. Customer `write` + fehlende Fachpermission -> Publish DENY,
7. Cross-Systemhouse DENY,
8. Cross-Customer DENY,
9. erratene Project/WP/Activity-ID liefert keine Fremddaten,
10. direkte Data-API-DML darf Server-Route nicht umgehen,
11. Engineer darf keine fremde Activity publizieren,
12. Activity mit `engineer_id != auth.uid()` DENY,
13. linked Parent aus falschem Customer DENY,
14. missing Parent nicht veröffentlichen,
15. unresolved Customer nicht veröffentlichen,
16. publisher-eigener Withdraw PASS,
17. fremde Publisher-Zeile kann nicht zurückgezogen werden,
18. globale Rolle / `dashboard.view` allein DENY,
19. AVKK-IDs bleiben unverändert bzw. Verwaisungstest PASS,
20. Import/Export/Backup-Restore Regression PASS.

Zusätzlich vollständige Projekt-CI einschließlich Security, E2E, Accessibility,
Technical Debt und `14 · Technical Report & Quality Gate`.

## 16. Implementierungsreihenfolge

1. Live-/Repo-Baseline und Supabase Project Ref verifizieren.
2. Identity-/Unique-Key-Regel pro Entity final entscheiden.
3. Projection-DDL, Constraints, FKs und minimale Grants planen.
4. RLS inklusive fachlicher Permissions und Ownership planen.
5. DB-Änderung ausschließlich über freigegebenen Lovable-Prompt anwenden.
6. Reale DB-/RLS-Negativtests ausführen.
7. Providerneutralen Repository-/Service-Adapter implementieren.
8. Dedizierte Publish-Server-Function/Route mit User-JWT implementieren.
9. Read-Service implementieren.
10. Regression, Doku und technische Prüfberichte aktualisieren.
11. Bereinigten GitHub-PR auf Exact Head vollständig abnehmen.

## 17. Nicht-Scope

Nicht Teil von BSF-02C:

- sichtbare Kundensicht / BSF-03,
- Customer Responsibility,
- PM-Leistungssicht,
- Teamlead-Leistungsnachweis,
- Abrechnung,
- vollständige zentrale Datenhaltung / BSF-04,
- Entra-/Azure-Produktivmigration,
- vollständige bidirektionale Offline-/Conflict-Synchronisation.

## 18. Abnahmezustand dieses Dokuments

Dieses Dokument beschreibt ausschließlich die genehmigte Architektur und den
Implementierungscontract. Es enthält keine DB-/RLS-/Grant-/Runtime-Änderung.

Nächster schreibender DB-Schritt bleibt gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`
Lovable-pflichtig.
