# BSF-02C – Phase B Runtime Publish-/Read-Pfad

Stand: 2026-09-03  
Status: **BLOCKED – transaktionale Publish-RPC fehlt**  
Issue: #88  
ADR: ADR-0032

## 1. Ziel

Nach der über PR #110 abgenommenen Shared-Projection-DB/RLS-Basis ergänzt diese Phase
den minimalen echten Runtime-Pfad:

```text
Local-First Browserdaten
  -> authentifizierte TanStack-Serverfunktion
  -> serverseitige Customer-/Permission-Prüfung
  -> providerneutraler Publish-/Read-Service
  -> Supabase-Adapter im selben User-JWT
  -> Grants + RLS
```

Es wird **keine** Service Role im normalen Publish-/Read-Pfad verwendet.

## 2. Providergrenze

Providerneutral bleiben:

- `src/lib/customer-data/shared-projection-contract.ts`
- `src/lib/customer-data/shared-projection-runtime.ts`

Supabase-spezifisch ist ausschließlich:

- `src/integrations/supabase/shared-projection-adapter.ts`

Die HTTP-/Session-Bindung liegt separat unter:

- `src/lib/customer-data-runtime/shared-projection.functions.ts`

Damit bleiben Domain-Vertrag, Datenzugriff und Auth-/Provider-Bindung getrennt.

## 3. Publish-Vertrag

Der Client darf keine `published_by`-Identität vorgeben und keine bereits vorbereiteten
DB-Zeilen einsenden.

Der Server akzeptiert Reconciliation nur mit einem ausdrücklich vollständigen
Local-First-Snapshot:

- `snapshotComplete: true`,
- `systemhouseId`,
- Ziel-`customerId`,
- explizite Legacy-Customer-Mappings,
- vollständige lokale Project-/WorkPackage-/Activity-Daten.

Eine gefilterte oder partielle Payload darf nicht als gelöschter Bestand interpretiert
werden.

Im Serverpfad werden erneut ausgeführt:

1. Payload-Validierung,
2. `buildSharedDataMigrationPlan(...)`,
3. Customer-/Collision-/Parent-/Engineer-Contract,
4. Ermittlung aller im lokalen Snapshot beobachteten Source-IDs,
5. aktive Account-/Membership-/Customer-Write-Prüfung,
6. fachliche Permission-Prüfung,
7. Persistenz im selben User-JWT,
8. RLS als maßgebliche Datenbank-Sicherheitsgrenze.

Unresolved Customer-Zuordnungen, Kollisionen, fehlende Parents und fremde
Activity-Engineer-Identitäten bleiben fail-closed.

## 4. Rollengetrennter Publish

### Struktur-Publish

Benutzer mit `project.edit` dürfen gemeinsame Project-/WorkPackage-Struktur
veröffentlichen. Publish erfolgt Project -> WorkPackage -> Activity. Enthält der
publizierbare Batch Activities, ist zusätzlich `activity.edit` erforderlich.

### Eigene Activity ohne Strukturautorität

Ein Engineer besitzt gemäß RBAC `activity.edit` und `workpackage.edit`, aber kein
`project.edit`. Deshalb existiert ein eigener Activity-Pfad:

- Project/WorkPackage werden nicht geschrieben,
- Project/WorkPackage werden nicht reconciled,
- verlinkte Activities dürfen nur auf eine bereits aktive und per RLS sichtbare
  WorkPackage-Projection desselben Customer-Scopes zeigen,
- `engineer_id` bleibt an den angemeldeten Benutzer gebunden,
- nur eigene Activities werden reconciled.

Damit entsteht kein indirektes gemeinsames Struktur-Schreibrecht.

## 5. Supabase-Adapter

Der vorbereitete Adapter:

- liest bestehende Projection-Zeilen im realen Benutzerkontext,
- verweigert die Übernahme einer fremd publizierten Source-ID,
- löst Parent-UUIDs aus bereits aktiven und/oder im gleichen Lauf publizierten Parents,
- setzt `source_hash` als SHA-256 über den fachlichen Source-Inhalt,
- erhöht `source_revision` nur bei fachlicher Source-Änderung,
- reaktiviert eigene vorhandene Zeilen,
- zieht nur tatsächlich stale eigene Projection-Zeilen per Soft Withdraw zurück,
- prüft bei Update/Upsert die von Supabase zurückgegebenen Zeilen, damit ein
  RLS-bedingtes `0 rows` nicht als erfolgreicher Write gilt,
- löscht keine Projection-Zeile.

## 6. Stale-/Publisher-Regel

Snapshot-Reconciliation zieht ausschließlich Zeilen zurück, die:

- zum gleichen Systemhouse/Customer gehören,
- vom aktuellen Benutzer publiziert wurden,
- aktuell aktiv sind,
- im vollständigen aktuellen lokalen Source-Snapshot wirklich nicht mehr vorkommen.

**Nicht publizierbar ist nicht gleich gelöscht.** Skipped/unresolved Sources bleiben als
beobachtet geschützt und werden nicht allein wegen eines aktuellen Validierungsproblems
deaktiviert.

## 7. Shared Read-Service

Der Read-Pfad verlangt:

- aktives Konto,
- aktive Systemhouse-Membership,
- Customer Access `read`,
- `dashboard.view`.

Danach liest der Adapter nur aktive Projection-Zeilen für exakt
`(systemhouseId, customerId)`. RLS bleibt maßgebliche Zeilengrenze.

## 8. Nachgewiesene Transaktionslücke

Der bisher vorbereitete Supabase-Adapter verteilt einen Full-Snapshot auf mehrere
Data-API-Aufrufe: Project-Upsert, WorkPackage-Upsert, Activity-Upsert und Soft-Withdraws.
Jeder einzelne Request ist durch Grants/RLS geschützt, die gesamte Snapshot-Operation
ist aber **nicht atomar**.

Beispiel: Project-Upsert ist erfolgreich, ein späterer Activity-Write schlägt fehl. Ohne
gemeinsame DB-Transaktion bliebe ein partieller Snapshot zurück.

Dieser Zustand ist für die BSF-02C-Runtime-Abnahme nicht ausreichend. PR #111 bleibt
deshalb Draft und darf in dieser Form nicht gemergt werden.

## 9. Erforderliche DB-Ergänzung

Benötigt wird genau eine transaktionale Supabase-/Postgres-RPC für den Publish-Schritt.
Verbindlich:

- `SECURITY INVOKER`, kein RLS-Bypass,
- `auth.uid()` als Publisher-/Engineer-Autorität,
- `PUBLIC`/`anon` kein EXECUTE,
- `authenticated` nur explizites EXECUTE,
- bestehende Tabellen-Grants und RLS bleiben zusätzliche Sicherheitsgrenze,
- Strukturmodus und Activity-only-Modus bilden den oben beschriebenen RBAC-Vertrag ab,
- Parent-Auflösung in derselben Transaktion,
- Upserts + publisher-eigene Soft-Withdraws in derselben Transaktion,
- jeder Fehler rollt den vollständigen Publish zurück,
- keine Service Role im normalen Runtime-Pfad.

Diese Änderung ist eine SQL-Function-/Grant-/Migration-Änderung und deshalb gemäß
`docs/DATABASE-CHANGE-GOVERNANCE.md` **Lovable-pflichtig**.

## 10. Aktuelle Supabase-Prüfung

Vor der Entscheidung wurde die aktuelle Supabase-Dokumentation/Changelog-Lage geprüft.
Für diesen Scope wurde keine Breaking Change gefunden, die den vorgesehenen
`SECURITY INVOKER`-/RLS-/RPC-Vertrag ersetzt. Relevant bleibt insbesondere, dass
Data-API-Exposition/Grants und RLS getrennte Schutzschichten sind.

## 11. Bewusste Abgrenzung

Noch nicht Bestandteil dieser Phase:

- UI `Meine Kunden` (BSF-03),
- automatische Customer-Mapping-UX,
- PM-Controlling,
- Teamlead-Leistungsnachweis,
- vollständige zentrale Datenhaltung / BSF-04,
- NAVIS/KI,
- Azure-/Entra-Produktivprovider.

## 12. Abnahmekriterien

- providerneutraler Repository-Port ohne Supabase-Import,
- Publisher ausschließlich aus validierter Session/`auth.uid()`,
- gleicher User-JWT bis zur DB/RLS-Grenze,
- kein Service-Role-Normalpfad,
- `snapshotComplete: true` für Reconciliation zwingend,
- Struktur- und Activity-only-Publish RBAC-konform getrennt,
- Parent-Auflösung fail-closed,
- fremde Publisher-Source-ID fail-closed,
- Soft Withdraw nur publisher-eigen und nur bei wirklich fehlender Source,
- skipped/unresolved Sources werden nicht versehentlich zurückgezogen,
- vollständiger Publish inklusive Withdraws **atomar**,
- absichtlich provozierter Fehler nach frühem Write führt zu vollständigem Rollback,
- Shared Customer Read nur im zulässigen Scope,
- DB-/RLS-/RPC-Negativtests PASS,
- Security + vollständige Exact-Head-CI inkl. E2E, Accessibility, Technical Debt und
  Technical Report & Quality Gate PASS,
- keine Lovable-Preview/Auth-Overlay-Dateien im Produkt-PR.
