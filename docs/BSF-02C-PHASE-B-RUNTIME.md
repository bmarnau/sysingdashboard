# BSF-02C – Phase B Runtime Publish-/Read-Pfad

Stand: 2026-09-03  
Status: IMPLEMENTATION / VERIFICATION IN PROGRESS  
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

Der Server erhält:

- `systemhouseId`,
- Ziel-`customerId`,
- explizite Legacy-Customer-Mappings,
- lokale Project-/WorkPackage-/Activity-Daten.

Im Serverpfad werden erneut ausgeführt:

1. Payload-Validierung,
2. `buildSharedDataMigrationPlan(...)`,
3. `prepareSharedCustomerPublishBatch(...)`,
4. aktive Account-/Membership-/Customer-Write-Prüfung,
5. fachliche Permission-Prüfung für tatsächlich zu veröffentlichende Entity-Arten,
6. Persistenz im selben User-JWT,
7. RLS als maßgebliche Datenbank-Sicherheitsgrenze.

Unresolved Customer-Zuordnungen, Kollisionen, fehlende Parents und fremde
Activity-Engineer-Identitäten bleiben fail-closed.

## 4. Supabase-Adapter

Der Adapter:

- liest bestehende Projection-Zeilen im realen Benutzerkontext,
- verweigert die Übernahme einer bereits von einem anderen Publisher publizierten
  Source-ID,
- upsertet Project -> WorkPackage -> Activity in Parent-Reihenfolge,
- löst Parent-UUIDs ausschließlich aus dem im gleichen Batch publizierten Parent auf,
- setzt `source_hash` als SHA-256 über den fachlichen Source-Inhalt,
- erhöht `source_revision` nur bei fachlicher Source-Änderung,
- reaktiviert erneut vorhandene eigene Zeilen,
- zieht stale eigene Projection-Zeilen per Soft Withdraw zurück,
- löscht keine Projection-Zeile.

Die bestehende DB erzwingt weiterhin zusätzlich:

- Customer-/Systemhouse-Scope,
- Ressourcenrechte,
- `published_by = auth.uid()`,
- bei Activity `engineer_id = auth.uid()`,
- unveränderliche Identity-Felder,
- Parent-/Customer-Composite-FKs,
- Source-Collision-Constraints.

## 5. Shared Read-Service

Der Read-Pfad verlangt serverseitig zusätzlich:

- aktives Konto,
- aktive Systemhouse-Membership,
- Customer Access `read`,
- `dashboard.view`.

Danach liest der Adapter nur aktive Projection-Zeilen für exakt
`(systemhouseId, customerId)`. RLS bleibt auch hier die maßgebliche Zeilengrenze.

Ausgegeben werden providerneutrale Records mit Source-ID, Parent-Source-ID,
Leistungsdaten und Provenance (`publishedBy`, `publishedAt`, `sourceRevision`,
`sourceHash`). Interne Parent-Projection-UUIDs werden nicht als fachliche Identität
exponiert.

## 6. Stale-/Publisher-Regel

Snapshot-Reconciliation zieht ausschließlich Zeilen zurück, die:

- zum gleichen Systemhouse/Customer gehören,
- vom aktuellen Benutzer publiziert wurden,
- aktuell aktiv sind,
- im neuen Publish-Batch nicht mehr vorkommen.

Andere Publisher werden weder überschrieben noch zurückgezogen. Ein Konflikt auf einer
bereits fremd publizierten Source-ID wird fail-closed gemeldet.

## 7. Keine DB-Änderung in Phase B

Diese Runtime-Phase benötigt nach aktuellem Stand:

- keine neue Tabelle,
- keine neue Migration,
- keine Grant-Änderung,
- keine RLS-Änderung,
- keine Function-/Trigger-Änderung.

Daher ist für diesen Schritt **kein neuer Lovable-DB-Prompt erforderlich**.

Sollte die Abnahme eine echte Schema-/RLS-/Grant-Lücke zeigen, wird vor jeder
Datenbankänderung gestoppt und gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md` ein separater
Lovable-Prompt formuliert.

## 8. Bewusste Abgrenzung

Noch nicht Bestandteil dieser Phase:

- UI `Meine Kunden` (BSF-03),
- automatische Customer-Mapping-UX,
- PM-Controlling,
- Teamlead-Leistungsnachweis,
- vollständige zentrale Datenhaltung / BSF-04,
- NAVIS/KI,
- Azure-/Entra-Produktivprovider.

Die Publish-Funktion ist zunächst ein explizit aufrufbarer sicherer Runtime-Baustein.
Die fachliche UI-Orchestrierung folgt nach vollständigem Abschluss von BSF-02C in
BSF-03.

## 9. Abnahmekriterien

- providerneutraler Repository-Port ohne Supabase-Import,
- Supabase nur im Adapter/Auth-Runtime-Layer,
- Publisher ausschließlich aus der validierten Session,
- gleicher User-JWT bis zur Data API/RLS,
- kein Service-Role-Pfad im Browser oder normalen Publish-Service,
- serverseitige Payload-/Customer-/Permission-Prüfung,
- Parent-Auflösung fail-closed,
- fremde Publisher-Source-ID fail-closed,
- Soft Withdraw nur publisher-eigen,
- Shared Customer Read nur im zulässigen Scope,
- Unit-/Security-/Backend-/API-/E2E-/Accessibility-/Technical-Debt-Regression PASS,
- vollständige Exact-Head-CI und Security-Workflow PASS,
- kein Lovable-Preview/Auth-Overlay im PR.
