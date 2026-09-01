# BSF-02C – Providerneutraler Publish-/Read-Contract vor DB-Implementierung

Stand: 2026-09-01  
Status: CODE CONTRACT – DB/RLS IMPLEMENTATION BLOCKED BY LOVABLE CREDIT LIMIT  
Issue: #88  
ADR: ADR-0032

## 1. Zweck

Diese Phase zieht ausschließlich den providerneutralen Fachvertrag für die spätere
Shared Projection vor. Sie verändert keine Datenbank, keine Migration, keine Grants,
keine RLS-Policy und keine Supabase-generierten Typen.

Die spätere Supabase-Implementierung bleibt gemäß `docs/DATABASE-CHANGE-GOVERNANCE.md`
Lovable-pflichtig.

## 2. Verbindliche Übergangsidentität

Für BSF-02C gilt fachlich:

```text
(entityType, systemhouseId, customerId, sourceId)
```

`published_by` ist Provenance und Autorität, aber kein Bestandteil der fachlichen
Objektidentität.

Die Source-ID bleibt wegen AVKK stabil. Sie wird nicht still neu vergeben.

## 3. Collision-Regel

Weil AVKK heute weiterhin über `subject_type + subject_id` referenziert, dürfen gleiche
Source-IDs derselben Entity-Art innerhalb eines Publish-Plans nicht still als getrennte
Objekte behandelt werden – auch dann nicht, wenn sie unterschiedlichen Customers
zugeordnet sind.

Der providerneutrale Contract behandelt solche Fälle deshalb fail-closed als
`source_id_collision` und veröffentlicht die betroffenen Objekte nicht.

Damit wird weder eine stille Zusammenführung noch eine publisher-basierte Parallelwelt
erzeugt.

## 4. Parent-Regeln

Für WorkPackages und Activities gelten die bereits in ADR-0032 festgelegten Zustände:

- `none`: ausdrücklich parentlos – zulässig,
- `linked`: Parent muss im gleichen Customer-Publish-Batch selbst publizierbar sein,
- `missing`: nicht publizieren.

Ein Kind eines nicht publizierbaren Parents wird ebenfalls nicht veröffentlicht
(`parent_unpublishable`).

Damit entstehen keine verwaisten oder customerübergreifend falsch verknüpften
Projection-Zeilen.

## 5. Activity-/Leistungserbringer-Regel

Der normale BSF-02C-Publish-Pfad darf eine Activity nur vorbereiten, wenn:

- eine stabile `engineerId` vorhanden ist und
- `engineerId` dem publizierenden Benutzer entspricht.

Fehlende Identität ergibt `engineer_missing`, eine fremde Identität
`engineer_mismatch`.

Ein administrativer Fremd-Publish-Pfad ist weiterhin Nicht-Scope.

## 6. Unresolved Customer Data

Unaufgelöste Customer-Zuordnungen werden nicht geraten und nicht veröffentlicht.
Der Contract gibt sie separat mit den bestehenden Gründen aus:

- `mapping_missing`,
- `missing_customer_context`,
- `customer_context_conflict`.

Die lokalen Daten bleiben unverändert erhalten.

## 7. Neue Code-Artefakte

- `src/lib/customer-data/shared-projection-contract.ts`
- `src/__tests__/lib/shared-projection-contract.test.ts`

Zentrale Funktionen:

- `sharedProjectionIdentityKey(...)`
- `prepareSharedCustomerPublishBatch(...)`

Die Funktionen sind bewusst providerneutral und führen keinerlei I/O oder DB-Zugriff
aus.

## 8. Abgrenzung zur noch offenen DB-Phase

Noch nicht umgesetzt sind:

- `shared_project_projection`,
- `shared_work_package_projection`,
- `shared_activity_projection`,
- Composite FKs,
- Grants,
- RLS,
- T01–T30 DB-/RLS-Testartefakt,
- Supabase-Adapter,
- Server-Publish-Function mit User-JWT,
- Shared Read-Service.

Diese Punkte bleiben im nächsten Lovable-Phase-A-Lauf nach Wiederverfügbarkeit von
Credits.

## 9. Security-Auswirkung dieser Code-Phase

Diese Phase erweitert keine produktive Angriffsfläche, weil sie:

- keine Route exponiert,
- keine Data-API-Berechtigung verändert,
- keine Service Role verwendet,
- keine Auth-/RBAC-Regel verändert,
- keine Persistenz schreibt.

Sie verschärft den späteren Publish-Vertrag durch explizites Fail-Closed-Verhalten bei
Kollisionen, fehlenden Parents, unresolved Customer-Zuordnungen und fremder
Activity-Identität.

## 10. Abnahmekriterien

- Source-IDs bleiben unverändert,
- Publisher ist nicht Teil der fachlichen Identität,
- Source-ID-Kollisionen werden fail-closed erkannt,
- parentlose Bestandsfälle bleiben zulässig,
- fehlende/nicht publizierbare Parents werden abgewiesen,
- Activities ohne eigene stabile Engineer-ID werden abgewiesen,
- unresolved Customer Data wird nicht geraten,
- bestehende Migration-/Import-/Export-/Backup-Verträge bleiben unverändert,
- vollständige Exact-Head-CI muss vor Merge PASS sein.
