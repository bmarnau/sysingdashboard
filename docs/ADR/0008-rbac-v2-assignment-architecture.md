# ADR-0008: RBAC v2 — Assignment-Architektur

- **Status**: Accepted
- **Datum**: 2026-07-13
- **Ergänzt**: ADR-0007

## Kontext

ADR-0007 hat die v2-Typen eingeführt (`ResourceType`, `ResourceScope`,
`PermissionV2`, `PermissionGroup`, `RoleAssignment`, `AccessContext`) sowie
`evaluateAccess()` mit v1-Fallback. Solange kein Aufrufer Assignments
mitgibt, ist v2 heute **inert**: die Funktion delegiert 1:1 an die
klassische v1-Matrix.

Für den produktiven Nutzen fehlen fünf Dinge:

1. **Persistenz** und Lookup von Assignments (Local-First, später Remote).
2. **Lifecycle** (Grant/Revoke/Ablauf) mit **Actor-Attribution** (v1.27.0).
3. **Multi-Assignment** pro Prinzipal (heute impliziert `UserProfile.role`
   genau eine Rolle).
4. **Scope-Auflösung** für die konkreten Ressourcentypen `customer`,
   `azure.subscription`, `azure.resourceGroup`.
5. **Group-** und **Service-Prinzipale** als Vorbereitung auf Entra-Sync.

Constraints: Local-First (ADR-0003), Pub-Sub-Store statt Zustand (ADR-0004),
Cloudflare Worker ohne Node-FS, spätere Entra-Integration (ADR-0007 M5),
strikt **additiv** zu v1 (kein Breaking Change), keine UI-Änderung in
diesem ADR.

## Entscheidung

Fünf entkoppelte Bausteine, jeder rückwärtskompatibel.

### 1. Domänenmodell (additiv zu `src/lib/rbac/types.ts`)

- **`Principal`** — diskriminierte Union über
  `principalType: "user" | "group" | "service"`. Id ist stabil: Entra-`oid`
  wenn vorhanden, sonst lokale ULID. Groups sind heute Stub (nur Typ +
  Store-Slot); die Auflösung `group → members` folgt mit Entra-Sync.
- **`ScopeRef`** — typisierter Wrapper `readonly ScopeSegment[]`,
  serialisiert über das vorhandene `serializeScope()`. Zusätzliche
  Konventionen:
  - `customer` darf **Top-Level** stehen (`customer:{id}`) **oder**
    verschachtelt unter Tenant (`tenant:{t}/customer:{c}`). Normalisierung
    im `ScopeResolver`, nicht im Repository.
  - `azure.subscription:{subId}` ist Top-Level (Azure ist global
    adressierbar).
  - `azure.resourceGroup:{rg}` ist **nur** unterhalb einer
    `azure.subscription`-Ebene gültig (Invariante, im Service geprüft).
- **`AssignmentLifecycle`** — abgeleiteter Zustand
  `active | pending | expired | revoked`, berechnet aus `grantedAt`,
  `expiresAt`, `revokedAt`. **Nicht persistiert**, um Doppel-Wahrheit zu
  vermeiden.
- **`AssignmentAudit`** — Zusammenfassung der Herkunftsfelder für Log-
  und UI-Zwecke: `grantedBy`, `revokedBy?`, `reason?`, `source`
  (`local | entra`), `sourceRef?` (z. B. Entra-Group-Object-Id).
- **Erweiterung `RoleAssignment`** — **rein additive** Optional-Felder:
  `revokedAt?`, `revokedBy?`, `reason?`, `sourceRef?`. Kein Feld wird
  entfernt oder umbenannt; alte Serialisierungen bleiben lesbar.

### 2. Datenfluss

```text
UI / Service
      │  requestPermission(user, perm, scopeRef)
      ▼
usePermission() / can-Guard  ──►  evaluateAccess(user, perm, ctx)
                                          ▲
                                          │ ctx.assignments
                                          │
                          AssignmentContextBuilder (pure)
                                          ▲
                                          │ liest
                                          │
                ┌─────────────────────────┴────────────────────────┐
                │                                                  │
     AssignmentRepository                              ScopeResolver
      (Persistenz-Port)                          (Ressource → ScopeRef)
                │                                                  │
   LocalAssignmentRepository                        CustomerScopeResolver
   (localStorage, heute)                            AzureScopeResolver
   RemoteAssignmentRepository                       (reine Funktionen)
   (später, Server-Function)
```

- **Reads** sind synchron aus dem Pub-Sub-Store (Slice `assignments`,
  bereits geladen); Komponenten kennen das Repository nicht.
- **Writes** laufen async über den `AssignmentService`; Repository ist
  Persistenz-Port ohne Business-Regeln.
- Der aus v1.27.0 stammende `ActorContext` fließt in **jeden** Write als
  `grantedBy` bzw. `revokedBy`.

### 3. Repositories (Ports, keine Implementierung im ADR)

```ts
interface AssignmentRepository {
  list(principalId: string): Promise<RoleAssignment[]>;
  listByScope(scope: ResourceScope): Promise<RoleAssignment[]>;
  upsert(a: RoleAssignment, actor: ActorContext): Promise<void>;
  revoke(id: string, actor: ActorContext, reason?: string): Promise<void>;
  snapshot(): Promise<RoleAssignment[]>; // Backup/Export
}
```

Zwei geplante Adapter:

- **`LocalAssignmentRepository`** — localStorage-Key
  `rbac.assignments.v1`, versioniert, mit Hook in `backup-service.ts`
  (Assignments landen im ZIP-Backup und werden vom Restore
  wiederhergestellt).
- **`RemoteAssignmentRepository`** — Server-Function-Backend über
  `src/routes/api/*`, aktiviert per Feature-Flag `RBAC_REMOTE`.

Read-Model im Pub-Sub-Store: neuer Slice `assignments` mit Selector
`selectAssignmentsForPrincipal(id)`. Komponenten greifen ausschließlich
über den Store zu — kein direkter Repository-Aufruf aus UI oder Hooks.

### 4. Services

**`AssignmentService`** kapselt Use-Cases, keine Persistenz-Details:

```ts
grantRole(principal, role, scope, actor, opts?): Promise<RoleAssignment>
revokeAssignment(id, actor, reason?): Promise<void>
extendAssignment(id, newExpiry, actor): Promise<void>
resolveEffectivePermissions(user, scope): readonly PermissionV2[]
```

**Invarianten** (im Service erzwungen, nicht im Repo):

- Grant von `roles.manage`-fähigen Rollen ausschließlich durch
  `systemadministrator` — spiegelt v1-Regel aus `check-rbac.mjs`.
- `azure.resourceGroup:*`-Scope nur unterhalb einer bekannten
  `azure.subscription:*`-Ebene; sonst Ablehnung mit `SCOPE_INVALID`.
- **Lockout-Schutz**: der letzte aktive `systemadministrator` kann nicht
  revoked werden (spiegelt v1 `SYSADMIN_LOCKOUT`).
- **Duplikat-Prevention**: `(principalId, role, canonicalScope, source)`
  muss unique sein. Kanonisierung über `serializeScope(parseScope(...))`
  vermeidet Whitespace- und Reihenfolge-Divergenzen.

**`ScopeResolver`** — pro Ressourcentyp eine reine Funktion, keine I/O:

```ts
customerToScope(customerId, tenantId?): ScopeRef
azureSubscriptionToScope(subId): ScopeRef
azureResourceGroupToScope(subId, rg): ScopeRef
```

**Logging**: jeder Grant/Revoke via `logger.info` mit `actorFields()`;
fehlender Actor → `warn`, konsistent zu v1.27.0.

### 5. Migrationsstrategie

Fünf Phasen, jede einzeln reversibel:

| Phase | Umfang                                                                                                                                            | Rollback                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| M1    | Dieses ADR + additive Typ-Erweiterungen (`revokedAt`, `revokedBy`, `reason`, `sourceRef`). Kein Verhalten.                                        | Datei löschen.                       |
| M2    | `LocalAssignmentRepository` + Store-Slice + Backup-Integration. Read-only Anzeige im Systemstatus („X aktive Assignments").                       | Slice leeren, Repo deaktivieren.     |
| M3    | `AssignmentService.grantRole/revoke` + Invarianten-Tests + Actor-Logging. Noch **kein** Aufrufer setzt `AccessContext.assignments`.               | Service ausbauen; v1 bleibt aktiv.   |
| M4    | Erster Aufrufer (Vorschlag: `azure.subscription:import`) nutzt `evaluateAccess(user, perm, { scope, assignments })`. Feature-Flag `RBAC_V2_ENFORCE`. | Flag off → v1-Fallback greift.       |
| M5    | Schrittweise Migration weiterer Aufrufer; `scripts/check-rbac.mjs` um Scope-Invarianten erweitert; `backend/services/rbac.mjs` prüft Assignments. | Aufrufer einzeln zurücksetzen.       |

Der **Entra-Sync-Pfad** (ADR-0007 v5) hakt in M3 ein: der Import legt
Assignments mit `source: "entra"` und `sourceRef: <groupObjectId>` an;
lokale Grants (`source: "local"`) überleben jeden Sync-Lauf unverändert.

## Alternativen

- **Assignments direkt am `UserProfile`** (Array statt separater Store) —
  bricht Group-/Service-Prinzipale und Multi-Scope pro User; verworfen.
- **Policy-Engine (Casbin / oso)** — Runtime-Kosten im Worker, verliert
  statische Typprüfung; bereits in ADR-0007 verworfen.
- **Reine Backend-Assignments** — bricht Local-First (ADR-0003) und
  erzwingt Server-Roundtrips für jede UI-Sichtbarkeit; verworfen.
- **`customer` ausschließlich unter `tenant`** — sauberer Baum, blockiert
  aber Single-Tenant-Setup heute. Stattdessen erlauben wir beide Formen
  und normalisieren im `ScopeResolver`.
- **Soft-Delete durch Löschen statt `revokedAt`** — verliert Audit-Spur;
  verworfen.

## Konsequenzen

**Positiv**

- v2 wird produktiv nutzbar, ohne einen einzigen v1-Aufrufer zu ändern.
- Klare Persistenz-Grenze (Repository-Port) — Local ↔ Remote ohne
  Business-Logik-Umbau austauschbar.
- Entra-Sync-Pfad landet mit denselben Typen (`source`/`sourceRef`) — kein
  weiterer Architekturschritt nötig.
- End-to-End Actor-Attribution (Grant und Revoke), anschlussfähig an den
  Log Viewer.
- Assignments landen automatisch im ZIP-Backup und werden vom Restore
  wiederhergestellt.

**Negativ**

- Zwei Wahrheiten während M2–M4 (v1-Matrix **und** Assignments). Risiko
  divergierender Ergebnisse; gemindert durch das Fallback-Design von
  `evaluateAccess()` und den Feature-Flag `RBAC_V2_ENFORCE`.
- Duplikat-Erkennung hängt an kanonischer Scope-Serialisierung; ein
  Aufrufer, der `serializeScope()` umgeht, kann Doppel-Grants erzeugen.
  Gegenmittel: Repository akzeptiert nur kanonisierte Scopes (Service-
  Vorstufe erzwingt Kanonisierung).
- Backend-Mirror bleibt bis M5 leer — bewusst, kein Nutzen ohne
  Assignment-Store, muss aber in M5 zwingend nachgezogen werden, sonst
  driftet der Server sobald der erste Endpoint scope-abhängig prüft.

## Trust-Boundary / Security-Note

- Client-seitige Assignments sind **UI-Komfort**, keine Sicherheitsgrenze
  (identisch zu ADR-0002/0007). Ein manipulierter Browser kann jederzeit
  Assignments injizieren.
- Ab M5 gilt: **jede** privilegierte Server-Route ruft `evaluateAccess()`
  mit einem **server-seitig** aufgelösten Scope auf; Scope-Angaben aus
  dem Client-Payload werden verworfen.
- Backup/Restore muss die Herkunftsfelder (`grantedBy`, `source`,
  `sourceRef`) bewahren. Restore ohne gültige Signatur setzt alle
  Einträge auf `source: "local"` und `grantedBy: "restore:<actorId>"` —
  Entra-Grants werden dabei bewusst nicht rekonstruiert (der nächste
  Sync-Lauf stellt sie wieder her).
- Das localStorage-Repo ist unverschlüsselt. Assignments enthalten keine
  Secrets, aber Rolle × Scope × Prinzipal kann in Multi-Customer-
  Kontexten sensitiv sein — Threat-Model beim Aktivieren von Multi-
  Tenancy erneut prüfen.
