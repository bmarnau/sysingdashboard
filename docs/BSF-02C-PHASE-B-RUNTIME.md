# BSF-02C – Phase B Runtime Publish-/Read-Pfad

Stand: 2026-09-07  
Status: **IN ARBEIT – B2-RPC integriert, Runtime-PR-Abnahme ausstehend**  
Issue: #88  
ADR: ADR-0032

## 1. Ziel

Nach der über PR #110 abgenommenen Shared-Projection-DB/RLS-Basis ergänzt diese Phase den minimalen echten Runtime-Pfad:

```text
Local-First Browserdaten
  -> authentifizierte TanStack-Serverfunktion
  -> serverseitige Customer-/Permission-Prüfung
  -> providerneutraler Publish-/Read-Service
  -> Supabase-Adapter im selben User-JWT
  -> transaktionale SECURITY-INVOKER-RPC
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

Der Client darf keine `published_by`-Identität vorgeben und keine bereits vorbereiteten DB-Zeilen einsenden.

Der Server akzeptiert Reconciliation nur mit einem ausdrücklich vollständigen Local-First-Snapshot:

- `snapshotComplete: true`,
- `systemhouseId`,
- Ziel-`customerId`,
- explizite Legacy-Customer-Mappings,
- vollständige lokale Project-/WorkPackage-/Activity-Daten.

Eine gefilterte oder partielle Payload darf nicht als gelöschter Bestand interpretiert werden.

Im Serverpfad werden erneut ausgeführt:

1. Payload-Validierung,
2. `buildSharedDataMigrationPlan(...)`,
3. Customer-/Collision-/Parent-/Engineer-Contract,
4. Ermittlung aller im lokalen Snapshot beobachteten Source-IDs,
5. aktive Account-/Membership-/Customer-Write-Prüfung,
6. fachliche Permission-Prüfung,
7. genau ein atomarer RPC-Aufruf im selben User-JWT,
8. RLS als maßgebliche Datenbank-Sicherheitsgrenze.

Unresolved Customer-Zuordnungen, Kollisionen, fehlende Parents und fremde Activity-Engineer-Identitäten bleiben fail-closed.

## 4. Rollengetrennter Publish

### Struktur-Publish

Benutzer mit `project.edit` dürfen gemeinsame Project-/WorkPackage-Struktur veröffentlichen. Enthält der publizierbare Batch Activities, ist zusätzlich `activity.edit` erforderlich.

Der Adapter ruft die B2-RPC im Modus `structure` auf. Project-/WorkPackage-/Activity-Upserts sowie publisher-eigene Reconciliation laufen innerhalb derselben PostgreSQL-Transaktion.

### Eigene Activity ohne Strukturautorität

Ein Engineer besitzt gemäß RBAC `activity.edit`, aber kein gemeinsames Project-Strukturrecht. Deshalb existiert ein eigener Activity-Pfad:

- Project/WorkPackage werden nicht geschrieben,
- Project/WorkPackage werden nicht reconciled,
- verlinkte Activities dürfen nur auf eine bereits aktive und per RLS sichtbare WorkPackage-Projection desselben Customer-Scopes zeigen,
- `engineer_id` bleibt an den angemeldeten Benutzer gebunden,
- nur eigene Activities werden reconciled.

Der Adapter ruft die B2-RPC im Modus `activities` auf und übergibt weder Struktur-Payload noch Struktur-Reconciliation.

## 5. Supabase-Adapter nach B2

Der Publish-Adapter verteilt den Snapshot nicht mehr über mehrere Data-API-Write-Aufrufe.

Stattdessen:

- bildet er aus dem providerneutralen Batch das RPC-Payload,
- berechnet `source_hash` als SHA-256 über den fachlichen Source-Inhalt,
- übergibt die vollständigen observed Source-IDs getrennt vom publizierbaren Batch,
- ruft genau einmal `public.bsf02c_publish_shared_projection_snapshot(...)` auf,
- akzeptiert ausschließlich den für den Runtime-Scope passenden Modus,
- interpretiert die RPC-Zähler als `SharedProjectionWriteCounts`,
- schlägt bei RPC-Fehlern oder ungültiger RPC-Antwort fail-closed fehl.

Revision, Ownership, Parent-Auflösung, Reaktivierung, Soft Withdraw und atomarer Rollback werden in der B2-RPC innerhalb derselben Transaktion umgesetzt und zusätzlich durch bestehende Grants/RLS begrenzt.

Der Read-Pfad bleibt bewusst unverändert: aktive Projection-Zeilen werden im User-JWT für exakt `(systemhouseId, customerId)` gelesen; RLS bleibt die Zeilengrenze.

## 6. Stale-/Publisher-Regel

Snapshot-Reconciliation zieht ausschließlich Zeilen zurück, die:

- zum gleichen Systemhouse/Customer gehören,
- vom aktuellen Benutzer publiziert wurden,
- aktuell aktiv sind,
- im vollständigen aktuellen lokalen Source-Snapshot wirklich nicht mehr vorkommen.

**Nicht publizierbar ist nicht gleich gelöscht.** Skipped/unresolved Sources bleiben als beobachtet geschützt und werden nicht allein wegen eines aktuellen Validierungsproblems deaktiviert.

## 7. Shared Read-Service

Der Read-Pfad verlangt:

- aktives Konto,
- aktive Systemhouse-Membership,
- Customer Access `read`,
- `dashboard.view`.

Danach liest der Adapter nur aktive Projection-Zeilen für exakt `(systemhouseId, customerId)`. RLS bleibt maßgebliche Zeilengrenze.

## 8. B2-Transaktionslücke geschlossen

Die zuvor dokumentierte Atomicity Gap ist durch PR #116 geschlossen.

In `main` integriert ist:

`public.bsf02c_publish_shared_projection_snapshot(uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[])`

Eigenschaften:

- `SECURITY INVOKER`,
- `search_path = public`,
- Publisher/Engineer aus `auth.uid()`,
- PUBLIC/anon ohne EXECUTE,
- authenticated mit gezieltem EXECUTE,
- bestehende Grants und RLS bleiben aktiv,
- Parent-Auflösung im exakten Customer-/Systemhouse-Scope,
- Upserts und Soft Withdraws in derselben Transaktion,
- kein Hard Delete,
- vollständiger Rollback bei jedem späteren Fehler.

Persistentes DB-Testartefakt: `supabase/tests/bsf-02c-transactional-publish-rpc.sql`.

T31–T51 einschließlich T51 Atomic Rollback: **PASS**.

## 9. Security Advisor

Offizieller Supabase Security Advisor am 2026-09-07: **PASS für B2**.

- keine neue BSF-02C-Warnung,
- keine ERROR-/CRITICAL-Findings,
- ausschließlich bekannte SEC-01-WARN-Baseline für `public.avkk_can_write(_subject uuid)` und `public.avkk_people_directory()`,
- B2-RPC erscheint nicht als SECURITY-DEFINER-Finding und bleibt `prosecdef=false`.

## 10. Runtime-Tests

Die Runtime-Tests prüfen weiterhin den providerneutralen Contract:

- vollständiger Struktur-Publish,
- skipped/unresolved bleibt observed,
- Activity-only-Publish gegen sichtbaren Parent,
- fehlender Parent fail-closed,
- Shared Read über Repository-Port.

Zusätzlich prüft der Supabase-Adapter nun explizit:

- Struktur-Publish erzeugt genau **einen** B2-RPC-Aufruf,
- während Publish erfolgt kein direkter Table-Write über `.from(...)`,
- Activity-only-Modus übergibt keine Struktur-Payload/-Reconciliation,
- Source-Hashes werden erzeugt,
- RPC-Fehler schlagen fail-closed fehl.

Die reale DB-Semantik der RPC selbst bleibt durch T31–T51 abgedeckt.

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
- Publish über genau einen atomaren B2-RPC-Aufruf,
- Parent-Auflösung fail-closed,
- fremde Publisher-Source-ID fail-closed,
- Soft Withdraw nur publisher-eigen und nur bei wirklich fehlender Source,
- skipped/unresolved Sources werden nicht versehentlich zurückgezogen,
- vollständiger Publish inklusive Withdraws atomar,
- T31–T51 einschließlich T51 Atomic Rollback PASS,
- offizieller Security Advisor ohne neue BSF-02C-Warnung PASS,
- Shared Customer Read nur im zulässigen Scope,
- Runtime-/Adapter-Tests PASS,
- Security + vollständige Exact-Head-CI inkl. E2E, Accessibility, Technical Debt und Technical Report & Quality Gate PASS,
- keine Lovable-Preview/Auth-Overlay-Dateien im Produkt-PR.
