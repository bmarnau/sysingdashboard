
# Plan: ADR-0008 — RBAC v2 Assignment-Architektur

Ziel: **Ein einziges neues Dokument** `docs/ADR/0007-rbac-v2-scopes-and-resources.md`
ergänzendes ADR anlegen und ADR-Index aktualisieren. Kein Code, keine UI,
keine Tests. Bestehende Typen (`ResourceType`, `ResourceScope`, `PermissionV2`,
`PermissionGroup`, `RoleAssignment`, `AccessContext`, `evaluateAccess()`)
bleiben unangetastet.

## Zu erstellende / zu ändernde Dateien

1. **`docs/ADR/0008-rbac-v2-assignment-architecture.md`** (neu) — der ADR.
2. **`docs/ADR/README.md`** — Index-Zeile für ADR-0008.
3. **`CHANGELOG.md`** — neuer Patch-Eintrag (Doku-Änderung, kein Feature-Bump).
4. **`src/lib/help-documentation.ts`** — `lastUpdated` bumpen und kurzen
   Verweis auf das neue ADR im bestehenden Kapitel „Rollen und Berechtigungen"
   ergänzen (keine neue HelpTopic).

## ADR-Inhalt (Gliederung)

### Kontext
- v2-Typen sind vorhanden, aber `evaluateAccess()` fällt ohne Assignments
  auf v1-Matrix zurück → v2 ist heute inert.
- Fehlend für produktive Nutzung: Persistenz, Lookup, Lifecycle,
  Actor-Attribution, Multi-Assignment pro Prinzipal, Scope-Auflösung
  für Customer / Azure-Subscription / Azure-ResourceGroup.
- Constraints: Local-First (ADR-0003), Pub-Sub-Store (ADR-0004),
  Cloudflare Worker (kein Node-FS), zukünftige Entra-Sync (ADR-0007),
  additiv zu v1 (kein Breaking Change).

### Entscheidung — fünf Bausteine

**1. Domänenmodell** (rein deklarativ, additiv zu `types.ts`)
- `Principal` — diskriminierte Union `user | group | service`, stabile Id
  (Entra-`oid` wenn vorhanden, sonst lokale ULID). Groups heute Stub
  (nur Typ + Store), Auflösung folgt mit Entra-Sync.
- `ScopeRef` — typisierter Wrapper `{ type: ResourceType, id: string }[]`,
  serialisiert via bestehendem `serializeScope()`. Neu spezifiziert:
    - `customer` = eigenständiger Top-Level-Scope **oder**
      `tenant:{t}/customer:{c}` (Migration siehe unten).
    - `azure.subscription:{subId}` — Top-Level (kein Tenant-Präfix nötig,
      da Azure global adressierbar).
    - `azure.resourceGroup:{rg}` — **nur** verschachtelt unter
      `azure.subscription:{subId}` gültig (Invariante).
- `AssignmentLifecycle` — `active | pending | expired | revoked`, abgeleitet
  aus `grantedAt`, `expiresAt`, `revokedAt`; nicht persistiert (Ableitung).
- `AssignmentAudit` — `grantedBy`, `revokedBy?`, `reason?`, `source`
  (`local | entra`), `sourceRef?` (Entra-Group-Id).
- Erweiterung `RoleAssignment` nur additiv: `revokedAt?`, `revokedBy?`,
  `reason?`, `sourceRef?`. Kein Feld entfernt, kein Typ umbenannt.

**2. Datenfluss**
```text
UI / Service
      │  requestPermission(user, perm, scopeRef)
      ▼
usePermission()  ──►  evaluateAccess(user, perm, ctx)
                              ▲
                              │ ctx.assignments
                              │
             AssignmentContextBuilder (pure)
                              ▲
                              │ liest
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
 AssignmentRepository                    ScopeResolver
   (Persistenz-Port)                     (Ressource → ScopeRef)
        │                                           │
   LocalAssignmentRepo                    CustomerScopeResolver
   (localStorage, heute)                  AzureScopeResolver
   BackendAssignmentRepo                  (jeweils reine Funktionen)
   (später, Cloudflare KV / D1)
```
- Reads sind synchron aus dem Pub-Sub-Store (bereits geladene
  Assignments); Writes async über Service.
- Actor-Kontext (aus v1.27.0) fließt in **jeden** Write als
  `grantedBy` / `revokedBy`.

**3. Repositories** (Ports, keine Implementierung im ADR)
- `AssignmentRepository` (Interface):
  `list(principalId): Promise<RoleAssignment[]>`,
  `listByScope(scope): Promise<RoleAssignment[]>`,
  `upsert(a: RoleAssignment, actor): Promise<void>`,
  `revoke(id, actor, reason?): Promise<void>`,
  `snapshot(): Promise<RoleAssignment[]>` (für Backup/Export).
- Zwei Adapter geplant:
  - `LocalAssignmentRepository` — localStorage-Key
    `rbac.assignments.v1`, versioniert, mit Backup-Hook
    (`backup-service.ts`).
  - `RemoteAssignmentRepository` — Server-Function-Backend
    (später, hinter Feature-Flag `RBAC_REMOTE`).
- Read-Model im Pub-Sub-Store: Slice `assignments` mit Selector
  `selectAssignmentsForPrincipal(id)`; kein direkter Repo-Aufruf aus
  Komponenten.

**4. Services**
- `AssignmentService` (Use-Cases, keine Persistenz-Logik):
  `grantRole(principal, role, scope, actor, opts?)`,
  `revokeAssignment(id, actor, reason?)`,
  `extendAssignment(id, newExpiry, actor)`,
  `resolveEffectivePermissions(user, scope)` (delegiert an
  `evaluateAccess()`; nur Convenience).
- **Invarianten** (im Service erzwungen, nicht im Repo):
  - Kein Grant von `roles.manage` außerhalb `systemadministrator`.
  - `azure.resourceGroup:*`-Scope nur unter existierender
    `azure.subscription:*`-Ebene.
  - Lockout-Schutz: letzter aktiver `systemadministrator` kann nicht
    revoked werden (mirror aus v1).
  - Duplikat-Prevention: `(principalId, role, scope, source)` unique.
- `ScopeResolver` (pro Ressourcentyp eine reine Funktion):
  `customerToScope(customerId, tenantId?)`,
  `azureSubscriptionToScope(subId)`,
  `azureResourceGroupToScope(subId, rg)`.
- Logging: jeder Grant/Revoke via `logger.info` mit `actorFields()`,
  fehlender Actor → `warn` (konsistent zu v1.27.0).

**5. Migrationsstrategie** (fünf Phasen, jede rückwärtskompatibel)

| Phase | Umfang | Rollback |
| ----- | ------ | -------- |
| M1 | ADR + Typ-Erweiterungen (`revokedAt`, `sourceRef`). Kein Verhalten. | Datei löschen. |
| M2 | `LocalAssignmentRepository` + Store-Slice + Backup-Integration. Read-only-UI im System­status („X aktive Assignments"). | Slice leeren. |
| M3 | `AssignmentService.grantRole/revoke` + Actor-Logging + Invarianten-Tests. Noch kein `evaluateAccess`-Aufrufer nutzt Assignments produktiv. | Service ausbauen; v1 bleibt aktiv. |
| M4 | Ein erster Aufrufer (Vorschlag: `azure.subscription:import`) nutzt `evaluateAccess(user, perm, { scope })`. Feature-Flag `RBAC_V2_ENFORCE`. | Flag off → v1-Fallback. |
| M5 | Schrittweise Migration weiterer Aufrufer; `check-rbac.mjs` um Scope-Invarianten erweitern; Backend-Mirror (`backend/services/rbac.mjs`) übernimmt Assignment-Prüfung. | Aufrufer einzeln zurückrollen. |

Entra-Sync (ADR-0007 v5) hakt in M3 ein: Import legt Assignments mit
`source: "entra"` + `sourceRef: <groupObjectId>` an; lokale Grants bleiben
`source: "local"` und überleben einen Sync-Lauf.

### Alternativen
- **Assignments direkt im `UserProfile`** — bricht Multi-Assignment und
  Group-Prinzipale; verworfen.
- **Policy-Engine (Casbin/oso) statt Assignments** — Runtime-Kosten im
  Worker, verliert statische Typprüfung; verworfen (siehe ADR-0007).
- **Nur Backend-Assignments** — bricht Local-First (ADR-0003).
- **`customer` immer unter `tenant`** erzwingen — sauberer, aber
  blockiert Single-Tenant-Betrieb heute; stattdessen beide Formen
  erlaubt, Normalisierung in `ScopeResolver`.

### Konsequenzen
- **Positiv:** v2 wird produktiv nutzbar ohne Breaking Change; klare
  Persistenz-Grenze (Repository-Port); Entra-Sync-Pfad ohne weitere
  Architekturänderung; Actor-Audit end-to-end.
- **Negativ:** Zwei Wahrheiten während M2–M4 (v1-Matrix + Assignments)
  — Risiko divergierender Ergebnisse, gemindert durch Fallback-Design
  von `evaluateAccess()`. Duplikat-Erkennung braucht kanonische
  Scope-Serialisierung (nutzt `serializeScope()`), sonst
  Doppel-Grants.

### Trust-Boundary / Security-Note
- Client-seitige Assignments sind Komfort, keine Sicherheitsgrenze.
- Ab M5 gilt: **jede** privilegierte Server-Route ruft
  `evaluateAccess()` mit dem serverseitig aufgelösten Scope auf; Client-
  Payload-Scopes werden verworfen.
- Backup/Restore von Assignments muss Actor-Signatur bewahren; Restore
  ohne Signatur → alle Einträge auf `source: "local"`, `grantedBy: "restore"`.

## Was **nicht** zum Plan gehört
- Keine neuen `.ts`-Dateien, keine Store-Slices, keine Repository-
  Implementierung, keine UI, keine Tests. Diese folgen in separaten
  Prompts pro Migrationsphase (M1 … M5).
